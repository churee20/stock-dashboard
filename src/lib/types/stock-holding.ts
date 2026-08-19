export interface StockHoldingSnapshot {
  id: string
  snapshotDate: string
  country: string
  stockCode: string
  stockName: string
  quantity: number
  avgPriceKrw: number | null
  avgPriceUsd: number | null
  currentPriceKrw: number | null
  currentPriceUsd: number | null
  valuationAmount: number
  weightRate: number
  cumulativeDividend: number
  cumulativeProfit: number
  totalReturnRate: number
  collectedAt: string
}

// "투자 수익" 메뉴 탭3(종목별 변동 리스트) 전용: from/to 두 시점을 비교하는 행.
// 누적배당금/누적수익/총수익률은 조회조건과 무관하게 항상 현재(최신) 기준값을 사용한다.
export interface StockHoldingCompareRow {
  stockCode: string
  stockName: string
  country: string
  valuationFrom: number
  valuationTo: number
  weightFrom: number
  weightTo: number
  periodProfitAmount: number
  periodProfitRate: number
  cumulativeDividend: number
  cumulativeProfit: number
  totalReturnRate: number
}
