import { TableRowProfitCell } from "@/components/tables/table-row-profit-cell"
import type { Account, AccountSnapshot } from "@/lib/types/account"

interface AccountProfitRatioChartProps {
  accounts: Account[]
  snapshots: AccountSnapshot[]
}

interface ProfitRatioItem {
  accountId: string
  accountName: string
  accountNoMasked: string
  profitAmount: number
  ratio: number
}

function buildProfitRatioItems(
  accounts: Account[],
  snapshots: AccountSnapshot[]
): ProfitRatioItem[] {
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
        profitAmount: snapshot.profitAmount,
        ratio: 0,
      }
    })
    .filter((item): item is ProfitRatioItem => item !== null)

  const totalAbsProfitAmount = items.reduce(
    (sum, item) => sum + Math.abs(item.profitAmount),
    0
  )

  return items
    .map((item) => ({
      ...item,
      ratio:
        totalAbsProfitAmount === 0
          ? 0
          : (Math.abs(item.profitAmount) / totalAbsProfitAmount) * 100,
    }))
    .sort((a, b) => b.profitAmount - a.profitAmount)
}

export function AccountProfitRatioChart({
  accounts,
  snapshots,
}: AccountProfitRatioChartProps) {
  const items = buildProfitRatioItems(accounts, snapshots)

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
            <TableRowProfitCell amount={item.profitAmount} unit="amount" />
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={
                item.profitAmount >= 0
                  ? "h-full rounded-full bg-profit-positive"
                  : "h-full rounded-full bg-profit-negative"
              }
              style={{ width: `${item.ratio}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
