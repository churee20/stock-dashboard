# 주식 실적 플래너 (Investment Dashboard)

구글 스프레드시트의 투자 실적/배당 데이터를 자동 수집해 Supabase에 이력을 쌓고, Vercel에 배포된 웹에서 계좌별 실적을 대시보드·일별·주별·월별·배당실적으로 조회하는 1인용 투자 통계 서비스입니다. 수집이 완료될 때마다 카카오톡·Slack·구글 캘린더로 요약 알림을 자동 발송합니다.

상세 요구사항은 [`docs/PRD.md`](./docs/PRD.md), 개발 이력은 [`docs/ROADMAP.md`](./docs/ROADMAP.md)를 참고하세요.

---

## 1. 아키텍처 구성

```
[Google Sheets]                              [Google Sheets]
 투자실적/자산비중 시트                         배당 시트(별도 문서)
        │                                            │
        └──────────────┬─────────────────────────────┘
                        ▼
        [Vercel Cron: 평일 KST 16:00]
                        │
                        ▼
        [/api/cron/collect API Route]
         - CRON_SECRET 인증
         - Google Sheets API로 시트 조회/파싱
         - Supabase에 upsert(계좌/스냅샷/자산군/배당)
                        │
          ┌─────────────┼─────────────────────┐
          ▼             ▼                     ▼
   [Supabase(Postgres)]                [알림 자동 발송]
    accounts                            카카오톡 "나에게 보내기"
    account_snapshots                   Slack Incoming Webhook
    asset_class_snapshots               Google Calendar 이벤트 등록
    dividend_snapshots                  (Promise.allSettled, 부분 실패 허용)
          │
          ▼
   [Next.js 웹 애플리케이션] ── Vercel 배포, 조회 전용(Server Component)
          │
          ▼
   [사용자 브라우저]
    현재실적 / 일별추적 / 주별추적 / 월별실적 / 배당실적
```

**핵심 설계 원칙**
- 수집(쓰기)과 조회(읽기)는 완전히 분리된 경로 — 수집 실패가 조회 화면에 영향을 주지 않음
- 알림 3종(카카오톡/Slack/구글캘린더)은 서로 독립 실행 — 하나가 실패해도 나머지와 수집 성공 응답에는 영향 없음
- 동일 계좌·동일 날짜(배당은 +종목코드) 데이터는 upsert — 재수집해도 중복 row가 생기지 않음
- 웹 앱은 조회 전용(read-only) — 데이터 입력/수정은 스케줄 수집 파이프라인이 전담

---

## 2. 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 16 (App Router, Turbopack) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS v4, shadcn/ui |
| 차트 | Recharts |
| 폼 | React Hook Form + Zod |
| 날짜 | dayjs (+ isoWeek, utc, timezone 플러그인) |
| 데이터베이스 | Supabase (PostgreSQL) |
| 데이터 수집 | googleapis (Google Sheets API, 서비스 계정 JWT 인증) |
| 알림 | 카카오 REST API, Slack Incoming Webhook, Google Calendar API |
| 배포/스케줄 | Vercel, Vercel Cron |

---

## 3. 소스 구조

```
src/
├── app/                          # Next.js App Router (라우트별 page.tsx는 Server Component)
│   ├── page.tsx                  # 현재 실적 (대시보드)
│   ├── daily/page.tsx            # 일별 추적
│   ├── weekly/page.tsx           # 주별 추적
│   ├── monthly/page.tsx          # 월별 실적
│   ├── dividend/page.tsx         # 배당실적
│   ├── api/cron/collect/route.ts # 수집+알림 진입점 (Vercel Cron이 호출)
│   ├── layout.tsx                # 공통 레이아웃(헤더+탭), TooltipProvider
│   └── error.tsx                 # 전역 에러 폴백 UI
│
├── components/
│   ├── dashboard/                # 대시보드 전용 컴포넌트(요약카드, 도넛차트, 상세테이블 등)
│   ├── period-view/               # 일/주/월별 화면 공용 컨테이너(필터+차트+테이블)
│   ├── dividend/                 # 배당실적 전용 컴포넌트(스택차트, 리스트, 종목 다중선택)
│   ├── charts/                   # 공용 차트 래퍼(DonutChart, TrendLineChart, ChartContainer)
│   ├── tables/                   # 공용 테이블(GroupedDetailTable, PeriodTable 등)
│   ├── forms/                    # 공용 폼(AccountMultiSelect, DateRangePicker, MonthRangeSelect)
│   ├── layout/                   # 헤더
│   ├── navigation/                # 탭 내비게이션(MainNav)
│   └── ui/                       # shadcn/ui 원자 컴포넌트
│
├── lib/
│   ├── types/                    # 타입 정의
│   │   ├── database.ts           # Supabase Row 타입(snake_case)
│   │   ├── account.ts, dividend.ts, dashboard.ts, period-view.ts, sheets.ts, api.ts
│   │   └── mappers.ts            # Row ↔ App 타입 변환 함수
│   ├── supabase/
│   │   ├── client.ts             # createSupabaseServerClient (서버 전용)
│   │   ├── queries.ts            # 조회 함수 (getAccounts, getDividendSnapshots 등)
│   │   └── collect.ts            # upsert 로직 (syncAccounts, upsertSnapshots, upsertDividendSnapshots)
│   ├── google-sheets/
│   │   ├── client.ts             # 서비스 계정 인증, 시트별 fetch 함수
│   │   └── parser.ts             # 시트 원시 데이터 → 중간 DTO 파싱
│   ├── notify/
│   │   ├── summarize.ts          # 그룹 합계/전일대비 계산
│   │   ├── message.ts            # 카카오톡·Slack·캘린더 메시지 빌더
│   │   ├── kakao.ts / slack.ts / calendar.ts  # 채널별 전송 모듈
│   │   └── types.ts
│   ├── format/                   # roundTo2/formatPercent(표시용 반올림), formatKst(타임존 변환)
│   └── dummy-data/                # 초기 개발용 더미 데이터(현재는 미사용, 참고용)
│
supabase/
└── migrations/                   # DB 스키마 변경 이력(SQL, 시간순 적용)

docs/                             # 아래 4장 참고
```

---

## 4. 문서(`docs/`) 위치 및 설명

| 경로 | 설명 |
|---|---|
| `docs/PRD.md` | 제품 요구사항 정의서. 기능/비기능 요구사항, 데이터 모델, 범위(In/Out of Scope), 리스크. 기능이 추가될 때마다 갱신되는 **최신 상태 기준 문서** |
| `docs/ROADMAP.md` | 개발 로드맵 겸 진행 이력. Phase/Task 단위로 완료된 작업을 체크 표시로 기록. 프로젝트 진행 상황을 가장 빠르게 파악할 수 있는 문서 |
| `docs/tasks/TASK-XXX.md` | Task별 상세 작업 명세서. 개요/구현사항/수락기준/관련파일/주의사항/디버깅 노트로 구성. Task 006/007은 하위 세분화(-1, -2)가 있음 |
| `docs/plans/PLAN-TASK-XXX-*.md` | 신규 Task 착수 전 작성하는 계획 문서. 요구사항 분석, 확정된 결정 사항, 열린 질문을 기록(구현 시작 전 스냅샷) |
| `docs/guides/*.md` | Next.js 15+, 폼(React Hook Form), 컴포넌트 패턴, 스타일링, 프로젝트 구조에 대한 개발 가이드 |
| `docs/ISSUES.md` | 인증 관련 이슈 메모(현재 placeholder) |
| `docs/AUTH_TESTING_GUIDE.md` | 인증 테스트 가이드 |
| `01.요구사항/` | 원본 요구사항 파일(엑셀/PPT/텍스트) — PRD와 TASK 문서의 근거 자료 |

**Task 진행 순서 요약** (상세는 `docs/ROADMAP.md` 참고):

| Task | 내용 |
|---|---|
| 001~004 | 프로젝트 골격, 공통 컴포넌트, 4개 화면 UI(더미 데이터) |
| 002, 005 | 타입/DB 스키마 설계, Supabase 연동 및 실 데이터 전환 |
| 006, 006-1, 006-2 | Google Sheets 수집 파이프라인 구현 및 실제 연동 |
| 007, 007-1 | 데이터 정합성/운영 안정성 강화, 투자원금 소스 변경, 자산군 비중 |
| 008 | Vercel Cron 등록 (평일 KST 16:00 자동 수집) |
| 009 | 카카오톡/Slack/구글캘린더 수집 완료 알림 자동화 |
| 010 | 배당실적 화면 신규 개발 |

---

## 5. 데이터베이스 스키마

`supabase/migrations/`에 시간순으로 적용된 마이그레이션:

| 테이블 | 역할 | 유니크 키 |
|---|---|---|
| `accounts` | 계좌 마스터(계좌명, 마스킹 계좌번호, 계좌구분) | - |
| `account_snapshots` | 계좌별 일별 실적 이력(투자원금/현재금액/수익금액/수익률) | `(account_id, snapshot_date)` |
| `asset_class_snapshots` | 자산군별(반도체/채권/미국배당 등) 비중 스냅샷 | `(asset_class, snapshot_date)` |
| `dividend_snapshots` | 계좌·종목별 배당 지급 스냅샷 | `(account_id, stock_code, payment_date)` — 한 계좌가 같은 날 여러 종목 배당을 받을 수 있어 종목코드까지 포함 |

---

## 6. 환경변수

`.env.local.example` 참고, 실제 값은 `.env.local`(로컬)과 Vercel Production 환경변수에 설정합니다.

| 변수 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 클라이언트 연결(anon key) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Google Sheets/Calendar API 서비스 계정 인증 |
| `GOOGLE_SHEET_ID` | 투자실적 스프레드시트 ID |
| `GOOGLE_DIVIDEND_SHEET_ID` | 배당 스프레드시트 ID(별도 문서) |
| `CRON_SECRET` | `/api/cron/collect` 무단 호출 차단용 인증 토큰 |
| `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `KAKAO_REFRESH_TOKEN` | 카카오 "나에게 보내기" 알림 |
| `SLACK_WEBHOOK_URL` | Slack 알림 |
| `GOOGLE_CALENDAR_ID` | 구글 캘린더 이벤트 등록 대상 캘린더 |

---

## 7. 개발 명령어

```bash
npm run dev         # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
```

**수집 파이프라인 수동 호출**
```bash
# dry-run: DB 쓰기/알림 발송 없이 시트 파싱 결과만 확인
curl "http://localhost:3000/api/cron/collect?dryRun=true" -H "Authorization: Bearer $CRON_SECRET"

# 실제 수집: DB 반영 + 카카오톡/Slack/구글캘린더 알림이 실제로 발송됨(주의)
curl "http://localhost:3000/api/cron/collect" -H "Authorization: Bearer $CRON_SECRET"
```

---

## 8. 배포

- **호스팅**: Vercel (GitHub 연동, `main` 브랜치 push 시 자동 재배포)
- **스케줄**: `vercel.json`에 등록된 Cron이 평일(월~금) KST 16:00(UTC 07:00)에 `/api/cron/collect` 자동 호출
- **주의**: 4개 조회 화면과 `/dividend`는 `export const dynamic = "force-dynamic"`(`layout.tsx`)로 매 요청마다 서버에서 새로 렌더링됨 — 이 설정이 없으면 Next.js가 빌드 시점에 정적 페이지로 고정해 크론이 새 데이터를 수집해도 화면이 갱신되지 않는 문제가 있었음(TASK 이력 참고)
