const wahaUrl = import.meta.env.VITE_WAHA_API_URL as string | undefined
const wahaApiKey = import.meta.env.VITE_WAHA_API_KEY as string | undefined

export type WahaSessionStatus =
  | "WORKING"
  | "SCAN_QR_CODE"
  | "STARTING"
  | "STOPPED"
  | "FAILED"

interface WahaSession {
  name: string
  status: WahaSessionStatus
  me?: { id: string; pushName: string } | null
}

function headers(): HeadersInit {
  const h: HeadersInit = {}
  if (wahaApiKey) h["X-Api-Key"] = wahaApiKey
  return h
}

export function isWahaConfigured(): boolean {
  return Boolean(wahaUrl)
}

export async function getWahaStatus(
  session = "default"
): Promise<{ status: WahaSessionStatus; name: string } | null> {
  if (!wahaUrl) return null

  const res = await fetch(`${wahaUrl}/api/sessions/${session}`, {
    headers: headers(),
  })

  if (!res.ok) return null

  const data = (await res.json()) as WahaSession
  return { status: data.status, name: data.me?.pushName ?? session }
}

export function getWahaQRUrl(session = "default"): string | null {
  if (!wahaUrl) return null
  const params = wahaApiKey ? `?key=${encodeURIComponent(wahaApiKey)}` : ""
  return `${wahaUrl}/api/${session}/auth/qr${params}`
}

export async function getWahaQRBase64(
  session = "default"
): Promise<string | null> {
  if (!wahaUrl) return null

  const res = await fetch(`${wahaUrl}/api/${session}/auth/qr`, {
    headers: { ...headers(), Accept: "application/json" },
  })

  if (!res.ok) return null

  const data = (await res.json()) as { mimetype: string; data: string }
  return `data:${data.mimetype};base64,${data.data}`
}
