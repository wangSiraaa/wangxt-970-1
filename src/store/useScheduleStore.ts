import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Role, Lawyer, Citizen, Schedule, Leave, Appointment,
  ConflictLog, ConflictInfo, AvailableSlot, AppointmentResult, Period
} from '@/types'

function generateId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
}

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekDates() {
  const dates: string[] = []
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return dates
}

const INITIAL_LAWYERS: Lawyer[] = [
  { id: 'L001', name: '张明远', specialty: '民商事诉讼', caseKeywords: ['合同纠纷', '债务追偿', '房产争议'], avatar: '张' },
  { id: 'L002', name: '李婉清', specialty: '婚姻家事', caseKeywords: ['离婚', '抚养权', '财产分割', '遗产继承'], avatar: '李' },
  { id: 'L003', name: '王建国', specialty: '刑事辩护', caseKeywords: ['盗窃', '诈骗', '故意伤害', '经济犯罪'], avatar: '王' },
  { id: 'L004', name: '赵雅芝', specialty: '知识产权', caseKeywords: ['商标侵权', '专利纠纷', '著作权', '商业秘密'], avatar: '赵' },
  { id: 'L005', name: '陈志强', specialty: '劳动争议', caseKeywords: ['劳动合同', '工伤赔偿', '社保纠纷', '辞退补偿'], avatar: '陈' },
  { id: 'L006', name: '刘雨桐', specialty: '行政法务', caseKeywords: ['行政处罚', '行政许可', '征地拆迁', '行政复议'], avatar: '刘' },
]

const INITIAL_CITIZENS: Citizen[] = [
  { id: 'C001', name: '周小华', phone: '138****1234' },
  { id: 'C002', name: '孙丽萍', phone: '139****5678' },
  { id: 'C003', name: '吴大海', phone: '136****9012' },
]

function buildInitialSchedules(dates: string[]): Schedule[] {
  const schedules: Schedule[] = []
  const assignments: { period: Period; lawyerIds: string[] }[] = [
    { period: 'morning', lawyerIds: ['L001', 'L002', 'L003', 'L004', 'L005', 'L006'] },
    { period: 'afternoon', lawyerIds: ['L001', 'L003', 'L004', 'L005', 'L006', 'L002'] },
  ]
  let counter = 0
  for (const date of dates) {
    for (const { period, lawyerIds } of assignments) {
      for (const lid of lawyerIds) {
        counter++
        schedules.push({ id: `S${String(counter).padStart(3, '0')}`, lawyerId: lid, date, period })
      }
    }
  }
  return schedules
}

function buildInitialLeaves(dates: string[]): Leave[] {
  return [
    { id: 'LV001', lawyerId: 'L002', date: dates[2], period: 'morning', reason: '个人事务' },
    { id: 'LV002', lawyerId: 'L005', date: dates[4], period: 'afternoon', reason: '出差' },
  ]
}

function buildInitialAppointments(dates: string[]): Appointment[] {
  return [
    { id: 'A001', citizenId: 'C001', lawyerId: 'L001', date: dates[1], period: 'morning', status: 'confirmed', caseDesc: '与公司发生合同纠纷，需要追讨货款' },
    { id: 'A002', citizenId: 'C002', lawyerId: 'L003', date: dates[3], period: 'afternoon', status: 'confirmed', caseDesc: '家人涉嫌盗窃，需要辩护律师' },
    { id: 'A003', citizenId: 'C003', lawyerId: 'L005', date: dates[4], period: 'morning', status: 'pending', caseDesc: '被公司辞退，要求经济补偿和社保补缴' },
  ]
}

const INITIAL_CONFLICTS: ConflictLog[] = []

const weekDates = getWeekDates()

interface ScheduleStore {
  currentRole: Role
  currentCitizenId: string
  lawyers: Lawyer[]
  citizens: Citizen[]
  schedules: Schedule[]
  leaves: Leave[]
  appointments: Appointment[]
  conflicts: ConflictLog[]
  selectedDate: string
  sidebarOpen: boolean

  setRole: (role: Role) => void
  setCitizen: (id: string) => void
  setSelectedDate: (date: string) => void
  setSidebarOpen: (open: boolean) => void

  addSchedule: (lawyerId: string, date: string, period: Period) => void
  removeSchedule: (id: string) => void
  addLeave: (lawyerId: string, date: string, period: Period, reason: string) => void
  cancelLeave: (id: string) => void

  addAppointment: (citizenId: string, lawyerId: string, date: string, period: Period, caseDesc: string) => AppointmentResult
  cancelAppointment: (id: string) => void
  reassignAppointment: (aptId: string, newLawyerId: string) => void

  checkConflict: (citizenId: string, lawyerId: string, caseDesc: string) => ConflictInfo | null
  getAvailableSlots: (date: string) => AvailableSlot[]
  getLawyerScheduleForDate: (lawyerId: string, date: string) => Period[]
  isLawyerOnLeave: (lawyerId: string, date: string, period: Period) => boolean
  hasCitizenAppointmentOnDate: (citizenId: string, date: string) => boolean
}

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set, get) => ({
      currentRole: 'manager' as Role,
      currentCitizenId: 'C001',
      lawyers: INITIAL_LAWYERS,
      citizens: INITIAL_CITIZENS,
      schedules: buildInitialSchedules(weekDates),
      leaves: buildInitialLeaves(weekDates),
      appointments: buildInitialAppointments(weekDates),
      conflicts: INITIAL_CONFLICTS,
      selectedDate: getToday(),
      sidebarOpen: false,

      setRole: (role) => set({ currentRole: role }),
      setCitizen: (id) => set({ currentCitizenId: id }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      addSchedule: (lawyerId, date, period) => {
        const existing = get().schedules.find(
          s => s.lawyerId === lawyerId && s.date === date && s.period === period
        )
        if (existing) return
        set(state => ({
          schedules: [...state.schedules, { id: generateId(), lawyerId, date, period }]
        }))
      },

      removeSchedule: (id) => {
        set(state => ({
          schedules: state.schedules.filter(s => s.id !== id)
        }))
      },

      addLeave: (lawyerId, date, period, reason) => {
        set(state => {
          const leaveId = generateId()
          const newLeave: Leave = { id: leaveId, lawyerId, date, period, reason }
          const affectedApts = state.appointments.filter(
            a => a.lawyerId === lawyerId && a.date === date && a.period === period
              && a.status !== 'cancelled' && a.status !== 'reassigned'
          )
          const updatedAppointments = state.appointments.map(a => {
            if (affectedApts.some(aa => aa.id === a.id)) {
              return { ...a, status: 'conflict' as const }
            }
            return a
          })
          return { leaves: [...state.leaves, newLeave], appointments: updatedAppointments }
        })
      },

      cancelLeave: (id) => {
        set(state => ({
          leaves: state.leaves.filter(l => l.id !== id)
        }))
      },

      addAppointment: (citizenId, lawyerId, date, period, caseDesc) => {
        const state = get()
        if (state.hasCitizenAppointmentOnDate(citizenId, date)) {
          return {
            success: false,
            message: '同一天只能保留一个预约，您已在该日期有预约',
          }
        }
        const existing = state.appointments.find(
          a => a.lawyerId === lawyerId && a.date === date && a.period === period
            && a.status !== 'cancelled'
        )
        if (existing) {
          return { success: false, message: '该律师此时段已被预约' }
        }
        if (state.isLawyerOnLeave(lawyerId, date, period)) {
          return { success: false, message: '该律师此时段已请假' }
        }
        const conflict = state.checkConflict(citizenId, lawyerId, caseDesc)
        if (conflict && conflict.hasConflict) {
          const newApt: Appointment = {
            id: generateId(), citizenId, lawyerId, date, period,
            status: 'conflict', caseDesc,
          }
          set(state => ({ appointments: [...state.appointments, newApt] }))
          return {
            success: false,
            appointment: newApt,
            conflict,
            message: `利益冲突检测：${conflict.reason}`,
          }
        }
        const newApt: Appointment = {
          id: generateId(), citizenId, lawyerId, date, period,
          status: 'confirmed', caseDesc,
        }
        set(state => ({ appointments: [...state.appointments, newApt] }))
        return { success: true, appointment: newApt, message: '预约成功' }
      },

      cancelAppointment: (id) => {
        set(state => ({
          appointments: state.appointments.map(a =>
            a.id === id ? { ...a, status: 'cancelled' as const } : a
          )
        }))
      },

      reassignAppointment: (aptId, newLawyerId) => {
        set(state => {
          const apt = state.appointments.find(a => a.id === aptId)
          if (!apt) return state
          const conflictLog: ConflictLog = {
            id: generateId(),
            appointmentId: aptId,
            originalLawyerId: apt.lawyerId,
            reassignedLawyerId: newLawyerId,
            conflictReason: apt.status === 'conflict'
              ? '利益冲突改派'
              : '律师请假改派',
            createdAt: new Date().toISOString(),
          }
          const updatedAppointments = state.appointments.map(a =>
            a.id === aptId ? { ...a, lawyerId: newLawyerId, status: 'reassigned' as const } : a
          )
          return {
            appointments: updatedAppointments,
            conflicts: [...state.conflicts, conflictLog],
          }
        })
      },

      checkConflict: (citizenId, lawyerId, caseDesc) => {
        const state = get()
        const lawyer = state.lawyers.find(l => l.id === lawyerId)
        if (!lawyer) return null
        const existingApts = state.appointments.filter(
          a => a.lawyerId === lawyerId && a.status !== 'cancelled' && a.citizenId !== citizenId
        )
        const caseWords = caseDesc.split(/[，,、\s]+/).filter(Boolean)
        const conflictingKeywords: string[] = []
        for (const kw of lawyer.caseKeywords) {
          if (caseDesc.includes(kw) || caseWords.some(w => kw.includes(w) || w.includes(kw))) {
            const hasConflict = existingApts.some(a => a.caseDesc.includes(kw))
            if (hasConflict) {
              conflictingKeywords.push(kw)
            }
          }
        }
        if (conflictingKeywords.length > 0) {
          return {
            hasConflict: true,
            reason: `该律师已有涉及"${conflictingKeywords.join('、')}"的案件预约，可能存在利益冲突`,
            conflictingKeywords,
          }
        }
        return null
      },

      getAvailableSlots: (date) => {
        const state = get()
        const slots: AvailableSlot[] = []
        for (const lawyer of state.lawyers) {
          for (const period of ['morning', 'afternoon'] as Period[]) {
            const isScheduled = state.schedules.some(
              s => s.lawyerId === lawyer.id && s.date === date && s.period === period
            )
            if (!isScheduled) continue
            const isOnLeave = state.leaves.some(
              l => l.lawyerId === lawyer.id && l.date === date && l.period === period
            )
            if (isOnLeave) continue
            const isBooked = state.appointments.some(
              a => a.lawyerId === lawyer.id && a.date === date && a.period === period
                && a.status !== 'cancelled'
            )
            if (isBooked) continue
            slots.push({
              lawyerId: lawyer.id,
              lawyerName: lawyer.name,
              specialty: lawyer.specialty,
              date,
              period,
            })
          }
        }
        return slots
      },

      getLawyerScheduleForDate: (lawyerId, date) => {
        const state = get()
        const periods: Period[] = []
        if (state.schedules.some(s => s.lawyerId === lawyerId && s.date === date && s.period === 'morning')) {
          periods.push('morning')
        }
        if (state.schedules.some(s => s.lawyerId === lawyerId && s.date === date && s.period === 'afternoon')) {
          periods.push('afternoon')
        }
        return periods
      },

      isLawyerOnLeave: (lawyerId, date, period) => {
        return get().leaves.some(
          l => l.lawyerId === lawyerId && l.date === date && l.period === period
        )
      },

      hasCitizenAppointmentOnDate: (citizenId, date) => {
        return get().appointments.some(
          a => a.citizenId === citizenId && a.date === date && a.status !== 'cancelled'
        )
      },
    }),
    {
      name: 'legal-schedule-store',
    }
  )
)
