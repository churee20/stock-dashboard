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
