import { useEffect, useState } from 'react'
import { ClipboardCopy, Download, RefreshCw, Trash2, Users } from 'lucide-react'
import type { AttendanceRow } from '../types'
import { clearAttendance, copyText, downloadCsv, loadAttendance, todayString, toTsv } from '../store'

export default function Attendance() {
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const date = todayString()
  const load = () => { setLoading(true); setRows(loadAttendance()); setTimeout(() => setLoading(false), 250) }
  useEffect(load, [])

  const today = rows.filter(r => r.date === date).sort((a, b) => b.scannedAt.localeCompare(a.scannedAt))
  const flash = (text: string) => { setNotice(text); setTimeout(() => setNotice(''), 2500) }
  const copy = async (list: AttendanceRow[]) => flash(await copyText(toTsv(list)) ? `Đã sao chép ${list.length} dòng — dán thẳng vào Google Sheets/Excel.` : 'Không sao chép được, hãy dùng nút tải CSV.')
  const clear = () => { if (confirm('Xóa toàn bộ dữ liệu điểm danh trên thiết bị này? Hãy xuất dữ liệu trước.')) { clearAttendance(); load() } }

  return <section className="attendance-page">
    <div className="list-heading"><div><span className="eyebrow">Lưu trên thiết bị này</span><h1>Danh sách hôm nay</h1><p>{new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p></div><button onClick={load}><RefreshCw size={17} className={loading ? 'spin' : ''} /> Làm mới</button></div>
    <div className="count-banner"><Users size={23} /><div><b>{today.length}</b><span>người đã có mặt</span></div></div>
    <div className="export-actions">
      <button onClick={() => copy(rows)} disabled={!rows.length}><ClipboardCopy size={17} /> Sao chép dữ liệu</button>
      <button onClick={() => downloadCsv(rows, `diem-danh-${date}.csv`)} disabled={!rows.length}><Download size={17} /> Tải CSV</button>
      <button onClick={clear} disabled={!rows.length}><Trash2 size={17} /> Xóa dữ liệu</button>
    </div>
    {notice && <p role="status">{notice}</p>}
    <div className="table-wrap"><table><thead><tr><th>Thời gian</th><th>Họ và tên</th><th>Lớp</th><th>STT</th><th>Ban</th><th>Trạng thái</th></tr></thead><tbody>
      {today.map(row => <tr key={row.id}><td>{new Date(row.scannedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</td><td><b>{row.fullName}</b></td><td>{row.className}</td><td>{row.classNumber}</td><td>{row.division}</td><td><span className="present">Có mặt</span></td></tr>)}
      {!today.length && <tr><td colSpan={6} className="empty-list">Chưa có lượt điểm danh nào hôm nay.</td></tr>}
    </tbody></table></div>
  </section>
}
