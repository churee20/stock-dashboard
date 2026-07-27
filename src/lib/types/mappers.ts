import type {
  AccountRow,
  AccountSnapshotRow,
  AssetClassSnapshotRow,
  DividendSnapshotRow,
} from "@/lib/types/database"
import type { Account, AccountSnapshot, AccountType } from "@/lib/types/account"
import type { AssetClassSnapshot } from "@/lib/types/dashboard"
import type { DividendSnapshot } from "@/lib/types/dividend"
import type {
  SheetAccountRow,
  SheetAssetClassRow,
  SheetDividendRow,
} from "@/lib/types/sheets"

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

export function mapSheetRowToAccountInsert(
  sheetRow: SheetAccountRow
): Omit<AccountRow, "id" | "created_at"> {
  return {
    account_name: sheetRow.accountName,
    account_no_masked: sheetRow.accountNoMasked,
    account_type: sheetRow.accountType,
  }
}

export function mapSheetRowToSnapshotInsert(
  sheetRow: SheetAccountRow,
  accountId: string,
  snapshotDate: string,
  collectedAt: string
): Omit<AccountSnapshotRow, "id"> {
  return {
    account_id: accountId,
    snapshot_date: snapshotDate,
    principal_amount: sheetRow.principalAmount,
    current_amount: sheetRow.currentAmount,
    profit_amount: sheetRow.profitAmount,
    profit_rate: sheetRow.profitRate,
    collected_at: collectedAt,
  }
}

export function mapAssetClassSnapshotRowToItem(
  row: AssetClassSnapshotRow
): AssetClassSnapshot {
  return {
    id: row.id,
    assetClass: row.asset_class,
    snapshotDate: row.snapshot_date,
    currentAmount: row.current_amount,
    collectedAt: row.collected_at,
  }
}

export function mapSheetRowToAssetClassSnapshotInsert(
  sheetRow: SheetAssetClassRow,
  snapshotDate: string,
  collectedAt: string
): Omit<AssetClassSnapshotRow, "id"> {
  return {
    asset_class: sheetRow.assetClass,
    snapshot_date: snapshotDate,
    current_amount: sheetRow.currentAmount,
    collected_at: collectedAt,
  }
}

export function mapDividendSnapshotRowToItem(
  row: DividendSnapshotRow
): DividendSnapshot {
  return {
    id: row.id,
    accountId: row.account_id,
    paymentDate: row.payment_date,
    stockCode: row.stock_code,
    stockName: row.stock_name,
    dividendShares: row.dividend_shares,
    dividendPerShare: row.dividend_per_share,
    dividendRate: row.dividend_rate,
    dividendAmount: row.dividend_amount,
    collectedAt: row.collected_at,
  }
}

export function mapSheetRowToDividendSnapshotInsert(
  sheetRow: SheetDividendRow,
  accountId: string,
  collectedAt: string
): Omit<DividendSnapshotRow, "id"> {
  return {
    account_id: accountId,
    payment_date: sheetRow.paymentDate,
    stock_code: sheetRow.stockCode,
    stock_name: sheetRow.stockName,
    dividend_shares: sheetRow.dividendShares,
    dividend_per_share: sheetRow.dividendPerShare,
    dividend_rate: sheetRow.dividendRate,
    dividend_amount: sheetRow.dividendAmount,
    collected_at: collectedAt,
  }
}
