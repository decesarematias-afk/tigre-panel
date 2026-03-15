const envWahaUrl = import.meta.env.VITE_WAHA_API_URL as string | undefined
const envWahaApiKey = import.meta.env.VITE_WAHA_API_KEY as string | undefined

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

function buildHeaders(apiKey?: string): HeadersInit {
  const h: HeadersInit = {}
  const key = apiKey ?? envWahaApiKey
  if (key) h["X-Api-Key"] = key
  return h
}

export function resolveWahaUrl(overrideUrl?: string): string | null {
  return overrideUrl || envWahaUrl || null
}

export function isWahaConfigured(overrideUrl?: string): boolean {
  return Boolean(resolveWahaUrl(overrideUrl))
}

export async function getWahaStatus(
  session = "default",
  overrideUrl?: string,
  overrideKey?: string
): Promise<{ status: WahaSessionStatus; name: string } | null> {
  const url = resolveWahaUrl(overrideUrl)
  if (!url) return null

  try {
    const res = await fetch(`${url}/api/sessions/${session}`, {
      headers: buildHeaders(overrideKey),
    })
    if (!res.ok) return null
    const data = (await res.json()) as WahaSession
    return { status: data.status, name: data.me?.pushName ?? session }
  } catch {
    return null
  }
}

export async function getWahaQRBase64(
  session = "default",
  overrideUrl?: string,
  overrideKey?: string
): Promise<string | null> {
  const url = resolveWahaUrl(overrideUrl)
  if (!url) return null

  try {
    const res = await fetch(`${url}/api/${session}/auth/qr`, {
      headers: { ...buildHeaders(overrideKey), Accept: "application/json" },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { mimetype: string; data: string }
    return `data:${data.mimetype};base64,${data.data}`
  } catch {
    return null
  }
}
