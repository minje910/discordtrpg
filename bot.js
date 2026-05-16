// ═══════════════════════════════════════════════════════════════
//  TRPG 디스코드 봇  ·  풀 구현 버전
//  새 기능: 전투 턴 관리, HP 대시보드, 씬 시스템, 공격 통합,
//           Modal 등록 UI, 행동 선언, 이세계 전이 테이블
// ═══════════════════════════════════════════════════════════════

const {
  Client, GatewayIntentBits, EmbedBuilder, Events,
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  ButtonBuilder, ButtonStyle,
} = require('discord.js');
const fs   = require('fs');
const path = require('path');

// ───────────────────────────────────────────
//  상수 & 파일 경로
// ───────────────────────────────────────────
const GM_ROLE         = 'GM';
const DATA_DIR        = path.join(__dirname, 'data');
const CHAR_FILE       = path.join(DATA_DIR, 'characters.json');
const INV_FILE        = path.join(DATA_DIR, 'inventory.json');
const MISSION_FILE    = path.join(DATA_DIR, 'missions.json');
const NPC_FILE        = path.join(DATA_DIR, 'npcs.json');
const COMBAT_FILE     = path.join(DATA_DIR, 'combat.json');
const SCENE_FILE      = path.join(DATA_DIR, 'scenes.json');
const DECLARE_FILE    = path.join(DATA_DIR, 'declarations.json');
const TURN_TIMEOUT_MS = 10 * 60 * 1000; // 10분 (Deadly Strike 규칙)

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ───────────────────────────────────────────
//  특성 트리거 맵
// ───────────────────────────────────────────
const TRAIT_TRIGGERS = {
  '닉토포비아': {
    backgrounds: ['어둠'],
    effect: '⚠️ **닉토포비아** 발동!\n> 정신력 판정 **자동 실패** / 도주·기습 판정 **자동 성공**',
  },
  '심해공포증': {
    backgrounds: ['수중', '바다', '심해'],
    effect: '⚠️ **심해공포증** 발동!\n> 정신력 판정 **자동 실패** / 수중 생물 피해 **50% 감소**',
  },
  '사회공포증': {
    backgrounds: ['군중', '도시', '파티'],
    effect: '⚠️ **사회공포증** 발동!\n> 동료 앞 행동 판정 난이도 **×2**',
  },
  '피에 젖은 밤': {
    backgrounds: ['블러드문'],
    effect: '🩸 **피에 젖은 밤** 발동!\n> 공격력·체력 **×2** (늑대인간 전용)',
  },
  '세계수의 가호': {
    backgrounds: ['숲', '자연', '들판', '녹지'],
    effect: '🌿 **세계수의 가호** 활성화!\n> 자연/정령 친화 판정 시 주사위 보정',
  },
  '월광참': {
    backgrounds: ['블러드문', '보름달'],
    effect: '🌕 **월광참** 강화!\n> 달이 보름달에 가까워 피해 상승',
  },
  '야성분출': {
    backgrounds: ['블러드문', '보름달'],
    effect: '🐾 **야성분출** 강화 가능!\n> 지력→민첩, 정신력→힘 전환 시 최대 효과',
  },
};

// ───────────────────────────────────────────
//  이세계 전이 사망 원인 테이블 (93가지)
// ───────────────────────────────────────────
const DEATH_EVENTS = [
  '벌에게 도망치다가 계단에서 굴러떨어져 사망했습니다',
  '자전거를 타고 내리막길을 달리다 브레이크가 고장나 트럭에 충돌하여 사망했습니다',
  '농구를 하다 덩크슛을 시도하다 골대에 머리를 부딪히고 튕겨나온 공에 맞아 사망했습니다',
  '편의점에서 삼각김밥을 먹다가 목에 걸려 사망했습니다',
  '낮잠을 자다가 침대에서 굴러 떨어져 운 나쁘게 사망했습니다',
  '번개가 치는 날 우산을 들고 걷다 벼락에 맞아 사망했습니다',
  '도서관에서 높은 곳의 책을 꺼내려다 사다리가 무너져 사망했습니다',
  '목욕탕에서 미끄러져 넘어지며 사망했습니다',
  '지하철에서 스마트폰을 보다 계단을 헛디뎌 사망했습니다',
  '라면을 먹다가 너무 뜨거운 국물을 흡입하고 사망했습니다',
  '공사장 앞을 지나다가 낙하물에 맞아 사망했습니다',
  '강아지에게 쫓기다 골목에서 담장에 부딪혀 사망했습니다',
  '아이스크림을 먹으며 걷다가 바나나 껍질에 미끄러져 사망했습니다',
  '게임을 하다가 72시간 동안 잠들지 못해 사망했습니다',
  '핸드폰 충전기를 물어뜯다가 감전사했습니다',
  '실내 암벽등반 중 장비를 착용하지 않아 추락하여 사망했습니다',
  '버블티를 마시다가 타피오카 펄이 기도를 막아 사망했습니다',
  '지붕에 올라가 별을 보다가 잠들어 굴러 떨어져 사망했습니다',
  '유리컵을 세게 잡다가 산산조각 나며 동맥을 다쳐 사망했습니다',
  '셀카를 찍으려다 난간에 기대다 균형을 잃고 사망했습니다',
  '헬스장에서 너무 무거운 역기를 들려다 사망했습니다',
  '반려묘에게 장난을 치다가 심각하게 할퀴어 패혈증으로 사망했습니다',
  '수박씨를 먹으면 뱃속에서 수박이 자란다는 것을 직접 증명하려다 사망했습니다',
  '치즈를 너무 많이 먹어서 콜레스테롤 수치가 하늘을 찌르며 사망했습니다',
  '고양이 동영상을 보며 걷다가 가로등에 부딪혀 사망했습니다',
  '버스 정류장에서 갑자기 달려온 비둘기 무리에 놀라 도로로 튀어나가 사망했습니다',
  '책상에 앉아 졸다가 이마를 책상에 강하게 부딪혀 뇌진탕으로 사망했습니다',
  '갑자기 내린 폭설에 지붕이 무너져 사망했습니다',
  '사무실 의자를 뒤로 젖히다가 뒤집어져 사망했습니다',
  '계단을 두 칸씩 내려가다 발목을 접질리고 구르며 사망했습니다',
  '배달 음식이 너무 많이 와서 과식으로 사망했습니다',
  '소설을 읽다가 너무 충격적인 반전에 심장마비로 사망했습니다',
  '주유소 앞에서 담배를 피우다 사망했습니다',
  '드라이아이스를 밀폐된 공간에 보관하다가 이산화탄소 중독으로 사망했습니다',
  '해변에서 모래성을 만들다가 그 안에 파묻혀 사망했습니다',
  '놀이공원에서 롤러코스터를 타다가 안전바가 풀려 사망했습니다',
  '길에서 동전을 줍다가 차에 치여 사망했습니다',
  '신발끈을 묶으려다 너무 오래 숙이고 있어 기절 후 머리를 부딪혀 사망했습니다',
  '귀신의 집에서 너무 놀라 심장이 멈춰 사망했습니다',
  '욕실에서 드라이기를 사용하다가 욕조에 빠뜨려 사망했습니다',
  '창문을 청소하다가 밖으로 떨어져 사망했습니다',
  '마트에서 장을 보다가 쌓여 있던 통조림이 무너져 사망했습니다',
  '갑작스런 재채기로 목뼈가 부러져 사망했습니다',
  '음식을 먹으면서 웃다가 기도가 막혀 사망했습니다',
  '수영장에서 다이빙을 잘못하여 사망했습니다',
  '밤에 귀신을 보고 달리다가 우물에 빠져 사망했습니다',
  '화장실에서 너무 힘을 주다가 사망했습니다',
  '가로수 아래를 걷다가 나뭇가지가 떨어져 사망했습니다',
  '형광등을 갈다가 감전사했습니다',
  '제설제를 설탕으로 오해하여 커피에 넣어 마시고 사망했습니다',
  '친구와 내기를 하다가 이상한 것을 먹고 사망했습니다',
  '분리수거를 하다가 유리조각에 찔려 사망했습니다',
  '연날리기를 하다가 갑자기 연이 강하게 당겨져 날아가 사망했습니다',
  '자동차 트렁크에 들어가 장난을 치다가 갇혀 사망했습니다',
  '모기를 잡으려다 창문 밖으로 떨어져 사망했습니다',
  '지진이 나서 책장이 쓰러져 사망했습니다',
  '화분을 베란다에 놓다가 바람에 날아간 화분에 맞아 사망했습니다',
  '지도를 잘못 보고 호수로 걸어 들어가 익사했습니다',
  '시험 준비를 하다가 스트레스로 사망했습니다',
  '유튜브를 보다가 밤새워 심장마비로 사망했습니다',
  '자판기가 돈을 안 먹어서 흔들다가 자판기에 깔려 사망했습니다',
  '에너지 음료를 너무 많이 마시고 심장이 멈춰 사망했습니다',
  '코끼리에게 먹이를 주다가 손이 물려 사망했습니다',
  '셀카봉으로 인증샷을 찍다가 번개를 맞아 사망했습니다',
  '온라인 쇼핑 중 너무 오래 앉아있다가 혈전이 생겨 사망했습니다',
  '새로 산 신발을 신고 빗길을 달리다가 미끄러져 사망했습니다',
  '탈출 방 게임에서 진짜로 가둬버린 운영자 탓에 갇혀 사망했습니다',
  '마라톤 중계를 보다가 갑자기 달리기 시작해 심장마비로 사망했습니다',
  '화산 근처로 여행을 갔다가 용암에 닿아 사망했습니다',
  '오래된 건물에서 찍사를 하다가 바닥이 무너져 사망했습니다',
  '정글에서 길을 잃고 식인 식물에게 소화되어 사망했습니다',
  '사막 한가운데서 냉방이 고장난 차에 갇혀 사망했습니다',
  '낚시 중 낚싯줄에 발이 낚여 강물에 떨어져 익사했습니다',
  '집 고치기 영상을 따라하다가 집이 무너져 사망했습니다',
  '바비큐 파티에서 고기를 굽다가 불이 번져 사망했습니다',
  '버스에서 급정거에 튕겨나가 사망했습니다',
  '친구 집 소파에서 자다가 소파가 접혀 사망했습니다',
  '무인도 캠핑을 갔다가 길을 못찾고 굶어 사망했습니다',
  '오래된 롤러스케이트를 신고 내리막길을 달리다 사망했습니다',
  '식물에 물을 주다가 발을 헛디뎌 사망했습니다',
  '뽑기 기계에서 인형을 꺼내려다 기계 안에 빠져 사망했습니다',
  '드라마의 결말이 너무 충격적이어서 분노로 사망했습니다',
  '알파카에게 침을 맞아 감염으로 사망했습니다',
  '폭죽을 실내에서 사용하다가 사망했습니다',
  '롤플레잉 게임의 치명적 버그로 실제로 사망했습니다',
  '떡볶이를 먹다가 너무 매워서 심장마비로 사망했습니다',
  '엘리베이터 버튼을 계속 눌러도 안 와서 계단을 달려가다 굴러 사망했습니다',
  '독서실에서 졸다가 책상에 머리를 쾅 박고 사망했습니다',
  '치킨을 주문하다가 전화를 잘못 눌러 폭발물 처리반에게 오해를 받고 진압 과정에서 사망했습니다',
  '체육 시간에 오래달리기를 하다가 체력 부족으로 쓰러져 사망했습니다',
];

// ───────────────────────────────────────────
//  클라이언트 초기화
// ───────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ───────────────────────────────────────────
//  파일 I/O
// ───────────────────────────────────────────
function loadJSON(fp) {
  if (!fs.existsSync(fp)) return {};
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); }
  catch (e) { console.error(`⚠️ 손상된 JSON 파일: ${fp}`, e); return {}; }
}
function saveJSON(fp, data) { fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8'); }

// ───────────────────────────────────────────
//  턴 타임아웃 관리
// ───────────────────────────────────────────
const turnTimeouts = new Map();

function setTurnTimeout(guildId, channel) {
  clearTurnTimeout(guildId);
  const id = setTimeout(async () => {
    const combatData = loadJSON(COMBAT_FILE);
    const cs = combatData[guildId];
    if (!cs?.active) return;
    const current = cs.participants[cs.currentIndex];
    await channel.send(`⏰ **${current.name}**의 턴 시간이 초과되었습니다. 자동으로 다음 턴으로 넘어갑니다.`).catch(() => {});
    await advanceTurn(guildId, channel);
  }, TURN_TIMEOUT_MS);
  turnTimeouts.set(guildId, id);
}

function clearTurnTimeout(guildId) {
  if (turnTimeouts.has(guildId)) {
    clearTimeout(turnTimeouts.get(guildId));
    turnTimeouts.delete(guildId);
  }
}

// ───────────────────────────────────────────
//  전투 턴 진행 (공용 함수)
// ───────────────────────────────────────────
async function advanceTurn(guildId, channel) {
  const combatData = loadJSON(COMBAT_FILE);
  const cs = combatData[guildId];
  if (!cs?.active) return;

  cs.currentIndex = (cs.currentIndex + 1) % cs.participants.length;
  if (cs.currentIndex === 0) cs.round++;
  saveJSON(COMBAT_FILE, combatData);

  const current = cs.participants[cs.currentIndex];
  const mention = current.type === 'player' ? `<@${current.id}>` : `**${current.name}**`;
  await channel.send(`\n⚔️ **라운드 ${cs.round}** — ${mention}의 턴입니다!`).catch(() => {});
  await updateCombatDashboard(guildId, channel);
  setTurnTimeout(guildId, channel);
}

// ───────────────────────────────────────────
//  전투 대시보드 갱신
// ───────────────────────────────────────────
async function updateCombatDashboard(guildId, channel) {
  const combatData = loadJSON(COMBAT_FILE);
  const cs = combatData[guildId];
  if (!cs?.active) return;

  const characters = loadJSON(CHAR_FILE);
  const npcs       = loadJSON(NPC_FILE);
  const embed      = buildCombatEmbed(cs, characters, npcs);

  try {
    if (cs.dashboardMsgId) {
      const msg = await channel.messages.fetch(cs.dashboardMsgId).catch(() => null);
      if (msg) { await msg.edit({ embeds: [embed] }); return; }
    }
    const msg = await channel.send({ embeds: [embed] });
    cs.dashboardMsgId = msg.id;
    saveJSON(COMBAT_FILE, combatData);
  } catch (e) { console.error('대시보드 갱신 오류:', e); }
}

// ───────────────────────────────────────────
//  씬 트리거 알림
// ───────────────────────────────────────────
async function triggerSceneTraits(channel, newBackgrounds) {
  const characters = loadJSON(CHAR_FILE);
  const triggered  = [];

  for (const [userId, char] of Object.entries(characters)) {
    for (const trait of (char.traits ?? [])) {
      const trg = TRAIT_TRIGGERS[trait];
      if (!trg) continue;
      const hit = trg.backgrounds.some(bg =>
        newBackgrounds.some(nb => nb.includes(bg) || bg.includes(nb))
      );
      if (hit) triggered.push({ userId, name: char.nickname, trait, effect: trg.effect });
    }
  }

  if (!triggered.length) return;

  const embed = new EmbedBuilder()
    .setTitle('⚡ 씬 변경 — 특성 트리거 알림')
    .setColor(0xE67E22);
  for (const t of triggered) {
    embed.addFields({ name: `${t.name}  <@${t.userId}>`, value: t.effect, inline: false });
  }
  await channel.send({ embeds: [embed] }).catch(() => {});
}

// ───────────────────────────────────────────
//  유틸리티
// ───────────────────────────────────────────
function isGM(member)     { return member.roles.cache.some(r => r.name === GM_ROLE); }
function effStat(char, s) {
  const base = char.stats?.[s] ?? char.specialStats?.[s] ?? 0;
  const temp = char.tempStats?.[s] ?? 0;
  if (base === Infinity) return Infinity;
  return base + temp;
}
function calcMaxHP(char) {
  const hp = effStat(char, '체력');
  return hp === Infinity ? Infinity : hp * 4;          // 내추럴 하이 스피드: 체력 × 4
}
function npcMaxHP(npc) {
  const hp = npc?.stats?.체력 ?? 0;
  return hp * 4;
}
function requiredExp(lv)   { return lv * 10; }
function rollDice(n, s)    { return Array.from({ length: n }, () => Math.floor(Math.random() * s) + 1); }

// 보정치: 능력치 / 2 (소수점 1자리까지 표현. 정수면 정수, .5면 .5)
function calcBonus(stat) {
  if (stat === Infinity) return Infinity;
  return Math.round((stat / 2) * 10) / 10;
}
function fmtBonus(b) {
  if (b === Infinity) return '∞';
  return Number.isInteger(b) ? `${b}` : `${b}`;
}

// 숙련도 스택: 능력치 20당 d20 +1, 최댓값 선택 (최소 1개)
function rollProficiency(stat) {
  if (stat === Infinity) return { rolls: [20], picked: 20, count: 1 };
  const count  = Math.max(1, 1 + Math.floor((stat ?? 0) / 20));
  const rolls  = rollDice(count, 20);
  const picked = Math.max(...rolls);
  return { rolls, picked, count };
}

// 폭발 주사위: 최댓값 나오면 한 번 더 굴려 합산 (연속, 안전장치 100회)
function rollExploding(count, sides) {
  const all = [];
  let pending = count, safety = 100;
  while (pending > 0 && safety-- > 0) {
    const rolls = rollDice(pending, sides);
    all.push(...rolls);
    pending = rolls.filter(r => r === sides).length;
  }
  return all;
}

// 주사위 식 파서: "1d20 + 1d10 + 5", "2d6-3" 등
// 토큰: XdY 또는 정수, 연결자 +/-
function evalRollExpression(expr) {
  const clean = (expr ?? '').replace(/\s+/g, '');
  if (!clean) throw new Error('빈 식입니다.');
  // 첫 토큰 부호 없을 수 있음 → 앞에 +를 붙여 처리 단순화
  const norm = clean.startsWith('+') || clean.startsWith('-') ? clean : '+' + clean;
  const tokenRe = /([+-])(\d+[dD]\d+|\d+)/g;
  const parts = [];
  let total = 0, lastIdx = 0, m;
  while ((m = tokenRe.exec(norm)) !== null) {
    if (m.index !== lastIdx) throw new Error(`알 수 없는 구문: \`${norm.slice(lastIdx, m.index) || norm}\``);
    lastIdx = m.index + m[0].length;
    const sign = m[1] === '-' ? -1 : 1;
    const body = m[2];
    const d = body.match(/^(\d+)[dD](\d+)$/);
    if (d) {
      const c = parseInt(d[1], 10), s = parseInt(d[2], 10);
      if (c < 1 || c > 100)  throw new Error('주사위 개수는 1~100');
      if (s < 2 || s > 1000) throw new Error('면체 수는 2~1000');
      const rolls = rollDice(c, s);
      const sum   = rolls.reduce((a,b)=>a+b, 0);
      total += sign * sum;
      const detail = rolls.map(r => r === s ? `**${r}**` : `${r}`).join('+');
      parts.push({ sign, label: `${c}d${s}`, detail: `[${detail}]`, value: sum });
    } else {
      const n = parseInt(body, 10);
      total += sign * n;
      parts.push({ sign, label: `${n}`, detail: '', value: n });
    }
  }
  if (lastIdx !== norm.length) throw new Error(`알 수 없는 구문: \`${norm.slice(lastIdx)}\``);
  if (parts.length === 0) throw new Error('식을 해석할 수 없습니다.');
  // 표시용 문자열 조립
  const display = parts.map((p, i) => {
    const op = p.sign === -1 ? ' − ' : (i === 0 ? '' : ' + ');
    return `${op}${p.label}${p.detail ? p.detail : ''}`;
  }).join('');
  return { total, display };
}

function makeHPBar(cur, max) {
  if (max === Infinity || max === 0) return '`∞`';
  const pct    = Math.round(cur / max * 100);
  const filled = Math.max(0, Math.min(10, Math.round(pct / 10)));
  const bar    = '█'.repeat(filled) + '░'.repeat(10 - filled);
  const icon   = pct > 60 ? '🟢' : pct > 30 ? '🟡' : '🔴';
  return `${icon} \`${bar}\` **${cur}/${max}** (${pct}%)`;
}

function initChar(char) {
  char.level        = char.level        ?? 1;
  char.exp          = char.exp          ?? 0;
  char.statPoints   = char.statPoints   ?? 0;
  char.fatePoints   = char.fatePoints   ?? { current: 5, max: 5 };
  char.stats        = char.stats        ?? {};
  char.specialStats = char.specialStats ?? {};
  char.tempStats    = char.tempStats    ?? {};
  char.skills       = char.skills       ?? [];
  char.traits       = char.traits       ?? [];
  char.affiliation  = char.affiliation  ?? '미등록';
  const maxHP = calcMaxHP(char);
  if (!char.hp) char.hp = { current: maxHP, max: maxHP };
  else { char.hp.max = maxHP; char.hp.current = Math.min(char.hp.current, maxHP); }
  return char;
}

// 특수스탯 문자열 파싱: "신성력:17, 자연친화:12"
function parseSpecialStats(raw) {
  const result = {};
  if (!raw || raw.trim() === '') return result;
  for (const part of raw.split(',')) {
    const [k, v] = part.trim().split(':');
    if (!k) continue;
    const num = parseInt(v, 10);
    result[k.trim()] = isNaN(num) ? 0 : num;
  }
  return result;
}

// 기본스탯 문자열 파싱: "10 8 12 15 10 5 15"
function parseBaseStats(raw) {
  const keys   = ['체력', '근력', '민첩', '지능', '매력', '감각', '정신력'];
  const nums   = raw.trim().split(/\s+/).map(Number);
  const result = {};
  for (let i = 0; i < keys.length; i++) {
    result[keys[i]] = isNaN(nums[i]) ? 0 : nums[i];
  }
  return result;
}

// ───────────────────────────────────────────
//  임베드 빌더
// ───────────────────────────────────────────
function charEmbed(char, member) {
  const fate  = char.fatePoints;
  const maxHP = calcMaxHP(char);
  char.hp.max = maxHP === Infinity ? Infinity : maxHP;
  const statsLines = Object.entries(char.stats).map(([k, v]) => {
    const temp = char.tempStats?.[k] ?? 0;
    if (v === Infinity) return `**${k}** : ∞`;
    const eff  = v + temp;
    return temp !== 0 ? `**${k}** : ${eff} (${temp > 0 ? '+' : ''}${temp}임시)` : `**${k}** : ${eff}`;
  }).join('\n');
  const embed = new EmbedBuilder()
    .setTitle(`📊 ${char.nickname}  /  ${char.race || '미등록'}  /  ${char.job || '미등록'}`)
    .setColor(0x2ECC71)
    .addFields(
      { name: '🏅 레벨',            value: `Lv. **${char.level}**`,                    inline: true  },
      { name: '⭐ 운명점',          value: `${fate.current} / ${fate.max}`,             inline: true  },
      { name: '✨ 분배 가능 능력치', value: `**${char.statPoints}** 점`,               inline: true  },
      { name: '📊 경험치',          value: `${char.exp} / ${requiredExp(char.level)}`,  inline: true  },
      { name: '❤️ 체력',            value: makeHPBar(char.hp.current, char.hp.max),     inline: false },
      { name: '🏠 소속',            value: char.affiliation || '미등록',               inline: true  },
      { name: '📈 상태창',          value: statsLines || '없음',                       inline: false },
    )
    .setFooter({ text: `플레이어: ${member.displayName}` });
  const sp = char.specialStats;
  if (Object.keys(sp).length) {
    const spLines = Object.entries(sp).map(([k, v]) => {
      if (v === Infinity) return `**${k}** : ∞`;
      const temp = char.tempStats?.[k] ?? 0;
      const eff  = v + temp;
      return temp !== 0 ? `**${k}** : ${eff} (${temp > 0 ? '+' : ''}${temp}임시)` : `**${k}** : ${eff}`;
    }).join('\n');
    embed.addFields({ name: '🔷 특수 스탯', value: spLines, inline: false });
  }
  embed.addFields(
    { name: '⚔️ 스킬', value: char.skills?.length ? char.skills.join(', ') : '미등록', inline: false },
    { name: '🔮 특성', value: char.traits?.length ? char.traits.join(', ') : '미등록', inline: false },
  );
  return embed;
}

function missionEmbed(mid, m) {
  const embed = new EmbedBuilder()
    .setColor(m.personal ? 0x9B59B6 : 0xE74C3C)
    .setTitle(`${m.active ? '🟢' : '🔴'} [${mid}] ${m.title}`)
    .setDescription(`*${m.subtitle}*`)
    .addFields(
      { name: '📝 설명',  value: m.description, inline: false },
      { name: '🏆 보상',  value: m.reward,       inline: false },
    );
  if (m.personal && m.targets?.length)
    embed.addFields({ name: '👥 대상', value: m.targets.map(id => `<@${id}>`).join(', '), inline: false });
  return embed;
}

function npcEmbed(nid, npc) {
  const maxHP = npc.hp?.max ?? npcMaxHP(npc);
  let desc = `**종족**: ${npc.race || '미등록'}  |  **직업**: ${npc.job || '미등록'}`;
  if (npc.hasLevel) desc += `  |  **Lv.${npc.level}**  |  EXP보상: **${npc.level}**`;
  if (npc.affiliation && npc.affiliation !== '미등록') desc += `\n**소속**: ${npc.affiliation}`;
  const embed = new EmbedBuilder().setColor(0x95A5A6)
    .setTitle(`👤 [NPC-${nid}] ${npc.name}`).setDescription(desc)
    .addFields({ name: '❤️ 체력', value: makeHPBar(npc.hp?.current ?? maxHP, maxHP), inline: false });
  if (npc.stats && Object.keys(npc.stats).length)
    embed.addFields({ name: '📈 스탯', value: Object.entries(npc.stats).map(([k,v]) => `**${k}**: ${v}`).join('\n'), inline: true });
  if (npc.specialStats && Object.keys(npc.specialStats).length)
    embed.addFields({ name: '🔷 특수 스탯', value: Object.entries(npc.specialStats).map(([k,v]) => `**${k}**: ${v}`).join('\n'), inline: true });
  if (npc.skills?.length)  embed.addFields({ name: '⚔️ 스킬',  value: npc.skills.join(', '),  inline: false });
  if (npc.traits?.length)  embed.addFields({ name: '🔮 특성',  value: npc.traits.join(', '),  inline: false });
  if (npc.description)     embed.addFields({ name: '📋 메모',  value: npc.description,         inline: false });
  return embed;
}

function buildCombatEmbed(cs, characters, npcs) {
  const lines = cs.participants.map((p, i) => {
    const mark = i === cs.currentIndex ? '▶️' : `${i + 1}.`;
    const ini  = `[🎲${p.initiative}]`;
    if (p.type === 'player') {
      const ch = characters[p.id];
      if (!ch) return `${mark} **${p.name}** ${ini} — 정보 없음`;
      return `${mark} **${ch.nickname}** ${ini}\n　　${makeHPBar(ch.hp?.current ?? 0, ch.hp?.max ?? 0)}`;
    } else {
      const npc = npcs[p.id];
      if (!npc) return `${mark} **${p.name}** ${ini} — 정보 없음`;
      return `${mark} **[NPC-${p.id}] ${npc.name}** ${ini}\n　　${makeHPBar(npc.hp?.current ?? 0, npc.hp?.max ?? 0)}`;
    }
  });

  const cur = cs.participants[cs.currentIndex];
  return new EmbedBuilder()
    .setTitle('⚔️ 전투 현황판')
    .setColor(0xE74C3C)
    .addFields({ name: `라운드 ${cs.round}`, value: lines.join('\n\n') || '참가자 없음' })
    .setFooter({ text: `현재 턴: ${cur?.name ?? '?'} | 5분 안에 행동하지 않으면 자동 스킵` });
}

// ───────────────────────────────────────────
//  임시 등록 상태 (Modal 2단계용)
// ───────────────────────────────────────────
const pendingChars = new Map(); // userId → partial char data
const pendingNPCs  = new Map(); // userId → partial npc data

// ───────────────────────────────────────────
//  인터랙션 핸들러
// ───────────────────────────────────────────
client.on(Events.InteractionCreate, async (interaction) => {
 try {

  // ══════════════════════════════
  //  BUTTON 클릭 처리 — 모달 체이닝용
  // ══════════════════════════════
  if (interaction.isButton()) {
    const uid = interaction.user.id;

    if (interaction.customId === 'char_next_btn') {
      if (!pendingChars.has(uid)) return interaction.reply({ content: '❌ 등록 세션이 만료되었습니다. `/상태등록`을 다시 시도해주세요.', ephemeral: true });
      const modal2 = new ModalBuilder()
        .setCustomId('char_modal_2')
        .setTitle('캐릭터 등록 (2/2) — 스킬·특성·특수스탯');
      modal2.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('skills').setLabel('스킬 (쉼표 구분, 없으면 빈칸)').setStyle(TextInputStyle.Short).setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('traits').setLabel('특성 (쉼표 구분, 없으면 빈칸)').setStyle(TextInputStyle.Short).setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('specialStats').setLabel('특수스탯 (형식: 이름:값, 이름:값 / 없으면 빈칸)').setStyle(TextInputStyle.Short).setRequired(false)
        ),
      );
      return interaction.showModal(modal2);
    }

    if (interaction.customId === 'npc_next_btn') {
      if (!pendingNPCs.has(uid)) return interaction.reply({ content: '❌ 등록 세션이 만료되었습니다. `/npc등록`을 다시 시도해주세요.', ephemeral: true });
      const modal2 = new ModalBuilder()
        .setCustomId('npc_modal_2')
        .setTitle('NPC 등록 (2/2) — 스탯·스킬·특성');
      modal2.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('stats').setLabel('기본스탯 (체력 근력 민첩 지능 매력 감각 정신력)').setStyle(TextInputStyle.Short).setPlaceholder('예) 9 8 10 7 5 6 8').setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('specialStats').setLabel('특수스탯 (이름:값, 이름:값 / 없으면 빈칸)').setStyle(TextInputStyle.Short).setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('skills').setLabel('스킬 (쉼표 구분, 없으면 빈칸)').setStyle(TextInputStyle.Short).setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('traits').setLabel('특성 (쉼표 구분, 없으면 빈칸)').setStyle(TextInputStyle.Short).setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('memo').setLabel('메모/설명 (없으면 빈칸)').setStyle(TextInputStyle.Paragraph).setRequired(false)
        ),
      );
      return interaction.showModal(modal2);
    }

    return; // 알 수 없는 버튼
  }

  // ══════════════════════════════
  //  MODAL 제출 처리
  // ══════════════════════════════
  if (interaction.isModalSubmit()) {
    const uid = interaction.user.id;

    // ── 캐릭터 등록 1단계 ──
    if (interaction.customId === 'char_modal_1') {
      const nickname    = interaction.fields.getTextInputValue('nickname');
      const race        = interaction.fields.getTextInputValue('race')        || '미등록';
      const job         = interaction.fields.getTextInputValue('job')         || '미등록';
      const affiliation = interaction.fields.getTextInputValue('affiliation') || '미등록';
      const statsRaw    = interaction.fields.getTextInputValue('stats');

      let stats;
      try { stats = parseBaseStats(statsRaw); } catch {
        return interaction.reply({ content: '❌ 기본스탯 형식 오류. 예) `10 8 12 15 10 5 15`', ephemeral: true });
      }

      pendingChars.set(uid, { nickname, race, job, affiliation, stats });

      const nextBtn = new ButtonBuilder()
        .setCustomId('char_next_btn')
        .setLabel('다음 단계로 (2/2) →')
        .setStyle(ButtonStyle.Primary);
      return interaction.reply({
        content: `✅ 1단계 입력 완료: **${nickname}**\n아래 버튼을 눌러 2단계(스킬·특성·특수스탯)로 진행해주세요.`,
        components: [new ActionRowBuilder().addComponents(nextBtn)],
        ephemeral: true,
      });
    }

    // ── 캐릭터 등록 2단계 ──
    if (interaction.customId === 'char_modal_2') {
      const partial = pendingChars.get(uid);
      if (!partial) return interaction.reply({ content: '❌ 등록 세션이 만료되었습니다. `/상태등록`을 다시 시도해주세요.', ephemeral: true });
      pendingChars.delete(uid);

      const skillsRaw      = interaction.fields.getTextInputValue('skills');
      const traitsRaw      = interaction.fields.getTextInputValue('traits');
      const specialRaw     = interaction.fields.getTextInputValue('specialStats');
      const skills         = skillsRaw.trim()  ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean)  : [];
      const traits         = traitsRaw.trim()  ? traitsRaw.split(',').map(t => t.trim()).filter(Boolean)  : [];
      const specialStats   = parseSpecialStats(specialRaw);

      const char = { ...partial, skills, traits, specialStats, tempStats: {} };
      initChar(char);
      const characters = loadJSON(CHAR_FILE);
      characters[uid] = char;
      saveJSON(CHAR_FILE, characters);

      await interaction.reply({ content: `✅ **${char.nickname}** 캐릭터 등록 완료!` });
      return interaction.followUp({ embeds: [charEmbed(char, interaction.member)] });
    }

    // ── 미션 등록 Modal ──
    if (interaction.customId === 'mission_modal') {
      if (!isGM(interaction.member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });

      const title      = interaction.fields.getTextInputValue('title');
      const subtitle   = interaction.fields.getTextInputValue('subtitle');
      const desc       = interaction.fields.getTextInputValue('description');
      const reward     = interaction.fields.getTextInputValue('reward');
      const personalRaw = interaction.fields.getTextInputValue('personal').trim();
      const isPersonal  = personalRaw === '예' || personalRaw === 'Y' || personalRaw === 'y';

      const missions = loadJSON(MISSION_FILE);
      const ids      = Object.keys(missions).map(Number).filter(n => !isNaN(n));
      const nextId   = String((ids.length ? Math.max(...ids) : 0) + 1);
      missions[nextId] = {
        title, subtitle, description: desc, reward,
        personal: isPersonal, targets: null,
        createdBy: uid, createdAt: new Date().toISOString(), active: true,
      };
      saveJSON(MISSION_FILE, missions);

      await interaction.reply({ embeds: [missionEmbed(nextId, missions[nextId])] });
      return interaction.followUp({ content: `✅ 미션 등록 완료! (ID: \`${nextId}\`)${isPersonal ? '\n⚠️ 개인미션 대상자는 `/미션수정` 으로 추가해주세요.' : ''}` });
    }

    // ── NPC 등록 1단계 ──
    if (interaction.customId === 'npc_modal_1') {
      if (!isGM(interaction.member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });

      const name        = interaction.fields.getTextInputValue('name');
      const race        = interaction.fields.getTextInputValue('race')        || '미등록';
      const job         = interaction.fields.getTextInputValue('job')         || '미등록';
      const affiliation = interaction.fields.getTextInputValue('affiliation') || '미등록';
      const levelRaw    = interaction.fields.getTextInputValue('level').trim();
      const level       = parseInt(levelRaw, 10);
      const hasLevel    = !isNaN(level) && level > 0;

      pendingNPCs.set(uid, { name, race, job, affiliation, hasLevel, level: hasLevel ? level : 1 });

      const nextBtn = new ButtonBuilder()
        .setCustomId('npc_next_btn')
        .setLabel('다음 단계로 (2/2) →')
        .setStyle(ButtonStyle.Primary);
      return interaction.reply({
        content: `✅ 1단계 입력 완료: **${name}**\n아래 버튼을 눌러 2단계(스탯·스킬·특성)로 진행해주세요.`,
        components: [new ActionRowBuilder().addComponents(nextBtn)],
        ephemeral: true,
      });
    }

    // ── NPC 등록 2단계 ──
    if (interaction.customId === 'npc_modal_2') {
      if (!isGM(interaction.member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });

      const partial = pendingNPCs.get(uid);
      if (!partial) return interaction.reply({ content: '❌ 등록 세션이 만료되었습니다. `/npc등록`을 다시 시도해주세요.', ephemeral: true });
      pendingNPCs.delete(uid);

      const statsRaw    = interaction.fields.getTextInputValue('stats');
      const specialRaw  = interaction.fields.getTextInputValue('specialStats');
      const skillsRaw   = interaction.fields.getTextInputValue('skills');
      const traitsRaw   = interaction.fields.getTextInputValue('traits');
      const memo        = interaction.fields.getTextInputValue('memo');

      let stats;
      try { stats = parseBaseStats(statsRaw); } catch {
        return interaction.reply({ content: '❌ 기본스탯 형식 오류.', ephemeral: true });
      }

      const specialStats = parseSpecialStats(specialRaw);
      const maxHP        = (stats['체력'] ?? 0) * 4;
      const npc = {
        ...partial,
        stats,
        specialStats,
        skills: skillsRaw.trim() ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
        traits: traitsRaw.trim() ? traitsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
        description: memo.trim() || '',
        hp: { current: maxHP, max: maxHP },
        createdBy: uid,
        createdAt: new Date().toISOString(),
      };

      const npcs  = loadJSON(NPC_FILE);
      const ids   = Object.keys(npcs).map(Number).filter(n => !isNaN(n));
      const nid   = String((ids.length ? Math.max(...ids) : 0) + 1);
      npcs[nid] = npc;
      saveJSON(NPC_FILE, npcs);

      await interaction.reply({ content: `✅ NPC 등록 완료! (ID: \`${nid}\`)` });
      return interaction.followUp({ embeds: [npcEmbed(nid, npc)] });
    }

    return; // 알 수 없는 modal
  }

  // ══════════════════════════════
  //  슬래시 커맨드 처리
  // ══════════════════════════════
  if (!interaction.isChatInputCommand()) return;
  const { commandName: cmd, member } = interaction;

  // ── 주사위 (식 표현식 지원: 1d20 + 1d10 + 5) ───────
  if (cmd === 'roll') {
    const diceStr = interaction.options.getString('dice');
    let result;
    try { result = evalRollExpression(diceStr); }
    catch (e) {
      return interaction.reply({ content: `❌ 형식 오류: ${e.message}\n예) \`2d6\`, \`1d20 + 1d10\`, \`2d6 + 5 - 1d4\``, ephemeral: true });
    }
    return interaction.reply({ embeds: [
      new EmbedBuilder().setTitle('🎲 주사위 결과').setColor(0x9B59B6)
        .addFields(
          { name: '식',     value: `\`${diceStr}\``,        inline: false },
          { name: '굴림',   value: result.display || '—',   inline: false },
          { name: '합계',   value: `**${result.total}**`,    inline: true  },
        ).setFooter({ text: `${member.displayName}의 굴림` })
    ]});
  }

  // ── 상태등록 (Modal) ──────────────────────────────
  if (cmd === '상태등록') {
    const modal = new ModalBuilder()
      .setCustomId('char_modal_1')
      .setTitle('캐릭터 등록 (1/2) — 기본 정보');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('nickname').setLabel('닉네임').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('race').setLabel('종족 (없으면 빈칸)').setStyle(TextInputStyle.Short).setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('job').setLabel('직업 (없으면 빈칸)').setStyle(TextInputStyle.Short).setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('affiliation').setLabel('소속 (없으면 빈칸)').setStyle(TextInputStyle.Short).setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('stats')
          .setLabel('기본스탯 (체력 근력 민첩 지능 매력 감각 정신력 순서로 공백 구분)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('예) 9 5 12 15 12 5 15')
          .setRequired(true)
      ),
    );
    return interaction.showModal(modal);
  }

  // ── 상태창 ───────────────────────────────────────
  if (cmd === '상태창') {
    const targetUser   = interaction.options.getUser('유저');
    const targetMember = targetUser ? await interaction.guild.members.fetch(targetUser.id).catch(() => null) : member;
    if (!targetMember) return interaction.reply({ content: '❌ 유저를 찾을 수 없습니다.', ephemeral: true });
    const characters = loadJSON(CHAR_FILE);
    const char       = characters[targetMember.id];
    if (!char) return interaction.reply({ content: targetMember.id === interaction.user.id ? '❌ 등록된 캐릭터가 없습니다. `/상태등록`으로 등록해주세요.' : '❌ 해당 유저의 캐릭터가 없습니다.', ephemeral: true });
    initChar(char); saveJSON(CHAR_FILE, characters);
    return interaction.reply({ embeds: [charEmbed(char, targetMember)] });
  }

  // ── 스탯수정 ─────────────────────────────────────
  if (cmd === '스탯수정') {
    const statName = interaction.options.getString('스탯');
    const rawVal   = interaction.options.getString('값');
    const value    = rawVal === '무한' ? Infinity : parseInt(rawVal, 10);
    if (isNaN(value)) return interaction.reply({ content: '❌ 값은 숫자 또는 `무한` 으로 입력해주세요.', ephemeral: true });
    const characters = loadJSON(CHAR_FILE);
    const char = characters[interaction.user.id];
    if (!char) return interaction.reply({ content: '❌ 등록된 캐릭터가 없습니다.', ephemeral: true });
    initChar(char);
    if (statName in char.stats)            { char.stats[statName] = value; char.hp.max = calcMaxHP(char); }
    else if (statName in char.specialStats) { char.specialStats[statName] = value; }
    else return interaction.reply({ content: `❌ \`${statName}\` 스탯을 찾을 수 없습니다.`, ephemeral: true });
    saveJSON(CHAR_FILE, characters);
    return interaction.reply({ content: `✅ **${statName}** → **${value === Infinity ? '∞' : value}** 으로 수정되었습니다.` });
  }

  // ── 프로필수정 ───────────────────────────────────
  if (cmd === '프로필수정') {
    const field = interaction.options.getString('항목');
    const value = interaction.options.getString('값');
    const characters = loadJSON(CHAR_FILE);
    const char = characters[interaction.user.id];
    if (!char) return interaction.reply({ content: '❌ 등록된 캐릭터가 없습니다.', ephemeral: true });
    const fieldMap = { '닉네임': 'nickname', '종족': 'race', '직업': 'job' };
    const old = char[fieldMap[field]];
    char[fieldMap[field]] = value;
    saveJSON(CHAR_FILE, characters);
    return interaction.reply({ content: `✅ **${field}** 변경: **${old}** → **${value}**` });
  }

  // ── 소속변경 ─────────────────────────────────────
  if (cmd === '소속변경') {
    const newAff = interaction.options.getString('소속');
    const characters = loadJSON(CHAR_FILE);
    const char = characters[interaction.user.id];
    if (!char) return interaction.reply({ content: '❌ 등록된 캐릭터가 없습니다.', ephemeral: true });
    const old = char.affiliation || '미등록';
    char.affiliation = newAff; saveJSON(CHAR_FILE, characters);
    return interaction.reply({ content: `✅ 소속 변경: **${old}** → **${newAff}**` });
  }

  // ── 분배 ─────────────────────────────────────────
  if (cmd === '분배') {
    const statName = interaction.options.getString('스탯');
    const amount   = interaction.options.getInteger('값');
    const characters = loadJSON(CHAR_FILE);
    const char = characters[interaction.user.id];
    if (!char) return interaction.reply({ content: '❌ 등록된 캐릭터가 없습니다.', ephemeral: true });
    initChar(char);
    if ((char.statPoints ?? 0) <= 0) return interaction.reply({ content: '❌ 분배 가능한 능력치가 없습니다.', ephemeral: true });
    if (amount > char.statPoints)    return interaction.reply({ content: `❌ 분배 가능 능력치 부족 (보유: **${char.statPoints}** 점)`, ephemeral: true });
    if (statName in char.stats) {
      char.stats[statName] += amount; char.statPoints -= amount; char.hp.max = calcMaxHP(char);
      saveJSON(CHAR_FILE, characters);
      return interaction.reply({ content: `✅ **${statName}** +${amount} → **${char.stats[statName]}**\n남은 포인트: **${char.statPoints}** 점` });
    } else if (statName in char.specialStats) {
      char.specialStats[statName] += amount; char.statPoints -= amount;
      saveJSON(CHAR_FILE, characters);
      return interaction.reply({ content: `✅ 특수 스탯 **${statName}** +${amount} → **${char.specialStats[statName]}**\n남은 포인트: **${char.statPoints}** 점` });
    }
    return interaction.reply({ content: `❌ \`${statName}\` 스탯을 찾을 수 없습니다.`, ephemeral: true });
  }

  // ── 처치 ─────────────────────────────────────────
  if (cmd === '처치') {
    const enemyLevel = interaction.options.getInteger('레벨');
    const characters = loadJSON(CHAR_FILE);
    const char = characters[interaction.user.id];
    if (!char) return interaction.reply({ content: '❌ 등록된 캐릭터가 없습니다.', ephemeral: true });
    initChar(char);
    char.exp += enemyLevel;
    const lines = [`⚔️ Lv.${enemyLevel} 적 처치! 경험치 **+${enemyLevel}** 획득`];
    while (char.exp >= requiredExp(char.level)) {
      char.exp -= requiredExp(char.level); char.level++; char.statPoints += 5;
      char.hp.max = calcMaxHP(char); char.hp.current = Math.min(char.hp.current, char.hp.max);
      lines.push(`🎉 **레벨 업!** → Lv.**${char.level}**  분배 가능 능력치 +5`);
    }
    lines.push(`📊 경험치: ${char.exp} / ${requiredExp(char.level)}`);
    saveJSON(CHAR_FILE, characters);
    return interaction.reply({ content: lines.join('\n') });
  }

  // ── 운명점 ───────────────────────────────────────
  if (cmd === '운명점') {
    const action = interaction.options.getString('행동');
    const amount = interaction.options.getInteger('값');
    const characters = loadJSON(CHAR_FILE);
    const char = characters[interaction.user.id];
    if (!char) return interaction.reply({ content: '❌ 등록된 캐릭터가 없습니다.', ephemeral: true });
    initChar(char);
    const fate = char.fatePoints;
    let msg;
    if (action === '사용')      { fate.current = Math.max(0, fate.current - amount); msg = `⭐ 운명점 ${amount}점 사용!`; }
    else if (action === '회복') { fate.current += amount; msg = `⭐ 운명점 ${amount}점 회복!`; }
    else                        { fate.current = Math.max(0, amount); msg = `⭐ 운명점 ${amount}점으로 설정!`; }
    saveJSON(CHAR_FILE, characters);
    return interaction.reply({ content: `${msg}  현재: ${fate.current}/${fate.max}` });
  }

  // ── 스킬/특성 추가·제거 ──────────────────────────
  if (['스킬추가','스킬제거','특성추가','특성제거'].includes(cmd)) {
    const isSkill = cmd.startsWith('스킬'), isAdd = cmd.endsWith('추가');
    const listKey = isSkill ? 'skills' : 'traits', label = isSkill ? '스킬' : '특성';
    const item    = interaction.options.getString('이름');
    const characters = loadJSON(CHAR_FILE);
    const char = characters[interaction.user.id];
    if (!char) return interaction.reply({ content: '❌ 등록된 캐릭터가 없습니다.', ephemeral: true });
    char[listKey] = char[listKey] || [];
    if (isAdd) {
      if (char[listKey].includes(item)) return interaction.reply({ content: `⚠️ 이미 등록된 ${label}입니다.`, ephemeral: true });
      char[listKey].push(item); saveJSON(CHAR_FILE, characters);
      return interaction.reply({ content: `✅ ${label} **${item}** 추가됨!` });
    } else {
      if (!char[listKey].includes(item)) return interaction.reply({ content: `❌ **${item}** ${label}을(를) 찾을 수 없습니다.`, ephemeral: true });
      char[listKey] = char[listKey].filter(x => x !== item); saveJSON(CHAR_FILE, characters);
      return interaction.reply({ content: `🗑️ ${label} **${item}** 제거됨.` });
    }
  }

  // ── 특수스탯 ─────────────────────────────────────
  if (cmd === '특수스탯추가') {
    const spName = interaction.options.getString('이름');
    const rawVal = interaction.options.getString('값');
    const spVal  = rawVal === '무한' ? Infinity : parseInt(rawVal, 10);
    if (isNaN(spVal)) return interaction.reply({ content: '❌ 값은 숫자 또는 `무한` 으로 입력해주세요.', ephemeral: true });
    const characters = loadJSON(CHAR_FILE); const char = characters[interaction.user.id];
    if (!char) return interaction.reply({ content: '❌ 등록된 캐릭터가 없습니다.', ephemeral: true });
    char.specialStats = char.specialStats || {};
    if (spName in char.specialStats) return interaction.reply({ content: `⚠️ 이미 등록된 특수 스탯입니다.`, ephemeral: true });
    char.specialStats[spName] = spVal; saveJSON(CHAR_FILE, characters);
    return interaction.reply({ content: `✅ 특수 스탯 **${spName}** (${spVal === Infinity ? '∞' : spVal}) 추가됨!` });
  }
  if (cmd === '특수스탯제거') {
    const spName = interaction.options.getString('이름');
    const characters = loadJSON(CHAR_FILE); const char = characters[interaction.user.id];
    if (!char) return interaction.reply({ content: '❌ 등록된 캐릭터가 없습니다.', ephemeral: true });
    char.specialStats = char.specialStats || {};
    if (!(spName in char.specialStats)) return interaction.reply({ content: `❌ 특수 스탯을 찾을 수 없습니다.`, ephemeral: true });
    delete char.specialStats[spName]; saveJSON(CHAR_FILE, characters);
    return interaction.reply({ content: `🗑️ 특수 스탯 **${spName}** 제거됨.` });
  }

  // ── 판정 ─────────────────────────────────────────
  if (cmd === '판정') {
    const sub = interaction.options.getSubcommand();
    const characters = loadJSON(CHAR_FILE); const char = characters[interaction.user.id];
    if (!char) return interaction.reply({ content: '❌ 등록된 캐릭터가 없습니다.', ephemeral: true });
    initChar(char);
    let embed;
    const fmtRolls = (rolls, picked) => rolls.map(r => r === picked ? `**${r}**` : `${r}`).join(', ');
    if (sub === '방어') {
      const stat = effStat(char, '체력'), bonus = calcBonus(stat);
      const { rolls, picked, count } = rollProficiency(stat);
      const total = Math.round((picked + bonus) * 10) / 10;
      embed = new EmbedBuilder().setTitle('🛡️ 방어 판정').setColor(0x3498DB)
        .setDescription(`**결과: ${total}**\nd20×${count} → [${fmtRolls(rolls, picked)}] → **${picked}** + (체력 ${stat}/2 = ${fmtBonus(bonus)})`);
    } else if (sub === '회피') {
      const stat = effStat(char, '민첩'), bonus = calcBonus(stat);
      const { rolls, picked, count } = rollProficiency(stat);
      const total = Math.round((picked + bonus) * 10) / 10;
      embed = new EmbedBuilder().setTitle('💨 회피 판정').setColor(0x1ABC9C)
        .setDescription(`**결과: ${total}**\nd20×${count} → [${fmtRolls(rolls, picked)}] → **${picked}** + (민첩 ${stat}/2 = ${fmtBonus(bonus)})`);
    } else if (sub === '일반' || sub === '공격') {
      const statName = interaction.options.getString('능력치');
      const stat = effStat(char, statName);
      if (stat === 0 && !(statName in char.stats) && !(statName in char.specialStats))
        return interaction.reply({ content: `❌ \`${statName}\` 스탯을 찾을 수 없습니다.`, ephemeral: true });
      const bonus = calcBonus(stat);
      const { rolls, picked, count } = rollProficiency(stat);
      const total = Math.round((picked + bonus) * 10) / 10;
      embed = new EmbedBuilder()
        .setTitle(sub === '공격' ? '⚔️ 공격 판정' : '🎯 일반 판정').setColor(0xE67E22)
        .addFields(
          { name: `🎲 d20 × ${count} (숙련도 스택)`, value: `[${fmtRolls(rolls, picked)}] → **${picked}**`, inline: false },
          { name: '➕ 보너스', value: `${fmtBonus(bonus)} (${statName} ${stat}/2)`, inline: true },
          { name: '📊 합계',   value: `**${total}**`,                inline: true },
        );
    } else if (sub === '데미지') {
      const statName = interaction.options.getString('능력치');
      const diceStr  = interaction.options.getString('주사위');
      const match    = diceStr.match(/^(\d+)[dD](\d+)$/);
      if (!match) return interaction.reply({ content: '❌ 주사위 형식 오류. 예) `2d6`', ephemeral: true });
      const stat = effStat(char, statName);
      const baseCount = parseInt(match[1]), sides = parseInt(match[2]);
      const rolls = rollExploding(baseCount, sides);
      const exploded = rolls.length > baseCount;
      const dtotal = rolls.reduce((a,b) => a+b, 0);
      const final = dtotal + stat;     // 무기 + 능력치 원본
      embed = new EmbedBuilder().setTitle('💥 데미지 판정').setColor(0xE74C3C)
        .addFields(
          { name: `🎲 ${diceStr}${exploded ? ' 💥 폭발!' : ''}`, value: `${rolls.join(' + ')} = **${dtotal}**`,      inline: false },
          { name: '➕ 능력치 원본', value: `+${stat} (${statName})`,         inline: true  },
          { name: '💥 총 데미지',  value: `**${final}**`,                    inline: true  },
        );
    }
    if (embed) { embed.setFooter({ text: `${char.nickname}의 판정` }); return interaction.reply({ embeds: [embed] }); }
  }

  // ── 인벤토리 ─────────────────────────────────────
  if (cmd === '인벤') {
    const targetUser   = interaction.options.getUser('유저');
    const targetMember = targetUser ? await interaction.guild.members.fetch(targetUser.id).catch(() => null) : member;
    const inventory = loadJSON(INV_FILE); const items = inventory[targetMember.id] || {};
    const entries = Object.entries(items);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🎒 ${targetMember.displayName}의 인벤토리`).setColor(0xE67E22)
      .setDescription(entries.length ? entries.map(([n,c]) => c > 1 ? `• **${n}** × ${c}` : `• **${n}**`).join('\n') : '비어있습니다.')] });
  }
  if (cmd === '아이템추가') {
    const name  = interaction.options.getString('이름');
    const count = interaction.options.getInteger('개수') ?? 1;
    const inventory = loadJSON(INV_FILE);
    if (!inventory[interaction.user.id]) inventory[interaction.user.id] = {};
    inventory[interaction.user.id][name] = (inventory[interaction.user.id][name] || 0) + count;
    saveJSON(INV_FILE, inventory);
    return interaction.reply({ content: `✅ **${name}** ${count}개 추가됨! (보유: ${inventory[interaction.user.id][name]}개)` });
  }
  if (cmd === '아이템제거') {
    const name  = interaction.options.getString('이름');
    const count = interaction.options.getInteger('개수') ?? 1;
    const inventory = loadJSON(INV_FILE); const items = inventory[interaction.user.id] || {};
    if (!items[name]) return interaction.reply({ content: `❌ **${name}** 아이템을 찾을 수 없습니다.`, ephemeral: true });
    items[name] -= count;
    let msg;
    if (items[name] <= 0) { delete items[name]; msg = `🗑️ **${name}** 제거됨.`; }
    else msg = `🗑️ **${name}** ${count}개 제거됨. (남은 수량: ${items[name]})`;
    saveJSON(INV_FILE, inventory);
    return interaction.reply({ content: msg });
  }

  // ── 미션 ─────────────────────────────────────────
  if (cmd === '미션') {
    const missions = loadJSON(MISSION_FILE), missionId = interaction.options.getString('id');
    if (!Object.keys(missions).length) return interaction.reply({ content: '📋 등록된 미션이 없습니다.', ephemeral: true });
    if (missionId) {
      const m = missions[missionId];
      if (!m) return interaction.reply({ content: `❌ 미션 ID \`${missionId}\`를 찾을 수 없습니다.`, ephemeral: true });
      if (m.personal && !isGM(member) && !m.targets?.includes(interaction.user.id))
        return interaction.reply({ content: '❌ 이 미션을 볼 권한이 없습니다.', ephemeral: true });
      return interaction.reply({ embeds: [missionEmbed(missionId, m)] });
    }
    const embed = new EmbedBuilder().setTitle('📋 미션 목록').setColor(0xE74C3C);
    Object.entries(missions).sort(([a],[b]) => Number(a)-Number(b)).forEach(([mid, m]) => {
      if (m.personal && !isGM(member) && !m.targets?.includes(interaction.user.id)) return;
      embed.addFields({ name: `[${mid}] ${m.title}${m.personal?' 🔒':''}`, value: `${m.subtitle}  |  ${m.active?'🟢':'🔴'}`, inline: false });
    });
    return interaction.reply({ embeds: [embed] });
  }
  if (cmd === '미션등록') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const modal = new ModalBuilder().setCustomId('mission_modal').setTitle('미션 등록');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('제목').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('subtitle').setLabel('부제목').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('설명').setStyle(TextInputStyle.Paragraph).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reward').setLabel('보상').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('personal').setLabel('개인 미션? (예 / 아니오)').setStyle(TextInputStyle.Short).setPlaceholder('아니오').setRequired(true)),
    );
    return interaction.showModal(modal);
  }
  if (cmd === '미션수정') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const missionId = interaction.options.getString('id'); const missions = loadJSON(MISSION_FILE);
    if (!missions[missionId]) return interaction.reply({ content: `❌ 미션 ID \`${missionId}\`를 찾을 수 없습니다.`, ephemeral: true });
    const field = interaction.options.getString('항목');
    const newVal = interaction.options.getString('값');
    const fieldMap = { '제목': 'title', '부제목': 'subtitle', '설명': 'description', '보상': 'reward' };
    if (!fieldMap[field]) return interaction.reply({ content: `❌ 수정 가능 항목: 제목/부제목/설명/보상`, ephemeral: true });
    missions[missionId][fieldMap[field]] = newVal; saveJSON(MISSION_FILE, missions);
    return interaction.reply({ content: `✅ **${field}** 수정 완료!`, embeds: [missionEmbed(missionId, missions[missionId])] });
  }
  if (cmd === '미션완료') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const missionId = interaction.options.getString('id'); const missions = loadJSON(MISSION_FILE);
    if (!missions[missionId]) return interaction.reply({ content: `❌ 미션 ID \`${missionId}\`를 찾을 수 없습니다.`, ephemeral: true });
    missions[missionId].active = false; saveJSON(MISSION_FILE, missions);
    return interaction.reply({ content: `✅ 미션 **${missions[missionId].title}** 완료 처리 🔴` });
  }
  if (cmd === '미션삭제') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const missionId = interaction.options.getString('id'); const missions = loadJSON(MISSION_FILE);
    if (!missions[missionId]) return interaction.reply({ content: `❌ 미션 ID \`${missionId}\`를 찾을 수 없습니다.`, ephemeral: true });
    const title = missions[missionId].title; delete missions[missionId]; saveJSON(MISSION_FILE, missions);
    return interaction.reply({ content: `🗑️ 미션 **${title}** 삭제됨.` });
  }

  // ── NPC ──────────────────────────────────────────
  if (cmd === 'npc') {
    const npcs = loadJSON(NPC_FILE), npcId = interaction.options.getString('id');
    if (!Object.keys(npcs).length) return interaction.reply({ content: '📋 등록된 NPC가 없습니다.', ephemeral: true });
    if (npcId) {
      if (!npcs[npcId]) return interaction.reply({ content: `❌ NPC ID \`${npcId}\`를 찾을 수 없습니다.`, ephemeral: true });
      return interaction.reply({ embeds: [npcEmbed(npcId, npcs[npcId])] });
    }
    const embed = new EmbedBuilder().setTitle('👥 NPC 목록').setColor(0x95A5A6);
    Object.entries(npcs).sort(([a],[b]) => Number(a)-Number(b)).forEach(([nid, n]) => {
      embed.addFields({ name: `[${nid}] ${n.name}${n.hasLevel ? ` Lv.${n.level}` : ''}`, value: `${n.race||'미등록'} / ${n.job||'미등록'}`, inline: false });
    });
    return interaction.reply({ embeds: [embed] });
  }
  if (cmd === 'npc등록') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const modal = new ModalBuilder().setCustomId('npc_modal_1').setTitle('NPC 등록 (1/2) — 기본 정보');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('NPC 이름').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('race').setLabel('종족 (없으면 빈칸)').setStyle(TextInputStyle.Short).setRequired(false)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('job').setLabel('직업 (없으면 빈칸)').setStyle(TextInputStyle.Short).setRequired(false)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('affiliation').setLabel('소속 (없으면 빈칸)').setStyle(TextInputStyle.Short).setRequired(false)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('level').setLabel('레벨 (없으면 빈칸)').setStyle(TextInputStyle.Short).setRequired(false)),
    );
    return interaction.showModal(modal);
  }
  if (cmd === 'npc체력') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const npcId = interaction.options.getString('id'), action = interaction.options.getString('행동'), amount = interaction.options.getInteger('값');
    const npcs = loadJSON(NPC_FILE);
    if (!npcs[npcId]) return interaction.reply({ content: `❌ NPC ID \`${npcId}\`를 찾을 수 없습니다.`, ephemeral: true });
    const npc = npcs[npcId]; if (!npc.hp) npc.hp = { current: 0, max: npcMaxHP(npc) };
    const before = npc.hp.current;
    if (action === '하락')       npc.hp.current = Math.max(0, npc.hp.current - amount);
    else if (action === '회복')  npc.hp.current = Math.min(npc.hp.max, npc.hp.current + amount);
    else                         npc.hp.current = Math.max(0, Math.min(npc.hp.max, amount));
    saveJSON(NPC_FILE, npcs);
    const diff = npc.hp.current - before;
    // 전투 대시보드 갱신
    const combatData = loadJSON(COMBAT_FILE);
    const cs = combatData[interaction.guild.id];
    if (cs?.active) await updateCombatDashboard(interaction.guild.id, interaction.channel);
    return interaction.reply({ content: `❤️ **${npc.name}** 체력: **${before}** → **${npc.hp.current}** / ${npc.hp.max}  (${diff >= 0 ? '+' : ''}${diff})\n${makeHPBar(npc.hp.current, npc.hp.max)}` });
  }
  if (cmd === 'npc삭제') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const npcId = interaction.options.getString('id'); const npcs = loadJSON(NPC_FILE);
    if (!npcs[npcId]) return interaction.reply({ content: `❌ NPC ID \`${npcId}\`를 찾을 수 없습니다.`, ephemeral: true });
    const name = npcs[npcId].name; delete npcs[npcId]; saveJSON(NPC_FILE, npcs);
    return interaction.reply({ content: `🗑️ NPC **${name}** 삭제됨.` });
  }
  if (cmd === 'npc수정') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const npcId  = interaction.options.getString('id');
    const field  = interaction.options.getString('항목');
    const rawVal = interaction.options.getString('값');
    const npcs   = loadJSON(NPC_FILE);
    if (!npcs[npcId]) return interaction.reply({ content: `❌ NPC ID \`${npcId}\`를 찾을 수 없습니다.`, ephemeral: true });
    const npc = npcs[npcId];
    let resultMsg = '';
    if (field === '이름')        { resultMsg = `📝 이름 → **${rawVal}**`;                npc.name = rawVal; }
    else if (field === '종족')   { resultMsg = `📝 종족 → **${rawVal}**`;                npc.race = rawVal; }
    else if (field === '직업')   { resultMsg = `📝 직업 → **${rawVal}**`;                npc.job  = rawVal; }
    else if (field === '소속')   { resultMsg = `🏠 소속 → **${rawVal}**`;                npc.affiliation = rawVal; }
    else if (field === '메모')   { resultMsg = `📋 메모 수정됨`;                          npc.description = rawVal; }
    else if (field === '레벨')   {
      const lv = parseInt(rawVal, 10);
      if (isNaN(lv) || lv < 1) return interaction.reply({ content: '❌ 레벨은 1 이상의 숫자여야 합니다.', ephemeral: true });
      resultMsg = `🏅 레벨 → **${lv}**`; npc.level = lv; npc.hasLevel = true;
    } else if (field === '스탯') {
      const parts = rawVal.trim().split(/\s+/);
      const statName = parts[0], statVal = parseInt(parts[1], 10);
      if (!statName || isNaN(statVal)) return interaction.reply({ content: '❌ 형식: `스탯이름 숫자`', ephemeral: true });
      npc.stats = npc.stats || {};
      npc.stats[statName] = statVal;
      if (statName === '체력') { npc.hp = npc.hp || {}; npc.hp.max = statVal * 4; npc.hp.current = Math.min(npc.hp.current ?? npc.hp.max, npc.hp.max); }
      resultMsg = `📈 스탯 **${statName}** → **${statVal}**`;
    } else if (field === '특수스탯') {
      const parts = rawVal.trim().split(/\s+/);
      const statName = parts[0], statVal = parseInt(parts[1], 10);
      if (!statName || isNaN(statVal)) return interaction.reply({ content: '❌ 형식: `스탯이름 숫자`', ephemeral: true });
      npc.specialStats = npc.specialStats || {};
      npc.specialStats[statName] = statVal;
      resultMsg = `🔷 특수 스탯 **${statName}** → **${statVal}**`;
    } else if (field === '스킬추가') { npc.skills = npc.skills || []; if (!npc.skills.includes(rawVal)) { npc.skills.push(rawVal); resultMsg = `⚔️ 스킬 추가: **${rawVal}**`; } else return interaction.reply({ content: `⚠️ 이미 등록된 스킬입니다.`, ephemeral: true });
    } else if (field === '스킬제거') { npc.skills = (npc.skills || []).filter(s => s !== rawVal); resultMsg = `⚔️ 스킬 제거: **${rawVal}**`;
    } else if (field === '특성추가') { npc.traits = npc.traits || []; if (!npc.traits.includes(rawVal)) { npc.traits.push(rawVal); resultMsg = `🔮 특성 추가: **${rawVal}**`; } else return interaction.reply({ content: `⚠️ 이미 등록된 특성입니다.`, ephemeral: true });
    } else if (field === '특성제거') { npc.traits = (npc.traits || []).filter(t => t !== rawVal); resultMsg = `🔮 특성 제거: **${rawVal}**`; }
    saveJSON(NPC_FILE, npcs);
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🛠️ NPC 수정 완료').setColor(0x95A5A6)
      .setDescription(`**[NPC-${npcId}] ${npc.name}** 수정됨`)
      .addFields({ name: '변경 내용', value: resultMsg })
      .setFooter({ text: `수정자: ${member.displayName}` })] });
    return interaction.followUp({ embeds: [npcEmbed(npcId, npc)] });
  }

  // ── GM 관리 ──────────────────────────────────────
  if (cmd === '레벨업') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const targetUser = interaction.options.getUser('유저');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) return interaction.reply({ content: '❌ 유저를 찾을 수 없습니다.', ephemeral: true });
    const characters = loadJSON(CHAR_FILE); const char = characters[targetMember.id];
    if (!char) return interaction.reply({ content: `❌ 캐릭터가 없습니다.`, ephemeral: true });
    initChar(char); char.level++; char.statPoints += 5; saveJSON(CHAR_FILE, characters);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🎉 레벨 업!').setColor(0xF1C40F)
      .setDescription(`**${char.nickname}** 의 레벨이 올랐습니다!`)
      .addFields({ name: '🏅 레벨', value: `Lv. **${char.level}**`, inline: true }, { name: '✨ 분배 가능 능력치', value: `**${char.statPoints}** 점`, inline: true })
      .setFooter({ text: `${targetMember.displayName}` })] });
  }
  if (cmd === 'gm수정') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const targetUser = interaction.options.getUser('유저');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const fieldName = interaction.options.getString('항목'), rawVal = interaction.options.getString('값');
    const characters = loadJSON(CHAR_FILE); const char = characters[targetMember.id];
    if (!char) return interaction.reply({ content: `❌ 캐릭터가 없습니다.`, ephemeral: true });
    initChar(char); let resultMsg = '';
    if (fieldName === '소속') { char.affiliation = rawVal; resultMsg = `🏠 **소속** → **${rawVal}**`; }
    else {
      const value = parseInt(rawVal, 10);
      if (isNaN(value)) return interaction.reply({ content: `❌ 숫자 값이 필요합니다.`, ephemeral: true });
      if (fieldName === '레벨')           { char.level = Math.max(1, value);                                  resultMsg = `🏅 **레벨** → **${value}**`; }
      else if (fieldName === '경험치')    { char.exp = Math.max(0, value);                                    resultMsg = `📊 **경험치** → **${value}**`; }
      else if (fieldName === '분배포인트') { char.statPoints = Math.max(0, value);                            resultMsg = `✨ **분배 포인트** → **${value}**`; }
      else if (fieldName === '운명점현재') { char.fatePoints.current = Math.max(0, value);                    resultMsg = `⭐ **운명점 현재** → **${value}**`; }
      else if (fieldName === '운명점최대') { char.fatePoints.max = Math.max(1, value);                        resultMsg = `⭐ **운명점 최대** → **${value}**`; }
      else if (fieldName === '체력현재')  { char.hp.current = Math.max(0, Math.min(char.hp.max, value));      resultMsg = `❤️ **현재 체력** → **${char.hp.current}**`; }
      else if (fieldName in char.stats)          { char.stats[fieldName] = value; char.hp.max = calcMaxHP(char); resultMsg = `📈 **${fieldName}** → **${value}**`; }
      else if (fieldName in char.specialStats)   { char.specialStats[fieldName] = value;                     resultMsg = `🔷 특수 스탯 **${fieldName}** → **${value}**`; }
      else return interaction.reply({ content: `❌ \`${fieldName}\` 항목을 찾을 수 없습니다.`, ephemeral: true });
    }
    saveJSON(CHAR_FILE, characters);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🛠️ GM 수정').setColor(0xE74C3C)
      .setDescription(`**${char.nickname}** (${targetMember.displayName}) 수정 완료`)
      .addFields({ name: '변경 내용', value: resultMsg })
      .setFooter({ text: `수정자: ${member.displayName}` })] });
  }
  if (cmd === 'gm체력') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const targetUser = interaction.options.getUser('유저');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const action = interaction.options.getString('행동'), amount = interaction.options.getInteger('값');
    const characters = loadJSON(CHAR_FILE); const char = characters[targetMember.id];
    if (!char) return interaction.reply({ content: '❌ 캐릭터가 없습니다.', ephemeral: true });
    initChar(char); const before = char.hp.current;
    if (action === '하락')      char.hp.current = Math.max(0, char.hp.current - amount);
    else if (action === '회복') char.hp.current = Math.min(char.hp.max, char.hp.current + amount);
    else                        char.hp.current = Math.max(0, Math.min(char.hp.max, amount));
    saveJSON(CHAR_FILE, characters);
    const diff = char.hp.current - before;
    // 전투 대시보드 갱신
    const combatData = loadJSON(COMBAT_FILE);
    const cs = combatData[interaction.guild.id];
    if (cs?.active) await updateCombatDashboard(interaction.guild.id, interaction.channel);
    return interaction.reply({ content: `❤️ **${char.nickname}** 체력: **${before}** → **${char.hp.current}** / ${char.hp.max}  (${diff >= 0 ? '+' : ''}${diff})\n${makeHPBar(char.hp.current, char.hp.max)}` });
  }
  if (cmd === 'gm임시스탯') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const targetUser = interaction.options.getUser('유저');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const statName = interaction.options.getString('스탯'), value = interaction.options.getInteger('값');
    const characters = loadJSON(CHAR_FILE); const char = characters[targetMember.id];
    if (!char) return interaction.reply({ content: '❌ 캐릭터가 없습니다.', ephemeral: true });
    initChar(char);
    if (!(statName in char.stats) && !(statName in char.specialStats))
      return interaction.reply({ content: `❌ \`${statName}\` 스탯을 찾을 수 없습니다.`, ephemeral: true });
    char.tempStats[statName] = value;
    if (statName === '체력') { char.hp.max = calcMaxHP(char); char.hp.current = Math.min(char.hp.current, char.hp.max); }
    saveJSON(CHAR_FILE, characters);
    const base = char.stats[statName] ?? char.specialStats[statName] ?? 0;
    return interaction.reply({ content: value === 0
      ? `✅ **${char.nickname}** 의 **${statName}** 임시 변동 초기화 → **${base}**`
      : `✅ **${char.nickname}** 의 **${statName}**: **${base}** → **${base + value}** (${value >= 0 ? '+' : ''}${value} 임시)` });
  }
  for (const [gcmd, listKey, label] of [['gm스킬추가','skills','스킬'],['gm스킬제거','skills','스킬'],['gm특성추가','traits','특성'],['gm특성제거','traits','특성']]) {
    if (cmd !== gcmd) continue;
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const targetUser = interaction.options.getUser('유저');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const itemName = interaction.options.getString('이름'), isAdd = gcmd.endsWith('추가');
    const characters = loadJSON(CHAR_FILE); const char = characters[targetMember.id];
    if (!char) return interaction.reply({ content: '❌ 캐릭터가 없습니다.', ephemeral: true });
    char[listKey] = char[listKey] || [];
    if (isAdd) {
      if (char[listKey].includes(itemName)) return interaction.reply({ content: `⚠️ 이미 보유한 ${label}입니다.`, ephemeral: true });
      char[listKey].push(itemName); saveJSON(CHAR_FILE, characters);
      return interaction.reply({ content: `✅ **${char.nickname}** — ${label} **${itemName}** 추가됨` });
    } else {
      if (!char[listKey].includes(itemName)) return interaction.reply({ content: `❌ 보유하지 않은 ${label}입니다.`, ephemeral: true });
      char[listKey] = char[listKey].filter(x => x !== itemName); saveJSON(CHAR_FILE, characters);
      return interaction.reply({ content: `🗑️ **${char.nickname}** — ${label} **${itemName}** 제거됨` });
    }
  }
  if (cmd === 'gm특수스탯추가') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const targetUser = interaction.options.getUser('유저');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const spName = interaction.options.getString('이름'), spVal = interaction.options.getInteger('값');
    const characters = loadJSON(CHAR_FILE); const char = characters[targetMember.id];
    if (!char) return interaction.reply({ content: '❌ 캐릭터가 없습니다.', ephemeral: true });
    char.specialStats = char.specialStats || {};
    if (spName in char.specialStats) return interaction.reply({ content: `⚠️ 이미 보유한 특수 스탯입니다.`, ephemeral: true });
    char.specialStats[spName] = spVal; saveJSON(CHAR_FILE, characters);
    return interaction.reply({ content: `✅ **${char.nickname}** — 특수 스탯 **${spName}**(${spVal}) 추가됨` });
  }
  if (cmd === 'gm특수스탯제거') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const targetUser = interaction.options.getUser('유저');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const spName = interaction.options.getString('이름');
    const characters = loadJSON(CHAR_FILE); const char = characters[targetMember.id];
    if (!char) return interaction.reply({ content: '❌ 캐릭터가 없습니다.', ephemeral: true });
    char.specialStats = char.specialStats || {};
    if (!(spName in char.specialStats)) return interaction.reply({ content: `❌ 보유하지 않은 특수 스탯입니다.`, ephemeral: true });
    delete char.specialStats[spName]; saveJSON(CHAR_FILE, characters);
    return interaction.reply({ content: `🗑️ **${char.nickname}** — 특수 스탯 **${spName}** 제거됨` });
  }

  // ── 설명등록 ─────────────────────────────────────
  if (cmd === '설명등록') {
    const type = interaction.options.getString('종류');
    const desc = interaction.options.getString('설명');
    const name = interaction.options.getString('이름') ?? null;
    const characters = loadJSON(CHAR_FILE);
    const char = characters[interaction.user.id];
    if (!char) return interaction.reply({ content: '❌ 등록된 캐릭터가 없습니다.', ephemeral: true });
    char.descriptions = char.descriptions ?? {};
    if (type === '소속') {
      char.descriptions['소속'] = { '소속': desc };
      saveJSON(CHAR_FILE, characters);
      return interaction.reply({ content: `✅ **소속** 설명 등록 완료!\n> ${desc}` });
    }
    if (!name) return interaction.reply({ content: `❌ \`이름\` 옵션을 입력해주세요.`, ephemeral: true });
    const typeKeyMap = { '스킬': 'skills', '특성': 'traits', '특수스탯': 'specialStats' };
    const listKey = typeKeyMap[type];
    const exists  = type === '특수스탯' ? name in (char.specialStats || {}) : (char[listKey] || []).includes(name);
    if (!exists) return interaction.reply({ content: `❌ **${name}** 은(는) 등록되지 않은 ${type}입니다.`, ephemeral: true });
    char.descriptions[type] = char.descriptions[type] ?? {};
    char.descriptions[type][name] = desc;
    saveJSON(CHAR_FILE, characters);
    return interaction.reply({ content: `✅ **[${type}] ${name}** 설명 등록 완료!\n> ${desc}` });
  }

  // ── 세부사항 ─────────────────────────────────────
  if (cmd === '세부사항') {
    const type       = interaction.options.getString('종류');
    const name       = interaction.options.getString('이름') ?? null;
    const targetUser = interaction.options.getUser('유저') ?? null;
    const targetMember = targetUser ? await interaction.guild.members.fetch(targetUser.id).catch(() => null) : member;
    const characters = loadJSON(CHAR_FILE);
    const char = characters[targetMember.id];
    if (!char) return interaction.reply({ content: '❌ 등록된 캐릭터가 없습니다.', ephemeral: true });
    const descs  = char.descriptions ?? {};
    const icons  = { '스킬': '⚔️', '특성': '🔮', '특수스탯': '🔷', '소속': '🏠' };
    const icon   = icons[type];
    if (type === '소속') {
      const affDesc = descs['소속']?.['소속'];
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`${icon} 소속 세부사항`).setColor(0x3498DB)
        .addFields({ name: `🏠 ${char.affiliation || '미등록'}`, value: affDesc ?? '*(설명 없음)*', inline: false })
        .setFooter({ text: char.nickname })] });
    }
    const typeKeyMap = { '스킬': 'skills', '특성': 'traits', '특수스탯': 'specialStats' };
    const listKey    = typeKeyMap[type];
    if (name) {
      const exists = type === '특수스탯' ? name in (char.specialStats || {}) : (char[listKey] || []).includes(name);
      if (!exists) return interaction.reply({ content: `❌ **${name}** 은(는) 등록되지 않은 ${type}입니다.`, ephemeral: true });
      const itemDesc = descs[type]?.[name];
      const embed = new EmbedBuilder().setTitle(`${icon} [${type}] ${name}`).setColor(0x3498DB)
        .setDescription(itemDesc ?? '*(설명 없음)*').setFooter({ text: char.nickname });
      if (type === '특수스탯') embed.addFields({ name: '📊 현재 값', value: `**${char.specialStats[name]}**`, inline: true });
      return interaction.reply({ embeds: [embed] });
    }
    const items = type === '특수스탯' ? Object.keys(char.specialStats || {}) : (char[listKey] || []);
    if (!items.length) return interaction.reply({ content: `❌ 등록된 ${type}이(가) 없습니다.`, ephemeral: true });
    const embed = new EmbedBuilder().setTitle(`${icon} ${char.nickname}의 ${type} 목록`).setColor(0x3498DB)
      .setFooter({ text: `상세 보기: /세부사항 ${type} [이름]` });
    for (const item of items) {
      const valStr = type === '특수스탯' ? `  *(현재: ${char.specialStats[item]})*` : '';
      embed.addFields({ name: `${item}${valStr}`, value: descs[type]?.[item] ?? '*(설명 없음)*', inline: false });
    }
    return interaction.reply({ embeds: [embed] });
  }

  // ── gm설명등록 ───────────────────────────────────
  if (cmd === 'gm설명등록') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const targetUser   = interaction.options.getUser('유저');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const type = interaction.options.getString('종류');
    const name = interaction.options.getString('이름');
    const desc = interaction.options.getString('설명');
    const characters = loadJSON(CHAR_FILE);
    const char = characters[targetMember.id];
    if (!char) return interaction.reply({ content: `❌ 캐릭터가 없습니다.`, ephemeral: true });
    const listKey = type === '스킬' ? 'skills' : 'traits';
    if (!(char[listKey] || []).includes(name))
      return interaction.reply({ content: `❌ **${char.nickname}** 은(는) **${name}** ${type}을(를) 보유하고 있지 않습니다.`, ephemeral: true });
    char.descriptions = char.descriptions ?? {};
    char.descriptions[type] = char.descriptions[type] ?? {};
    char.descriptions[type][name] = desc;
    saveJSON(CHAR_FILE, characters);
    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('📝 GM 설명 등록').setColor(0xE74C3C)
      .setDescription(`**${char.nickname}** (${targetMember.displayName})`)
      .addFields({ name: `${type === '스킬' ? '⚔️' : '🔮'} ${type}`, value: `**${name}**`, inline: true }, { name: '📋 설명', value: desc, inline: false })
      .setFooter({ text: `등록자: ${member.displayName}` })] });
  }

  // ══════════════════════════════════════════════════
  //  ⚔️ 전투 시스템
  // ══════════════════════════════════════════════════

  // ── 전투시작 ─────────────────────────────────────
  if (cmd === '전투시작') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });

    const guildId   = interaction.guild.id;
    const playerRaw = interaction.options.getString('플레이어') ?? '';
    const npcRaw    = interaction.options.getString('npc') ?? '';

    const combatData = loadJSON(COMBAT_FILE);
    if (combatData[guildId]?.active)
      return interaction.reply({ content: '❌ 이미 전투가 진행 중입니다. `/전투종료`로 먼저 종료해주세요.', ephemeral: true });

    // 플레이어 파싱 (mention)
    const mentionRe = /<@!?(\d+)>/g;
    const playerIds = [...playerRaw.matchAll(mentionRe)].map(m => m[1]);

    // NPC ID 파싱
    const npcIds = npcRaw ? npcRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (playerIds.length === 0 && npcIds.length === 0)
      return interaction.reply({ content: '❌ 참가자를 1명 이상 지정해주세요.', ephemeral: true });

    const characters = loadJSON(CHAR_FILE);
    const npcs       = loadJSON(NPC_FILE);
    const participants = [];

    for (const pid of playerIds) {
      const char = characters[pid];
      const name = char?.nickname ?? `플레이어(${pid})`;
      const initiative = rollDice(1, 20)[0];
      participants.push({ type: 'player', id: pid, name, initiative });
    }
    for (const nid of npcIds) {
      const npc = npcs[nid];
      if (!npc) continue;
      const initiative = rollDice(1, 20)[0];
      participants.push({ type: 'npc', id: nid, name: npc.name, initiative });
    }

    // 이니셔티브 순 정렬 (내림차순)
    participants.sort((a, b) => b.initiative - a.initiative);

    combatData[guildId] = {
      active: true,
      channelId: interaction.channel.id,
      round: 1,
      currentIndex: 0,
      participants,
      dashboardMsgId: null,
    };
    saveJSON(COMBAT_FILE, combatData);

    await interaction.reply({ content: `⚔️ **전투 시작!** 이니셔티브 굴림 완료.\n${participants.map((p,i) => `${i+1}. **${p.name}** — 🎲${p.initiative}`).join('\n')}` });

    const first = participants[0];
    const mention = first.type === 'player' ? `<@${first.id}>` : `**${first.name}**`;
    await interaction.followUp({ content: `\n⚔️ **라운드 1** — ${mention}의 턴입니다!` });

    await updateCombatDashboard(guildId, interaction.channel);
    setTurnTimeout(guildId, interaction.channel);
    return;
  }

  // ── 다음턴 ───────────────────────────────────────
  if (cmd === '다음턴') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const guildId = interaction.guild.id;
    const combatData = loadJSON(COMBAT_FILE);
    if (!combatData[guildId]?.active)
      return interaction.reply({ content: '❌ 진행 중인 전투가 없습니다.', ephemeral: true });
    await interaction.reply({ content: '✅ 다음 턴으로 넘어갑니다.' });
    clearTurnTimeout(guildId);
    await advanceTurn(guildId, interaction.channel);
  }

  // ── 전투현황 ─────────────────────────────────────
  if (cmd === '전투현황') {
    const guildId = interaction.guild.id;
    const combatData = loadJSON(COMBAT_FILE);
    const cs = combatData[guildId];
    if (!cs?.active) return interaction.reply({ content: '❌ 진행 중인 전투가 없습니다.', ephemeral: true });
    const characters = loadJSON(CHAR_FILE);
    const npcs       = loadJSON(NPC_FILE);
    return interaction.reply({ embeds: [buildCombatEmbed(cs, characters, npcs)] });
  }

  // ── 전투종료 ─────────────────────────────────────
  if (cmd === '전투종료') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const guildId = interaction.guild.id;
    clearTurnTimeout(guildId);
    const combatData = loadJSON(COMBAT_FILE);
    if (!combatData[guildId]?.active)
      return interaction.reply({ content: '❌ 진행 중인 전투가 없습니다.', ephemeral: true });
    const roundsPlayed = combatData[guildId].round;
    delete combatData[guildId];
    saveJSON(COMBAT_FILE, combatData);
    return interaction.reply({ content: `🏁 **전투 종료!** (총 ${roundsPlayed} 라운드)` });
  }

  // ── 공격 (Deadly Strike: 명중 격차 + 폭발 주사위 + 크리티컬 배수) ──
  if (cmd === '공격') {
    const targetRaw = interaction.options.getString('대상');
    const statName  = interaction.options.getString('능력치');
    const diceRaw   = interaction.options.getString('주사위') ?? '1d6';

    const characters = loadJSON(CHAR_FILE);
    const char = characters[interaction.user.id];
    if (!char) return interaction.reply({ content: '❌ 등록된 캐릭터가 없습니다.', ephemeral: true });
    initChar(char);

    const atkStat = effStat(char, statName);
    if (atkStat === 0 && !(statName in char.stats) && !(statName in char.specialStats))
      return interaction.reply({ content: `❌ \`${statName}\` 스탯을 찾을 수 없습니다.`, ephemeral: true });

    const fmtRolls = (rolls, picked) => rolls.map(r => r === picked ? `**${r}**` : `${r}`).join(', ');

    // 공격 판정
    const atkBonus = calcBonus(atkStat);
    const atkProf  = rollProficiency(atkStat);
    const atkTotal = Math.round((atkProf.picked + atkBonus) * 10) / 10;

    // 무기 주사위 파싱
    const dMatch = diceRaw.match(/^(\d+)[dD](\d+)$/);
    if (!dMatch) return interaction.reply({ content: '❌ 주사위 형식 오류. 예) `1d6`', ephemeral: true });
    const weaponCount = parseInt(dMatch[1]), weaponSides = parseInt(dMatch[2]);

    const npcMatch = targetRaw.match(/^(\d+)$/);
    const npcs = loadJSON(NPC_FILE);

    let targetName = targetRaw;
    let defProf = null, defBonus = 0, defTotal = 0, defStatLabel = '';
    let dmgText = '', hpText = '', resultText = '';
    let hitSuccess = false;

    if (npcMatch) {
      const nid = npcMatch[1];
      const npc = npcs[nid];
      if (!npc) return interaction.reply({ content: `❌ NPC ID \`${nid}\`를 찾을 수 없습니다.`, ephemeral: true });
      targetName = `[NPC-${nid}] ${npc.name}`;

      const defStat = npc.stats?.체력 ?? 0;
      defStatLabel  = `체력 ${defStat}`;
      defBonus      = calcBonus(defStat);
      defProf       = rollProficiency(defStat);
      defTotal      = Math.round((defProf.picked + defBonus) * 10) / 10;

      const gap = Math.round((atkTotal - defTotal) * 10) / 10;
      hitSuccess = gap >= 0;          // 0 이상이면 명중

      if (hitSuccess) {
        // 폭발 무기 주사위
        const weaponRolls = rollExploding(weaponCount, weaponSides);
        const exploded    = weaponRolls.length > weaponCount;
        const weaponSum   = weaponRolls.reduce((a,b)=>a+b, 0);

        // 크리티컬 배수 (공격 d20 = 20만, ×2)
        const natCrit  = atkProf.picked === 20;
        const multiplier = natCrit ? 2 : 1;

        // 데미지 = (무기 + 능력치 원본 + 격차) × 배수
        const baseDmg  = weaponSum + atkStat + gap;
        const rawDmg   = baseDmg * multiplier;
        const finalDmg = Math.max(0, Math.round(rawDmg));

        if (!npc.hp) npc.hp = { current: npcMaxHP(npc), max: npcMaxHP(npc) };
        const before = npc.hp.current;
        npc.hp.current = Math.max(0, npc.hp.current - finalDmg);
        saveJSON(NPC_FILE, npcs);

        const explodeMark = exploded ? ' 💥 폭발!' : '';
        const critLine    = natCrit ? `\n🎯 **Natural 20!** 최종 데미지 ×2` : '';
        dmgText = `🎲 무기 ${diceRaw}${explodeMark}: ${weaponRolls.join('+')} = **${weaponSum}**\n` +
                  `📐 명중 격차: **${gap}**\n` +
                  `💥 기본: ${weaponSum} + ${atkStat}(${statName} 원본) + ${gap}(격차) = **${baseDmg}**${critLine}\n` +
                  (multiplier > 1 ? `🔥 최종: ${baseDmg} × ${multiplier} = **${finalDmg}**` : `🔥 최종 데미지: **${finalDmg}**`);
        hpText  = `❤️ ${npc.name}: **${before}** → **${npc.hp.current}** / ${npc.hp.max}\n${makeHPBar(npc.hp.current, npc.hp.max)}`;
        if (npc.hp.current === 0) hpText += '\n☠️ **전투 불능!**';
        resultText = '🩸 **명중!** (성공 시 연속 공격 가능)';
      } else {
        resultText = `🛡️ **빗나감** (격차: ${gap})`;
      }
    } else {
      resultText = '⚠️ 대상이 NPC ID가 아닙니다 — 방어 판정은 GM이 수동 처리해주세요.';
    }

    const embed = new EmbedBuilder()
      .setTitle(`⚔️ ${char.nickname} → ${targetName}`)
      .setColor(hitSuccess ? 0xE74C3C : 0x95A5A6)
      .addFields(
        { name: `🗡️ 공격 (d20×${atkProf.count})`, value: `[${fmtRolls(atkProf.rolls, atkProf.picked)}] → **${atkProf.picked}** + ${fmtBonus(atkBonus)} (${statName} ${atkStat}/2) = **${atkTotal}**`, inline: false },
      );
    if (defProf) embed.addFields({
      name: `🛡️ 방어 (d20×${defProf.count})`,
      value: `[${fmtRolls(defProf.rolls, defProf.picked)}] → **${defProf.picked}** + ${fmtBonus(defBonus)} (${defStatLabel}/2) = **${defTotal}**`,
      inline: false,
    });
    embed.addFields({ name: '📊 결과', value: resultText, inline: false });
    if (dmgText) embed.addFields({ name: '💥 데미지', value: dmgText, inline: false });
    if (hpText)  embed.addFields({ name: 'HP 변화', value: hpText, inline: false });
    embed.setFooter({ text: `${statName} ${atkStat} 사용` });

    await interaction.reply({ embeds: [embed] });

    // 전투 대시보드 갱신
    const combatData = loadJSON(COMBAT_FILE);
    const cs = combatData[interaction.guild.id];
    if (cs?.active) await updateCombatDashboard(interaction.guild.id, interaction.channel);
  }

  // ══════════════════════════════════════════════════
  //  🌄 씬 시스템
  // ══════════════════════════════════════════════════

  if (cmd === '씬설정') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const bgRaw    = interaction.options.getString('배경');
    const bgs      = bgRaw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
    const guildId  = interaction.guild.id;
    const scenes   = loadJSON(SCENE_FILE);
    scenes[guildId] = { backgrounds: bgs, setAt: new Date().toISOString(), channelId: interaction.channel.id };
    saveJSON(SCENE_FILE, scenes);

    const embed = new EmbedBuilder()
      .setTitle('🌄 씬 배경 변경')
      .setColor(0x3498DB)
      .addFields({ name: '현재 배경', value: bgs.map(b => `• ${b}`).join('\n') || '없음' })
      .setFooter({ text: `설정: ${member.displayName}` });

    await interaction.reply({ embeds: [embed] });
    await triggerSceneTraits(interaction.channel, bgs);
  }

  if (cmd === '씬현황') {
    const guildId = interaction.guild.id;
    const scenes  = loadJSON(SCENE_FILE);
    const scene   = scenes[guildId];
    if (!scene?.backgrounds?.length)
      return interaction.reply({ content: '📍 현재 씬 배경이 설정되지 않았습니다.', ephemeral: true });
    return interaction.reply({ embeds: [new EmbedBuilder()
      .setTitle('🌄 현재 씬 배경')
      .setColor(0x3498DB)
      .addFields({ name: '배경', value: scene.backgrounds.map(b => `• ${b}`).join('\n') })] });
  }

  if (cmd === '씬초기화') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const guildId = interaction.guild.id;
    const scenes  = loadJSON(SCENE_FILE);
    delete scenes[guildId];
    saveJSON(SCENE_FILE, scenes);
    return interaction.reply({ content: '🌄 씬 배경이 초기화되었습니다.' });
  }

  // ══════════════════════════════════════════════════
  //  📋 행동 선언 시스템
  // ══════════════════════════════════════════════════

  if (cmd === '행동선언') {
    const action     = interaction.options.getString('행동');
    const guildId    = interaction.guild.id;
    const characters = loadJSON(CHAR_FILE);
    const char       = characters[interaction.user.id];
    const name       = char?.nickname ?? member.displayName;

    const decls = loadJSON(DECLARE_FILE);
    if (!decls[guildId]) decls[guildId] = {};
    decls[guildId][interaction.user.id] = { name, action, timestamp: new Date().toISOString() };
    saveJSON(DECLARE_FILE, decls);

    return interaction.reply({ content: `📋 **${name}**의 행동 선언: *${action}*`, ephemeral: false });
  }

  if (cmd === '행동확인') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const guildId = interaction.guild.id;
    const decls   = loadJSON(DECLARE_FILE);
    const entries  = Object.entries(decls[guildId] ?? {});
    if (!entries.length)
      return interaction.reply({ content: '📋 선언된 행동이 없습니다.', ephemeral: true });

    const combatData = loadJSON(COMBAT_FILE);
    const cs = combatData[guildId];

    // 전투 중이면 이니셔티브 순서로 정렬
    let sorted = entries;
    if (cs?.active) {
      const orderMap = {};
      cs.participants.forEach((p, i) => { if (p.type === 'player') orderMap[p.id] = i; });
      sorted = entries.sort(([a], [b]) => (orderMap[a] ?? 99) - (orderMap[b] ?? 99));
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 이번 라운드 행동 선언')
      .setColor(0x9B59B6)
      .addFields(sorted.map(([uid, d]) => ({ name: `${d.name}  <@${uid}>`, value: d.action, inline: false })));

    return interaction.reply({ embeds: [embed] });
  }

  if (cmd === '행동초기화') {
    if (!isGM(member)) return interaction.reply({ content: '❌ GM 역할이 필요합니다.', ephemeral: true });
    const guildId = interaction.guild.id;
    const decls   = loadJSON(DECLARE_FILE);
    delete decls[guildId];
    saveJSON(DECLARE_FILE, decls);
    return interaction.reply({ content: '✅ 행동 선언이 초기화되었습니다.' });
  }

  // ══════════════════════════════════════════════════
  //  🌀 이세계 전이
  // ══════════════════════════════════════════════════

  if (cmd === '이세계전이') {
    const targetUser   = interaction.options.getUser('유저') ?? interaction.user;
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const roll         = Math.floor(Math.random() * DEATH_EVENTS.length);
    const event        = DEATH_EVENTS[roll];

    const embed = new EmbedBuilder()
      .setTitle('🌀 이세계 전이')
      .setColor(0x9B59B6)
      .setDescription(`**${targetMember?.displayName ?? targetUser.username}**`)
      .addFields(
        { name: '사망 원인', value: event, inline: false },
        { name: '결과',      value: '**이세계로 전이합니다.** ✨', inline: false },
      )
      .setFooter({ text: `🎲 ${roll + 1}번 / 총 ${DEATH_EVENTS.length}가지` });

    return interaction.reply({ embeds: [embed] });
  }

  // ══════════════════════════════════════════════════
  //  🤖 AI 판정 시스템
  // ══════════════════════════════════════════════════

  if (cmd === 'ai판정') {
    const action = interaction.options.getString('행동');
    const characters = loadJSON(CHAR_FILE);
    const char = characters[interaction.user.id];
    if (!char) return interaction.reply({ content: '❌ 등록된 캐릭터가 없습니다.', ephemeral: true });

    const ANTHROPIC_KEY = process.env.OPENAI_API_KEY;
    if (!ANTHROPIC_KEY) return interaction.reply({ content: '❌ OPENAI_API_KEY 환경변수가 설정되지 않았습니다.', ephemeral: true });

    await interaction.deferReply();
    initChar(char);

    // d20 미리 굴림 (AI는 해석만, 주사위는 봇이 굴림)
    const d20 = rollDice(1, 20)[0];

    // 현재 씬 불러오기
    const scenes  = loadJSON(SCENE_FILE);
    const scene   = scenes[interaction.guild.id];
    const sceneBg = scene?.backgrounds ?? [];

    // AI 호출
    let result;
    try {
      result = await callAIJudge(ANTHROPIC_KEY, char, action, d20, sceneBg);
    } catch (e) {
      console.error('AI 판정 오류:', e);
      return interaction.editReply({ content: `❌ AI 판정 중 오류가 발생했습니다.\n\`\`\`${e.message}\`\`\`` });
    }

    // 임베드 구성
    const isCrit    = d20 === 20;
    const isFumble  = d20 === 1;
    const embedColor = isCrit ? 0xF1C40F : isFumble ? 0x7F8C8D : 0x9B59B6;

    const embed = new EmbedBuilder()
      .setTitle(`🤖 AI 판정 — ${char.nickname}`)
      .setColor(embedColor)
      .setDescription(`*"${action}"*`)
      .addFields(
        { name: '🎲 주사위',    value: `d20 = **${d20}**${isCrit ? ' 🌟 크리티컬!' : isFumble ? ' 💀 퍼블!' : ''}`, inline: true },
        { name: '⚙️ 사용 스킬/능력', value: result.skill_used || '자동 판단', inline: true },
      );

    // 능력치 분해
    if (result.stats_used?.length) {
      const statLines = result.stats_used.map(s => `**${s.name}** ${s.value} → +${s.bonus}`).join('\n');
      embed.addFields({ name: '📈 적용 능력치', value: statLines, inline: false });
    }

    // 계산 분해
    embed.addFields({ name: '🔢 계산식', value: `\`${result.breakdown}\``, inline: false });
    embed.addFields({ name: '📊 최종 결과', value: `## **${result.total}**`, inline: false });

    // 특성 효과
    const triggeredTraits = (result.trait_effects ?? []).filter(t => t.triggered);
    if (triggeredTraits.length) {
      const traitLines = triggeredTraits.map(t => `🔮 **${t.trait}**: ${t.effect}`).join('\n');
      embed.addFields({ name: '⚡ 발동된 특성', value: traitLines, inline: false });
    }

    // AI 서술
    if (result.narrative) {
      embed.addFields({ name: '📖 판정 묘사', value: result.narrative, inline: false });
    }

    // 추가 주석
    if (result.notes) {
      embed.addFields({ name: '📌 추가 적용 규칙', value: result.notes, inline: false });
    }

    embed.setFooter({ text: `씬 배경: ${sceneBg.join(', ') || '없음'} | Claude AI 판정` });

    return interaction.editReply({ embeds: [embed] });
  }

  // ── 도움말 ───────────────────────────────────────
  if (cmd === '도움말') {
    const embed = new EmbedBuilder()
      .setTitle('📖 TRPG 봇 명령어 목록').setColor(0x3498DB)
      .addFields(
        { name: '🎲 주사위',    value: '`/roll dice:1d20 + 1d10 + 5` — 식 표현식 지원 (XdY, 정수, +/-)', inline: false },
        { name: '📊 캐릭터',    value: ['`/상태등록` — 팝업 창으로 캐릭터 생성 (채팅 오염 없음)', '`/상태창` `/프로필수정` `/스탯수정` `/소속변경`', '`/분배` `/처치` `/운명점`'].join('\n'), inline: false },
        { name: '⚔️ 스킬·특성·특수스탯', value: ['`/스킬추가` `/스킬제거` `/특성추가` `/특성제거`', '`/특수스탯추가` `/특수스탯제거`'].join('\n'), inline: false },
        { name: '📖 설명·세부사항', value: '`/설명등록` `/세부사항`', inline: false },
        { name: '🎯 판정',      value: '`/판정 일반` `/판정 공격` `/판정 방어` `/판정 회피` `/판정 데미지`', inline: false },
        { name: '🤖 AI 판정',   value: ['`/ai판정 행동:[내용]` — AI가 캐릭터 시트·스킬·특성 설명을 읽고 복합 판정 자동 계산', '> 스킬이 능력치 2개를 쓰거나 특성 조건이 복잡해도 AI가 유연하게 처리'].join('\n'), inline: false },
        { name: '⚔️ 전투 (내추럴 하이 스피드)', value: ['`/전투시작` 🔒 — 이니셔티브 자동 굴림 & 턴 순서 정렬', '`/다음턴` 🔒 — 다음 턴 (10분 무응답 시 자동 스킵)', '`/전투현황` — 현재 HP 대시보드', '`/전투종료` 🔒', '`/공격 [NPC ID] [능력치] [주사위]` — 명중 격차 + 폭발 무기 + Nat20 ×2. 명중 시 연속 공격 가능'].join('\n'), inline: false },
        { name: '🌄 씬',        value: ['`/씬설정` 🔒 — 배경 설정 + 특성 자동 트리거 알림', '`/씬현황` `/씬초기화` 🔒'].join('\n'), inline: false },
        { name: '📋 행동 선언', value: ['`/행동선언 [행동]` — 다음 턴 행동 미리 제출 (8명 진행 가속)', '`/행동확인` 🔒 `/행동초기화` 🔒'].join('\n'), inline: false },
        { name: '🌀 이세계',    value: '`/이세계전이` — 93가지 사망 원인 랜덤 (1d93)',     inline: false },
        { name: '🎒 인벤토리',  value: '`/인벤` `/아이템추가` `/아이템제거`',              inline: false },
        { name: '📜 미션',      value: '`/미션` `/미션등록` 🔒 팝업창 등록 `/미션수정` 🔒 `/미션완료` 🔒 `/미션삭제` 🔒', inline: false },
        { name: '👤 NPC 🔒',    value: '`/npc` `/npc등록` 팝업창 등록 `/npc수정` `/npc체력` `/npc삭제`', inline: false },
        { name: '🛠️ GM 관리 🔒', value: ['`/레벨업` `/gm수정` `/gm체력`', '`/gm임시스탯` `/gm스킬추가` `/gm스킬제거`', '`/gm특성추가` `/gm특성제거` `/gm특수스탯추가` `/gm특수스탯제거`', '`/gm설명등록`'].join('\n'), inline: false },
      )
      .setFooter({ text: '🔒 = GM 역할 필요' });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
 } catch (err) {
  console.error('❌ 인터랙션 처리 중 오류:', err);
  const payload = { content: '❌ 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', ephemeral: true };
  try {
    if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
    else await interaction.reply(payload);
  } catch (e) { console.error('에러 응답 전송 실패:', e); }
 }
});

// ═══════════════════════════════════════════════════════════════
//  🤖 AI 판정 — 핵심 함수
// ═══════════════════════════════════════════════════════════════

/** 캐릭터 시트 전체를 AI가 읽을 수 있는 텍스트로 변환 */
function buildCharContext(char) {
  const lines = [];
  lines.push(`캐릭터명: ${char.nickname} | 종족: ${char.race || '미등록'} | 직업: ${char.job || '미등록'} | 소속: ${char.affiliation || '미등록'}`);
  lines.push(`레벨: ${char.level} | HP: ${char.hp?.current ?? 0} / ${char.hp?.max ?? 0} | 운명점: ${char.fatePoints?.current}/${char.fatePoints?.max}`);

  lines.push('\n[기본 스탯] (각 스탯의 판정 보너스 = 스탯값/2)');
  for (const [k, v] of Object.entries(char.stats ?? {})) {
    const temp  = char.tempStats?.[k] ?? 0;
    const eff   = v === Infinity ? Infinity : v + temp;
    const bonus = fmtBonus(calcBonus(eff));
    const tempStr = temp !== 0 ? ` (기본 ${v} + 임시 ${temp >= 0 ? '+' : ''}${temp})` : '';
    lines.push(`  ${k}: ${eff === Infinity ? '∞' : eff}${tempStr} → 판정보너스 +${bonus}`);
  }

  if (Object.keys(char.specialStats ?? {}).length) {
    lines.push('\n[특수 스탯]');
    for (const [k, v] of Object.entries(char.specialStats)) {
      const temp  = char.tempStats?.[k] ?? 0;
      const eff   = v === Infinity ? Infinity : v + temp;
      const bonus = fmtBonus(calcBonus(eff));
      lines.push(`  ${k}: ${eff === Infinity ? '∞' : eff} → 판정보너스 +${bonus}`);
    }
  }

  if (char.skills?.length) {
    lines.push(`\n[보유 스킬] ${char.skills.join(', ')}`);
  }
  if (char.traits?.length) {
    lines.push(`\n[보유 특성] ${char.traits.join(', ')}`);
  }

  const descs = char.descriptions ?? {};

  if (Object.keys(descs['스킬'] ?? {}).length) {
    lines.push('\n[스킬 상세 설명] — 어떤 능력치를 쓰는지, 효과가 무엇인지 포함');
    for (const [k, v] of Object.entries(descs['스킬'])) {
      lines.push(`  ・ ${k}: ${v}`);
    }
  }
  if (Object.keys(descs['특성'] ?? {}).length) {
    lines.push('\n[특성 상세 설명] — 발동 조건, 효과 포함');
    for (const [k, v] of Object.entries(descs['특성'])) {
      lines.push(`  ・ ${k}: ${v}`);
    }
  }
  if (Object.keys(descs['특수스탯'] ?? {}).length) {
    lines.push('\n[특수스탯 설명]');
    for (const [k, v] of Object.entries(descs['특수스탯'])) {
      lines.push(`  ・ ${k}: ${v}`);
    }
  }
  if (descs['소속']?.['소속']) {
    lines.push(`\n[소속 설명] ${descs['소속']['소속']}`);
  }

  return lines.join('\n');
}

/** OpenAI API 호출 — 판정 계산 및 결과 반환 */
async function callAIJudge(apiKey, char, action, d20Roll, sceneBgs) {
  const charContext  = buildCharContext(char);
  const sceneContext = sceneBgs.length ? sceneBgs.join(', ') : '없음 (일반 실내)';

  const systemPrompt = `당신은 TRPG 판정 계산 전문 AI입니다. 플레이어의 캐릭터 시트, 스킬/특성 설명, 현재 씬 배경을 분석하여 판정을 정확하게 계산합니다.

## 게임 규칙 (Natural High Speed — 반드시 준수)
- 보정치: 능력치 / 2 (예: 능력치 15 → 7.5)
- HP: 체력 × 4
- 기본 판정: d20(숙련도 스택 최댓값) + 보정치
- 숙련도 스택: 능력치 20당 d20 +1, 가장 높은 값 채택 (예: 능력치 40 → d20 2개 → 최댓값)
- 스킬 설명에 능력치가 2개 이상 명시된 경우: 각 보너스(능력치/2)를 모두 합산
- 방어 판정: d20(숙련도 스택 최댓값) + (체력/2)
- 회피 판정: d20(숙련도 스택 최댓값) + (민첩/2)
- 데미지: 무기 주사위(폭발) + 능력치 원본 + 명중 격차
- 폭발 주사위: 무기 주사위에서 최댓값이 나오면 한 번 더 굴려 합산 (연속 가능)
- 임시 스탯 반영: 이미 캐릭터 시트에 합산되어 있음
- 특성은 씬 배경 또는 행동 상황에 따라 활성화 여부 판단

## 명중 격차 & 크리티컬
- 명중 격차(Gap) = ATK - DEF. Gap >= 0이면 명중, < 0이면 빗나감(데미지 0)
- 공격자 채택 d20 = 20 (Natural 20): 최종 데미지 ×2
- 데미지 공식: (무기주사위합 + 능력치 원본 + 격차) × 크리티컬 배수
- 공격 성공 시 연속 공격 가능

## 응답 형식
반드시 아래 JSON만 출력하세요. 추가 텍스트, 마크다운 코드블록, 설명 일절 없이 JSON 객체만:
{
  "skill_used": "사용한 스킬명 또는 판정 유형",
  "stats_used": [
    {"name": "능력치명", "value": 실제값, "bonus": 보너스값}
  ],
  "trait_effects": [
    {"trait": "특성명", "triggered": true, "effect": "발동 효과 설명"}
  ],
  "dice_result": d20값,
  "total": 최종합계,
  "breakdown": "d20(14) + 지능보너스(1) + 정신력보너스(1) = 16 형태",
  "narrative": "한두 문장의 판정 묘사 (캐릭터 시점의 서사적 표현)",
  "notes": "추가 규칙 적용 사항이 있으면 적기, 없으면 null"
}`;

  const userPrompt = `## 캐릭터 시트
${charContext}

## 현재 씬 배경
${sceneContext}

## 굴러진 d20 결과
${d20Roll}

## 플레이어가 선언한 행동
${action}

위 정보를 바탕으로 판정을 계산하세요. 스킬 설명에 명시된 능력치를 우선 사용하고, 모호하면 행동 내용과 가장 관련 있는 능력치를 선택하세요.`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:      'gpt-4o-mini',
      max_tokens: 900,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`API 오류 ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  const raw  = data.choices?.[0]?.message?.content ?? '';

  // JSON 파싱 (혹시 코드블록이 붙어 있으면 제거)
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// ───────────────────────────────────────────
//  봇 준비
// ───────────────────────────────────────────
client.once(Events.ClientReady, c => {
  console.log(`✅ ${c.user.tag} 봇이 시작되었습니다!`);
  console.log(`   서버 수: ${c.guilds.cache.size}`);
});

process.on('unhandledRejection', err => console.error('에러:', err));

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) { console.error('❌ DISCORD_TOKEN 환경변수를 설정해주세요!'); process.exit(1); }
client.login(TOKEN);
