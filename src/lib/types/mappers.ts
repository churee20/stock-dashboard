import type { AccountRow, AccountSnapshotRow } from "@/lib/types/database"
import type { Account, AccountSnapshot, AccountType } from "@/lib/types/account"

export function mapAccountRowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    accountName: row.account_name,
    accountNoMasked: row.account_no_masked,
    accountType: row.account_type as AccountType,
    createdAt: row.created_at,
  }
}

export function mapSnapshotRowToSnapshot(
  row: AccountSnapshotRow
): AccountSnapshot {
  return {
    id: row.id,
    accountId: row.account_id,
    snapshotDate: row.snapshot_date,
    principalAmount: row.principal_amount,
    currentAmount: row.current_amount,
    profitAmount: row.profit_amount,
    profitRate: row.profit_rate,
    collectedAt: row.collected_at,
  }
}
