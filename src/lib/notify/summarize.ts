import type { Account, AccountSnapshot } from "@/lib/types/account"

export interface GroupSummary {
  principalAmount: number
  currentAmount: number
  profitAmount: number
  profitRate: number
}

export interface FullSummary {
  pension: GroupSummary
  personal: GroupSummary
  total: GroupSummary
}

export interface DayOverDay {
  amountDiff: number
  rateDiff: number
  isFirstRun: boolean
}

function sumGroup(snapshots: AccountSnapshot[]): GroupSummary {
  const principalAmount = snapshots.reduce((sum, s) => sum + s.principalAmount, 0)
  const currentAmount = snapshots.reduce((sum, s) => sum + s.currentAmount, 0)
  const profitAmount = snapshots.reduce((sum, s) => sum + s.profitAmount, 0)
  const profitRate = principalAmount === 0 ? 0 : (profitAmount / principalAmount) * 100

  return { principalAmount, currentAmount, profitAmount, profitRate }
}

// 계좌 마스터(account_type)를 기준으로 스냅샷을 연금/개인투자/전체로 그룹핑해 합산한다.
export function summarizeByGroup(
  accounts: Account[],
  snapshots: AccountSnapshot[]
): FullSummary {
  const accountTypeById = new Map(accounts.map((a) => [a.id, a.accountType]))

  const pensionSnapshots = snapshots.filter(
    (s) => accountTypeById.get(s.accountId) === "연금"
  )
  const personalSnapshots = snapshots.filter(
    (s) => accountTypeById.get(s.accountId) === "개인투자"
  )

  return {
    pension: sumGroup(pensionSnapshots),
    personal: sumGroup(personalSnapshots),
    total: sumGroup(snapshots),
  }
}

// 오늘/전일 전체 합계(current_amount 기준)로 증감액/증감률을 계산한다.
// 전일 스냅샷이 없으면(최초 실행 등) 0으로 방어 처리한다.
export function calculateDayOverDay(
  todayTotal: GroupSummary,
  yesterdayTotal: GroupSummary | undefined
): DayOverDay {
  if (!yesterdayTotal || yesterdayTotal.currentAmount === 0) {
    return { amountDiff: 0, rateDiff: 0, isFirstRun: true }
  }

  const amountDiff = todayTotal.currentAmount - yesterdayTotal.currentAmount
  const rateDiff = (amountDiff / yesterdayTotal.currentAmount) * 100

  return { amountDiff, rateDiff, isFirstRun: false }
}

// 원화 금액을 억 단위 소수 2자리 문자열로 변환한다 (예: 526750590 -> "5.27억").
// 화면 표시용 roundTo2/formatPercent(src/lib/format/round.ts)와는 별도 규칙(억 단위 축약)이라 분리했다.
export function formatEok(amount: number): string {
  return `${(amount / 100_000_000).toFixed(2)}억`
}
