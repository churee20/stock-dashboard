import { GroupedDetailTable } from "@/components/tables/grouped-detail-table"
import type { Account, AccountSnapshot } from "@/lib/types/account"

interface DashboardDetailTableProps {
  accounts: Account[]
  snapshots: AccountSnapshot[]
}

export function DashboardDetailTable({
  accounts,
  snapshots,
}: DashboardDetailTableProps) {
  return <GroupedDetailTable accounts={accounts} snapshots={snapshots} />
}
