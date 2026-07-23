import type { NotifyResult } from "@/lib/notify/types"

// Slack Incoming Webhook으로 텍스트 메시지를 전송한다. 실패해도 예외를 던지지 않고 결과 객체로 반환한다.
// 채널은 Webhook URL 발급 시 이미 바인딩되어 있어 별도 channel 파라미터가 필요 없다.
export async function sendSlackMessage(message: string): Promise<NotifyResult> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    return { success: false, error: "SLACK_WEBHOOK_URL 환경변수가 설정되지 않았습니다" }
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    })

    const body = await response.text()
    if (!response.ok || body !== "ok") {
      return { success: false, error: `Slack 전송 실패: ${response.status} ${body}` }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
