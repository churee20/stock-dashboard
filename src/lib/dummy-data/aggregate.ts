import dayjs from "dayjs"
import isoWeek from "dayjs/plugin/isoWeek"

import type { Account, AccountSnapshot } from "@/lib/types/account"
import type { GroupBreakdown } from "@/lib/types/dashboard"

dayjs.extend(isoWeek)

// 주/월 마지막 수집일 스냅샷을 대표값으로 삼는다 (PRD 5.4/5.5 규칙). 부수효과 없는 순수 함수.
function pickLastSnapshotPerPeriod(
  snapshots: AccountSnapshot[],
  periodKeyOf: (date: string) => string
): AccountSnapshot[] {
  const latestByAccountAndPeriod = new Map<string, AccountSnapshot>()

  for (const snapshot of snapshots) {
    const periodKey = periodKeyOf(snapshot.snapshotDate)
    const mapKey = `${snapshot.accountId}__${periodKey}`
    const existing = latestByAccountAndPeriod.get(mapKey)

    if (!existing || existing.snapshotDate < snapshot.snapshotDate) {
      latestByAccountAndPeriod.set(mapKey, snapshot)
    }
  }

  return Array.from(latestByAccountAndPeriod.values())
}

export function aggregateToWeekly(
  snapshots: AccountSnapshot[]
): AccountSnapshot[] {
  return pickLastSnapshotPerPeriod(snapshots, (date) => {
    const d = dayjs(date)
    return `${d.isoWeekYear()}-W${String(d.isoWeek()).padStart(2, "0")}`
  })
}

export function aggregateToMonthly(
  snapshots: AccountSnapshot[]
): AccountSnapshot[] {
  return pickLastSnapshotPerPeriod(snapshots, (date) =>
    dayjs(date).format("YYYY-MM")
  )
}

export function calculateGroupTotals(
  accounts: Account[],
  snapshots: AccountSnapshot[]
): GroupBreakdown[] {
  const accountTypeById = new Map(
    accounts.map((account) => [account.id, account.accountType])
  )

  const totalsByType = new Map<
    string,
    { principalAmount: number; currentAmount: number }
  >()

  for (const snapshot of snapshots) {
    const accountType = accountTypeById.get(snapshot.accountId)
    if (!accountType) continue

    const existing = totalsByType.get(accountType) ?? {
      principalAmount: 0,
      currentAmount: 0,
    }

    totalsByType.set(accountType, {
      principalAmount: existing.principalAmount + snapshot.principalAmount,
      currentAmount: existing.currentAmount + snapshot.currentAmount,
    })
  }

  return Array.from(totalsByType.entries()).map(([accountType, totals]) => {
    const profitAmount = totals.currentAmount - totals.principalAmount
    const profitRate =
      totals.principalAmount === 0
        ? 0
        : (profitAmount / totals.principalAmount) * 100

    return {
      accountType: accountType as GroupBreakdown["accountType"],
      principalAmount: totals.principalAmount,
      currentAmount: totals.currentAmount,
      profitAmount,
      profitRate,
    }
  })
}
