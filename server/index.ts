import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import QRCode from 'qrcode'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data')
const studentsFile = path.join(dataDir, 'students.csv')
const attendanceFile = path.join(dataDir, 'attendance.csv')
const studentHeaders = ['id', 'full_name', 'age', 'class_name', 'class_number', 'division', 'created_at'] as const
const attendanceHeaders = ['id', 'student_id', 'scanned_at', 'attendance_date', 'device_name'] as const

fs.mkdirSync(dataDir, { recursive: true })
ensureCsv(studentsFile, studentHeaders)
ensureCsv(attendanceFile, attendanceHeaders)

const app = express()
const port = Number(process.env.PORT || 3001)
const secret = process.env.QR_SECRET || 'dev-only-change-me-before-production'
const adminPassword = process.env.ADMIN_PASSWORD || '246810'
app.use(cors())
app.use(express.json({ limit: '50kb' }))

type CsvRow = Record<string, string>
type Registration = { fullName?: string; age?: number; className?: string; classNumber?: number; division?: string }

function csvCell(value: unknown) {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function csvLine(values: readonly unknown[]) { return `${values.map(csvCell).join(',')}\r\n` }

function ensureCsv(file: string, headers: readonly string[]) {
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) fs.writeFileSync(file, csvLine(headers), 'utf8')
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    if (quoted) {
      if (char === '"' && content[i + 1] === '"') { field += '"'; i++ }
      else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') { row.push(field); field = '' }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); if (row.some(Boolean)) rows.push(row); row = []; field = '' }
    else field += char
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row) }
  return rows
}

function readCsv(file: string): CsvRow[] {
  const parsed = parseCsv(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
  const [headers = [], ...rows] = parsed
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

function appendCsv(file: string, values: readonly unknown[]) { fs.appendFileSync(file, csvLine(values), 'utf8') }

function signStudent(id: string) {
  const signature = crypto.createHmac('sha256', secret).update(id).digest('base64url')
  return `QRDD1.${id}.${signature}`
}

function verifyToken(token: string) {
  const [version, id, signature] = token.split('.')
  if (version !== 'QRDD1' || !id || !signature) return null
  const expected = crypto.createHmac('sha256', secret).update(id).digest('base64url')
  const a = Buffer.from(signature), b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? id : null
}

function localDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function publicStudent(row: CsvRow) {
  return { id: row.id, fullName: row.full_name, age: Number(row.age), className: row.class_name, classNumber: Number(row.class_number), division: row.division }
}

function sendCsv(res: express.Response, file: string, downloadName: string) {
  const content = fs.readFileSync(file, 'utf8')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`)
  res.send(`\uFEFF${content}`)
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const supplied = String(req.header('x-admin-password') || '')
  const expected = Buffer.from(adminPassword), actual = Buffer.from(supplied)
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return res.status(401).json({ message: 'Mật mã quản trị không đúng.' })
  }
  next()
}

app.get('/api/health', (_req, res) => res.json({ ok: true, storage: 'csv' }))
app.post('/api/admin/verify', requireAdmin, (_req, res) => res.json({ ok: true }))

app.post('/api/students', async (req, res) => {
  const { fullName, age, className, classNumber, division } = req.body as Registration
  const name = fullName?.trim(), classroom = className?.trim().toUpperCase(), group = division?.trim()
  if (!name || name.length < 2 || name.length > 100) return res.status(400).json({ message: 'Họ tên chưa hợp lệ.' })
  if (!Number.isInteger(age) || age! < 5 || age! > 100) return res.status(400).json({ message: 'Tuổi phải từ 5 đến 100.' })
  if (!classroom || classroom.length > 30) return res.status(400).json({ message: 'Tên lớp chưa hợp lệ.' })
  if (!Number.isInteger(classNumber) || classNumber! < 1 || classNumber! > 999) return res.status(400).json({ message: 'Số thứ tự chưa hợp lệ.' })
  if (!group || group.length > 50) return res.status(400).json({ message: 'Vui lòng chọn ban.' })

  const students = readCsv(studentsFile)
  if (students.some(row => row.class_name === classroom && Number(row.class_number) === classNumber)) return res.status(409).json({ message: `Lớp ${classroom} đã có số thứ tự ${classNumber}.` })

  const id = crypto.randomUUID(), createdAt = new Date().toISOString()
  appendCsv(studentsFile, [id, name, age, classroom, classNumber, group, createdAt])
  try {
    const qrDataUrl = await QRCode.toDataURL(signStudent(id), { width: 900, margin: 2, errorCorrectionLevel: 'H' })
    res.status(201).json({ student: { id, fullName: name, age, className: classroom, classNumber, division: group }, qrDataUrl })
  } catch (error) {
    console.error(error); res.status(500).json({ message: 'Đã lưu đăng ký nhưng không thể tạo ảnh QR lúc này.' })
  }
})

app.post('/api/attendance/scan', requireAdmin, (req, res) => {
  const studentId = verifyToken(String(req.body?.token || '').trim())
  if (!studentId) return res.status(400).json({ message: 'Mã QR không hợp lệ hoặc không thuộc hệ thống.' })
  const studentRow = readCsv(studentsFile).find(row => row.id === studentId)
  if (!studentRow) return res.status(404).json({ message: 'Không tìm thấy người dùng của mã QR này.' })
  const student = publicStudent(studentRow), date = localDate()
  if (readCsv(attendanceFile).some(row => row.student_id === studentId && row.attendance_date === date)) return res.status(409).json({ message: 'Người này đã điểm danh hôm nay.', student, duplicate: true })
  const scannedAt = new Date().toISOString()
  appendCsv(attendanceFile, [crypto.randomUUID(), studentId, scannedAt, date, String(req.body?.deviceName || '').slice(0, 100)])
  res.status(201).json({ message: 'Điểm danh thành công!', student, scannedAt, duplicate: false })
})

app.get('/api/attendance/today', requireAdmin, (_req, res) => {
  const students = new Map(readCsv(studentsFile).map(row => [row.id, row]))
  const rows = readCsv(attendanceFile).filter(row => row.attendance_date === localDate()).map(row => {
    const student = students.get(row.student_id)
    if (!student) return null
    const publicData = publicStudent(student)
    return { id: row.id, scannedAt: row.scanned_at, fullName: publicData.fullName, className: publicData.className, classNumber: publicData.classNumber, division: publicData.division }
  }).filter(row => row !== null).sort((a, b) => b.scannedAt.localeCompare(a.scannedAt))
  res.json({ date: localDate(), count: rows.length, rows })
})

app.get('/api/stats', requireAdmin, (_req, res) => res.json({ students: readCsv(studentsFile).length, today: readCsv(attendanceFile).filter(row => row.attendance_date === localDate()).length }))
app.get('/api/export/students.csv', requireAdmin, (_req, res) => sendCsv(res, studentsFile, `danh-sach-dang-ky-${localDate()}.csv`))
app.get('/api/export/attendance.csv', requireAdmin, (_req, res) => sendCsv(res, attendanceFile, `diem-danh-${localDate()}.csv`))

const dist = path.join(root, 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error)
  if ((error as { type?: string })?.type === 'entity.parse.failed') return res.status(400).json({ message: 'Dữ liệu gửi lên không hợp lệ.' })
  res.status(500).json({ message: 'Máy chủ gặp lỗi không mong muốn.' })
})

app.listen(port, '0.0.0.0', () => console.log(`API CSV đang chạy tại http://localhost:${port}`))
