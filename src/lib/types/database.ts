// Supabase accounts/account_snapshots 테이블의 Row 타입입니다(snake_case, DB 컬럼명 그대로).
// 애플리케이션 레이어(camelCase)는 src/lib/types/account.ts를 사용하고,
// Row → 애플리케이션 타입 변환은 src/lib/types/mappers.ts를 참고하세요.

export interface AccountRow {
  id: string
  account_name: string
  account_no_masked: string
  account_type: string
  created_at: string
}

export interface AccountSnapshotRow {
  id: string
  account_id: string
  snapshot_date: string
  principal_amount: number
  current_amount: number
  profit_amount: number
  profit_rate: number
  collected_at: string
}

export interface AssetClassSnapshotRow {
  id: string
  asset_class: string
  snapshot_date: string
  current_amount: number
  collected_at: string
}

export interface DividendSnapshotRow {
  id: string
  account_id: string
  payment_date: string
  stock_code: string
  stock_name: string
  dividend_shares: number
  dividend_per_share: number
  dividend_rate: number
  dividend_amount: number
  collected_at: string
}
