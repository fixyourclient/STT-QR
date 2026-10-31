import crypto from 'node:crypto'
import fs from 'node:fs'

const base = 'http://127.0.0.1:3102'
const response = await fetch(`${base}/api/students`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ fullName: 'Nguyễn, Minh Anh', age: 16, className: '12A1', classNumber: 8, division: 'Ban Chuyên Môn' }),
})
const registration = await response.json()
const signature = crypto.createHmac('sha256', 'integration-secret').update(registration.student.id).digest('base64url')
const denied = await fetch(`${base}/api/attendance/today`)
const verified = await fetch(`${base}/api/admin/verify`, { method: 'POST', headers: { 'x-admin-password': '135790' } })
const attendance = await fetch(`${base}/api/attendance/scan`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-admin-password': '135790' },
  body: JSON.stringify({ token: `QRDD1.${registration.student.id}.${signature}`, deviceName: 'Test, Device' }),
})
const exported = await fetch(`${base}/api/export/attendance.csv`, { headers: { 'x-admin-password': '135790' } })
const exportedBytes = new Uint8Array(await exported.arrayBuffer())
const studentsCsv = fs.readFileSync('data/integration-csv/students.csv', 'utf8')

console.log(JSON.stringify({
  student: registration.student.fullName,
  unauthorizedStatus: denied.status,
  verifyStatus: verified.status,
  scanStatus: attendance.status,
  csvType: exported.headers.get('content-type'),
  escapedName: studentsCsv.includes('"Nguyễn, Minh Anh"'),
  exportHasBom: exportedBytes[0] === 0xef && exportedBytes[1] === 0xbb && exportedBytes[2] === 0xbf,
}))
