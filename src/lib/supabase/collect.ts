import { createSupabaseServerClient } from "@/lib/supabase/client"
import type { AccountRow, AccountSnapshotRow } from "@/lib/types/database"
import type {
  SheetAccountRow,
  SheetAssetClassRow,
  SheetDividendRow,
  SheetStockHoldingRow,
} from "@/lib/types/sheets"
import {
  mapSheetRowToAccountInsert,
  mapSheetRowToAssetClassSnapshotInsert,
  mapSheetRowToDividendSnapshotInsert,
  mapSheetRowToSnapshotInsert,
  mapSheetRowToStockHoldingSnapshotInsert,
} from "@/lib/types/mappers"

// 시트 원본값과 DB에 upsert되는 값이 다르면 경고만 남긴다(수집 흐름은 중단하지 않음).
// 현재 parser.ts는 반올림 없이 Number() 그대로 저장하므로 정상 상황에서는 항상 일치해야 하며,
// 향후 시트 서식/반올림 정책이 바뀌었을 때 조기 발견하기 위한 안전장치다.
function verifyRounding(
  sheetRow: SheetAccountRow,
  snapshotInsert: Omit<AccountSnapshotRow, "id">
): void {
  const fields: Array<{
    field: keyof SheetAccountRow
    sheetValue: number
    dbValue: number
  }> = [
    {
      field: "principalAmount",
      sheetValue: sheetRow.principalAmount,
      dbValue: snapshotInsert.principal_amount,
    },
    {
      field: "currentAmount",
      sheetValue: sheetRow.currentAmount,
      dbValue: snapshotInsert.current_amount,
    },
    {
      field: "profitAmount",
      sheetValue: sheetRow.profitAmount,
      dbValue: snapshotInsert.profit_amount,
    },
    {
      field: "profitRate",
      sheetValue: sheetRow.profitRate,
      dbValue: snapshotInsert.profit_rate,
    },
  ]

  for (const { field, sheetValue, dbValue } of fields) {
    if (sheetValue !== dbValue) {
      console.warn(
        `[collect] 반올림 불일치: account=${sheetRow.accountName} field=${field} sheet=${sheetValue} db=${dbValue}`
      )
    }
  }
}

export interface CollectResult {
  accountCount: number
  newAccountCount: number
  upsertedSnapshotCount: number
  upsertedAssetClassCount: number
  upsertedDividendCount: number
  dividendError?: string
  upsertedStockHoldingCount: number
  stockHoldingError?: string
}

// 계좌명만으로는 동일 계좌명을 쓰는 서로 다른 증권사 계좌(예: "처리투자"의 미래에셋/삼성증권)를
// 구분할 수 없으므로, 계좌명+계좌번호(마스킹) 조합을 계좌 식별 키로 사용한다.
function toAccountKey(accountName: string, accountNoMasked: string): string {
  return `${accountName}|${accountNoMasked}`
}

// 시트에 등장한 계좌를 기존 accounts와 매칭하고, 없는 계좌는 신규 등록한다.
// 반환값: 계좌 식별 키(계좌명+계좌번호) -> account id 매핑
export async function syncAccounts(
  sheetRows: SheetAccountRow[]
): Promise<{ accountIdByName: Map<string, string>; newAccountCount: number }> {
  const supabase = createSupabaseServerClient()

  const { data: existingRows, error: selectError } = await supabase
    .from("accounts")
    .select("*")
  if (selectError) throw selectError

  const accountIdByName = new Map<string, string>(
    (existingRows as AccountRow[]).map((row) => [
      toAccountKey(row.account_name, row.account_no_masked),
      row.id,
    ])
  )

  const newSheetRows = sheetRows.filter(
    (row) => !accountIdByName.has(toAccountKey(row.accountName, row.accountNoMasked))
  )

  if (newSheetRows.length === 0) {
    return { accountIdByName, newAccountCount: 0 }
  }

  const insertPayload = newSheetRows.map(mapSheetRowToAccountInsert)
  const { data: insertedRows, error: insertError } = await supabase
    .from("accounts")
    .insert(insertPayload)
    .select("*")
  if (insertError) throw insertError

  for (const row of insertedRows as AccountRow[]) {
    accountIdByName.set(toAccountKey(row.account_name, row.account_no_masked), row.id)
  }

  return { accountIdByName, newAccountCount: insertedRows.length }
}

// account_snapshots에 (account_id, snapshot_date) 기준 upsert를 수행한다(PRD 6.3: 동일 계좌+동일 수집일은 갱신).
export async function upsertSnapshots(
  accountIdByName: Map<string, string>,
  sheetRows: SheetAccountRow[],
  snapshotDate: string,
  collectedAt: string
): Promise<{ upserted: number }> {
  const supabase = createSupabaseServerClient()

  const payload = sheetRows.map((row) => {
    const accountId = accountIdByName.get(toAccountKey(row.accountName, row.accountNoMasked))
    if (!accountId) {
      throw new Error(`계좌 ID를 찾을 수 없습니다: ${row.accountName}(${row.accountNoMasked})`)
    }
    const snapshotInsert = mapSheetRowToSnapshotInsert(
      row,
      accountId,
      snapshotDate,
      collectedAt
    )
    verifyRounding(row, snapshotInsert)
    return snapshotInsert
  })

  const { error } = await supabase
    .from("account_snapshots")
    .upsert(payload, { onConflict: "account_id,snapshot_date" })
  if (error) throw error

  return { upserted: payload.length }
}

// asset_class_snapshots에 (asset_class, snapshot_date) 기준 upsert를 수행한다.
export async function upsertAssetClassSnapshots(
  assetClassRows: SheetAssetClassRow[],
  snapshotDate: string,
  collectedAt: string
): Promise<{ upserted: number }> {
  const supabase = createSupabaseServerClient()

  const payload = assetClassRows.map((row) =>
    mapSheetRowToAssetClassSnapshotInsert(row, snapshotDate, collectedAt)
  )

  const { error } = await supabase
    .from("asset_class_snapshots")
    .upsert(payload, { onConflict: "asset_class,snapshot_date" })
  if (error) throw error

  return { upserted: payload.length }
}

// stock_holding_snapshots에 (stock_code, snapshot_date) 기준 upsert를 수행한다.
export async function upsertStockHoldingSnapshots(
  stockRows: SheetStockHoldingRow[],
  snapshotDate: string,
  collectedAt: string
): Promise<{ upserted: number }> {
  const supabase = createSupabaseServerClient()

  const payload = stockRows.map((row) =>
    mapSheetRowToStockHoldingSnapshotInsert(row, snapshotDate, collectedAt)
  )

  if (payload.length === 0) {
    return { upserted: 0 }
  }

  const { error } = await supabase
    .from("stock_holding_snapshots")
    .upsert(payload, { onConflict: "stock_code,snapshot_date" })
  if (error) throw error

  return { upserted: payload.length }
}

// dividend_snapshots에 (account_id, stock_code, payment_date) 기준 upsert를 수행한다.
// 계좌명이 accounts에 없으면(시트-DB 매칭 실패) 명확한 에러를 던져 조기 발견되도록 한다.
export async function upsertDividendSnapshots(
  accountIdByName: Map<string, string>,
  dividendRows: SheetDividendRow[],
  collectedAt: string
): Promise<{ upserted: number }> {
  const supabase = createSupabaseServerClient()

  const payload = dividendRows.map((row) => {
    const accountId = accountIdByName.get(toAccountKey(row.accountName, row.accountNoMasked))
    if (!accountId) {
      throw new Error(`배당 계좌 ID를 찾을 수 없습니다: ${row.accountName}(${row.accountNoMasked})`)
    }
    return mapSheetRowToDividendSnapshotInsert(row, accountId, collectedAt)
  })

  if (payload.length === 0) {
    return { upserted: 0 }
  }

  const { error } = await supabase
    .from("dividend_snapshots")
    .upsert(payload, { onConflict: "account_id,stock_code,payment_date" })
  if (error) throw error

  return { upserted: payload.length }
}

// Google Sheets에서 읽은 계좌 데이터와 자산군 비중 데이터를 Supabase에 반영하는 진입점.
export async function collectFromSheet(
  sheetRows: SheetAccountRow[],
  assetClassRows: SheetAssetClassRow[],
  dividendRows: SheetDividendRow[] = [],
  stockHoldingRows: SheetStockHoldingRow[] = []
): Promise<CollectResult> {
  const now = new Date()
  const snapshotDate = now.toISOString().slice(0, 10)
  const collectedAt = now.toISOString()

  const { accountIdByName, newAccountCount } = await syncAccounts(sheetRows)
  const { upserted } = await upsertSnapshots(
    accountIdByName,
    sheetRows,
    snapshotDate,
    collectedAt
  )
  const { upserted: upsertedAssetClassCount } = await upsertAssetClassSnapshots(
    assetClassRows,
    snapshotDate,
    collectedAt
  )

  // 배당 수집은 계좌/자산군 수집과 별개 데이터 소스(별도 스프레드시트)이므로,
  // 배당 수집이 실패해도 이미 완료된 계좌/자산군 수집 결과에는 영향을 주지 않는다.
  let upsertedDividendCount = 0
  let dividendError: string | undefined
  try {
    const result = await upsertDividendSnapshots(
      accountIdByName,
      dividendRows,
      collectedAt
    )
    upsertedDividendCount = result.upserted
  } catch (error) {
    console.error("[collect] 배당 데이터 수집 실패:", error)
    dividendError = String(error)
  }

  // 종목 수집도 배당과 마찬가지로 별개 데이터 소스(별도 스프레드시트)이므로 독립 실패를 허용한다.
  let upsertedStockHoldingCount = 0
  let stockHoldingError: string | undefined
  try {
    const result = await upsertStockHoldingSnapshots(
      stockHoldingRows,
      snapshotDate,
      collectedAt
    )
    upsertedStockHoldingCount = result.upserted
  } catch (error) {
    console.error("[collect] 종목 데이터 수집 실패:", error)
    stockHoldingError = String(error)
  }

  return {
    accountCount: accountIdByName.size,
    newAccountCount,
    upsertedSnapshotCount: upserted,
    upsertedAssetClassCount,
    upsertedDividendCount,
    ...(dividendError ? { dividendError } : {}),
    upsertedStockHoldingCount,
    ...(stockHoldingError ? { stockHoldingError } : {}),
  }
}
