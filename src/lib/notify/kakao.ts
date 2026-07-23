import type { NotifyResult } from "@/lib/notify/types"

// 카카오 refresh token으로 access token을 갱신한다.
// 카카오 앱의 Client Secret 발급 상태가 ON이라 client_secret도 함께 전달해야 한다(실측 확인됨).
async function refreshKakaoAccessToken(): Promise<string> {
  const restApiKey = process.env.KAKAO_REST_API_KEY
  const clientSecret = process.env.KAKAO_CLIENT_SECRET
  const refreshToken = process.env.KAKAO_REFRESH_TOKEN

  if (!restApiKey || !refreshToken) {
    throw new Error("카카오 환경변수(KAKAO_REST_API_KEY/KAKAO_REFRESH_TOKEN)가 설정되지 않았습니다")
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: restApiKey,
    refresh_token: refreshToken,
  })
  if (clientSecret) {
    params.set("client_secret", clientSecret)
  }

  const response = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  })

  const body = await response.json()
  if (!response.ok || !body.access_token) {
    throw new Error(`카카오 access token 갱신 실패: ${JSON.stringify(body)}`)
  }

  return body.access_token as string
}

// 카카오 "나에게 보내기"로 텍스트 메시지를 전송한다. 실패해도 예외를 던지지 않고 결과 객체로 반환한다.
export async function sendKakaoMemo(message: string): Promise<NotifyResult> {
  try {
    const accessToken = await refreshKakaoAccessToken()

    const templateObject = {
      object_type: "text",
      text: message,
      link: {
        web_url: "https://developers.kakao.com",
        mobile_web_url: "https://developers.kakao.com",
      },
    }

    const params = new URLSearchParams({
      template_object: JSON.stringify(templateObject),
    })

    const response = await fetch(
      "https://kapi.kakao.com/v2/api/talk/memo/default/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      }
    )

    const body = await response.json()
    if (!response.ok || body.result_code !== 0) {
      return { success: false, error: `카카오 전송 실패: ${JSON.stringify(body)}` }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
