# Task 011: "투자 수익" 메뉴 신규 개발 (종목 현황 + 계좌별 월간 수익율 백필) ✅ 완료

## 개요
- **목표**: (1) 구글시트 "종목별 실적&비중"을 매일 수집·누적하는 신규 테이블 신설, (2) 엑셀 "자산 투자 수익율(합계).xlsx"의 계좌별 월간 이력을 `account_snapshots`에 백필, (3) "현재 실적" 다음 메뉴로 "투자 수익" 신규 추가 및 3개 탭(계좌별 월간수익율/종목별비중/종목별변동리스트) 구현. 기존 메뉴 라벨 "일별 추적"→"일별 실적", "주별 추적"→"주별 실적" 수정 포함
- **관련 기능**: Google Sheets 수집 파이프라인(Task 006/009/010)에 종목 데이터 소스 추가, 기존 `PeriodViewContainer`/`chart-container`/`AccountMultiSelect`/`DateRangePicker` 패턴 재사용
- **참조 문서**: `01.요구사항/자산 투자 수익율(합계).xlsx`, `01.요구사항/포트폴리오구성.pptx`, `01.요구사항/투자비중.png`, 구글시트 `16I7Pmj0YIFSjz7qHLFYrTZ1orNaLGERP7PGuJkgQWV0`("2. 종목현황" 탭), `docs/plans/PLAN-TASK-011-투자수익메뉴.md`

---

## 사전 조사 결과 (실측 확정값)

- 엑셀 "0.계좌별 수익율"/"2.투자 실적" 시트의 계좌명 10종이 DB `accounts` 10개와 계좌번호 기준으로 정확히 1:1 대응됨(매칭표는 계획 문서 참고)
- "퇴직연금(삼성증권)" 블록은 당초 "2025-06부터 백필"로 안내했으나, 실측 재확인 결과 컬럼 매핑 착오였음이 드러나 정정 — 실제로는 **2025-12부터** 데이터가 존재하고 그 이전은 시트 자체가 공란이라 별도 조치 없이 자동 제외됨
- DB에는 이미 2026-07-21부터 일별 실 데이터가 있어, 엑셀 백필은 **2026-06 이전 데이터만** 대상으로 함(월말일을 `snapshot_date`로 사용) — 총 162행(10계좌, 최대 2024-07~2026-06)
- 구글시트 "종목별 실적&비중" 섹션 실측 위치: 스프레드시트 `16I7Pmj0YIFSjz7qHLFYrTZ1orNaLGERP7PGuJkgQWV0`의 **"2. 종목현황"** 탭, 헤더 6~7행, 데이터 9행부터. 컬럼: C=국가, D=종목코드, E=종목명, F=수량, G/H=평단가(원/달러), I/J=현재가(원/달러), K=평가액, L=투자비중, M=누적배당금, N=누적수익, O=총수익률. 음수는 `-` 부호가 아닌 `▼` 접두사로 표기됨(전용 파서 `parseSignedAmount`/`parseSignedPercent` 신설로 대응)
- 스냅샷 날짜 없이 현재 시점 값만 존재 → 신규 테이블은 수집일 기록 방식으로 매일 누적하도록 설계
- 포트폴리오구성.pptx 3슬라이드가 3개 화면의 참고 와이어프레임(slide1=종목별 스택바, slide2=계좌별 월간 수익율 콤보차트, slide3=종목별 변동 리스트). S&P500 비교선(slide2)은 이번 범위에서 제외

### 확정된 결정 사항
- 신규 메뉴명 "투자 수익", 라우트 `/investment-return`, **"현재 실적" 다음 순서**로 배치(최초에는 최상단으로 구현했으나 사용자 요청으로 재조정)
- 3개 화면은 한 페이지 내 3개 탭으로 구성(별도 하위 메뉴 없음)
- `stock_holding_snapshots` 신규 테이블: `(stock_code, snapshot_date)` 유니크, `account_snapshots`와 동일 upsert 패턴, RLS 활성화(기존 테이블과 동일하게 anon 접근 차단)
- 엑셀 백필은 사용자 승인 후 1회 실행 완료, 백필용 파싱 스크립트는 scratchpad에서만 사용하고 리포지토리에 보관하지 않음
- **탭1(계좌별 월간 수익율)**: 계좌 다중선택에 "전체 선택/해제" 토글 체크박스 추가, 연도 필터를 단일 선택에서 **from~to 범위 선택**으로 변경, 초기값은 보유 데이터 전체 기간(2024~2026)
- **탭2(종목별 비중)**: 당초 국가별 막대 리스트로 구현했으나, 포트폴리오구성.pptx slide1 스타일에 맞춰 **월별 스택 막대 차트 + 일자 범위(달력) 조회조건**으로 재구현. 월이 많아지면 가로 스크롤되도록 차트 최소 너비를 데이터 개수에 비례 계산
- **탭3(종목별 변동 리스트)**: 정렬 가능한 테이블에 **일자 범위(달력) 조회조건** 추가(선택 기간 중 최신 snapshot_date 기준 조회)
- 종목 데이터가 현재 1일치(2026-08-19)뿐이라 탭2/탭3의 기간 조회는 지금은 단일 스냅샷만 보여주지만, 매일 cron 수집이 쌓이면 자연스럽게 다구간 조회로 확장됨(로직은 이미 다구간을 전제로 작성)

---

## 구현 사항

### 1. 종목 데이터 수집 파이프라인 ✅
- [x] `stock_holding_snapshots` 테이블 마이그레이션 작성 및 사용자 승인 후 적용(RLS 포함)
- [x] 구글시트 조회/파서/DB 타입/매퍼 구현(dry-run으로 실제 range 실측: "2. 종목현황" 탭 A1:P30)
- [x] `upsertStockHoldingSnapshots()` 구현 및 `/api/cron/collect` 통합(독립 실패 허용)
- [x] 사용자 승인 후 1회 실행하여 초기 데이터 적재(16개 종목, 평가액 합계 ₩720,033,029 시트 원본과 일치)

### 2. 엑셀 계좌별 월간 데이터 백필 ✅
- [x] 1회성 파싱 스크립트로 계좌 매칭표 기준 변환(162행), 결과 사용자 보고 및 승인
- [x] `account_snapshots` upsert 실행(ON CONFLICT DO NOTHING으로 기존 실 데이터 보호), 계좌별/월별 합계가 엑셀 원본과 원 단위까지 일치 확인

### 3. 신규 메뉴 및 3개 화면 ✅
- [x] `main-nav.tsx`에 "투자 수익"을 "현재 실적" 다음 순서로 추가, "일별 추적"/"주별 추적" 라벨 수정
- [x] 탭1(계좌별 월간 수익율): 계좌 다중선택(전체 선택/해제 토글) + 연도 범위(from~to) + 콤보 차트(기말평가액 영역+수익률 선) + 상세 테이블
- [x] 탭2(종목별 비중): 일자 범위(달력) 조회조건 + 종목별 월별 스택 막대 차트(가로 스크롤 지원)
- [x] 탭3(종목별 변동 리스트): 일자 범위(달력) 조회조건 + 정렬 가능한 리스트 테이블

### 4. 검증 및 문서화 ✅
- [x] typecheck/lint/build 전체 통과
- [x] claude-in-chrome으로 전체 플로우 검증(메뉴 순서, 3개 탭, 계좌 전체선택/해제, 연도 범위, 날짜 범위 캘린더, 정렬)
- [x] `docs/ROADMAP.md` 갱신

---

## 수락 기준

1. [x] `stock_holding_snapshots` 테이블이 생성되고 cron 수집 시 종목 데이터가 매일 누적된다
2. [x] `account_snapshots`에 계좌별 월간 이력(2026-06 이전)이 반영되고, 월별 합계가 엑셀 원본과 일치한다
3. [x] "현재 실적" 다음에 "투자 수익"이 노출되고, "일별 실적"/"주별 실적" 라벨로 변경된다
4. [x] `/investment-return` 페이지에서 3개 탭이 모두 정상 동작한다(전체 선택/해제, 연도 범위, 날짜 범위 캘린더 포함)
5. [x] typecheck/lint/build가 통과한다

## 관련 파일
- `docs/plans/PLAN-TASK-011-투자수익메뉴.md`
- `src/components/navigation/main-nav.tsx`
- `src/lib/google-sheets/client.ts`, `parser.ts`
- `src/lib/supabase/collect.ts`, `queries.ts`
- `src/app/api/cron/collect/route.ts`
- `supabase/migrations/20260819000000_create_stock_holding_snapshots.sql`
- `src/app/investment-return/page.tsx`
- `src/components/investment-return/`(account-monthly-view/table, account-multi-select-with-toggle, stock-holding-ratio-view, stock-holding-stacked-bar-chart, stock-holding-list-view, stock-holding-trend-line-chart, stock-holding-compare-table)
- `src/components/forms/year-range-select.tsx`, `date-range-picker.tsx`
- `src/components/charts/amount-rate-combo-chart.tsx`

## 추가 수정 (01.요구사항/포트폴리오 수정사항.pptx 반영, 2026-08-19)
- [x] `DateRangePicker`(공용 컴포넌트, `/daily`·`/weekly`·투자 수익 탭2·탭3에서 공유)의 `numberOfMonths`를 2에서 1로 축소하고 `PopoverContent`에 `max-w-[calc(100vw-2rem)]` 추가 — 캘린더가 화면을 과도하게 차지하던 문제 개선
- [x] 탭3(종목별 변동 리스트)을 pptx slide3 요구사항에 맞춰 전면 재구성: 종목별 평가금액 변동 추이 라인 차트(`StockHoldingTrendLineChart`) 추가, 리스트를 from/to 두 시점 비교 테이블(`StockHoldingCompareTable`)로 교체 — 컬럼: 종목명/국가/평가액(from)/평가액(to)/비중(from)/비중(to)/조회 수익/조회 수익률/누적배당금/누적수익/총수익률(현재). 누적배당금·누적수익·총수익률은 조회조건과 무관하게 항상 전체 스냅샷 중 최신값 사용
- [x] 탭2(종목별 비중)는 사용자 확인에 따라 기존 스택 막대 구조 그대로 유지(변경 없음)
- [x] `StockHoldingCompareRow` 타입 신설(`lib/types/stock-holding.ts`), 기존 `StockHoldingListTable`/`stock-holding-ratio-list.tsx`는 정리
- [x] typecheck/lint/build 재검증 통과, claude-in-chrome으로 탭3 신규 컬럼과 축소된 캘린더 확인

## 추가 수정 2 (01.요구사항/달력수정.png 반영, 2026-08-19)
- [x] 탭1/탭2/탭3 공용 `TrendLineChart`/`AmountRateComboChart`/`StockHoldingStackedBarChart`/`StockHoldingTrendLineChart`의 recharts `YAxis`에 명시적 `width={80}`(콤보차트 우측 축은 50) 추가 — 왼쪽 Y축 억 단위 숫자가 잘리던 문제 수정
- [x] 탭2/탭3 뷰(`stock-holding-ratio-view.tsx`, `stock-holding-list-view.tsx`)에서 `DateRangePicker`를 `/daily`와 동일하게 `sm:flex-row` 래퍼로 감싸 트리거 버튼이 줄 전체를 차지하지 않도록 수정
- [x] 가로 스크롤이 있는 차트 컨테이너에서 세로 스크롤바가 함께 생기는 문제 확인 → 이후 툴팁을 단일 항목 표시로 바꾸며 자연히 해소(아래 항목 참고)

## 추가 수정 3 (01.요구사항/범례추가.png 반영, 2026-08-19)
- [x] 탭2(종목별 비중) 차트 위에 커스텀 범례(색상 점 + 종목명 + 비중%) 추가, 탭3(종목별 변동 리스트) 차트 위에 커스텀 범례(색상 선 + 종목명) 추가 — recharts 기본 Legend 대신 차트 바깥 HTML로 구현
- [x] 탭2 툴팁에 금액 뒤 보유 비중(%) 추가(`ChartTooltipContent`의 `formatter`로 커스터마이징, 최신 달 기준 `weightRate` 사용)
- [x] 탭2/탭3 툴팁이 hover한 요소(막대 세그먼트/선) 하나만 표시하도록 수정 — 기존에는 recharts 기본 동작상 같은 X축 위치의 전체 시리즈(16개)가 한꺼번에 표시되어 컨테이너 하단이 잘리는 문제가 있었음. 탭2(`BarChart`)는 `ChartTooltip shared={false}`로 해결, 탭3(`LineChart`)는 `shared`만으로는 분리되지 않아 각 `Line`의 `onMouseEnter`/`activeDot.onMouseOver`로 hover 중인 종목명을 state로 추적하고 `content` 커스텀 렌더러에서 `payload`를 해당 종목만 필터링하는 방식으로 구현. 이 변경으로 툴팁이 항상 1건만 표시되어 세로 스크롤/잘림 문제도 함께 해소됨
- [x] typecheck/lint/build 재검증 통과, claude-in-chrome으로 탭2 hover 시 단일 종목 툴팁(금액+비중%), 탭3 hover 시 단일 종목 툴팁 정상 동작 확인

## 버그 수정: 탭1 2026-07/08 수익률 이상치 (2026-08-19)
- **증상**: 계좌별 월간 수익율 리스트에서 2026-07/08(실 cron 수집 데이터 구간)의 수익률만 다른 달 대비 비정상적으로 큰 값으로 표시됨
- **원인**: `account_snapshots.profit_rate` 컬럼의 저장 단위가 데이터 소스별로 다름 — 엑셀 백필분(2024-07~2026-06)은 소수(예: 1.667901 = 166.79%)로 저장되지만, Google Sheets 실 수집분(2026-07-21~)은 시트 원본 셀 값이 이미 %단위 숫자(예: 115.391)라 그대로 저장됨. 탭1 컴포넌트가 이 컬럼값에 일괄로 `*100`을 적용해 실 데이터 구간만 약 100배 부풀려짐. 기존 `/daily`·`/weekly`·`/monthly` 화면은 애초에 이 컬럼을 쓰지 않고 원금/현재금액으로 항상 직접 재계산해 문제가 드러나지 않았음
- **수정**: `account-monthly-view.tsx`의 `buildMonthlyRows()`에서 `profitAmount`/`profitRate`를 DB 컬럼값 대신 `principalAmount`/`currentAmount` 기준으로 항상 직접 재계산하도록 변경(기존 화면들과 동일한 방식으로 통일, DB 저장 단위 불일치에 더 이상 의존하지 않음)
- **검증**: 2026-07 DC계좌(원금 51,504,545/현재금액 102,811,265/수익률 +99.62%) 등 재계산값이 원금 대비 정확히 일치함을 확인, typecheck/lint/build 통과

## 후속 과제
- 종목 데이터가 며칠 더 쌓이면 탭2 스택 막대/탭3 리스트의 실제 다구간 조회 UX를 재검증할 필요 있음
- 날짜 범위 캘린더(`DateRangePicker`)의 이전 달 이동 시 일부 조작감 이슈 발견(재현 필요, 기능 자체는 동작)
- `account_snapshots.profit_rate` 컬럼 자체의 저장 단위가 소스별로 여전히 불일치한 상태(백필=소수, 실 수집=%). 이 컬럼을 직접 참조하는 화면을 새로 만들 경우 반드시 원금/현재금액으로 재계산할 것 — 근본 수정(수집 파서 또는 백필 데이터 단위 통일)은 이번 범위 밖으로 이월
