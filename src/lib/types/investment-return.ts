// "투자 수익" 메뉴 탭1(계좌별 월간 수익율) 전용 타입.
// 기존 PeriodTableRow는 그룹(전체합계/연금/개인투자) 단위지만, 이 화면은 계좌 단위로 조회한다.
export interface AccountMonthlyRow {
  monthLabel: string
  accountId: string
  accountName: string
  principalAmount: number
  currentAmount: number
  profitAmount: number
  profitRate: number
}

// 탭1 리스트 전용 타입. 계좌 단위 1행으로 요약한다.
// - MIN/MAX·조회 수익(율)은 조회 조건(연도 범위·선택 계좌) 내 값 기준
// - 현재 평가액·누적 수익·총수익율(현재)은 조회 조건과 무관하게 계좌 전체 스냅샷 이력 기준(항상 고정)
export interface AccountSummaryRow {
  accountId: string
  accountName: string
  // accounts.account_no_masked 값. 이 프로젝트에서는 계좌번호가 아니라 증권사명("미래에셋"
  // 등)이 저장되어 있어 계좌명 옆 "(증권사)" 표시에 사용한다.
  broker: string
  principalAmount: number
  valuationMin: number
  valuationMax: number
  weightRate: number
  periodProfitAmount: number
  periodProfitRate: number
  currentValuation: number
  cumulativeProfitAmount: number
  totalReturnRate: number
}

// 탭1 리스트의 그룹 소계(연금/개인투자) 및 전체 합계 공용 타입.
// weightRate는 전체 합계 대비 그룹 비중(전체 합계 행은 100%).
export interface AccountSummaryGroupRow {
  label: string
  principalAmount: number
  valuationMin: number
  valuationMax: number
  weightRate: number
  periodProfitAmount: number
  periodProfitRate: number
  currentValuation: number
  cumulativeProfitAmount: number
  totalReturnRate: number
}

// 탭1 리스트를 "현재 실적"의 GroupedDetailTable과 동일하게 연금/개인투자 접기·펼치기
// 그룹 구조로 렌더링하기 위한 타입.
export interface AccountSummaryGroup {
  groupType: "연금" | "개인투자"
  summary: AccountSummaryGroupRow
  rows: AccountSummaryRow[]
}
