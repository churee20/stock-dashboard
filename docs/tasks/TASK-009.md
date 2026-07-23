# Task 009: 수집 완료 알림 자동화 (카카오톡 / Slack / 구글 캘린더)

## 개요
- **목표**: Vercel Cron으로 실행되는 `/api/cron/collect` 수집이 완료될 때마다 투자 실적 요약을 카카오톡, Slack, 구글 캘린더에 자동으로 전송/등록
- **관련 기능**: Google Sheets 수집 파이프라인(Task 006/008)에 부가 알림 기능 추가
- **참조 문서**: `01.요구사항/추가요구사항_20260723.md`, `docs/plans/PLAN-TASK-009-알림연동.md`

---

## 사전 조사 결과 (계획 단계에서 확인한 사실)

- 원본 요구사항 문서는 `mcp__...__KakaotalkChat-MemoChat`, `mcp__...__slack_send_message`, `mcp__...__create_event` MCP 도구 호출 예시를 들고 있으나, 이 도구들은 Claude Code 세션(대화형 클라이언트)에서만 호출 가능하고 Vercel 서버리스 API Route 코드에서는 사용할 수 없음. 이 사실을 사용자에게 확인시키고 방향을 전환함
- 사용자 협의 결과, 각 서비스의 **공식 서버 API를 코드에서 직접 호출**하는 방식으로 확정 (MCP 도구 미사용)
  - 카카오톡: 카카오 REST API "나에게 보내기"(`/v2/api/talk/memo/default/send`), refresh token 기반 access token 자동 갱신
  - Slack: Incoming Webhook URL 방식 (Bot Token API 아님)
  - 구글 캘린더: 기존 Google Sheets 수집용 서비스 계정 재사용, 사용자 캘린더에 "일정 변경 권한"으로 공유
- 세 알림은 서로 독립 실행하며 하나의 실패가 다른 알림이나 수집 자체의 성공 응답에 영향을 주지 않음 (부분 실패 허용)
- 현재 `collectFromSheet()`(`src/lib/supabase/collect.ts`)는 계좌별 스냅샷 upsert까지만 수행하고 반환값은 `{ accountCount, newAccountCount, upsertedSnapshotCount, upsertedAssetClassCount }`뿐이라, 알림 메시지에 필요한 연금/개인투자 합계·전일 대비는 별도로 계산함
- 전일 대비 계산을 위해 어제 날짜의 `account_snapshots`를 조회하는 `getSnapshotsByDate(date)`를 `queries.ts`에 신규 추가

---

## 구현 사항

### 1. 사전 준비 (사용자 작업)
- [x] 카카오: Kakao Developers 앱 생성 → 카카오 로그인 활성화(`talk_message` 스코프) → OAuth 인가 코드 발급 → refresh token 확보. 앱의 Client Secret 발급 상태가 ON이라 토큰 교환 시 `client_secret`도 함께 필요함을 실측으로 확인(`invalid_client` 에러 재현 후 해결)
- [x] Slack: Incoming Webhook 앱 추가 → Webhook URL 발급
- [x] 구글 캘린더: 기존 서비스 계정 이메일(`GOOGLE_SERVICE_ACCOUNT_EMAIL`)을 사용자 캘린더에 "일정 변경 권한"으로 공유, Calendar API 활성화
- [x] 로컬 `.env.local`에 환경변수 5개 입력: `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `KAKAO_REFRESH_TOKEN`, `SLACK_WEBHOOK_URL`, `GOOGLE_CALENDAR_ID`

### 2. 요약 계산 로직 (`src/lib/notify/summarize.ts`)
- [x] `summarizeByGroup(accounts, snapshots)`: 계좌 `account_type` 기준 연금/개인투자/전체 그룹 합산(원금/현재금액/수익금액/수익률)
- [x] `src/lib/supabase/queries.ts`에 `getSnapshotsByDate(date)` 추가 (`snapshot_date` eq 필터, 기존 `getAccountSnapshots()` 패턴 재사용)
- [x] `calculateDayOverDay(today, yesterday)`: 전일 대비 증감액/증감률 계산, 전일 데이터 없거나 0이면 `isFirstRun:true`로 방어
- [x] `formatEok(amount)`: 억 단위 소수 2자리 포맷 — 기존 `roundTo2`/`formatPercent`(화면 표시용)와 별도 함수로 분리
- 실제 Supabase 데이터(계좌 8종, 2026-07-22 스냅샷)로 검증: 연금 합계 + 개인투자 합계 = 전체 합계 정확히 일치 확인

### 3. 메시지 빌더 (`src/lib/notify/message.ts`)
- [x] `buildSummaryMessage`: 카카오톡/Slack 공용, 요구사항 이모지 포맷 그대로 재현
- [x] `buildCalendarEvent`: 구글 캘린더용 `summary`/`description`/`startTime`/`endTime`
- **200자 초과 대응**: 실제값(185자)은 여유 있었으나, 자산 100억대 경계 테스트에서 소수점 1자리 포맷 시 202자로 초과하는 사례 발견 → 수익률/전일대비 소수점을 1자리 → 0자리로 단계적으로 줄여 재시도하는 `composeMessage(digits)` 방식으로 개선, 재테스트 결과 190자로 정보 손실 없이 처리됨 확인

### 4. 카카오톡 전송 (`src/lib/notify/kakao.ts`)
- [x] `refreshKakaoAccessToken()`: refresh token + client_secret으로 access token 갱신
- [x] `sendKakaoMemo(message)`: "나에게 보내기" 호출, 모든 실패를 try/catch로 감싸 `{success:false, error}` 반환(throw 없음)
- 실제 refresh token으로 로컬에서 여러 차례 실전송해 카카오톡 정상 수신 확인 (최초 curl 명령행 직접 입력 시 한글이 깨진 적이 있었으나, 이는 셸 인코딩 문제였고 파일 기반 전송/Node.js 코드에서는 문제 없음을 확인)

### 5. Slack 전송 (`src/lib/notify/slack.ts`)
- [x] `sendSlackMessage(message)`: Webhook URL로 `{text: message}` POST, 응답이 `"ok"`가 아니면 실패로 간주
- [x] `NotifyResult` 타입을 `src/lib/notify/types.ts`로 분리해 kakao.ts와 공용화
- 실제 Webhook으로 로컬에서 실전송해 Slack 채널 정상 수신 확인

### 6. 구글 캘린더 등록 (`src/lib/notify/calendar.ts`)
- [x] 기존 `client.ts`의 JWT 패턴을 재사용하되 스코프를 `https://www.googleapis.com/auth/calendar`로 분리한 별도 인스턴스 생성
- [x] `createInvestmentSummaryEvent(event)`: `calendar.events.insert` 호출, `colorId:"7"`(Peacock), `transparency:"transparent"`(AVAILABILITY_FREE)
- 실제 서비스 계정으로 로컬에서 이벤트 등록해 청록색/바쁨 표시 없음 상태로 정상 등록 확인

### 7. `/api/cron/collect` 통합
- [x] `collectFromSheet()` 성공 후 `sendCollectNotifications()` 헬퍼에서 오늘/전일 스냅샷 조회 → 요약 계산 → 메시지 생성 → `Promise.allSettled`로 3종 병렬 전송
- [x] 응답 JSON에 `notifications: { kakao, slack, calendar }` 포함 (`status: fulfilled/rejected` + `success`/`error`)
- [x] 알림 준비 단계 예외도 try/catch로 감싸 수집 성공 응답에 영향 없음
- [x] dry-run(`?dryRun=true`)은 알림 단계 이전에 `return`되어 알림 미전송 유지

### 8. 문서화
- [x] 본 문서를 구현 완료 내용으로 갱신
- [x] `docs/ROADMAP.md`에 Task 009 항목 추가
- [x] `.env.local.example`에 신규 환경변수 5개(`KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `KAKAO_REFRESH_TOKEN`, `SLACK_WEBHOOK_URL`, `GOOGLE_CALENDAR_ID`) 추가

---

## 수락 기준

1. [x] 200자 제한 메시지가 실제로 200자를 넘지 않는다 — 실제값(185자), 100억대 경계 케이스(소수점 0자리 축약 후 190자) 모두 확인
2. [x] 카카오톡 access token 발급/갱신(refresh token + client_secret)이 정상 동작해 전송이 계속 성공한다
3. [x] Slack 전송 실패가 카카오톡/캘린더 전송을 막지 않는다 — Slack Webhook URL을 의도적으로 잘못된 값으로 오버라이드해 실측 확인(`slack.success:false`, `kakao.success:true`, `calendar.success:true` 동시 확인)
4. [x] 알림이 부분 실패해도 `/api/cron/collect`는 200과 함께 수집 결과(`accountCount` 등)를 정상 반환한다
5. [x] 전일 스냅샷이 없는 경우 전일 대비 계산이 에러 없이 처리된다 (`calculateDayOverDay`가 `isFirstRun:true` 반환, `buildSummaryMessage`에서 "전일대비:-"로 표시)
6. [x] 구글 캘린더 이벤트가 `AVAILABILITY_FREE`(바쁨 표시 없음)로 등록된다 — 실제 등록 후 사용자가 캘린더에서 직접 확인
7. [x] 로컬 `/api/cron/collect` 실행으로 세 알림이 모두 수신됨을 확인 — 프로덕션 실제 크론 자동 실행분 확인은 다음 정규 스케줄(평일 KST 16:00)에서 자연 검증 예정

---

## 테스트 체크리스트

> API/비즈니스 로직 작업이므로 Playwright MCP 테스트 시나리오 대신, 서버 API 직접 호출 기반 시나리오로 대체 (브라우저 UI 변경이 없는 백엔드 전용 기능)

- [x] 로컬에서 `?dryRun=true` 호출 시 알림 미전송, 기존 파싱 동작에 영향 없음 확인 (HTTP 200)
- [x] 로컬에서 실제 알림 3종을 여러 차례 실전송해 카카오톡/Slack/캘린더 수신 확인 (단계별 모듈 테스트 + 통합 테스트 각각 수행)
- [x] 카카오 access token 갱신 플로우 확인 (매 호출마다 refresh token으로 재발급하는 방식이라 별도 만료 대기 없이 정상 동작 확인)
- [x] Slack Webhook URL을 임시로 잘못된 값으로 오버라이드해 실패해도 카카오/캘린더는 정상 전송되는지 확인 (`404 no_team` 에러를 `notifications.slack.error`로 정확히 캡처)
- [ ] 프로덕션 배포 후 실제 크론 스케줄 1회 실행분으로 최종 확인 — 다음 평일 정규 실행(KST 16:00)에서 자연 검증 예정, 별도 조치 불필요

---

## 관련 파일

### 신규 생성
```
src/lib/notify/summarize.ts
src/lib/notify/message.ts
src/lib/notify/kakao.ts
src/lib/notify/slack.ts
src/lib/notify/calendar.ts
src/lib/notify/types.ts
docs/tasks/TASK-009.md
docs/plans/PLAN-TASK-009-알림연동.md
```

### 수정
```
src/lib/supabase/queries.ts        (getSnapshotsByDate 추가)
src/app/api/cron/collect/route.ts  (알림 3종 통합)
.env.local.example                 (신규 환경변수 5개 추가)
docs/ROADMAP.md
```

---

## 디버깅 노트 (트러블슈팅 기록)

1. **카카오 `invalid_client` 에러**: 앱의 Client Secret 발급 상태가 ON이라 토큰 교환 시 `client_secret` 파라미터 누락으로 발생. `KAKAO_CLIENT_SECRET` 환경변수를 추가해 해결
2. **curl 한글 깨짐**: 명령행에 직접 입력한 한글이 Windows Git Bash 셸 인코딩 문제로 깨짐. 파일 기반 전송(`--data-urlencode @file`)으로는 정상 확인 — 실제 Node.js 코드(문자열 리터럴 UTF-8)에서는 재현되지 않는 이슈
3. **부분 실패 테스트 시 `.env.local` 변경이 반영되지 않음**: 원인은 Windows User 환경변수(전역 설정)에 `SLACK_WEBHOOK_URL`이 이미 등록되어 있어, Next.js가 `.env.local`보다 실제 OS 프로세스 환경변수를 우선 적용했기 때문. 해당 프로세스에만 임시로 값을 오버라이드해 테스트를 완료(전역 환경변수 자체는 변경하지 않음)

---

## 주의사항

1. 카카오 refresh token, Slack Webhook URL은 시크릿이므로 `.env.local`/Vercel 환경변수에만 저장하고 커밋 금지 (Google 서비스 계정 키와 동일한 취급)
2. 카카오 "나에게 보내기"는 앱 관리자(본인) 계정으로만 전송 가능 — 1인용 서비스라 문제없음
3. 억 단위 변환은 기존 `roundTo2`(화면 표시용) 정책과 별개로 신규 함수로 분리
4. Vercel Production 환경변수에 신규 5개(`KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `KAKAO_REFRESH_TOKEN`, `SLACK_WEBHOOK_URL`, `GOOGLE_CALENDAR_ID`)를 아직 등록하지 않음 — 실제 프로덕션 자동 알림이 동작하려면 Task 008 선례와 동일하게 사용자가 Vercel 대시보드에서 직접 입력 필요
5. 카카오 access token은 매 실행마다 refresh token으로 재발급(캐싱 없음) — 크론이 하루 1회뿐이라 불필요한 최적화로 판단해 생략

---

## 다음 단계

1. **Vercel Production 환경변수 5개 등록 필요** (사용자가 직접 입력, Task 008 선례와 동일 절차) — 등록 전까지는 프로덕션 자동 크론에서 알림이 전송되지 않음(수집 자체는 정상 동작)
2. 등록 후 다음 평일 정규 크론 실행(KST 16:00)에서 실제 알림 3종 수신을 최종 확인
3. 알림 발송 이력(성공/실패) 로그를 별도로 남길지, 실패 시 재시도 로직을 넣을지는 실제 운영하며 필요성 확인 후 후속 과제로 검토
