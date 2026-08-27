import { createSupabaseServerClient } from "@/lib/supabase/client"
import type { NotifyResult } from "@/lib/notify/types"

const KAKAO_REFRESH_TOKEN_KEY = "kakao_refresh_token"

// 카카오 refresh token은 자체 만료 주기(약 60일)가 있어 env에 고정해두면 언젠가 반드시
// 만료된다. app_secrets 테이블에 저장된 최신 값이 있으면 그걸 우선 쓰고(카카오가 갱신
// 응답에 새 refresh_token을 내려줄 때마다 여기 자동 저장됨), 없으면 env를 최초 시드로 쓴다.
async function getStoredKakaoRefreshToken(): Promise<string | undefined> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from("app_secrets")
    .select("value")
    .eq("key", KAKAO_REFRESH_TOKEN_KEY)
    .maybeSingle()

  if (error) {
    console.error("[kakao] app_secrets 조회 실패, env로 폴백:", error)
    return undefined
  }

  return data?.value
}

async function saveKakaoRefreshToken(refreshToken: string): Promise<void> {
  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from("app_secrets")
    .upsert({ key: KAKAO_REFRESH_TOKEN_KEY, value: refreshToken, updated_at: new Date().toISOString() })

  if (error) {
    console.error("[kakao] 새 refresh_token 저장 실패:", error)
  }
}

// 카카오 refresh token으로 access token을 갱신한다.
// 카카오 앱의 Client Secret 발급 상태가 ON이라 client_secret도 함께 전달해야 한다(실측 확인됨).
async function refreshKakaoAccessToken(): Promise<string> {
  const restApiKey = process.env.KAKAO_REST_API_KEY
  const clientSecret = process.env.KAKAO_CLIENT_SECRET
  const refreshToken =
    (await getStoredKakaoRefreshToken()) ?? process.env.KAKAO_REFRESH_TOKEN

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

  // 카카오는 갱신 시점에 따라 새 refresh_token을 함께 내려줄 수 있다(만료 임박 시 등).
  // 내려오면 저장해두어야 다음 호출에서 원래 refresh token의 고정 만료일에 발목잡히지 않는다.
  if (typeof body.refresh_token === "string") {
    await saveKakaoRefreshToken(body.refresh_token)
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
