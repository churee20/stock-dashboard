import type { Account, AccountSnapshot } from "@/lib/types/account"

export function selectLatestSnapshots(
  accounts: Account[],
  snapshots: AccountSnapshot[]
): AccountSnapshot[] {
  const latestByAccountId = new Map<string, AccountSnapshot>()

  for (const snapshot of snapshots) {
    const existing = latestByAccountId.get(snapshot.accountId)

    if (!existing || existing.snapshotDate < snapshot.snapshotDate) {
      latestByAccountId.set(snapshot.accountId, snapshot)
    }
  }

  return accounts
    .map((account) => latestByAccountId.get(account.id))
    .filter((snapshot): snapshot is AccountSnapshot => snapshot !== undefined)
}

export function filterSnapshotsByDateRange(
  snapshots: AccountSnapshot[],
  startDate: string,
  endDate: string
): AccountSnapshot[] {
  return snapshots.filter(
    (snapshot) =>
      snapshot.snapshotDate >= startDate && snapshot.snapshotDate <= endDate
  )
}
