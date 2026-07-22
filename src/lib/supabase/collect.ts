import { createSupabaseServerClient } from "@/lib/supabase/client"
import type { AccountRow, AccountSnapshotRow } from "@/lib/types/database"
import type { SheetAccountRow, SheetAssetClassRow } from "@/lib/types/sheets"
import {
  mapSheetRowToAccountInsert,
  mapSheetRowToAssetClassSnapshotInsert,
  mapSheetRowToSnapshotInsert,
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
}

// 시트에 등장한 계좌명을 기존 accounts와 매칭하고, 없는 계좌는 신규 등록한다.
// 반환값: 계좌명 -> account id 매핑
export async function syncAccounts(
  sheetRows: SheetAccountRow[]
): Promise<{ accountIdByName: Map<string, string>; newAccountCount: number }> {
  const supabase = createSupabaseServerClient()

  const { data: existingRows, error: selectError } = await supabase
    .from("accounts")
    .select("*")
  if (selectError) throw selectError

  const accountIdByName = new Map<string, string>(
    (existingRows as AccountRow[]).map((row) => [row.account_name, row.id])
  )

  const newSheetRows = sheetRows.filter(
    (row) => !accountIdByName.has(row.accountName)
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
    accountIdByName.set(row.account_name, row.id)
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
    const accountId = accountIdByName.get(row.accountName)
    if (!accountId) {
      throw new Error(`계좌 ID를 찾을 수 없습니다: ${row.accountName}`)
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

// Google Sheets에서 읽은 계좌 데이터와 자산군 비중 데이터를 Supabase에 반영하는 진입점.
export async function collectFromSheet(
  sheetRows: SheetAccountRow[],
  assetClassRows: SheetAssetClassRow[]
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

  return {
    accountCount: accountIdByName.size,
    newAccountCount,
    upsertedSnapshotCount: upserted,
    upsertedAssetClassCount,
  }
}
