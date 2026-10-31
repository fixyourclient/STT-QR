import type { AttendanceRow, Student } from './types'

// Mật mã quản trị (kiểm tra ngay trên trình duyệt). Có thể đổi bằng VITE_ADMIN_PASSWORD khi build.
export const ADMIN_PASSWORD = String(import.meta.env.VITE_ADMIN_PASSWORD || '246810')
const KEY = 'attendance-rows-v1'
const PREFIX = 'QRDD2.'

/* ---------- Mã QR chứa sẵn dữ liệu người đăng ký ---------- */
function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text)
  let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromBase64Url(value: string) {
  const bin = atob(value.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)))
}

export function encodeStudent(s: Student) {
  return PREFIX + toBase64Url(JSON.stringify([s.id, s.fullName, s.age ?? 0, s.className, s.classNumber, s.division]))
}

export function decodeStudent(token: string): Student | null {
  try {
    const text = token.trim()
    if (!text.startsWith(PREFIX)) return null
    const [id, fullName, age, className, classNumber, division] = JSON.parse(fromBase64Url(text.slice(PREFIX.length)))
    if (!id || !fullName) return null
    return { id: String(id), fullName: String(fullName), age: Number(age), className: String(className), classNumber: Number(classNumber), division: String(division) }
  } catch { return null }
}

/* ---------- Lưu điểm danh trong localStorage của máy quản trị ---------- */
export function todayString() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function loadAttendance(): AttendanceRow[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as AttendanceRow[] } catch { return [] }
}
function save(rows: AttendanceRow[]) { localStorage.setItem(KEY, JSON.stringify(rows)) }

export function recordScan(token: string): { student: Student; duplicate: boolean; message: string } {
  const student = decodeStudent(token)
  if (!student) throw new Error('Mã QR không hợp lệ hoặc không thuộc hệ thống.')
  const rows = loadAttendance(), date = todayString()
  if (rows.some(r => r.studentId === student.id && r.date === date)) return { student, duplicate: true, message: 'Người này đã điểm danh hôm nay.' }
  rows.push({ id: crypto.randomUUID(), studentId: student.id, scannedAt: new Date().toISOString(), date, fullName: student.fullName, age: student.age, className: student.className, classNumber: student.classNumber, division: student.division })
  save(rows)
  return { student, duplicate: false, message: 'Điểm danh thành công!' }
}

export function clearAttendance() { localStorage.removeItem(KEY) }

/* ---------- Xuất dữ liệu ---------- */
const headers = ['Thời gian', 'Ngày', 'Họ và tên', 'Tuổi', 'Lớp', 'STT', 'Ban']
function toTable(rows: AttendanceRow[]) {
  const time = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return [headers, ...rows.map(r => [time(r.scannedAt), r.date, r.fullName, r.age ?? '', r.className, r.classNumber, r.division])]
}
const csvCell = (v: unknown) => { const t = String(v ?? ''); return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t }

export function toCsv(rows: AttendanceRow[]) { return toTable(rows).map(l => l.map(csvCell).join(',')).join('\r\n') + '\r\n' }
// TSV: dán thẳng vào Google Sheets / Excel sẽ tự chia cột
export function toTsv(rows: AttendanceRow[]) { return toTable(rows).map(l => l.map(v => String(v ?? '').replace(/[\t\r\n]+/g, ' ')).join('\t')).join('\n') }

export function downloadCsv(rows: AttendanceRow[], filename: string) {
  const url = URL.createObjectURL(new Blob(['\uFEFF' + toCsv(rows)], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true } catch {
    const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'
    document.body.appendChild(t); t.select()
    const ok = document.execCommand('copy'); t.remove(); return ok
  }
}
