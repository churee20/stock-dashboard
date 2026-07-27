export interface DividendSnapshot {
  id: string
  accountId: string
  paymentDate: string
  stockCode: string
  stockName: string
  dividendShares: number
  dividendPerShare: number
  dividendRate: number
  dividendAmount: number
  collectedAt: string
}
