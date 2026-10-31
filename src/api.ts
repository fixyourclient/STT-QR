const configuredUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''

export function apiUrl(path: string) {
  return `${configuredUrl}${path}`
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(body.message || 'Có lỗi xảy ra.'), { status: response.status, body })
  return body
}
