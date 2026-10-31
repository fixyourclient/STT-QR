import { FormEvent, useEffect, useRef, useState } from 'react'
import { Check, Download, RotateCcw } from 'lucide-react'
import { api } from '../api'
import type { RegistrationResult } from '../types'
import duck from '../assets/duck.webp'
import duckPhotographer from '../assets/duck-photographer.webp'
import duckMechanic from '../assets/duck-mechanic.webp'
import duckPainter from '../assets/duck-painter.webp'

const divisions = ['Ban Chuyên Môn', 'Ban Thiết Kế', 'Ban Truyền Thông']

export default function Register({ onCreated, onAdminUnlock }: { onCreated: () => void; onAdminUnlock: (password: string) => void }) {
  const [form, setForm] = useState({ fullName: '', age: '', className: '', classNumber: '', division: '' })
  const [result, setResult] = useState<RegistrationResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const adminTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (adminTimer.current) clearTimeout(adminTimer.current) }, [])

  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }))
  const updateName = (value: string) => {
    update('fullName', value)
    if (adminTimer.current) clearTimeout(adminTimer.current)
    if (!/^\d{4,12}$/.test(value.trim())) return
    adminTimer.current = setTimeout(async () => {
      try {
        await api<{ ok: true }>('/api/admin/verify', { method: 'POST', headers: { 'x-admin-password': value.trim() } })
        sessionStorage.setItem('adminPassword', value.trim())
        setForm(current => ({ ...current, fullName: '' }))
        onAdminUnlock(value.trim())
      } catch { /* Mã không đúng được giữ như câu trả lời thông thường. */ }
    }, 450)
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true); setError('')
    try {
      const data = await api<RegistrationResult>('/api/students', {
        method: 'POST', body: JSON.stringify({ ...form, age: Number(form.age), classNumber: Number(form.classNumber) }),
      })
      setResult(data); onCreated()
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể đăng ký.') }
    finally { setLoading(false) }
  }

  const download = () => {
    if (!result) return
    const link = document.createElement('a')
    link.href = result.qrDataUrl
    link.download = `QR-${result.student.className}-${result.student.classNumber}-${result.student.fullName.replace(/\s+/g, '-')}.png`
    link.click()
  }

  if (result) return (
    <section className="form-page success-page">
      <div className="form-title-card">
        <div className="form-accent" />
        <h1>Đăng ký thành công</h1>
        <p>Cảm ơn bạn đã hoàn tất biểu mẫu. Hãy tải mã QR và giữ lại để điểm danh.</p>
      </div>
      <div className="qr-card">
        <div className="success-icon"><Check size={22} /></div>
        <img src={result.qrDataUrl} alt={`Mã QR của ${result.student.fullName}`} />
        <h2>{result.student.fullName}</h2>
        <p>{result.student.className} · Số {result.student.classNumber}</p>
        <div className="student-summary"><span>Tuổi: <b>{result.student.age}</b></span><span>Ban: <b>{result.student.division}</b></span></div>
        <button className="primary" onClick={download}><Download size={18} /> Tải mã QR</button>
      </div>
      <button className="new-response" onClick={() => { setResult(null); setForm({ fullName: '', age: '', className: '', classNumber: '', division: '' }) }}><RotateCcw size={16} /> Gửi một câu trả lời khác</button>
    </section>
  )

  return (
    <section className="form-page">
      <div className="mascot" aria-hidden="true"><img src={duck} alt="" /></div>
      <div className="side-ducks" aria-hidden="true">
        <img className="duck-photographer" src={duckPhotographer} alt="" />
        <img className="duck-mechanic" src={duckMechanic} alt="" />
        <img className="duck-painter" src={duckPainter} alt="" />
      </div>
      <div className="form-title-card">
        <div className="form-accent" />
        <h1>Đăng ký điểm danh</h1>
        <p>Vui lòng điền đầy đủ thông tin bên dưới. Sau khi gửi, bạn sẽ nhận được một mã QR cá nhân để sử dụng khi điểm danh.</p>
        <div className="required-note">* Biểu thị câu hỏi bắt buộc</div>
      </div>
      <form className="question-list" onSubmit={submit}>
        <label className="question-card"><span>Họ và tên <i>*</i></span><input required autoComplete="name" value={form.fullName} onChange={e => updateName(e.target.value)} placeholder="Câu trả lời của bạn" minLength={2} maxLength={100} /></label>
        <label className="question-card"><span>Tuổi <i>*</i></span><input required type="number" inputMode="numeric" min="5" max="100" value={form.age} onChange={e => update('age', e.target.value)} placeholder="Câu trả lời của bạn" /></label>
        <label className="question-card"><span>Lớp <i>*</i></span><input required value={form.className} onChange={e => update('className', e.target.value)} placeholder="Ví dụ: 12A1" maxLength={30} /></label>
        <label className="question-card"><span>Số thứ tự trong lớp <i>*</i></span><input required type="number" inputMode="numeric" min="1" max="999" value={form.classNumber} onChange={e => update('classNumber', e.target.value)} placeholder="Câu trả lời của bạn" /></label>
        <label className="question-card"><span>Ban học <i>*</i></span>
          <select required value={form.division} onChange={e => update('division', e.target.value)}>
            <option value="" disabled>Chọn</option>
            {divisions.map(item => <option key={item}>{item}</option>)}
          </select>
        </label>
        {error && <div className="error" role="alert">{error}</div>}
        <div className="form-actions"><button className="primary submit" disabled={loading}>{loading ? 'Đang gửi…' : 'Gửi'}</button><button type="button" className="clear-form" onClick={() => setForm({ fullName: '', age: '', className: '', classNumber: '', division: '' })}>Xóa hết câu trả lời</button></div>
        <p className="privacy-note">Thông tin của bạn chỉ được sử dụng cho mục đích điểm danh.</p>
      </form>
    </section>
  )
}
