import type { AccountType } from "@/lib/types/account"

export interface SummaryCardData {
  totalCurrentAmount: number
  totalProfitAmount: number
  totalProfitRate: number
  changeAmount: number
  changeRate: number
}

export interface GroupBreakdown {
  accountType: AccountType
  principalAmount: number
  currentAmount: number
  profitAmount: number
  profitRate: number
}

export interface AccountRatioItem {
  accountId: string
  accountName: string
  accountNoMasked: string
  accountType: AccountType
  amount: number
  ratio: number
}
