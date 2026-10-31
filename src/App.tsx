import { useEffect, useState } from 'react'
import { ClipboardList, QrCode, ScanLine, UserPlus } from 'lucide-react'
import Register from './components/Register'
import Scanner from './components/Scanner'
import Attendance from './components/Attendance'
import { loadAttendance, todayString } from './store'

type View = 'register' | 'scan' | 'attendance'

export default function App() {
  const [view, setView] = useState<View>('register')
  const [adminPassword, setAdminPassword] = useState(() => sessionStorage.getItem('adminPassword') || '')
  const [stats, setStats] = useState({ students: 0, today: 0 })
  const refresh = () => {
    if (!adminPassword) return
    const today = todayString()
    setStats({ students: 0, today: loadAttendance().filter(r => r.date === today).length })
  }
  const lock = () => { sessionStorage.removeItem('adminPassword'); setAdminPassword(''); setStats({ students: 0, today: 0 }); setView('register') }

  useEffect(refresh, [view, adminPassword])

  return (
    <div className="app-shell">
      {adminPassword && <><header className="topbar">
        <button className="brand" onClick={() => setView('register')} aria-label="Trang đăng ký">
          <span className="brand-mark"><QrCode size={25} /></span>
          <span>Phiếu điểm danh</span>
        </button>
        <div className="live-stats" aria-label="Trạng thái quản trị">{adminPassword ? <><b>{stats.today}</b><span> lượt hôm nay</span><button onClick={lock}>Khóa</button></> : <span>Đăng ký công khai</span>}</div>
      </header>

      <nav className="nav-tabs" aria-label="Điều hướng chính">
        <button className={view === 'register' ? 'active' : ''} onClick={() => setView('register')}><UserPlus size={18} /> Đăng ký</button>
        <button className={view === 'scan' ? 'active' : ''} onClick={() => setView('scan')}><ScanLine size={18} /> Quét mã</button>
        <button className={view === 'attendance' ? 'active' : ''} onClick={() => setView('attendance')}><ClipboardList size={18} /> Câu trả lời</button>
      </nav></>}

      <main>
        {(!adminPassword || view === 'register') && <Register onCreated={refresh} onAdminUnlock={setAdminPassword} />}
        {adminPassword && view === 'scan' && <Scanner onScanned={refresh} />}
        {adminPassword && view === 'attendance' && <Attendance />}
      </main>

      <footer>Không chia sẻ mã QR cá nhân của bạn cho người khác.</footer>
    </div>
  )
}
