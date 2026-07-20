// 정식 애플리케이션 타입입니다. PRD 6.2절 데이터 모델 기준.
// DB 원시 Row 타입(snake_case)은 src/lib/types/database.ts, 변환 함수는 src/lib/types/mappers.ts 참고.

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
