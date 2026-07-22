# Task 007: 데이터 정합성 및 운영 안정성 강화

## 개요
- **목표**: (1) 화면 표시용 반올림 정책 통일, (2) 수집 시 원본-DB 반올림 차이 검증 로그, (3) 최종 수집 시각 조회 성능 개선(전용 쿼리), (4) Supabase 조회 실패 시 폴백 UI(error.tsx), (5) ISO 주차/월 집계 기준 확정 및 경계값 검증, (6) 미사용 `date-fns` 의존성 제거
- **관련 기능**: 데이터 정합성 검증, 운영 안정성(에러 폴백), 조회 성능
- **의존성**: Task 006(Google Sheets 수집 파이프라인) 완료 필요
- **참조 문서**: `docs/ROADMAP.md`(Phase 4), `docs/tasks/TASK-006.md`
- **shrimp task**: 7개 서브태스크로 계획 등록(append 모드)

---

## 사전 조사 결과 (계획 단계에서 확인한 사실)

- `src/lib/google-sheets/parser.ts:46-52`의 `parseAmount()`는 시트 문자열을 정규식으로 정제 후 `Number()`로만 변환, 반올림 없음
- `src/lib/supabase/queries.ts:9-21`의 `getAccounts`/`getAccountSnapshots`는 `select("*")` 전량 조회, `error` 발생 시 즉시 throw, try/catch 없음
- `src/app/layout.tsx:23-28`의 `selectLatestCollectedAt()`이 전체 snapshots를 reduce로 순회해 `collectedAt` 최댓값(문자열 비교)을 구함 — 전용 쿼리 없음
- `src/app/{page,daily,weekly,monthly}/page.tsx` 전부 `await getAccounts()/getAccountSnapshots()`를 try/catch 없이 직접 호출, `error.tsx`/`loading.tsx` 전무
- 화면단(`summary-cards.tsx`, `table-row-profit-cell.tsx`, `account-ratio-bar-list.tsx`)에서 `toFixed(2)`가 개별 산재
- `dayjs` + `isoWeek` 플러그인으로 주차 집계가 이미 일관 구현됨. `date-fns`는 package.json 의존성만 있고 미사용
- `account_snapshots.collected_at` 컬럼에는 인덱스 없음(현재 8계좌×소수 스냅샷 규모에서는 불필요로 판단, 이번 범위에서 인덱스 추가 안 함)

---

## 구현 사항

### 1. 화면 표시용 반올림 공용 유틸 신설 및 적용
- [x] `src/lib/format/round.ts` 생성: `roundTo2()`, `formatPercent()` 순수 함수
- [x] `summary-cards.tsx`/`table-row-profit-cell.tsx`/`account-ratio-bar-list.tsx`의 `toFixed(2)` 직접 호출을 유틸로 교체
- [x] DB 저장값은 변경하지 않음(표시 레이어만 통일)

`account-ratio-bar-list.tsx`는 기존 소수 1자리 표시(`toFixed(1)`)를 유지하기 위해 `formatPercent(value, 1)`로 자릿수를 명시적으로 전달했다(`formatPercent`는 `digits` 기본값 2).

### 2. 수집 시 원본-DB 반올림 차이 검증 로그
- [x] `src/lib/supabase/collect.ts`에 시트 원본값과 upsert 값 비교 후 차이 시 `console.warn` 남기는 검증 함수 추가
- [x] 수집 흐름을 중단시키지 않음(경고만)

`verifyRounding()`이 `upsertSnapshots()` 내부 payload 생성 시점(upsert 직전)에 principalAmount/currentAmount/profitAmount/profitRate 4개 필드를 비교한다. 예외를 던지지 않고 `console.warn`만 남긴다.

### 3. 최종 수집 시각 전용 쿼리
- [x] `src/lib/supabase/queries.ts`에 `getLatestCollectedAt()` 추가(`order + limit(1)`)
- [x] `src/app/layout.tsx`가 `getAccountSnapshots()` 전체 조회 대신 이 함수 사용, `selectLatestCollectedAt()` 제거

### 4. 전역 error.tsx 폴백 UI
- [x] `src/app/error.tsx` 신설(재시도 버튼 포함)
- [x] `layout.tsx`의 `getLatestCollectedAt()` 호출을 try/catch로 감싸 실패 시 `undefined` 폴백

검증: `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`을 임시로 무효한 값으로 바꿔 실제 조회 실패를 유발한 뒤, 브라우저로 `error.tsx`가 "데이터를 불러오지 못했습니다" + 다시 시도 버튼을 정상 렌더링하고 헤더는 "기준일시: -"로 깨지지 않고 폴백되는 것을 확인. 검증 직후 원복.

### 5. ISO 주차/월 집계 기준 문서화 및 경계값 검증
- [x] `aggregate.ts`/`period-view-container.tsx`의 연말/연초 경계 케이스 검증
- [x] 확정 기준을 본 문서에 명문화(코드 변경은 문제 발견 시에만)

#### 확정 기준
- **주차**: ISO 8601(월요일 시작, 목요일이 포함된 주가 그 해의 소속 주). `dayjs().isoWeek()`/`isoWeekYear()`(isoWeek 플러그인) 조합을 `aggregate.ts`(`aggregateToWeekly`)와 `period-view-container.tsx`(`weekPeriodLabel`) 양쪽에서 일관되게 사용
- **월**: 캘린더 월 기준(`dayjs().format("YYYY-MM")`)
- **대표값**: 각 기간(주/월)의 마지막 수집일 스냅샷을 대표값으로 사용(`pickLastSnapshotPerPeriod`)

#### 경계값 검증 결과
스크립트로 연말/연초 경계 날짜를 `isoWeek()`/`isoWeekYear()`에 통과시켜 확인:

| 날짜 | 요일 | ISO 주차 | 주 시작~종료 |
|---|---|---|---|
| 2025-12-29 | 월 | 2026-W01 | 2025-12-29 ~ 2026-01-04 |
| 2025-12-31 | 수 | 2026-W01 | 2025-12-29 ~ 2026-01-04 |
| 2026-01-01 | 목 | 2026-W01 | 2025-12-29 ~ 2026-01-04 |
| 2026-01-04 | 일 | 2026-W01 | 2025-12-29 ~ 2026-01-04 |
| 2026-12-28 | 월 | 2026-W53 | 2026-12-28 ~ 2027-01-03 |
| 2027-01-03 | 일 | 2026-W53 | 2026-12-28 ~ 2027-01-03 |
| 2027-01-04 | 월 | 2027-W01 | 2027-01-04 ~ 2027-01-10 |

- 연초(1월 1일이 포함된 주가 아니라 목요일 기준)와 연말(2026-W53처럼 다음 해로 넘어가는 주)이 모두 ISO 8601 규칙대로 정확히 처리됨을 확인
- `isoWeekYear()`를 키에 함께 사용하므로 `format("YYYY")` 단독 사용 시 발생할 수 있는 "1월 초인데 전년도 주차로 오분류" 문제가 원천적으로 없음
- **결론**: 기존 구현이 이미 올바르게 동작하므로 코드 변경 없음(회귀 없음)

### 6. 미사용 date-fns 제거
- [x] 사용처 없음 재확인 후 `npm uninstall date-fns`

`package.json`의 직접 의존성에서는 완전히 제거되었다. `package-lock.json`에는 `react-day-picker`의 전이 의존성으로 `date-fns`/`@date-fns/tz`가 남아있으나 이는 정상이다.

### 7. 문서화
- [x] 본 문서 구현 완료 후 갱신
- [x] `docs/ROADMAP.md` Task 007 항목 완료 표시

---

## 수락 기준

1. [x] 화면 수익률 표시가 공용 유틸(`roundTo2`/`formatPercent`)을 통해 통일되고, 기존 표시값과 차이 없음
2. [x] 수집 시 원본-DB 값 차이가 있으면 경고 로그가 남고, 수집 자체는 실패하지 않음
3. [x] `getLatestCollectedAt()`이 전량 조회가 아닌 단건 조회로 동작하고, 헤더 기준일시 표시가 기존과 동일
4. [x] Supabase 조회 실패 시 `error.tsx`가 정상 렌더링되고, 헤더는 깨지지 않고 `-`로 폴백
5. [x] 주차/월 집계 경계값 검증 결과가 문서화되고 회귀 없음
6. [x] `date-fns` 제거 후 빌드 정상
7. [x] `npm run typecheck`, `npm run lint`, `npm run build` 통과, any 타입 미사용

---

## 관련 파일

### 생성할 파일
```
src/lib/format/round.ts
src/app/error.tsx
```

### 수정할 파일
```
src/components/dashboard/summary-cards.tsx
src/components/tables/table-row-profit-cell.tsx
src/components/dashboard/account-ratio-bar-list.tsx
src/lib/supabase/collect.ts
src/lib/supabase/queries.ts
src/app/layout.tsx
package.json
docs/tasks/TASK-007.md
docs/ROADMAP.md
```

---

## 검증 결과

- `npm run typecheck`/`npm run lint`/`npm run build` 모두 통과(any 타입 미사용)
- 브라우저(localhost:3000)로 4개 화면(`/`, `/daily`, `/weekly`, `/monthly`) 재확인: 반올림 표시, 헤더 기준일시, error.tsx 폴백, 주차 라벨 모두 회귀 없음
- `error.tsx` 폴백은 `NEXT_PUBLIC_SUPABASE_URL`을 임시로 무효화해 실제 조회 실패를 유발하는 방식으로 검증(검증 직후 즉시 원복)
- ISO 주차 경계값은 스크립트로 연말/연초 7개 날짜를 실측 검증(본 문서 4번 항목 표 참고)

---

## 주의사항

1. **"마지막 성공 데이터로 폴백"의 범위 재정의**: 캐싱/재시도 레이어 없이는 엄밀한 폴백이 불가하므로, 이번 범위는 "조회 실패 시 화면이 깨지지 않고 에러 UI를 보여준다"로 한정한다
2. **화면별 error.tsx는 만들지 않음**: 전역 1개로 충분(과설계 방지)
3. **collected_at 인덱스 추가 안 함**: 현재 데이터 규모에서는 불필요, 데이터가 크게 늘면 재검토
4. **주/월 집계 코드는 원칙적으로 변경 없음**: 이미 dayjs isoWeek로 올바르게 구현되어 있을 가능성이 높아 검증+문서화에 집중

---

## 다음 단계

Task 007 완료 후: **Task 008** — 성능 최적화 및 Vercel 배포
