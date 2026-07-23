# Task 009: 수집 완료 알림 자동화 (카카오톡 / Slack / 구글 캘린더)

## Context

`01.요구사항/추가요구사항_20260723.md`에 명시된 요구사항: Vercel Cron으로 평일 오후 4시 실행되는 `/api/cron/collect` 수집 파이프라인이 완료될 때마다, 투자 실적 요약을 카카오톡·Slack·구글 캘린더로 자동 전송/등록한다.

**중요한 전제 수정**: 원본 요구사항 문서는 `mcp__...__KakaotalkChat-MemoChat`, `mcp__...__slack_send_message`, `mcp__...__create_event` 같은 MCP 도구 호출을 예시로 들고 있으나, 이 도구들은 Claude Code 세션(대화형 클라이언트)에서만 호출 가능하며 Vercel에 배포된 서버리스 API Route(`/api/cron/collect`) 코드에서는 사용할 수 없다. 사용자와 협의한 결과, **각 서비스의 공식 서버 API를 코드에서 직접 호출**하는 방식으로 진행한다 (MCP 도구는 사용하지 않음).

세션 중 확정된 결정 사항:
- **카카오톡**: 카카오 REST API "나에게 보내기"(`/v2/api/talk/memo/default/send`) 사용. 카카오 로그인으로 발급받은 refresh token을 서버가 보관하며 access token을 자동 갱신
- **Slack**: Incoming Webhook URL 방식 (Bot Token API 아님)
- **구글 캘린더**: 기존 Google Sheets 수집에 쓰는 서비스 계정을 재사용하고, 사용자의 구글 캘린더에 "일정 변경 권한"으로 공유해 인증 절차 추가 없이 바로 사용
- 세 알림은 서로 독립적으로 실행하며, 하나가 실패해도 나머지는 계속 시도한다(부분 실패 허용, 수집 자체의 성공/실패와도 분리)
- 알림 실패가 `/api/cron/collect`의 전체 응답을 실패(500)로 만들지 않는다 — DB 수집 성공이 최우선이며, 알림은 부가 기능

## 작업 개요

이 Task는 **계획 문서만 작성**한다. 실제 코드 구현은 사용자 승인 후 별도로 진행한다(TASK-006/008 선례와 동일한 순서).

1. `docs/tasks/TASK-009.md` 작성 (알림 자동화 명세)
2. 사전 준비 단계(사용자가 직접 수행해야 하는 외부 설정)를 명확히 분리해 문서화
3. 계산 로직·메시지 포맷·실패 처리 전략을 구현 단계별로 정의

## TASK-009.md 구성 내용 (초안)

### 사전 준비 (사용자 작업, 코드 구현 전 필수)

1. **카카오**
   - Kakao Developers에서 앱 생성, "카카오 로그인" 활성화, `talk_message` 스코프 동의
   - 최초 1회 사용자가 직접 OAuth 인가 코드 발급 → refresh token 확보 (임시 스크립트 또는 브라우저로 진행)
   - 환경변수: `KAKAO_REST_API_KEY`, `KAKAO_REFRESH_TOKEN`

2. **Slack**
   - `#투자실적` 채널에 Incoming Webhook 앱 추가, Webhook URL 발급
   - 환경변수: `SLACK_WEBHOOK_URL`

3. **구글 캘린더**
   - 기존 서비스 계정 이메일(`GOOGLE_SERVICE_ACCOUNT_EMAIL`)을 사용자의 구글 캘린더에 "일정 변경" 권한으로 공유
   - Google Cloud Console에서 해당 프로젝트에 Calendar API 활성화
   - 환경변수: `GOOGLE_CALENDAR_ID` (보통 사용자 Gmail 주소 또는 캘린더 ID)

4. Vercel Production 환경변수에 위 4개 신규 값 등록

### 구현 사항

1. **요약 계산 로직 신설** (`src/lib/notify/summarize.ts`)
   - `collectFromSheet()` 실행 직후 얻는 당일 스냅샷(계좌별 principal/current/profit)을 입력으로, 연금 합계/개인투자 합계/전체 합계(금액+수익률)를 계산하는 순수 함수
   - **전일 대비** 계산을 위해 어제 날짜(`snapshot_date`) 스냅샷을 Supabase에서 추가 조회 필요 (`getSnapshotsByDate(date)` 신규 쿼리 함수, `queries.ts`에 추가)
   - 금액을 억 단위 소수점 2자리로 변환하는 포맷 함수(`formatEok`, 기존 `src/lib/format/round.ts`의 `roundTo2` 재사용 검토)

2. **메시지 빌더** (`src/lib/notify/message.ts`)
   - 카카오톡/Slack 공용 200자 이내 텍스트 빌더 (요구사항 문서의 이모지 포맷 그대로)
   - 구글 캘린더용 `summary`/`description` 빌더 (200자 제약 없음, 별도 포맷)

3. **카카오톡 전송** (`src/lib/notify/kakao.ts`)
   - refresh token으로 access token 갱신 (`/oauth/token`) → "나에게 보내기" 호출 (`/v2/api/talk/memo/default/send`, `template_object` 텍스트 타입)
   - 실패 시 예외를 던지지 않고 `{ success: false, error }` 형태로 반환

4. **Slack 전송** (`src/lib/notify/slack.ts`)
   - Webhook URL로 단순 POST (`{ text: "..." }`), 실패 시 동일하게 결과 객체로 반환

5. **구글 캘린더 등록** (`src/lib/notify/calendar.ts`)
   - 기존 `src/lib/google-sheets/client.ts`의 JWT 인증 패턴을 재사용하되 스코프에 `https://www.googleapis.com/auth/calendar` 추가
   - `googleapis`의 `calendar.events.insert` 호출 (colorId: "7", transparency: "transparent" ↔ AVAILABILITY_FREE)

6. **`/api/cron/collect` 통합**
   - `collectFromSheet()` 성공 후, 세 알림을 `Promise.allSettled`로 병렬 실행 (하나의 실패가 다른 것을 막지 않음)
   - 각 알림 결과를 응답 JSON에 `notifications: { kakao, slack, calendar }` 형태로 포함 (성공/실패 로그 확인용)
   - 알림 실패는 콘솔 에러 로그만 남기고 API 전체 응답은 여전히 200 유지 (수집 자체는 성공했으므로)

7. **dry-run 모드 확장**
   - 기존 `?dryRun=true`는 DB 쓰기 없이 파싱 결과만 반환 — 알림도 dry-run 시에는 전송하지 않도록 유지
   - 알림 자체만 테스트할 별도 쿼리 파라미터(`?notifyOnly=true` 등, 최근 DB 데이터로 메시지만 만들어 실제 전송) 필요 여부는 구현 단계에서 판단

### 수락 기준

- [ ] 200자 제한 메시지가 실제로 200자를 넘지 않는다 (긴 계좌명/큰 금액 상황 포함 경계 테스트)
- [ ] 카카오톡 access token 만료 시 refresh token으로 자동 갱신되어 전송이 계속 성공한다
- [ ] 카카오톡 전송 실패가 Slack/캘린더 전송을 막지 않는다 (역방향도 동일)
- [ ] 알림 3종 모두 실패해도 `/api/cron/collect`는 200과 함께 수집 결과(`accountCount` 등)를 정상 반환한다
- [ ] 전일 스냅샷이 없는 경우(최초 실행 등) 전일 대비 계산이 에러 없이 처리된다 (0 또는 "N/A" 처리)
- [ ] 구글 캘린더 이벤트가 `AVAILABILITY_FREE`(바쁨 표시 없음)로 등록되어 기존 일정과 충돌 표시가 안 뜬다
- [ ] 실제 프로덕션 크론 실행 1회로 세 알림이 모두 수신됨을 확인한다

### 관련 파일 (예정)

- `src/lib/notify/summarize.ts` (신규)
- `src/lib/notify/message.ts` (신규)
- `src/lib/notify/kakao.ts` (신규)
- `src/lib/notify/slack.ts` (신규)
- `src/lib/notify/calendar.ts` (신규)
- `src/lib/supabase/queries.ts` (전일 스냅샷 조회 함수 추가)
- `src/app/api/cron/collect/route.ts` (알림 호출 통합)
- `.env.local.example` (신규 환경변수 4개 추가)

### 주의사항

- 카카오 refresh token은 시크릿이므로 `.env.local`/Vercel 환경변수에만 저장하고 커밋 금지 (Google 서비스 계정 키와 동일한 취급)
- 카카오 "나에게 보내기"는 앱 관리자(본인) 계정으로만 전송 가능 — 다중 사용자 확장 시 별도 검토 필요하나 이 서비스는 1인용이므로 문제없음
- Slack Webhook URL도 시크릿에 준해 관리 (URL 자체가 인증 토큰 역할)
- 억 단위 변환 시 반올림 규칙은 기존 `roundTo2` 정책과 별개로 "소수 2자리 고정"이 요구사항이므로 신규 포맷 함수로 분리
- 프로덕션 첫 자동 실행 전, 로컬에서 실제 전송 테스트를 먼저 수행해 메시지 포맷/token 유효성을 검증할 것

## 다음 단계

이 계획에 대해 사용자 승인을 받은 뒤:
1. `docs/tasks/TASK-009.md`를 위 초안 기준으로 정식 작성
2. shrimp task manager에 `split_tasks`(append 모드)로 하위 작업 등록
3. 사전 준비(카카오/Slack/캘린더 키 발급)를 사용자가 먼저 진행
4. 코드 구현 → 로컬 실전송 테스트 → 프로덕션 배포 → 실제 크론 1회 실행 검증 순으로 진행
