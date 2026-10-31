import { useEffect, useState } from 'react'
import { Download, RefreshCw, Users } from 'lucide-react'
import { api, apiUrl } from '../api'
import type { AttendanceRow } from '../types'

export default function Attendance({ adminPassword }: { adminPassword: string }) {
  const [data, setData] = useState<{ date: string; count: number; rows: AttendanceRow[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const load = () => { setLoading(true); api<typeof data>('/api/attendance/today', { headers: { 'x-admin-password': adminPassword } }).then(setData).finally(() => setLoading(false)) }
  const download = async (path: string, filename: string) => {
    const response = await fetch(apiUrl(path), { headers: { 'x-admin-password': adminPassword } })
    if (!response.ok) return
    const url = URL.createObjectURL(await response.blob())
    const link = document.createElement('a'); link.href = url; link.download = filename; link.click()
    URL.revokeObjectURL(url)
  }
  useEffect(load, [])
  return <section className="attendance-page">
    <div className="list-heading"><div><span className="eyebrow">Dữ liệu theo thời gian thực</span><h1>Danh sách hôm nay</h1><p>{data?.date ? new Date(`${data.date}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : ''}</p></div><button onClick={load}><RefreshCw size={17} className={loading ? 'spin' : ''} /> Làm mới</button></div>
    <div className="count-banner"><Users size={23} /><div><b>{data?.count ?? 0}</b><span>người đã có mặt</span></div></div>
    <div className="export-actions">
      <button onClick={() => download('/api/export/attendance.csv', 'diem-danh.csv')}><Download size={17} /> Tải CSV điểm danh</button>
      <button onClick={() => download('/api/export/students.csv', 'danh-sach-dang-ky.csv')}><Download size={17} /> Tải CSV đăng ký</button>
    </div>
    <div className="table-wrap"><table><thead><tr><th>Thời gian</th><th>Họ và tên</th><th>Lớp</th><th>STT</th><th>Ban</th><th>Trạng thái</th></tr></thead><tbody>
      {data?.rows.map(row => <tr key={row.id}><td>{new Date(`${row.scannedAt}Z`).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</td><td><b>{row.fullName}</b></td><td>{row.className}</td><td>{row.classNumber}</td><td>{row.division}</td><td><span className="present">Có mặt</span></td></tr>)}
      {!loading && !data?.rows.length && <tr><td colSpan={6} className="empty-list">Chưa có lượt điểm danh nào hôm nay.</td></tr>}
    </tbody></table></div>
  </section>
}
