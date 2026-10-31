const configuredUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''

export function apiUrl(path: string) {
  return `${configuredUrl}${path}`
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw Object.assign(new Error('Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ API (VITE_API_URL).'), { status: 0, body: {} })
  }

  const text = await response.text()
  let body: any = {}
  try { body = text ? JSON.parse(text) : {} } catch { body = {} }

  if (!response.ok) {
    const fallback = response.status === 404 || response.status === 405
      ? `Không tìm thấy API (${response.status}). Frontend đang không trỏ tới máy chủ backend — hãy đặt VITE_API_URL.`
      : response.status >= 500
        ? `Máy chủ đang lỗi (${response.status}). Vui lòng thử lại sau.`
        : `Có lỗi xảy ra (${response.status}).`
    throw Object.assign(new Error(body.message || fallback), { status: response.status, body })
  }
  if (text && !Object.keys(body).length) {
    throw Object.assign(new Error('Máy chủ trả về dữ liệu không phải JSON. Kiểm tra VITE_API_URL.'), { status: response.status, body })
  }
  return body
}
