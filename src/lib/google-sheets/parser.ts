import type { AccountType } from "@/lib/types/account"
import type {
  SheetAccountRow,
  SheetAssetClassRow,
  SheetDividendRow,
} from "@/lib/types/sheets"

// "1.투자 현황(현재)" 탭 컬럼 인덱스(0-base, 실측 확정값).
// 계좌명은 계좌의 첫 종목 행에만 등장하고, 계좌 합계는 "합 계" 라벨이 있는 행에 담긴다.
const COLUMN = {
  ACCOUNT_NAME: 1,
  PRINCIPAL_AMOUNT_CELL: 2,
  CURRENT_AMOUNT: 12,
  PROFIT_AMOUNT: 13,
  PROFIT_RATE: 14,
} as const

// 계좌 요약이 아닌 그룹 합산 행(개별 계좌로 취급하지 않음).
const GROUP_SUMMARY_KEYWORDS = ["연금(합계)", "개인 투자(합계)", "전체(합계)"]

// 계좌 요약 행을 나타내는 라벨(그룹 합산 행과 구분).
const ACCOUNT_SUMMARY_LABEL = "합 계"

// 시트에는 있지만 수집 대상에서 제외할 계좌(계좌명+계좌번호 조합으로 식별, 사용자 확정).
const EXCLUDED_ACCOUNTS = [{ accountName: "은퇴 투자", accountNoMasked: "삼성증권" }]

function isExcludedAccount(accountName: string, accountNoMasked: string): boolean {
  return EXCLUDED_ACCOUNTS.some(
    (excluded) =>
      excluded.accountName === accountName &&
      excluded.accountNoMasked === accountNoMasked
  )
}

// 연금 계좌로 분류되는 계좌명 접두어(실측 시트 표기 기준, 공백 포함)
const PENSION_ACCOUNT_NAMES = [
  "퇴직연금",
  "개인연금(기존)",
  "개인연금(신)",
  "DC 계좌",
  "퇴직연금(삼성)",
]

function resolveAccountType(accountName: string): AccountType {
  return PENSION_ACCOUNT_NAMES.some((name) => accountName.startsWith(name))
    ? "연금"
    : "개인투자"
}

function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null
  const numeric = raw.replace(/[^0-9.-]/g, "")
  if (numeric === "" || numeric === "-") return null
  const parsed = Number(numeric)
  return Number.isNaN(parsed) ? null : parsed
}

// 계좌명 셀("퇴직연금\n(220-91-xxxx-757)")을 계좌명/계좌번호(마스킹)로 분리한다.
// 계좌번호 부분을 감싼 괄호는 제거해 다른 계좌(예: "220-91")와 표기를 통일한다.
function splitAccountNameCell(cell: string): {
  accountName: string
  accountNoMasked: string
} {
  const [namePart, noPart] = cell.split("\n")
  const accountNoMasked = (noPart?.trim() ?? "").replace(/^\(|\)$/g, "")
  return {
    accountName: namePart?.trim() ?? "",
    accountNoMasked,
  }
}

function isGroupSummaryRow(label: string): boolean {
  return GROUP_SUMMARY_KEYWORDS.some((keyword) => label.includes(keyword))
}

// "1.투자 현황(현재)" 탭 원시 행 배열을 계좌별 요약 SheetAccountRow[]로 변환하는 순수 함수.
// 계좌명은 첫 종목 행에서 확인해 유지하다가, "합 계" 행을 만나면 해당 계좌의 요약으로 확정한다.
// 그룹 합산 행(연금(합계)/개인 투자(합계)/전체(합계)), 투자금액을 파싱할 수 없는(빈 계좌) 행,
// EXCLUDED_ACCOUNTS에 명시된 계좌(사용자 확정)는 결과에서 제외한다.
export function parseInvestmentSheet(rows: string[][]): SheetAccountRow[] {
  const result: SheetAccountRow[] = []
  let currentAccountName = ""
  let currentAccountNoMasked = ""
  let currentPrincipalAmount: number | null = null

  for (const row of rows) {
    const labelCell = row[COLUMN.ACCOUNT_NAME]?.trim() ?? ""

    if (labelCell === "" || isGroupSummaryRow(labelCell)) {
      continue
    }

    if (labelCell.includes("\n")) {
      const { accountName, accountNoMasked } = splitAccountNameCell(labelCell)
      currentAccountName = accountName
      currentAccountNoMasked = accountNoMasked
      currentPrincipalAmount = parseAmount(row[COLUMN.PRINCIPAL_AMOUNT_CELL])
      continue
    }

    if (labelCell !== ACCOUNT_SUMMARY_LABEL || currentAccountName === "") {
      continue
    }

    if (isExcludedAccount(currentAccountName, currentAccountNoMasked)) {
      currentAccountName = ""
      currentAccountNoMasked = ""
      currentPrincipalAmount = null
      continue
    }

    const currentAmount = parseAmount(row[COLUMN.CURRENT_AMOUNT])
    const profitAmount = parseAmount(row[COLUMN.PROFIT_AMOUNT])
    const profitRate = parseAmount(row[COLUMN.PROFIT_RATE])

    if (currentPrincipalAmount === null || currentAmount === null) {
      currentAccountName = ""
      currentAccountNoMasked = ""
      currentPrincipalAmount = null
      continue
    }

    result.push({
      accountName: currentAccountName,
      accountNoMasked: currentAccountNoMasked,
      accountType: resolveAccountType(currentAccountName),
      principalAmount: currentPrincipalAmount,
      currentAmount,
      profitAmount: profitAmount ?? 0,
      profitRate: profitRate ?? 0,
    })

    currentAccountName = ""
    currentAccountNoMasked = ""
    currentPrincipalAmount = null
  }

  return result
}

// "4.계좌별 비중" 탭 컬럼 인덱스(0-base, 실측 확정값). A열은 항상 빈 값, B열은 "계좌"(빈 값).
const ASSET_CLASS_COLUMN = {
  ASSET_CLASS: 2,
  CURRENT_AMOUNT: 3,
} as const

// 자산군 라벨이 아닌 행(헤더 "자산군", 합계 라벨, 빈 라벨)은 개별 자산군으로 취급하지 않는다.
const ASSET_CLASS_EXCLUDED_LABELS = ["자산군", "합계"]

// "4.계좌별 비중" 탭 [전체 계좌 비중] 섹션 원시 행 배열을 자산군별 요약 SheetAssetClassRow[]로 변환하는 순수 함수.
// 헤더 행("계좌"/"자산군"/"현재금액(원)"/...)과 "합계" 라벨 행, 자산군명이 없는 행은 결과에서 제외한다.
export function parseAssetClassRatio(rows: string[][]): SheetAssetClassRow[] {
  const result: SheetAssetClassRow[] = []

  for (const row of rows) {
    const assetClass = row[ASSET_CLASS_COLUMN.ASSET_CLASS]?.trim() ?? ""

    if (assetClass === "" || ASSET_CLASS_EXCLUDED_LABELS.includes(assetClass)) {
      continue
    }

    const currentAmount = parseAmount(row[ASSET_CLASS_COLUMN.CURRENT_AMOUNT])
    if (currentAmount === null) {
      continue
    }

    result.push({ assetClass, currentAmount })
  }

  return result
}

// 배당 시트 컬럼 인덱스(0-base, 실측 확정값). A열은 항상 빈 값.
const DIVIDEND_COLUMN = {
  PAYMENT_DATE: 1,
  ACCOUNT_NAME: 5,
  STOCK_CODE: 6,
  STOCK_NAME: 7,
  DIVIDEND_SHARES: 8,
  DIVIDEND_PER_SHARE: 9,
  DIVIDEND_RATE: 10,
  DIVIDEND_AMOUNT: 11,
} as const

// 시트의 "YYYY/MM/DD" 일자 표기를 DB date 컬럼과 동일한 "YYYY-MM-DD"로 정규화한다.
function normalizeDividendDate(raw: string | undefined): string | null {
  const match = raw?.trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (!match) return null

  const [, year, month, day] = match
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
}

// 배당 스프레드시트("6.배당금 계산기") "3.배당금지급" 탭 원시 행 배열을 SheetDividendRow[]로 변환하는 순수 함수.
// 헤더 행, 일자를 파싱할 수 없는 행은 제외하고, 오늘 날짜보다 미래인 지급 예정 행도 제외한다
// (시트에 아직 지급되지 않은 예정 배당이 미리 입력되어 있음).
export function parseDividendSheet(
  rows: string[][],
  today: string = new Date().toISOString().slice(0, 10)
): SheetDividendRow[] {
  const result: SheetDividendRow[] = []

  for (const row of rows) {
    const paymentDate = normalizeDividendDate(row[DIVIDEND_COLUMN.PAYMENT_DATE])
    if (paymentDate === null || paymentDate > today) {
      continue
    }

    const accountName = row[DIVIDEND_COLUMN.ACCOUNT_NAME]?.trim() ?? ""
    const stockCode = row[DIVIDEND_COLUMN.STOCK_CODE]?.trim() ?? ""
    const stockName = row[DIVIDEND_COLUMN.STOCK_NAME]?.trim() ?? ""

    const dividendShares = parseAmount(row[DIVIDEND_COLUMN.DIVIDEND_SHARES])
    const dividendPerShare = parseAmount(row[DIVIDEND_COLUMN.DIVIDEND_PER_SHARE])
    const dividendRate = parseAmount(row[DIVIDEND_COLUMN.DIVIDEND_RATE])
    const dividendAmount = parseAmount(row[DIVIDEND_COLUMN.DIVIDEND_AMOUNT])

    if (
      accountName === "" ||
      stockCode === "" ||
      dividendShares === null ||
      dividendPerShare === null ||
      dividendAmount === null
    ) {
      continue
    }

    result.push({
      accountName,
      paymentDate,
      stockCode,
      stockName,
      dividendShares,
      dividendPerShare,
      dividendRate: dividendRate ?? 0,
      dividendAmount,
    })
  }

  return result
}
