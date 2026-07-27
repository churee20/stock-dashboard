import dayjs from "dayjs"
import {
  fetchAssetClassRatioRows,
  fetchDividendSheetRows,
  fetchInvestmentSheetRows,
} from "@/lib/google-sheets/client"
import {
  parseAssetClassRatio,
  parseDividendSheet,
  parseInvestmentSheet,
} from "@/lib/google-sheets/parser"
import type { SheetDividendRow } from "@/lib/types/sheets"
import { collectFromSheet } from "@/lib/supabase/collect"
import { getAccounts, getSnapshotsByDate } from "@/lib/supabase/queries"
import { summarizeByGroup } from "@/lib/notify/summarize"
import { buildCalendarEvent, buildSummaryMessage } from "@/lib/notify/message"
import { sendKakaoMemo } from "@/lib/notify/kakao"
import { sendSlackMessage } from "@/lib/notify/slack"
import { createInvestmentSummaryEvent } from "@/lib/notify/calendar"
import type { NotifyResult } from "@/lib/notify/types"

type NotificationStatus =
  | { status: "fulfilled"; success: boolean; error?: string }
  | { status: "rejected"; error: string }

function toNotificationStatus(
  result: PromiseSettledResult<NotifyResult>
): NotificationStatus {
  if (result.status === "fulfilled") {
    return {
      status: "fulfilled",
      success: result.value.success,
      error: result.value.error,
    }
  }
  return { status: "rejected", error: String(result.reason) }
}

// 수집 완료 후 카카오톡/Slack/구글캘린더 알림 3종을 독립적으로 전송한다.
// 알림 실패는 여기서 절대 throw하지 않고 결과만 반환한다(호출부의 수집 성공 응답에 영향 없음).
async function sendCollectNotifications(executedAt: Date) {
  const today = dayjs(executedAt).format("YYYY-MM-DD")
  const yesterday = dayjs(executedAt).subtract(1, "day").format("YYYY-MM-DD")

  const accounts = await getAccounts()
  const [todaySnapshots, yesterdaySnapshots] = await Promise.all([
    getSnapshotsByDate(today),
    getSnapshotsByDate(yesterday),
  ])

  const todaySummary = summarizeByGroup(accounts, todaySnapshots)
  const yesterdaySummary =
    yesterdaySnapshots.length > 0
      ? summarizeByGroup(accounts, yesterdaySnapshots)
      : undefined

  const message = buildSummaryMessage(todaySummary, yesterdaySummary, executedAt)
  const calendarEvent = buildCalendarEvent(todaySummary, yesterdaySummary, executedAt)

  const [kakaoResult, slackResult, calendarResult] = await Promise.allSettled([
    sendKakaoMemo(message),
    sendSlackMessage(message),
    createInvestmentSummaryEvent(calendarEvent),
  ])

  return {
    kakao: toNotificationStatus(kakaoResult),
    slack: toNotificationStatus(slackResult),
    calendar: toNotificationStatus(calendarResult),
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const isDryRun = searchParams.get("dryRun") === "true"

  try {
    const rawRows = await fetchInvestmentSheetRows()
    const sheetRows = parseInvestmentSheet(rawRows)

    const assetClassRawRows = await fetchAssetClassRatioRows()
    const assetClassRows = parseAssetClassRatio(assetClassRawRows)

    // 배당 시트는 계좌/자산군과 별도 스프레드시트라, 조회 자체가 실패해도
    // 기존 계좌/자산군 수집(dry-run 응답 포함)에는 영향을 주지 않는다.
    let dividendRawRows: string[][] = []
    let dividendRows: SheetDividendRow[] = []
    let dividendFetchError: string | undefined
    try {
      dividendRawRows = await fetchDividendSheetRows()
      dividendRows = parseDividendSheet(dividendRawRows)
    } catch (error) {
      console.error("[cron/collect] 배당 시트 조회/파싱 실패:", error)
      dividendFetchError = String(error)
    }

    if (isDryRun) {
      return Response.json({
        dryRun: true,
        rawRowCount: rawRows.length,
        rawRows,
        parsedRows: sheetRows,
        parsedAssetClassRows: assetClassRows,
        dividendRawRowCount: dividendRawRows.length,
        parsedDividendRows: dividendRows,
        ...(dividendFetchError ? { dividendFetchError } : {}),
      })
    }

    const result = await collectFromSheet(sheetRows, assetClassRows, dividendRows)

    let notifications
    try {
      notifications = await sendCollectNotifications(new Date())
    } catch (notifyError) {
      // 알림 준비(계좌/스냅샷 조회, 메시지 생성) 단계 자체가 실패해도 수집 성공 응답에는 영향 없음
      console.error("[cron/collect] 알림 전송 준비 중 오류:", notifyError)
      notifications = { error: String(notifyError) }
    }

    return Response.json({ success: true, ...result, notifications })
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }
}
