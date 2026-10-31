export type Student = {
  id: string
  fullName: string
  age?: number
  className: string
  classNumber: number
  division: string
}

export type RegistrationResult = { student: Student; qrDataUrl: string }

export type AttendanceRow = Omit<Student, 'id' | 'age'> & { id: number; scannedAt: string }
