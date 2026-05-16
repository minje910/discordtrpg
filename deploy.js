const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  // ─── 주사위 ───
  new SlashCommandBuilder().setName('roll').setDescription('주사위를 굴립니다 (식 표현식 지원)')
    .addStringOption(o => o.setName('dice').setDescription('예) 2d6, 1d20+1d10, 2d6+5-1d4').setRequired(true)),

  // ─── 상태창 ───
  new SlashCommandBuilder().setName('상태등록').setDescription('캐릭터를 등록합니다 (팝업 창으로 입력)'),
  new SlashCommandBuilder().setName('상태창').setDescription('상태창을 봅니다')
    .addUserOption(o => o.setName('유저').setDescription('다른 유저 상태창 보기')),
  new SlashCommandBuilder().setName('프로필수정').setDescription('닉네임·종족·직업을 수정합니다')
    .addStringOption(o => o.setName('항목').setDescription('수정할 항목').setRequired(true)
      .addChoices({ name: '닉네임', value: '닉네임' }, { name: '종족', value: '종족' }, { name: '직업', value: '직업' }))
    .addStringOption(o => o.setName('값').setDescription('새로운 값').setRequired(true)),
  new SlashCommandBuilder().setName('스탯수정').setDescription('스탯 값을 수정합니다 (숫자 또는 무한)')
    .addStringOption(o => o.setName('스탯').setDescription('스탯 이름').setRequired(true))
    .addStringOption(o => o.setName('값').setDescription('새로운 값 (숫자 또는 "무한")').setRequired(true)),
  new SlashCommandBuilder().setName('소속변경').setDescription('소속을 변경합니다')
    .addStringOption(o => o.setName('소속').setDescription('새 소속명').setRequired(true)),
  new SlashCommandBuilder().setName('분배').setDescription('분배 가능 능력치를 스탯에 투자합니다')
    .addStringOption(o => o.setName('스탯').setDescription('스탯 이름').setRequired(true))
    .addIntegerOption(o => o.setName('값').setDescription('투자할 점수').setRequired(true)),
  new SlashCommandBuilder().setName('처치').setDescription('적을 처치하여 경험치를 획득합니다')
    .addIntegerOption(o => o.setName('레벨').setDescription('적의 레벨').setRequired(true)),
  new SlashCommandBuilder().setName('운명점').setDescription('운명점을 관리합니다')
    .addStringOption(o => o.setName('행동').setDescription('사용 / 회복 / 설정').setRequired(true)
      .addChoices({ name: '사용', value: '사용' }, { name: '회복', value: '회복' }, { name: '설정', value: '설정' }))
    .addIntegerOption(o => o.setName('값').setDescription('점수').setRequired(true)),

  // ─── 스킬 / 특성 ───
  new SlashCommandBuilder().setName('스킬추가').setDescription('스킬을 추가합니다')
    .addStringOption(o => o.setName('이름').setDescription('스킬 이름').setRequired(true)),
  new SlashCommandBuilder().setName('스킬제거').setDescription('스킬을 제거합니다')
    .addStringOption(o => o.setName('이름').setDescription('스킬 이름').setRequired(true)),
  new SlashCommandBuilder().setName('특성추가').setDescription('특성을 추가합니다')
    .addStringOption(o => o.setName('이름').setDescription('특성 이름').setRequired(true)),
  new SlashCommandBuilder().setName('특성제거').setDescription('특성을 제거합니다')
    .addStringOption(o => o.setName('이름').setDescription('특성 이름').setRequired(true)),

  // ─── 특수 스탯 ───
  new SlashCommandBuilder().setName('특수스탯추가').setDescription('특수 스탯을 추가합니다')
    .addStringOption(o => o.setName('이름').setDescription('특수 스탯 이름').setRequired(true))
    .addStringOption(o => o.setName('값').setDescription('초기값 (숫자 또는 "무한")').setRequired(true)),
  new SlashCommandBuilder().setName('특수스탯제거').setDescription('특수 스탯을 제거합니다')
    .addStringOption(o => o.setName('이름').setDescription('특수 스탯 이름').setRequired(true)),

  // ─── 판정 ───
  new SlashCommandBuilder().setName('판정').setDescription('판정을 굴립니다')
    .addSubcommand(s => s.setName('일반').setDescription('일반 판정: 1d20 + (능력치/10)')
      .addStringOption(o => o.setName('능력치').setDescription('능력치 이름').setRequired(true)))
    .addSubcommand(s => s.setName('공격').setDescription('공격 판정: 1d20 + (능력치/10)')
      .addStringOption(o => o.setName('능력치').setDescription('능력치 이름').setRequired(true)))
    .addSubcommand(s => s.setName('방어').setDescription('방어 판정: 10 + (체력/10)'))
    .addSubcommand(s => s.setName('회피').setDescription('회피 판정: 10 + (민첩/10)'))
    .addSubcommand(s => s.setName('데미지').setDescription('데미지 판정: 무기주사위 + (능력치/10)')
      .addStringOption(o => o.setName('능력치').setDescription('능력치 이름').setRequired(true))
      .addStringOption(o => o.setName('주사위').setDescription('예) 2d6').setRequired(true))),

  // ─── 인벤토리 ───
  new SlashCommandBuilder().setName('인벤').setDescription('인벤토리를 봅니다')
    .addUserOption(o => o.setName('유저').setDescription('다른 유저 인벤 보기')),
  new SlashCommandBuilder().setName('아이템추가').setDescription('아이템을 추가합니다')
    .addStringOption(o => o.setName('이름').setDescription('아이템 이름').setRequired(true))
    .addIntegerOption(o => o.setName('개수').setDescription('추가할 개수 (기본 1)')),
  new SlashCommandBuilder().setName('아이템제거').setDescription('아이템을 제거합니다')
    .addStringOption(o => o.setName('이름').setDescription('아이템 이름').setRequired(true))
    .addIntegerOption(o => o.setName('개수').setDescription('제거할 개수 (기본 1)')),

  // ─── 미션 ───
  new SlashCommandBuilder().setName('미션').setDescription('미션을 봅니다')
    .addStringOption(o => o.setName('id').setDescription('특정 미션 ID')),
  new SlashCommandBuilder().setName('미션등록').setDescription('미션을 등록합니다 (GM 전용, 팝업 창)'),
  new SlashCommandBuilder().setName('미션수정').setDescription('미션을 수정합니다 (GM 전용)')
    .addStringOption(o => o.setName('id').setDescription('미션 ID').setRequired(true))
    .addStringOption(o => o.setName('항목').setDescription('제목/부제목/설명/보상').setRequired(true)
      .addChoices({ name: '제목', value: '제목' }, { name: '부제목', value: '부제목' }, { name: '설명', value: '설명' }, { name: '보상', value: '보상' }))
    .addStringOption(o => o.setName('값').setDescription('새 내용').setRequired(true)),
  new SlashCommandBuilder().setName('미션완료').setDescription('미션을 완료 처리합니다 (GM 전용)')
    .addStringOption(o => o.setName('id').setDescription('미션 ID').setRequired(true)),
  new SlashCommandBuilder().setName('미션삭제').setDescription('미션을 삭제합니다 (GM 전용)')
    .addStringOption(o => o.setName('id').setDescription('미션 ID').setRequired(true)),

  // ─── NPC ───
  new SlashCommandBuilder().setName('npc').setDescription('NPC를 봅니다')
    .addStringOption(o => o.setName('id').setDescription('특정 NPC ID')),
  new SlashCommandBuilder().setName('npc등록').setDescription('NPC를 등록합니다 (GM 전용, 팝업 창)'),
  new SlashCommandBuilder().setName('npc체력').setDescription('NPC 체력을 조정합니다 (GM 전용)')
    .addStringOption(o => o.setName('id').setDescription('NPC ID').setRequired(true))
    .addStringOption(o => o.setName('행동').setDescription('하락 / 회복 / 설정').setRequired(true)
      .addChoices({ name: '하락', value: '하락' }, { name: '회복', value: '회복' }, { name: '설정', value: '설정' }))
    .addIntegerOption(o => o.setName('값').setDescription('HP 값').setRequired(true)),
  new SlashCommandBuilder().setName('npc삭제').setDescription('NPC를 삭제합니다 (GM 전용)')
    .addStringOption(o => o.setName('id').setDescription('NPC ID').setRequired(true)),
  new SlashCommandBuilder().setName('npc수정').setDescription('NPC 정보를 수정합니다 (GM 전용)')
    .addStringOption(o => o.setName('id').setDescription('NPC ID').setRequired(true))
    .addStringOption(o => o.setName('항목').setDescription('수정할 항목').setRequired(true)
      .addChoices(
        { name: '이름', value: '이름' }, { name: '종족', value: '종족' }, { name: '직업', value: '직업' },
        { name: '소속', value: '소속' }, { name: '레벨', value: '레벨' }, { name: '스탯', value: '스탯' },
        { name: '특수스탯', value: '특수스탯' }, { name: '스킬추가', value: '스킬추가' }, { name: '스킬제거', value: '스킬제거' },
        { name: '특성추가', value: '특성추가' }, { name: '특성제거', value: '특성제거' }, { name: '메모', value: '메모' },
      ))
    .addStringOption(o => o.setName('값').setDescription('새로운 값').setRequired(true)),

  // ─── 전투 ───
  new SlashCommandBuilder().setName('전투시작').setDescription('전투를 시작합니다 (GM 전용) — 이니셔티브 자동 굴림')
    .addStringOption(o => o.setName('플레이어').setDescription('@멘션으로 참가 플레이어 지정 (예: @철수 @영희)').setRequired(true))
    .addStringOption(o => o.setName('npc').setDescription('NPC ID 쉼표 구분 (예: 1,2,3)')),
  new SlashCommandBuilder().setName('다음턴').setDescription('다음 턴으로 넘어갑니다 (GM 전용)'),
  new SlashCommandBuilder().setName('전투현황').setDescription('현재 전투 상태와 HP 현황판을 봅니다'),
  new SlashCommandBuilder().setName('전투종료').setDescription('전투를 종료합니다 (GM 전용)'),
  new SlashCommandBuilder().setName('공격').setDescription('적을 공격합니다 — 판정+데미지+HP 자동 처리')
    .addStringOption(o => o.setName('대상').setDescription('NPC ID (숫자) 또는 대상 이름').setRequired(true))
    .addStringOption(o => o.setName('능력치').setDescription('공격에 사용할 능력치').setRequired(true))
    .addStringOption(o => o.setName('주사위').setDescription('무기 주사위 (예: 2d6, 기본 1d6)')),

  // ─── 씬 ───
  new SlashCommandBuilder().setName('씬설정').setDescription('배경/씬 상태를 설정합니다 (GM 전용) — 특성 자동 트리거')
    .addStringOption(o => o.setName('배경').setDescription('배경 상태 (쉼표·공백 구분 가능, 예: 어둠, 블러드문)').setRequired(true)),
  new SlashCommandBuilder().setName('씬현황').setDescription('현재 씬 배경 상태를 봅니다'),
  new SlashCommandBuilder().setName('씬초기화').setDescription('씬 배경을 초기화합니다 (GM 전용)'),

  // ─── 행동 선언 ───
  new SlashCommandBuilder().setName('행동선언').setDescription('이번 턴 행동을 미리 선언합니다 — 8명 진행 가속용')
    .addStringOption(o => o.setName('행동').setDescription('선언할 행동 내용').setRequired(true)),
  new SlashCommandBuilder().setName('행동확인').setDescription('선언된 행동 목록을 봅니다 (GM 전용)'),
  new SlashCommandBuilder().setName('행동초기화').setDescription('선언된 행동을 초기화합니다 (GM 전용)'),

  // ─── 이세계 전이 ───
  new SlashCommandBuilder().setName('이세계전이').setDescription('이세계 전이 사망 원인을 랜덤으로 굴립니다 (93가지)')
    .addUserOption(o => o.setName('유저').setDescription('전이할 유저 (기본: 본인)')),

  // ─── GM 관리 ───
  new SlashCommandBuilder().setName('레벨업').setDescription('플레이어를 레벨업합니다 (GM 전용)')
    .addUserOption(o => o.setName('유저').setDescription('대상 유저').setRequired(true)),
  new SlashCommandBuilder().setName('gm수정').setDescription('플레이어 능력치를 수정합니다 (GM 전용)')
    .addUserOption(o => o.setName('유저').setDescription('대상 유저').setRequired(true))
    .addStringOption(o => o.setName('항목').setDescription('스탯명/레벨/경험치/분배포인트/운명점현재/운명점최대/체력현재/소속').setRequired(true))
    .addStringOption(o => o.setName('값').setDescription('새로운 값').setRequired(true)),
  new SlashCommandBuilder().setName('gm체력').setDescription('플레이어 체력을 조정합니다 (GM 전용)')
    .addUserOption(o => o.setName('유저').setDescription('대상 유저').setRequired(true))
    .addStringOption(o => o.setName('행동').setDescription('하락 / 회복 / 설정').setRequired(true)
      .addChoices({ name: '하락', value: '하락' }, { name: '회복', value: '회복' }, { name: '설정', value: '설정' }))
    .addIntegerOption(o => o.setName('값').setDescription('HP 값').setRequired(true)),
  new SlashCommandBuilder().setName('gm임시스탯').setDescription('플레이어 임시 스탯 변동 (GM 전용)')
    .addUserOption(o => o.setName('유저').setDescription('대상 유저').setRequired(true))
    .addStringOption(o => o.setName('스탯').setDescription('스탯 이름').setRequired(true))
    .addIntegerOption(o => o.setName('값').setDescription('변동값 (0이면 초기화)').setRequired(true)),
  new SlashCommandBuilder().setName('gm스킬추가').setDescription('플레이어 스킬 강제 추가 (GM 전용)')
    .addUserOption(o => o.setName('유저').setDescription('대상 유저').setRequired(true))
    .addStringOption(o => o.setName('이름').setDescription('스킬 이름').setRequired(true)),
  new SlashCommandBuilder().setName('gm스킬제거').setDescription('플레이어 스킬 강제 제거 (GM 전용)')
    .addUserOption(o => o.setName('유저').setDescription('대상 유저').setRequired(true))
    .addStringOption(o => o.setName('이름').setDescription('스킬 이름').setRequired(true)),
  new SlashCommandBuilder().setName('gm특성추가').setDescription('플레이어 특성 강제 추가 (GM 전용)')
    .addUserOption(o => o.setName('유저').setDescription('대상 유저').setRequired(true))
    .addStringOption(o => o.setName('이름').setDescription('특성 이름').setRequired(true)),
  new SlashCommandBuilder().setName('gm특성제거').setDescription('플레이어 특성 강제 제거 (GM 전용)')
    .addUserOption(o => o.setName('유저').setDescription('대상 유저').setRequired(true))
    .addStringOption(o => o.setName('이름').setDescription('특성 이름').setRequired(true)),
  new SlashCommandBuilder().setName('gm특수스탯추가').setDescription('플레이어 특수 스탯 추가 (GM 전용)')
    .addUserOption(o => o.setName('유저').setDescription('대상 유저').setRequired(true))
    .addStringOption(o => o.setName('이름').setDescription('특수 스탯 이름').setRequired(true))
    .addIntegerOption(o => o.setName('값').setDescription('초기값').setRequired(true)),
  new SlashCommandBuilder().setName('gm특수스탯제거').setDescription('플레이어 특수 스탯 제거 (GM 전용)')
    .addUserOption(o => o.setName('유저').setDescription('대상 유저').setRequired(true))
    .addStringOption(o => o.setName('이름').setDescription('특수 스탯 이름').setRequired(true)),

  // ─── 세부사항 / 설명 ───
  new SlashCommandBuilder().setName('세부사항').setDescription('스킬·특성·특수스탯·소속의 세부 설명을 봅니다')
    .addStringOption(o => o.setName('종류').setDescription('스킬 / 특성 / 특수스탯 / 소속').setRequired(true)
      .addChoices({ name: '스킬', value: '스킬' }, { name: '특성', value: '특성' }, { name: '특수스탯', value: '특수스탯' }, { name: '소속', value: '소속' }))
    .addStringOption(o => o.setName('이름').setDescription('확인할 항목 이름 (소속은 생략 가능)')),
  new SlashCommandBuilder().setName('설명등록').setDescription('스킬·특성·특수스탯·소속에 세부 설명을 등록/수정합니다')
    .addStringOption(o => o.setName('종류').setDescription('스킬 / 특성 / 특수스탯 / 소속').setRequired(true)
      .addChoices({ name: '스킬', value: '스킬' }, { name: '특성', value: '특성' }, { name: '특수스탯', value: '특수스탯' }, { name: '소속', value: '소속' }))
    .addStringOption(o => o.setName('설명').setDescription('등록할 설명 내용').setRequired(true))
    .addStringOption(o => o.setName('이름').setDescription('항목 이름 (소속은 생략 가능)')),
  new SlashCommandBuilder().setName('gm설명등록').setDescription('플레이어의 스킬·특성에 설명을 등록/수정합니다 (GM 전용)')
    .addUserOption(o => o.setName('유저').setDescription('대상 유저').setRequired(true))
    .addStringOption(o => o.setName('종류').setDescription('스킬 / 특성').setRequired(true)
      .addChoices({ name: '스킬', value: '스킬' }, { name: '특성', value: '특성' }))
    .addStringOption(o => o.setName('이름').setDescription('스킬/특성 이름').setRequired(true))
    .addStringOption(o => o.setName('설명').setDescription('등록할 설명 내용').setRequired(true)),

  // ─── AI 판정 ───
  new SlashCommandBuilder().setName('ai판정').setDescription('AI가 캐릭터 시트·스킬·특성 설명을 읽고 복합 판정을 자동 계산합니다')
    .addStringOption(o => o.setName('행동').setDescription('선언할 행동 내용 (예: 정신분석 스킬로 상대의 약점을 파악한다)').setRequired(true)),

  new SlashCommandBuilder().setName('도움말').setDescription('봇의 모든 명령어 목록을 봅니다'),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`📡 슬래시 커맨드 등록 중... (${commands.length}개)`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ 슬래시 커맨드 등록 완료!');
  } catch (err) {
    console.error(err);
  }
})();
