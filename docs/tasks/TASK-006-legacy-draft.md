# Task 006: Google Sheets 수집 파이프라인 및 스케줄 등록 (Vercel Cron 기반)

## 개요
- **목표**: Google Sheets의 투자 실적 데이터를 서버 사이드에서 자동으로 읽어와 Supabase에 일별 스냅샷으로 적재하는 파이프라인을 구축하고, Vercel Cron으로 매일 자동 실행되도록 스케줄을 등록한다
- **관련 기능**: 데이터 수집 전체 파이프라인 (Google Sheets → 파싱 → Supabase upsert)
- **의존성**: Task 002(타입 정의 및 DB 스키마 설계) 완료 필요 — `accounts`, `account_snapshots` 테이블 존재 전제
- **참조 문서**: `docs/PRD.md`(4.1, 6, 7, 10장), `docs/ROADMAP.md`

> ⚠️ **PRD와의 차이점**: PRD 4.1/8/10장은 "Claude Code(Windows) 스케줄 작업" 기반 수집을 전제로 작성되었으나, 본 Task는 **Vercel Cron + Google 서비스 계정 인증** 방식으로 진행한다. PC 전원 상태에 의존하지 않는 완전 자동화를 위해서다 (PRD 10장의 "스케줄 실행 환경 의존성" 리스크를 해소하는 방향). Task 착수 시 PRD도 이 방식으로 함께 갱신한다.

---

## 배경: agent.md 기존 로컬 워크플로우와의 관계

기존에 로컬 Windows PC에서 Claude Code + Claude in Chrome으로 운영되던 `agent.md` 자동화(경로: `D:\00.은퇴계획\01.투자실적\agent.md`)가 있다. 이 워크플로우는 브라우저 로그인 세션을 이용해 gviz API로 시트를 읽고 xlsx/HTML 파일을 직접 갱신하는 방식으로, Vercel 서버리스 환경에는 그대로 이식할 수 없다 (서버에는 브라우저도 로그인 세션도 없음).

**재사용 가능한 부분** (agent.md에서 그대로 참고):
- 시트 열 구조: `"","계좌명","투자원금","","","","","","","calc_inv","","현재금액","수익금액","수익률%",""`
- 계좌 분류 체계: 연금(퇴직연금, 개인연금(기존/신), DC계좌 등) vs 개인투자(처리투자, 은퇴투자, ISA계좌 등)
- 합계 행 판별 키워드: `연금(합계)`, `개인 투자(합계)`, `전체(합계)`
- 억 단위 표시 규칙(÷1억), 월별 신규 행 판단(한국 주식시장 첫 거래일) 등 비즈니스 규칙

**재사용 불가능한 부분** (본 Task에서 새로 구현):
- 인증 방식: 브라우저 세션 → **Google 서비스 계정(Service Account)**
- 저장 방식: xlsx/json 파일 → **Supabase upsert**
- 트리거: 사람/에이전트 수동 실행 → **Vercel Cron 자동 실행**
- 알림(카카오톡/Slack/캘린더)은 범위 밖 (PRD 9.2 Out of Scope)

---

## 구현 사항

### 1. Google Cloud 서비스 계정 준비 (수동 설정, 코드 작업 아님)
- [ ] Google Cloud Console에서 프로젝트 생성 (또는 기존 프로젝트 사용)
- [ ] Google Sheets API 활성화
- [ ] 서비스 계정 생성 후 JSON 키 발급
- [ ] 대상 스프레드시트(`1ZroPOkUSwNqHiVWENaoVxlR6AK-AlBV3axVBscxZgRA`)에 서비스 계정 이메일을 **뷰어 권한**으로 공유
- [ ] 발급받은 JSON 키의 `client_email`, `private_key`를 환경변수로 분리 보관 준비

### 2. 환경변수 설정
- [ ] `.env.local`(로컬 개발용, `.gitignore`에 이미 포함되어 있는지 확인)에 아래 항목 추가
  ```
  GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
  GOOGLE_SHEET_ID=1ZroPOkUSwNqHiVWENaoVxlR6AK-AlBV3axVBscxZgRA
  SUPABASE_SERVICE_ROLE_KEY=xxx
  CRON_SECRET=xxx  # Vercel Cron 요청 검증용 임의 문자열
  ```
- [ ] Vercel 프로젝트 설정(Environment Variables)에도 동일 항목 등록 (Production/Preview 분리 고려)
- [ ] `src/lib/env.ts`에 필수 환경변수 검증 로직 추가 (Zod 스키마로 누락 시 빌드/런타임 에러 발생)

### 3. Google Sheets 읽기 모듈 구현
- [ ] `googleapis` 패키지 설치 (`npm install googleapis`)
- [ ] `src/lib/google-sheets/client.ts`: 서비스 계정 인증으로 Sheets API 클라이언트 생성
- [ ] `src/lib/google-sheets/fetch-sheet.ts`: 지정 시트 탭(`1.투자현황(현재)`, `4.계좌별 비중`)의 값 범위를 읽어 2차원 배열로 반환
- [ ] 시트 구조는 agent.md의 열 구조를 기준으로 파싱 (계좌명/투자원금/현재금액/수익금액/수익률% 컬럼 위치 확인)

### 4. 파싱 및 변환 로직 구현
- [ ] `src/lib/google-sheets/parse-accounts.ts`: 원시 시트 행 → `Account`/`AccountSnapshot` 타입(Task 002 정의)으로 변환
  - 계좌명으로 연금/개인투자 구분 (agent.md 계좌 목록 기준: 퇴직연금, 개인연금(기존/신), DC계좌 → 연금 / 처리투자, 은퇴투자, ISA계좌 → 개인투자)
  - 합계 행(`(합계)` 포함 행)은 별도 집계용으로만 사용하고 `accounts` 테이블에는 개별 계좌만 저장
  - 금액/수익률 숫자 파싱 시 콤마, 통화 기호 등 제거 후 `number` 변환
- [ ] `src/lib/google-sheets/validate-sheet.ts`: 시트 구조 검증 (필수 컬럼 존재 여부, 계좌 수 최소값 등) — 구조가 깨진 경우 명확한 에러 메시지와 함께 파이프라인 중단

### 5. Supabase Upsert 로직 구현
- [ ] `src/lib/supabase/admin-client.ts`: Service Role Key를 사용하는 서버 전용 Supabase 클라이언트 (절대 클라이언트 번들에 노출되지 않도록 `server-only` 패키지로 가드)
- [ ] `src/lib/supabase/upsert-snapshot.ts`:
  - `accounts`: 계좌명 기준으로 존재하지 않으면 신규 등록(자동 동기화), 존재하면 유지
  - `account_snapshots`: `(account_id, snapshot_date)` 유니크 제약 기준 upsert — 동일 계좌·동일 날짜면 갱신, 다르면 신규 행 추가
- [ ] 트랜잭션 처리: 계좌 동기화와 스냅샷 upsert를 하나의 트랜잭션으로 묶어 부분 실패 방지 (Supabase RPC 함수 또는 순차 실행 후 실패 시 롤백 로직)

### 6. 수집 API Route 구현
- [ ] `src/app/api/cron/collect/route.ts` (Next.js Route Handler, `GET` 또는 `POST`)
  - Vercel Cron 요청 검증: `Authorization: Bearer ${CRON_SECRET}` 헤더 확인
  - 위 3~5단계 모듈을 순서대로 호출: 시트 읽기 → 검증 → 파싱 → upsert
  - 각 단계 실행 결과를 로그로 기록 (성공/실패, 처리된 계좌 수, 소요 시간)
  - 실패 시 500 응답 + 에러 상세를 응답 바디에 포함 (Vercel 로그에서 확인 가능하도록)
  - 성공 시 200 응답 + 수집 요약(수집 시각, 계좌 수, 총 현재금액 등) 반환

### 7. Vercel Cron 스케줄 등록
- [ ] `vercel.json`에 cron 설정 추가
  ```json
  {
    "crons": [
      { "path": "/api/cron/collect", "schedule": "0 7 * * 1-5" }
    ]
  }
  ```
  - Vercel Cron은 UTC 기준이므로 한국시간(KST, UTC+9) 오후 4시 = UTC 07:00으로 환산
  - 무료 플랜은 하루 1회 실행 제한 및 실행 시각 오차가 있을 수 있으므로, 정시 실행이 중요하면 Pro 플랜 권장 (PRD 리스크 항목에 반영)
- [ ] Vercel 배포 후 Cron 대시보드에서 등록 확인

### 8. 수집 실패 대비 폴백 처리
- [ ] 조회 화면(대시보드 등)은 최신 성공 스냅샷을 그대로 조회하므로, 수집 실패 시에도 화면이 깨지지 않음을 확인 (PRD 7장 가용성 요구사항)
- [ ] 수집 실패 로그를 확인할 수 있는 최소 수단 마련 (Vercel 함수 로그 확인 방법을 `docs/guides`에 기록하거나, 실패 시 별도 로그 테이블(`collection_logs`)에 기록하는 방식 중 택1 — 구현 단계에서 결정)

---

## 수락 기준

1. [ ] 서비스 계정 인증으로 Google Sheets API를 통해 시트 데이터를 정상적으로 읽어온다 (브라우저/로그인 세션 불필요)
2. [ ] 시트의 계좌별 행이 `accounts`/`account_snapshots` 테이블에 정확히 upsert된다 (신규 계좌 자동 등록, 동일 날짜 재실행 시 중복 row 생성 없음)
3. [ ] `/api/cron/collect`를 수동 호출(`curl` 또는 Postman, `CRON_SECRET` 포함)하면 정상적으로 수집 파이프라인이 실행되고 200 응답을 반환한다
4. [ ] `CRON_SECRET` 없이 호출하면 401/403으로 거부된다
5. [ ] Vercel 배포 후 Cron 스케줄이 등록되어 지정 시각에 자동 실행된다 (Vercel 대시보드 Cron 로그로 확인)
6. [ ] 시트 구조가 예상과 다를 경우(컬럼 누락 등) 파이프라인이 명확한 에러로 중단되고, 기존 DB 데이터는 훼손되지 않는다
7. [ ] 수집 실패 후에도 웹 대시보드는 마지막 성공 데이터로 정상 렌더링된다
8. [ ] `npm run typecheck`, `npm run lint`, `npm run build`가 에러 없이 통과한다
9. [ ] any 타입 사용 없음, Service Role Key가 클라이언트 번들에 포함되지 않음(빌드 결과물 검사로 확인)

---

## 관련 파일

### 생성할 파일
```
src/
├── app/
│   └── api/
│       └── cron/
│           └── collect/
│               └── route.ts          # 수집 파이프라인 실행 API Route
├── lib/
│   ├── google-sheets/
│   │   ├── client.ts                 # 서비스 계정 인증 클라이언트
│   │   ├── fetch-sheet.ts            # 시트 값 읽기
│   │   ├── parse-accounts.ts         # 파싱/변환
│   │   └── validate-sheet.ts         # 구조 검증
│   └── supabase/
│       ├── admin-client.ts           # Service Role 클라이언트 (server-only)
│       └── upsert-snapshot.ts        # accounts/account_snapshots upsert
vercel.json                            # Cron 스케줄 설정
```

### 수정할 파일
```
src/lib/env.ts                         # 신규 환경변수 검증 추가
docs/PRD.md                            # 4.1, 8장, 10장 수집 방식을 Vercel Cron 기준으로 갱신
.env.local (로컬 전용, 커밋 금지)
```

---

## 구현 단계

### Step 1: Google Cloud 서비스 계정 설정 (수동)
1. Google Cloud Console → 프로젝트 생성/선택 → Sheets API 활성화
2. 서비스 계정 생성 → JSON 키 다운로드
3. 대상 시트에 서비스 계정 이메일 뷰어로 공유
4. `.env.local`에 이메일/프라이빗 키/시트 ID 등록

### Step 2: Google Sheets 읽기 모듈
1. `googleapis` 설치
2. `client.ts`, `fetch-sheet.ts` 작성 후 로컬에서 `console.log`로 원시 데이터 수집 확인

### Step 3: 파싱 로직
1. agent.md 열 구조 기준으로 `parse-accounts.ts` 작성
2. `validate-sheet.ts`로 구조 검증 추가
3. 단위 테스트 또는 로컬 스크립트로 실제 시트 데이터 파싱 결과 검증

### Step 4: Supabase 연동
1. `admin-client.ts` 작성 (`server-only` import로 클라이언트 노출 방지)
2. `upsert-snapshot.ts` 작성 및 로컬에서 1회 수동 실행하여 DB 적재 확인

### Step 5: API Route 및 Cron 등록
1. `route.ts` 작성, `CRON_SECRET` 검증 포함
2. 로컬에서 `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/collect` 로 테스트
3. `vercel.json` cron 설정 추가 후 배포
4. Vercel 대시보드에서 Cron 등록 및 최초 실행 결과 확인

### Step 6: 폴백 및 에러 처리 검증
1. 시트 컬럼을 임시로 변경해 파싱 실패 시나리오 테스트 (로컬)
2. 실패 시에도 기존 대시보드 조회가 정상 동작하는지 확인

### Step 7: PRD 갱신
1. PRD 4.1/8/10장을 Vercel Cron 방식으로 수정
2. `docs/ROADMAP.md` Task 006 설명에 Vercel Cron 방식임을 명시

---

## 테스트 체크리스트 (Playwright MCP)

> API/비즈니스 로직 작업이므로 필수 포함. 단, 실제 Google Sheets/Cron 트리거는 Playwright로 검증 불가한 영역이 있어 수동 검증과 병행한다.

- [ ] `/api/cron/collect`를 유효한 `CRON_SECRET`으로 호출 시 200 응답과 함께 수집 요약 JSON이 반환되는지 확인
- [ ] `CRON_SECRET` 누락/오류 시 401/403 응답을 반환하는지 확인
- [ ] 수집 성공 후 대시보드(`/`) 페이지를 재조회하여 최신 수집 데이터가 반영되는지 확인 (요약 카드 금액이 시트 값과 일치)
- [ ] 동일 날짜에 API를 재호출했을 때 `account_snapshots`에 중복 row가 생기지 않고 값만 갱신되는지 확인 (Supabase 조회로 row 수 검증)
- [ ] 신규 계좌가 시트에 추가된 상황을 가정하여 `accounts` 테이블에 자동 등록되는지 확인
- [ ] 수집 파이프라인 강제 실패(예: 잘못된 시트 ID) 후에도 대시보드/일별/주별/월별 화면이 에러 없이 마지막 데이터로 렌더링되는지 확인
- [ ] 시트 구조 오류(필수 컬럼 누락) 상황에서 API가 명확한 에러 메시지로 실패하고 DB에 잘못된 데이터가 적재되지 않는지 확인

---

## 주의사항

1. **Service Role Key 절대 클라이언트 노출 금지**: `admin-client.ts`는 `server-only` 패키지로 감싸 클라이언트 컴포넌트에서 실수로 import 시 빌드 타임에 에러가 나도록 강제
2. **Private Key 개행 문자 처리**: 환경변수에 저장된 `private_key`는 `\n`이 문자열 그대로 들어가므로 코드에서 `.replace(/\\n/g, '\n')` 처리 필요
3. **CRON_SECRET 검증 필수**: `/api/cron/collect`는 인증 없이 호출 가능한 공개 URL이므로 반드시 시크릿 검증 후 실행 (Vercel Cron은 자동으로 이 헤더를 붙여 호출하도록 설정 가능)
4. **any 타입 금지**: 전역 규칙 준수, Google Sheets API 응답은 명시적 타입/Zod 스키마로 검증
5. **PRD와 실제 구현 간 불일치 방지**: 본 Task 착수 시 PRD 4.1/8/10장을 반드시 함께 갱신하여 문서-코드 정합성 유지
6. **agent.md는 참고 자료일 뿐 실행 대상 아님**: 로컬 xlsx/카카오톡/Slack/캘린더 연동은 본 Task 범위에 포함하지 않음 (PRD 9.2 Out of Scope)

---

## 다음 단계

Task 006 완료 후:
1. **Task 006-1**: 핵심 기능 통합 테스트 (전체 사용자 플로우 + 실 데이터 검증)
2. **Task 007**: 데이터 정합성 및 운영 안정성 강화 (반올림 규칙, 주/월 집계 기준 확정)
