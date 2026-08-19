import type { AccountType } from "@/lib/types/account"
import type {
  SheetAccountRow,
  SheetAssetClassRow,
  SheetDividendRow,
  SheetStockHoldingRow,
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

// 종목 시트는 음수를 "-" 부호가 아닌 "▼" 접두사로 표기한다("▼₩40,318,147", "▼16.74%").
// 숫자 자체에는 마이너스 부호가 없으므로 parseAmount와 별도로 "▼" 유무를 먼저 확인해 부호를 반영한다.
function parseSignedAmount(raw: string | undefined): number | null {
  if (!raw) return null
  const isNegative = raw.includes("▼")
  const numeric = raw.replace(/[^0-9.]/g, "")
  if (numeric === "") return null
  const parsed = Number(numeric)
  if (Number.isNaN(parsed)) return null
  return isNegative ? -parsed : parsed
}

// "27.8%"/"▼16.74%" 형태의 퍼센트 문자열을 소수(0.278/-0.1674)로 변환한다.
// 기존 profit_rate 등 DB 저장 관례(소수, 화면에서 formatPercent로 %를 붙임)와 통일하기 위함.
function parseSignedPercent(raw: string | undefined): number | null {
  const parsed = parseSignedAmount(raw)
  return parsed === null ? null : parsed / 100
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
// 그룹 합산 행(연금(합계)/개인 투자(합계)/전체(합계)), 투자금액을 파싱할 수 없는(빈 계좌) 행은 결과에서 제외한다.
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
// 헤더 행("계좌"/"자산군"/"현재금액(원)"/...)과 "합계" 라벨 행은 결과에서 제외한다.
// 자산군명이 없는 빈 행을 만나면 [전체 계좌 비중] 섹션이 끝난 것으로 보고 순회를 중단한다.
// (아래 여백 행 너머에는 자산군명이 같은 [계좌별 비중] 섹션이 이어지므로, 여기서 끊지 않으면 중복 합산된다.)
// 이 방식 덕분에 자산군 행 수가 늘거나 줄어도(예: 자산군 추가) 코드 수정 없이 대응된다.
export function parseAssetClassRatio(rows: string[][]): SheetAssetClassRow[] {
  const result: SheetAssetClassRow[] = []

  for (const row of rows) {
    const assetClass = row[ASSET_CLASS_COLUMN.ASSET_CLASS]?.trim() ?? ""

    if (assetClass === "") {
      if (result.length > 0) break
      continue
    }

    if (ASSET_CLASS_EXCLUDED_LABELS.includes(assetClass)) {
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
// G열(증권사)은 동일 계좌명을 쓰는 서로 다른 증권사 계좌(예: "처리투자"의 미래에셋/삼성증권)를
// 구분하기 위해 추가된 컬럼이다.
const DIVIDEND_COLUMN = {
  PAYMENT_DATE: 1,
  ACCOUNT_NAME: 5,
  ACCOUNT_NO_MASKED: 6,
  STOCK_CODE: 7,
  STOCK_NAME: 8,
  DIVIDEND_SHARES: 9,
  DIVIDEND_PER_SHARE: 10,
  DIVIDEND_RATE: 11,
  DIVIDEND_AMOUNT: 12,
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
    const accountNoMasked = row[DIVIDEND_COLUMN.ACCOUNT_NO_MASKED]?.trim() ?? ""
    const stockCode = row[DIVIDEND_COLUMN.STOCK_CODE]?.trim() ?? ""
    const stockName = row[DIVIDEND_COLUMN.STOCK_NAME]?.trim() ?? ""

    const dividendShares = parseAmount(row[DIVIDEND_COLUMN.DIVIDEND_SHARES])
    const dividendPerShare = parseAmount(row[DIVIDEND_COLUMN.DIVIDEND_PER_SHARE])
    const dividendRate = parseAmount(row[DIVIDEND_COLUMN.DIVIDEND_RATE])
    const dividendAmount = parseAmount(row[DIVIDEND_COLUMN.DIVIDEND_AMOUNT])

    if (
      accountName === "" ||
      accountNoMasked === "" ||
      stockCode === "" ||
      dividendShares === null ||
      dividendPerShare === null ||
      dividendAmount === null
    ) {
      continue
    }

    result.push({
      accountName,
      accountNoMasked,
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

// 종목 시트 "2. 종목현황" 탭 컬럼 인덱스(0-base, 실측 확정값). A열은 항상 빈 값.
const STOCK_HOLDING_COLUMN = {
  COUNTRY: 2,
  STOCK_CODE: 3,
  STOCK_NAME: 4,
  QUANTITY: 5,
  AVG_PRICE_KRW: 6,
  AVG_PRICE_USD: 7,
  CURRENT_PRICE_KRW: 8,
  CURRENT_PRICE_USD: 9,
  VALUATION_AMOUNT: 10,
  WEIGHT_RATE: 11,
  CUMULATIVE_DIVIDEND: 12,
  CUMULATIVE_PROFIT: 13,
  TOTAL_RETURN_RATE: 14,
} as const

// "현금" 행은 종목이 아니므로 결과에서 제외한다(종목코드/종목명이 모두 "현금").
const CASH_ROW_LABEL = "현금"

// "2. 종목현황" 탭 "종목별 실적 & 비중" 섹션 원시 행 배열을 종목별 SheetStockHoldingRow[]로 변환하는 순수 함수.
// 헤더 행(국가 라벨 없음), 합계 행(종목코드 없음), 현금 행은 제외한다.
export function parseStockHoldings(rows: string[][]): SheetStockHoldingRow[] {
  const result: SheetStockHoldingRow[] = []

  for (const row of rows) {
    const country = row[STOCK_HOLDING_COLUMN.COUNTRY]?.trim() ?? ""
    const stockCode = row[STOCK_HOLDING_COLUMN.STOCK_CODE]?.trim() ?? ""
    const stockName = row[STOCK_HOLDING_COLUMN.STOCK_NAME]?.trim() ?? ""

    if (country === "" || stockCode === "" || stockCode === CASH_ROW_LABEL) {
      continue
    }

    const quantity = parseAmount(row[STOCK_HOLDING_COLUMN.QUANTITY])
    const valuationAmount = parseAmount(row[STOCK_HOLDING_COLUMN.VALUATION_AMOUNT])
    const weightRate = parseAmount(row[STOCK_HOLDING_COLUMN.WEIGHT_RATE])
    const cumulativeDividend = parseAmount(
      row[STOCK_HOLDING_COLUMN.CUMULATIVE_DIVIDEND]
    )
    const cumulativeProfit = parseSignedAmount(
      row[STOCK_HOLDING_COLUMN.CUMULATIVE_PROFIT]
    )
    const totalReturnRate = parseSignedPercent(
      row[STOCK_HOLDING_COLUMN.TOTAL_RETURN_RATE]
    )

    if (
      quantity === null ||
      valuationAmount === null ||
      weightRate === null ||
      cumulativeProfit === null ||
      totalReturnRate === null
    ) {
      continue
    }

    result.push({
      country,
      stockCode,
      stockName,
      quantity,
      avgPriceKrw: parseAmount(row[STOCK_HOLDING_COLUMN.AVG_PRICE_KRW]),
      avgPriceUsd: parseAmount(row[STOCK_HOLDING_COLUMN.AVG_PRICE_USD]),
      currentPriceKrw: parseAmount(row[STOCK_HOLDING_COLUMN.CURRENT_PRICE_KRW]),
      currentPriceUsd: parseAmount(row[STOCK_HOLDING_COLUMN.CURRENT_PRICE_USD]),
      valuationAmount,
      weightRate: weightRate / 100,
      cumulativeDividend: cumulativeDividend ?? 0,
      cumulativeProfit,
      totalReturnRate,
    })
  }

  return result
}
