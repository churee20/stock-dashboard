# Task 006: Google Sheets 수집 파이프라인 및 스케줄 등록 (Vercel Cron 기반) ✅ 완료(실연동 포함)

## 개요
- **목표**: Google 서비스 계정 인증으로 Google Sheets("1.투자현황(현재)" 탭, "4.계좌별 비중" 탭)를 읽어 `accounts`/`account_snapshots`에 upsert하는 수집 파이프라인을 구현하고, `/api/cron/collect` API Route로 노출한다.
- **관련 기능**: 데이터 수집 파이프라인(코드/API Route 구현까지)
- **의존성**: **Task 005(Supabase 연동 및 조회 API 개발) 완료 필요** — `createSupabaseServerClient()`, `database.ts`, `mappers.ts` 재사용
- **참조 문서**: `docs/PRD.md`(4.1, 6장, 7장), `docs/ROADMAP.md`, `docs/tasks/TASK-005.md`
- **이전 초안**: `docs/tasks/TASK-006-legacy-draft.md`(Service Role Key + 브라우저 세션 기반 초안, 아래 재논의 결과 폐기하고 본 문서로 대체)

> ⚠️ **범위**: 코드/API Route 구현에 더해, Task 006-2에서 **실제 서비스 계정 발급 및 Supabase 실데이터 반영까지 완료**했다. Vercel 프로젝트 연결, 환경변수 실등록, `vercel.json` Cron 스케줄 등록만 **Task 008(배포)**로 남아있다.
>
> ⚠️ **키 전략(재확인 완료)**: Task 005와 동일하게 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(anon key)를 재사용한다. RLS가 비활성 상태이므로 anon key로도 insert/upsert가 가능하다. Service Role Key는 발급하지 않는다. — *이전 초안(`TASK-006-legacy-draft.md`)은 Service Role Key 발급을 전제로 작성되어 있었으나, 계획 재논의 후 anon key 재사용으로 최종 확정했다.*
>
> ⚠️ **접근 방식(재확인 완료)**: `D:\00.은퇴계획\01.투자실적\agent.md`에 이미 운영 중인 **브라우저 세션(Claude in Chrome + gviz API) 기반 로컬 자동화**가 별도로 존재하지만, 본 Task는 이와 무관하게 **Google 서비스 계정 인증 + Vercel Cron 기반 서버리스 자동화**로 진행한다(PC 전원/로그인 세션에 의존하지 않기 위함, 사용자 재확인 완료). agent.md의 카카오톡/Slack/캘린더 알림, xlsx/HTML 산출물 기능은 본 Task 범위에 포함하지 않는다(PRD 9.2 Out of Scope).
>
> ✅ **실연동 완료(Task 006-2)**: 서비스 계정 발급, 실제 시트 구조 실측(`docs/tasks/TASK-006-2.md` 참고), parser.ts 재설계, 실제 Supabase 반영까지 완료했다. 아래 "실측 확정 사항" 섹션에 최종 구조를 기록한다.

---

## 실측 확정 사항 (Task 006-2에서 확인)

당초 agent.md(gviz CSV 기준, 별도 로컬 워크플로우) 참고로 추정했던 구조와 실제 Google Sheets API(v4) 응답 구조는 상당히 달랐다. 실측 후 확정한 내용:

- **탭 이름**: `1.투자 현황(현재)` (agent.md/PRD의 `1.투자현황(현재)`와 달리 "투자"와 "현황" 사이에 공백 포함)
- **조회 범위**: `1.투자 현황(현재)!A1:O123` — 1~123행에 활성 계좌 데이터, 124행 이후는 비활성/여백
- **행 구조**: 계좌당 여러 종목 상세 행 + 계좌 요약 "합 계" 행으로 구성(agent.md가 설명한 "계좌당 1행" 구조가 아님). 계좌명은 계좌의 **첫 종목 행에만** `계좌명\n(계좌번호)` 형태로 줄바꿈 포함 등장하고, 이후 종목 행들과 "합 계" 행에는 등장하지 않는다. 파서는 상태기계 방식으로 직전에 등장한 계좌명을 유지하다가 "합 계" 행을 만나면 해당 계좌의 요약으로 확정한다.
- **열 인덱스(0-base)**: `1`=계좌명/라벨, `10`=투자금액, `12`=조회금액(현재금액), `13`=수익금액, `14`=수익율(%) — 총 15열(구분, 금액, 국가, 코드, 항목, 자산구분, 총수량, 구매단가, 투자비중, 투자금액, 현재가, 조회금액, 수익금액, 수익율(%))
- **그룹 합산 행 판별 키워드**: `연금(합계)`, `개인 투자(합계)`, `전체(합계)` — 개별 계좌 요약("합 계")과 구분해 제외
- **실제 계좌 수**: 11개(시드 데이터 8종과 다름). 이 중 `처리 투자(삼성증권)`, `RIA 계좌`는 투자금액이 없어(`"- "` 표기) 자동 제외되고, `은퇴 투자(삼성증권)`는 데이터가 있지만 **사용자 요청으로 수집 대상에서 명시적으로 제외**(`EXCLUDED_ACCOUNTS` 상수). 최종 수집 대상은 **8개 계좌**로 기존 시드 데이터와 정확히 일치한다.
- **계좌명 표기 불일치**: 시드 데이터의 `DC계좌`/`처리투자(미래에셋)`/`ISA계좌`가 실제 시트에서는 `DC 계좌`/`처리 투자(미래에셋)`/`ISA 계좌`(공백 포함)로 표기되어, `syncAccounts()`의 문자열 완전일치 매칭이 실패하고 중복 계좌가 생성될 뻔했다. 사용자 승인 하에 기존 `accounts.account_name`을 시트 표기로 UPDATE해 통일했다(`docs/tasks/TASK-006-2.md` 참고).
- **계좌명/계좌번호 분리 스키마 통일**: `처리투자(미래에셋)`, `은퇴투자(미래에셋)` 2개 계좌는 시드 데이터에 세부식별자가 계좌명에 통짜로 포함되어 있었으나, 시트 파서는 `\n` 기준으로 계좌명/계좌번호를 분리해 저장한다(예: `계좌명="처리 투자"`, `계좌번호="미래에셋"`). 다른 6개 계좌와 스키마를 통일하기 위해 이 2개도 분리 형태로 UPDATE했다.
- **원본 스프레드시트**: `https://docs.google.com/spreadsheets/d/1ZroPOkUSwNqHiVWENaoVxlR6AK-AlBV3axVBscxZgRA/`
- **실연동 상세 진행 기록**: `docs/tasks/TASK-006-2.md` 참고 (dry-run 검증, 중복 계좌 발생/복구, 계좌명 통일 등 전체 과정)

---

## 구현 사항

### 1. Google Sheets 클라이언트 및 시트 파서 구현
- [x] `googleapis` 패키지 설치
- [x] `src/lib/google-sheets/client.ts`: `createGoogleSheetsClient()`(서비스 계정 JWT 인증, 환경변수 미설정 시 에러), `getGoogleSheetId()`, `fetchInvestmentSheetRows()`(시트 값 범위 읽기)
- [x] `src/lib/google-sheets/parser.ts`: `parseInvestmentSheet()` — 시트 원시 행을 중간 DTO로 변환하는 순수 함수. 계좌명 접두어 기준 연금/개인투자 분류, 합계 행(`연금(합계)`/`개인 투자(합계)`/`전체(합계)`)·빈 행 제외
- [x] `src/lib/types/sheets.ts`: `SheetAccountRow` 파싱 중간 타입 정의
- [x] `.env.local.example`에 `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SHEET_ID` 변수명 추가

### 2. Supabase upsert 로직 구현 (계좌 자동 등록 + 스냅샷 upsert)
- [x] `src/lib/types/mappers.ts`에 `mapSheetRowToAccountInsert`, `mapSheetRowToSnapshotInsert` App→Row 역방향 매퍼 추가
- [x] `src/lib/supabase/collect.ts`: `syncAccounts()`(계좌명 기준 매칭, 신규 계좌만 insert), `upsertSnapshots()`(`onConflict: 'account_id,snapshot_date'`), `collectFromSheet()`(진입점, `createSupabaseServerClient()` 재사용)

### 3. `/api/cron/collect` API Route 구현
- [x] `src/app/api/cron/collect/route.ts`: `Authorization: Bearer {CRON_SECRET}` 검증, 인증 실패 시 401, 성공 시 시트 읽기→파싱→upsert 실행 후 결과 JSON 응답
- [x] `.env.local.example`에 `CRON_SECRET` 변수명 추가
- [x] `CRON_SECRET` 미설정 시에도 인증 우회 없이 항상 거부되도록 처리(`!cronSecret` 선행 체크)

### 4. 로컬 수동 호출 검증 및 문서화
- [x] `npm run typecheck`/`lint`/`build` 통과(빌드 결과 `/api/cron/collect`가 Dynamic 라우트로 정상 생성됨)
- [x] curl로 인증 실패(헤더 없음/불일치) 401 확인
- [x] curl로 인증 성공 후 서비스 계정 미설정 에러 응답 확인(`"Google 서비스 계정 환경변수가 설정되지 않았습니다"`, 500)
- [x] 본 `TASK-006.md`를 구현 완료 후 실제 산출물 기준으로 갱신

---

## 수락 기준

1. [x] `createGoogleSheetsClient()`가 환경변수 미설정 시 명확한 에러를 던진다
2. [x] `parseInvestmentSheet()`가 any 타입 없이 순수 함수로 구현되고, 합계 행(`(합계)` 포함)을 개별 계좌와 구분해 제외한다
3. [x] `syncAccounts()`가 신규 계좌만 insert하고 기존 계좌는 재사용한다
4. [x] `upsertSnapshots()`가 `(account_id, snapshot_date)` 기준 upsert로 PRD 6.3 규칙(동일 계좌+동일 수집일은 갱신, 중복 row 생성 금지)을 만족한다
5. [x] `/api/cron/collect`가 `CRON_SECRET` 불일치/누락 시 401을 반환한다(curl로 확인)
6. [x] `npm run typecheck`, `npm run lint`, `npm run build`가 에러 없이 통과한다
7. [x] any 타입 사용 없음, Service Role Key 미사용(anon key만 사용), 기존 4개 화면/컴포넌트/조회 쿼리 무변경

---

## 관련 파일

### 생성할 파일
```
src/lib/google-sheets/
├── client.ts           # Google Sheets API 클라이언트(서비스 계정 인증)
└── parser.ts            # 시트 파싱 순수 함수

src/lib/types/sheets.ts   # 파싱 중간 DTO 타입
src/lib/supabase/collect.ts  # 계좌 자동 등록 + 스냅샷 upsert 서비스
src/app/api/cron/collect/route.ts  # 수집 트리거 API Route
```

### 수정할 파일
```
package.json             # googleapis 의존성 추가
src/lib/types/mappers.ts # App/Sheet -> Row Insert 페이로드 역매퍼 추가
.env.local.example       # GOOGLE_SERVICE_ACCOUNT_*, GOOGLE_SHEET_ID, CRON_SECRET 변수명 추가
docs/tasks/TASK-006.md   # 본 문서(구현 완료 후 갱신)
docs/ROADMAP.md          # Task 006 진행 상황 갱신
```

### 참조(변경 없음)
```
src/lib/supabase/client.ts   # createSupabaseServerClient 재사용
src/lib/types/database.ts    # AccountRow/AccountSnapshotRow 재사용
supabase/migrations/20260720000000_create_accounts_and_snapshots.sql  # unique(account_id, snapshot_date) 제약 확인
D:\00.은퇴계획\01.투자실적\agent.md  # 시트 열 구조/계좌 분류 참고(별도 워크플로우, 실행 대상 아님)
```

---

## 구현 단계

### Step 1: Google Sheets 클라이언트/파서
1. `googleapis` 설치, `client.ts`/`parser.ts`/`sheets.ts` 작성
2. `npm run typecheck`로 확인

### Step 2: Supabase upsert 로직
1. `mappers.ts`에 역매퍼 추가
2. `collect.ts`에 `syncAccounts`/`upsertSnapshots`/`collectFromSheet` 구현

### Step 3: API Route
1. `route.ts` 구현, `CRON_SECRET` 인증 분기
2. `.env.local.example` 갱신

### Step 4: 로컬 검증 및 문서화
```bash
npm run typecheck
npm run lint
npm run build
```
1. 개발 서버 구동 후 curl로 인증 실패/성공 케이스 확인
2. `TASK-006.md`, `docs/ROADMAP.md` 갱신

---

## 로컬 검증 결과

| 시나리오 | 요청 | 결과 |
|---|---|---|
| 인증 헤더 없음 | `curl http://localhost:3000/api/cron/collect` | `401 {"error":"Unauthorized"}` |
| 잘못된 `CRON_SECRET` | `Authorization: Bearer wrong-secret` | `401 {"error":"Unauthorized"}` |
| 정상 `CRON_SECRET`(로컬 임시값) | `Authorization: Bearer local-dev-test-secret` | `500 {"success":false,"error":"Error: Google 서비스 계정 환경변수가 설정되지 않았습니다"}` |

`npm run build` 결과 `/api/cron/collect`가 Dynamic 라우트(`ƒ`)로 정상 생성됨을 확인. 검증에 사용한 임시 `CRON_SECRET`은 검증 직후 `.env.local`에서 제거했다.

---

## 주의사항

1. **Vercel Cron 실등록은 범위 밖**: `vercel.json` Cron 스케줄 등록과 실제 Vercel 배포 연동은 Task 008에서 진행한다
2. **accounts 테이블 동시성 리스크**: unique 제약이 없어 이론상 동시 실행 시 중복 insert 가능성이 있으나, 1인용 cron 단일 실행 특성상 낮은 리스크로 판단해 이번 범위에서는 별도 락 처리를 하지 않는다
3. **키 전략**: anon/publishable key만 사용, Service Role Key는 발급하지 않는다
4. **agent.md와는 독립적인 별도 파이프라인**: 브라우저 세션 기반 로컬 자동화(agent.md)는 계속 별도로 운영되며, 본 Task의 서버리스 파이프라인이 이를 대체하거나 수정하지 않는다
5. **any 타입 금지**: 전역 규칙 준수
6. **`.env.local`의 `CRON_SECRET`은 로컬 개발용 임시값**: 실제 Vercel 배포 시(Task 008) 별도의 프로덕션용 시크릿으로 교체해야 한다
7. **dry-run 모드(`?dryRun=true`)는 정식 기능으로 유지**: 향후 시트 구조가 바뀌거나 파서 검증이 필요할 때 DB 쓰기 없이 원시 데이터/파싱 결과를 확인할 수 있다

---

## 다음 단계

Task 006 완료 후:
1. **Task 006-1**: 핵심 기능 통합 테스트 (완료)
2. **Task 006-2**: Google Sheets 실제 연동 (완료 — `docs/tasks/TASK-006-2.md` 참고)
3. **Task 007**: 데이터 정합성 및 운영 안정성 강화
4. **Task 008**: Vercel 배포 시 `vercel.json` Cron 스케줄 등록 및 환경변수 실등록(프로덕션용 `CRON_SECRET`, 서비스 계정 키 포함)
