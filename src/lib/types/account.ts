// NOTE: Task 002(Supabase 스키마 설계)에서 생성된 DB 타입으로 교체될 선행 타입입니다.
// PRD 6.2절의 개략 데이터 모델을 기준으로 작성되었습니다.

export type AccountType = "연금" | "개인투자"

export interface Account {
  id: string
  accountName: string
  accountNoMasked: string
  accountType: AccountType
  createdAt: string
}

export interface AccountSnapshot {
  id: string
  accountId: string
  snapshotDate: string
  principalAmount: number
  currentAmount: number
  profitAmount: number
  profitRate: number
  collectedAt: string
}
