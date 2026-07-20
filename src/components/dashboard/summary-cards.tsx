import { SummaryCard } from "@/components/dashboard/summary-card"
import type { Account, AccountSnapshot } from "@/lib/types/account"

interface SummaryCardsProps {
  accounts: Account[]
  snapshots: AccountSnapshot[]
}

function sumBy(
  snapshots: AccountSnapshot[],
  field: "principalAmount" | "currentAmount"
): number {
  return snapshots.reduce((sum, s) => sum + s[field], 0)
}

function selectSnapshotsByDate(
  accounts: Account[],
  snapshots: AccountSnapshot[],
  date: string
): AccountSnapshot[] {
  const accountIds = new Set(accounts.map((a) => a.id))
  return snapshots.filter(
    (s) => accountIds.has(s.accountId) && s.snapshotDate === date
  )
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()}원`
}

function formatSigned(amount: number, unit: "amount" | "rate"): string {
  const formatted =
    unit === "rate"
      ? `${Math.abs(amount).toFixed(2)}%`
      : `${Math.abs(amount).toLocaleString()}원`

  if (amount > 0) return `+${formatted}`
  if (amount < 0) return `-${formatted}`
  return formatted
}

export function SummaryCards({ accounts, snapshots }: SummaryCardsProps) {
  const dates = Array.from(new Set(snapshots.map((s) => s.snapshotDate))).sort(
    (a, b) => (a < b ? 1 : a > b ? -1 : 0)
  )
  const latestDate = dates[0]
  const previousDate = dates[1]

  const latestSnapshots = latestDate
    ? selectSnapshotsByDate(accounts, snapshots, latestDate)
    : []
  const previousSnapshots = previousDate
    ? selectSnapshotsByDate(accounts, snapshots, previousDate)
    : []

  const totalPrincipalAmount = sumBy(latestSnapshots, "principalAmount")
  const totalCurrentAmount = sumBy(latestSnapshots, "currentAmount")
  const totalProfitAmount = totalCurrentAmount - totalPrincipalAmount
  const totalProfitRate =
    totalPrincipalAmount === 0
      ? 0
      : (totalProfitAmount / totalPrincipalAmount) * 100

  const previousCurrentAmount = sumBy(previousSnapshots, "currentAmount")
  const changeAmount =
    previousSnapshots.length === 0
      ? 0
      : totalCurrentAmount - previousCurrentAmount
  const changeRate =
    previousCurrentAmount === 0
      ? 0
      : (changeAmount / previousCurrentAmount) * 100

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SummaryCard label="총 현재금액" value={formatCurrency(totalCurrentAmount)} />
      <SummaryCard
        label="총 수익금액"
        value={formatSigned(totalProfitAmount, "amount")}
        subValue={formatSigned(totalProfitRate, "rate")}
        subValueTone={
          totalProfitAmount > 0
            ? "positive"
            : totalProfitAmount < 0
              ? "negative"
              : "neutral"
        }
      />
      <SummaryCard
        label="전일 대비"
        value={formatSigned(changeAmount, "amount")}
        subValue={formatSigned(changeRate, "rate")}
        subValueTone={
          changeAmount > 0 ? "positive" : changeAmount < 0 ? "negative" : "neutral"
        }
      />
    </div>
  )
}
