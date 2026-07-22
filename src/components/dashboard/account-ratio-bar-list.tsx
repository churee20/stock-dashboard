import { formatPercent } from "@/lib/format/round"
import type { AccountRatioItem } from "@/lib/types/dashboard"
import type { Account, AccountSnapshot } from "@/lib/types/account"

interface AccountRatioBarListProps {
  accounts: Account[]
  snapshots: AccountSnapshot[]
}

function buildRatioItems(
  accounts: Account[],
  snapshots: AccountSnapshot[]
): AccountRatioItem[] {
  const snapshotByAccountId = new Map(
    snapshots.map((snapshot) => [snapshot.accountId, snapshot])
  )

  const items = accounts
    .map((account) => {
      const snapshot = snapshotByAccountId.get(account.id)
      if (!snapshot) return null

      return {
        accountId: account.id,
        accountName: account.accountName,
        accountNoMasked: account.accountNoMasked,
        accountType: account.accountType,
        amount: snapshot.currentAmount,
        ratio: 0,
      }
    })
    .filter((item): item is AccountRatioItem => item !== null)

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)

  return items
    .map((item) => ({
      ...item,
      ratio: totalAmount === 0 ? 0 : (item.amount / totalAmount) * 100,
    }))
    .sort((a, b) => b.amount - a.amount)
}

export function AccountRatioBarList({
  accounts,
  snapshots,
}: AccountRatioBarListProps) {
  const items = buildRatioItems(accounts, snapshots)

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.accountId} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">
              {item.accountName}
              <span className="text-muted-foreground ml-1 text-xs">
                ({item.accountNoMasked})
              </span>
            </span>
            <span className="tabular-nums text-muted-foreground">
              {item.amount.toLocaleString()}원 ({formatPercent(item.ratio, 1)})
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${item.ratio}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
