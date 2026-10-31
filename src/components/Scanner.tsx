import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CheckCircle2, Keyboard, RotateCcw, TriangleAlert, XCircle } from 'lucide-react'
import { api } from '../api'
import type { Student } from '../types'

type ScanResult = { message: string; student?: Student; duplicate?: boolean }

export default function Scanner({ onScanned, adminPassword }: { onScanned: () => void; adminPassword: string }) {
  const scanner = useRef<Html5Qrcode | null>(null)
  const busy = useRef(false)
  const [active, setActive] = useState(false)
  const [manual, setManual] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')

  const stop = async () => {
    if (scanner.current?.isScanning) await scanner.current.stop().catch(() => {})
    scanner.current?.clear(); scanner.current = null; setActive(false)
  }

  useEffect(() => () => { if (scanner.current?.isScanning) scanner.current.stop().catch(() => {}) }, [])

  const submitToken = async (token: string) => {
    if (busy.current) return
    busy.current = true; setError('')
    try {
      const data = await api<ScanResult>('/api/attendance/scan', { method: 'POST', headers: { 'x-admin-password': adminPassword }, body: JSON.stringify({ token, deviceName: navigator.userAgent }) })
      setResult(data); onScanned(); await stop()
    } catch (err: unknown) {
      const typed = err as Error & { body?: ScanResult }
      if (typed.body?.duplicate) { setResult(typed.body); await stop() }
      else setError(typed.message || 'Không thể đọc mã này.')
    } finally { busy.current = false }
  }

  const start = async () => {
    setError(''); setResult(null)
    try {
      const instance = new Html5Qrcode('reader')
      scanner.current = instance
      await instance.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 }, submitToken, () => {})
      setActive(true)
    } catch { setError('Không thể mở camera. Hãy cấp quyền camera cho ứng dụng rồi thử lại.'); await stop() }
  }

  const reset = () => { setResult(null); setError(''); setManual(''); busy.current = false }

  return (
    <section className="scanner-page">
      <div className="center-heading"><span className="eyebrow">Điểm danh hôm nay</span><h1>Đưa mã QR vào khung</h1><p>Camera sẽ tự nhận diện và ghi nhận chỉ trong vài giây.</p></div>
      <div className="scanner-grid">
        <div className={`camera-card ${active ? 'active' : ''}`}>
          <div id="reader" />
          {!active && !result && <div className="camera-empty"><div className="scan-icon"><ScanCorners /></div><h2>Sẵn sàng quét</h2><p>Cho phép truy cập camera để bắt đầu</p><button className="primary" onClick={start}><Camera size={19} /> Mở camera</button></div>}
          {active && <button className="stop-camera" onClick={stop}>Dừng camera</button>}
          {result && <div className={`scan-result ${result.duplicate ? 'duplicate' : ''}`}>
            {result.duplicate ? <TriangleAlert size={54} /> : <CheckCircle2 size={54} />}
            <span>{result.duplicate ? 'Đã điểm danh' : 'Thành công'}</span>
            <h2>{result.student?.fullName}</h2>
            <p>{result.student?.className} · Số {result.student?.classNumber}</p>
            <button className="primary" onClick={reset}><RotateCcw size={18} /> Quét người tiếp theo</button>
          </div>}
        </div>
        <aside className="scanner-side">
          <div className="status-card"><span className="status-dot" /><div><b>Hệ thống đang hoạt động</b><small>Dữ liệu sẽ được lưu ngay khi quét</small></div></div>
          <div className="manual-card"><Keyboard size={22} /><h3>Nhập mã thủ công</h3><p>Dùng khi camera không thể nhận diện.</p><textarea value={manual} onChange={e => setManual(e.target.value)} placeholder="Dán nội dung mã QR tại đây" /><button disabled={!manual.trim()} onClick={() => submitToken(manual)}>Xác nhận mã</button></div>
          {error && <div className="scan-error"><XCircle size={20} /><span>{error}</span></div>}
        </aside>
      </div>
    </section>
  )
}

function ScanCorners() {
  return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 24V12a4 4 0 0 1 4-4h12M40 8h12a4 4 0 0 1 4 4v12M56 40v12a4 4 0 0 1-4 4H40M24 56H12a4 4 0 0 1-4-4V40" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
}
