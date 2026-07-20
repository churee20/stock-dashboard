import dayjs from "dayjs"

import type { Account, AccountSnapshot } from "@/lib/types/account"

// mulberry32: 시드 고정 결정론적 PRNG. 매번 동일한 더미 데이터를 재현하기 위해 사용한다.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SEED = 20260101
const MONTHS_TO_GENERATE = 14
const PRINCIPAL_BY_ACCOUNT: Record<string, number> = {
  "acc-01": 45_000_000,
  "acc-02": 30_000_000,
  "acc-03": 20_000_000,
  "acc-04": 25_000_000,
  "acc-05": 15_000_000,
  "acc-06": 35_000_000,
  "acc-07": 25_000_000,
  "acc-08": 20_000_000,
}

interface GenerateSnapshotsOptions {
  keepWeekendValue?: boolean
}

export function generateSnapshots(
  accounts: Account[],
  options: GenerateSnapshotsOptions = {}
): AccountSnapshot[] {
  const { keepWeekendValue = true } = options
  const random = mulberry32(SEED)

  const endDate = dayjs("2026-07-16")
  const startDate = endDate.subtract(MONTHS_TO_GENERATE, "month").startOf("day")

  const snapshots: AccountSnapshot[] = []
  const lastAmountByAccount = new Map<string, number>()

  for (const account of accounts) {
    lastAmountByAccount.set(
      account.id,
      PRINCIPAL_BY_ACCOUNT[account.id] ?? 10_000_000
    )
  }

  let cursor = startDate
  let snapshotSeq = 0

  while (cursor.isBefore(endDate) || cursor.isSame(endDate, "day")) {
    const isWeekend = cursor.day() === 0 || cursor.day() === 6

    for (const account of accounts) {
      const principalAmount = PRINCIPAL_BY_ACCOUNT[account.id] ?? 10_000_000
      const previousAmount =
        lastAmountByAccount.get(account.id) ?? principalAmount

      let currentAmount = previousAmount
      if (!isWeekend || !keepWeekendValue) {
        const changeRate = (random() - 0.5) * 0.04
        currentAmount = Math.round(previousAmount * (1 + changeRate))
      }

      lastAmountByAccount.set(account.id, currentAmount)

      const profitAmount = currentAmount - principalAmount
      const profitRate = (profitAmount / principalAmount) * 100

      snapshotSeq += 1

      snapshots.push({
        id: `snap-${snapshotSeq}`,
        accountId: account.id,
        snapshotDate: cursor.format("YYYY-MM-DD"),
        principalAmount,
        currentAmount,
        profitAmount,
        profitRate,
        collectedAt: cursor.format("YYYY-MM-DDT16:00:00.000[Z]"),
      })
    }

    cursor = cursor.add(1, "day")
  }

  return snapshots
}
