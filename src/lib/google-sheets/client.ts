import { google, sheets_v4 } from "googleapis"

// 서버 사이드 전용: 서비스 계정(JWT) 인증으로 Google Sheets API 클라이언트를 생성합니다.
export function createGoogleSheetsClient(): sheets_v4.Sheets {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

  if (!email || !privateKey) {
    throw new Error("Google 서비스 계정 환경변수가 설정되지 않았습니다")
  }

  const auth = new google.auth.JWT({
    email,
    // .env에는 개행이 \n 문자열 그대로 저장되므로 실제 개행으로 치환
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })

  return google.sheets({ version: "v4", auth })
}

export function getGoogleSheetId(): string {
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!sheetId) {
    throw new Error("GOOGLE_SHEET_ID 환경변수가 설정되지 않았습니다")
  }
  return sheetId
}

// 배당 데이터는 투자 실적과 별도의 스프레드시트("6.배당금 계산기")에 있다.
export function getGoogleDividendSheetId(): string {
  const sheetId = process.env.GOOGLE_DIVIDEND_SHEET_ID
  if (!sheetId) {
    throw new Error("GOOGLE_DIVIDEND_SHEET_ID 환경변수가 설정되지 않았습니다")
  }
  return sheetId
}

// "1.투자 현황(현재)" 탭의 활성 데이터 범위(1~123행)를 2차원 문자열 배열로 읽어온다.
export async function fetchInvestmentSheetRows(
  range = "1.투자 현황(현재)!A1:O123"
): Promise<string[][]> {
  const sheets = createGoogleSheetsClient()
  const spreadsheetId = getGoogleSheetId()

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  })

  return (response.data.values ?? []) as string[][]
}

// "4.계좌별 비중" 탭의 [전체 계좌 비중] 섹션(4행 헤더 포함 ~11행 합계) 범위를 읽어온다.
// "1.투자 현황(현재)" G열(자산구분)+M열(조회금액) 기준으로 시트 수식이 자동 계산해두는 값이다.
export async function fetchAssetClassRatioRows(
  range = "4.계좌별 비중!A4:D11"
): Promise<string[][]> {
  const sheets = createGoogleSheetsClient()
  const spreadsheetId = getGoogleSheetId()

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  })

  return (response.data.values ?? []) as string[][]
}

// 배당 스프레드시트("6.배당금 계산기") "3.배당금지급" 탭을 읽어온다(별도 스프레드시트, 헤더 3행+데이터 5행~).
export async function fetchDividendSheetRows(
  range = "3.배당금지급!A1:N700"
): Promise<string[][]> {
  const sheets = createGoogleSheetsClient()
  const spreadsheetId = getGoogleDividendSheetId()

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  })

  return (response.data.values ?? []) as string[][]
}
