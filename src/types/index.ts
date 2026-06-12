export type Role = 'manager' | 'lawyer' | 'citizen' | 'onsite'

export type Period = 'morning' | 'afternoon'

export type AppointmentStatus = 'pending' | 'confirmed' | 'conflict' | 'reassigned' | 'cancelled'

export interface Lawyer {
  id: string
  name: string
  specialty: string
  caseKeywords: string[]
  avatar: string
}

export interface Citizen {
  id: string
  name: string
  phone: string
}

export interface Schedule {
  id: string
  lawyerId: string
  date: string
  period: Period
}

export interface Leave {
  id: string
  lawyerId: string
  date: string
  period: Period
  reason: string
}

export interface Appointment {
  id: string
  citizenId: string
  lawyerId: string
  date: string
  period: Period
  status: AppointmentStatus
  caseDesc: string
}

export interface ConflictLog {
  id: string
  appointmentId: string
  originalLawyerId: string
  reassignedLawyerId: string
  conflictReason: string
  createdAt: string
}

export interface ConflictInfo {
  hasConflict: boolean
  reason: string
  conflictingKeywords: string[]
}

export interface AvailableSlot {
  lawyerId: string
  lawyerName: string
  specialty: string
  date: string
  period: Period
}

export interface AppointmentResult {
  success: boolean
  appointment?: Appointment
  conflict?: ConflictInfo
  message: string
}
