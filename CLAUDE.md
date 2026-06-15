# CLAUDE.md

TRPG용 디스코드 봇. 캐릭터 시트, 스탯/판정, 전투 턴 관리, NPC, 미션, 씬, 인벤토리,
그리고 AI 복합 판정을 슬래시 커맨드로 제공한다. 코드·주석·UI는 모두 한국어다.

## 실행 / 배포

```
npm run deploy   # node deploy.js — 슬래시 커맨드를 Discord에 등록
npm run bot      # node bot.js    — 봇 프로세스 기동
npm start        # deploy 후 bot 실행 (둘 다)
```

- 의존성은 `discord.js` 하나뿐. 빌드 단계·테스트 스위트·린터 없음 (`package.json` 참고).
- 수정 후 검증은 `node -c bot.js` / `node -c deploy.js` 구문 체크가 사실상 전부다.

### 환경변수
- `DISCORD_TOKEN` — 봇 토큰 (필수, `bot.js`/`deploy.js`).
- `CLIENT_ID` — 애플리케이션 ID (`deploy.js` 커맨드 등록에 필수).
- `GUILD_ID` — **설정 시** 해당 길드에만 즉시 등록(개발용), **미설정 시** 전역 등록(최대 1시간 전파).
- `OLD_GUILD_ID` — 전역 전환 시 옛 길드 한정 커맨드 자동 정리용 (선택).
- `DATA_DIR` — JSON 영속 저장 경로. 미설정 시 `./data`. (Railway Volume은 `/data` 마운트.)
- `OPENAI_API_KEY` — `/ai판정`에서 사용. 변수명은 OPENAI지만 실제 호출 대상은 코드 확인 필요
  (`callAIJudge` / `fetch('https://api.openai.com/...')`).

## 구조

- `bot.js` (~2.4k줄) — 단일 파일. 상단에 상수/헬퍼, 그 아래 하나의 거대한
  `Events.InteractionCreate` 핸들러가 `if (cmd === '...')` 분기로 모든 커맨드를 처리한다.
- `deploy.js` — `SlashCommandBuilder` 배열로 커맨드 스키마만 정의해 Discord에 등록.

### 커맨드를 추가할 때 (중요)
세 곳을 함께 고쳐야 한다:
1. `deploy.js`의 `commands` 배열에 `SlashCommandBuilder` 추가.
2. `bot.js` 인터랙션 핸들러에 `if (cmd === '이름') { ... }` 분기 추가.
3. `bot.js` 하단 `/도움말` 임베드 필드에 안내 한 줄 추가.

추가 후 `node -c`로 구문 확인하고, 실제 반영은 `npm run deploy` 재실행이 필요하다.

## 데이터 / 영속성

- 저장소는 `DATA_DIR` 아래 JSON 파일들: `characters.json`, `inventory.json`,
  `missions.json`, `npcs.json`, `combat.json`, `scenes.json`, `declarations.json`.
- 접근은 `loadJSON(fp)` / `saveJSON(fp, data)`로만. 손상된 JSON은 `{}`로 폴백.
- **모든 데이터는 길드 단위로 스코프된다.** 항상 `interaction.guild.id`로 분기할 것.
  - 캐릭터: `allChars[guildId][uid] = { active, profiles: { "1": charObj, ... } }`
    (유저당 다중 프로필). 헬퍼: `getCharBook`, `activeOf`, `loadCharCtx`,
    `addProfile`, `activeCharsForGuild`.
  - 그 외 파일: `guildScope(file, guildId)` → `[all, all[guildId]]`.
- 동시성: read-modify-write 사이에 락이 없으므로, 저장 직전 최신본을 다시 `loadJSON`해
  병합하는 패턴을 따른다 (예: 전투 진행부). 기존 코드 패턴을 깨지 말 것.

## 권한 / 규칙

- GM 전용 기능은 `isGM(member)` (디스코드 역할 이름이 `GM`)로 가드한다.
  실패 시 `{ content: '❌ GM 역할이 필요합니다.', ephemeral: true }` 반환.
- 기본 스탯 7종은 `DEFAULT_STATS`, 단 스탯 이름/개수와 HP 공식은 캐릭터·NPC마다 커스텀 가능.
- 보정치 = 능력치/2 (`calcBonus`), 판정은 d20 + 보정. 숙련도 스택(`rollProficiency`)은
  능력치 20당 d20 +1개를 굴려 최댓값 채택. 무기는 폭발 주사위(`rollExploding`).
- 전투 턴 타임아웃 10분(`TURN_TIMEOUT_MS`), 초과 시 `advanceTurn`으로 자동 진행.

## 주사위 헬퍼

- `rollDice(n, s)` — n개의 s면체. `evalRollExpression` — `2d6+5-1d4` 같은 식 파서(`/roll`).
- `/pateroll` — 페이트 코어(Fudge) 주사위. 각 주사위가 -1/0/+1 중 하나, n개(기본 4) 굴려 합산.
  `개수`(1~100)와 선택 `보정` 옵션을 받는다.
