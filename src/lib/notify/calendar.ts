import { google } from "googleapis"
import type { NotifyResult } from "@/lib/notify/types"
import type { CalendarEventInput } from "@/lib/notify/message"

// Google Sheets 수집용 서비스 계정을 재사용하되, 캘린더 스코프는 별도 JWT 인스턴스로 분리한다
// (client.ts의 Sheets 클라이언트와 스코프가 다르므로 공유 인스턴스로 합치지 않는다).
function createGoogleCalendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

  if (!email || !privateKey) {
    throw new Error("Google 서비스 계정 환경변수가 설정되지 않았습니다")
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/calendar"],
  })

  return google.calendar({ version: "v3", auth })
}

// 투자 실적 요약 이벤트를 구글 캘린더에 등록한다. colorId=7(Peacock), transparency="transparent"로
// AVAILABILITY_FREE(바쁨 표시 없음)를 구현한다. 실패해도 예외를 던지지 않고 결과 객체로 반환한다.
export async function createInvestmentSummaryEvent(
  event: CalendarEventInput
): Promise<NotifyResult> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID

  if (!calendarId) {
    return { success: false, error: "GOOGLE_CALENDAR_ID 환경변수가 설정되지 않았습니다" }
  }

  try {
    const calendar = createGoogleCalendarClient()

    await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.startTime, timeZone: "Asia/Seoul" },
        end: { dateTime: event.endTime, timeZone: "Asia/Seoul" },
        colorId: "7",
        transparency: "transparent",
      },
    })

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
