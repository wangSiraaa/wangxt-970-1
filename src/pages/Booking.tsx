import { useState, useMemo } from 'react'
import { useScheduleStore } from '@/store/useScheduleStore'
import type { Period, ConflictInfo } from '@/types'
import { Clock, User, FileText, X, AlertTriangle, ArrowRight, Check, Trash2 } from 'lucide-react'

const PERIOD_LABEL: Record<Period, string> = { morning: '上午 09:00-12:00', afternoon: '下午 14:00-17:00' }
const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending: { text: '待确认', color: 'bg-yellow-500/15 text-yellow-400' },
  confirmed: { text: '已确认', color: 'bg-green-500/15 text-green-400' },
  conflict: { text: '冲突中', color: 'bg-red-500/15 text-red-400' },
  reassigned: { text: '已改派', color: 'bg-blue-500/15 text-blue-400' },
  cancelled: { text: '已取消', color: 'bg-gray-500/15 text-gray-400' },
}

export default function BookingPage() {
  const store = useScheduleStore()
  const [selectedDate, setSelectedDate] = useState(store.selectedDate)
  const [bookingMode, setBookingMode] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ lawyerId: string; period: Period } | null>(null)
  const [caseDesc, setCaseDesc] = useState('')
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null)
  const [conflictAptId, setConflictAptId] = useState('')
  const [toast, setToast] = useState('')

  const availableSlots = useMemo(() => store.getAvailableSlots(selectedDate), [selectedDate, store])

  const myAppointments = useMemo(() => {
    if (store.currentRole !== 'citizen') return store.appointments.filter(a => a.status !== 'cancelled')
    return store.appointments.filter(a => a.citizenId === store.currentCitizenId && a.status !== 'cancelled')
  }, [store.appointments, store.currentRole, store.currentCitizenId])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleBook = (lawyerId: string, period: Period) => {
    setSelectedSlot({ lawyerId, period })
    setCaseDesc('')
    setBookingMode(true)
  }

  const handleSubmitBooking = () => {
    if (!selectedSlot || !caseDesc) return
    const citizenId = store.currentCitizenId
    const result = store.addAppointment(citizenId, selectedSlot.lawyerId, selectedDate, selectedSlot.period, caseDesc)
    if (result.success) {
      showToast('预约成功！')
      setBookingMode(false)
      setSelectedSlot(null)
      setCaseDesc('')
    } else if (result.conflict) {
      setConflictInfo(result.conflict)
      setConflictAptId(result.appointment?.id || '')
      setBookingMode(false)
    } else {
      showToast(result.message)
      setBookingMode(false)
    }
  }

  const handleReassign = (newLawyerId: string) => {
    store.reassignAppointment(conflictAptId, newLawyerId)
    setConflictInfo(null)
    setConflictAptId('')
    showToast('改派成功！')
  }

  const weekDates = useMemo(() => {
    const dates: { key: string; label: string; isToday: boolean }[] = []
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      dates.push({ key, label: `${dayLabels[i]} ${d.getDate()}日`, isToday: key === today })
    }
    return dates
  }, [])

  const availableLawyersForReassign = useMemo(() => {
    if (!conflictInfo || !conflictAptId) return []
    const apt = store.appointments.find(a => a.id === conflictAptId)
    if (!apt) return []
    return store.lawyers.filter(l => {
      if (l.id === apt.lawyerId) return false
      const isOnLeave = store.isLawyerOnLeave(l.id, apt.date, apt.period)
      if (isOnLeave) return false
      const isScheduled = store.schedules.some(s => s.lawyerId === l.id && s.date === apt.date && s.period === apt.period)
      if (!isScheduled) return false
      const isBooked = store.appointments.some(
        a => a.lawyerId === l.id && a.date === apt.date && a.period === apt.period && a.status !== 'cancelled'
      )
      return !isBooked
    })
  }, [conflictInfo, conflictAptId, store])

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: '"Noto Serif SC", serif' }}>
          预约详情
        </h2>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {weekDates.map(d => (
            <button
              key={d.key}
              onClick={() => setSelectedDate(d.key)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all duration-200 ${
                selectedDate === d.key
                  ? 'bg-[#D4A843] text-[#1B2A4A] font-bold'
                  : d.isToday
                    ? 'bg-[#1B2A4A] border border-[#D4A843]/30 text-[#D4A843]'
                    : 'bg-[#1B2A4A] text-gray-400 hover:text-gray-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-medium">可约律师</h3>
          <span className="text-xs text-gray-500">日期：{selectedDate}</span>
        </div>

        {availableSlots.length === 0 ? (
          <div className="bg-[#1B2A4A] rounded-xl p-8 text-center text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-3 text-gray-600" />
            <p>该日期暂无可约时段</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableSlots.map(slot => {
              const lawyer = store.lawyers.find(l => l.id === slot.lawyerId)
              if (!lawyer) return null
              return (
                <div
                  key={`${slot.lawyerId}-${slot.period}`}
                  className="bg-[#1B2A4A] rounded-xl p-4 border border-[#2A3F5F] hover:border-[#D4A843]/40 transition-all duration-200 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4A843] to-[#B8912E] flex items-center justify-center text-[#1B2A4A] font-bold text-sm shrink-0">
                      {lawyer.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-100">{lawyer.name}</h4>
                        <span className="text-xs bg-[#D4A843]/10 text-[#D4A843] px-2 py-0.5 rounded">
                          {lawyer.specialty}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{PERIOD_LABEL[slot.period]}</p>
                      {store.currentRole === 'citizen' && (
                        <button
                          onClick={() => handleBook(slot.lawyerId, slot.period)}
                          className="mt-2 w-full py-1.5 rounded-lg bg-[#D4A843]/10 text-[#D4A843] text-sm font-medium hover:bg-[#D4A843]/20 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          预约此律师
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="w-[360px] shrink-0">
        <h3 className="text-lg font-medium mb-4">
          {store.currentRole === 'citizen' ? '我的预约' : '预约列表'}
        </h3>

        {store.currentRole === 'citizen' && (
          <div className="mb-4 bg-[#1B2A4A] rounded-lg p-3 border border-[#2A3F5F]">
            <label className="text-xs text-gray-500 block mb-1">选择预约人</label>
            <select
              value={store.currentCitizenId}
              onChange={e => store.setCitizen(e.target.value)}
              className="w-full bg-[#0F1923] border border-[#2A3F5F] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#D4A843]"
            >
              {store.citizens.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
          </div>
        )}

        {myAppointments.length === 0 ? (
          <div className="bg-[#1B2A4A] rounded-xl p-6 text-center text-gray-500">
            <FileText className="w-6 h-6 mx-auto mb-2 text-gray-600" />
            <p className="text-sm">暂无预约</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myAppointments.map(apt => {
              const lawyer = store.lawyers.find(l => l.id === apt.lawyerId)
              const citizen = store.citizens.find(c => c.id === apt.citizenId)
              const statusInfo = STATUS_LABEL[apt.status] || STATUS_LABEL.pending
              return (
                <div
                  key={apt.id}
                  className="bg-[#1B2A4A] rounded-xl p-4 border border-[#2A3F5F]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{apt.date}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${statusInfo.color}`}>
                      {statusInfo.text}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <User className="w-3.5 h-3.5" />
                      <span>{lawyer?.name || '未知'} · {lawyer?.specialty}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{PERIOD_LABEL[apt.period]}</span>
                    </div>
                    {store.currentRole !== 'citizen' && citizen && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <FileText className="w-3.5 h-3.5" />
                        <span>预约人：{citizen.name}</span>
                      </div>
                    )}
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">案件：{apt.caseDesc}</p>
                  </div>
                  {(store.currentRole === 'citizen' && (apt.status === 'confirmed' || apt.status === 'pending')) && (
                    <button
                      onClick={() => { store.cancelAppointment(apt.id); showToast('预约已取消') }}
                      className="mt-2 w-full py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      取消预约
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {bookingMode && selectedSlot && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setBookingMode(false)}>
          <div className="bg-[#1B2A4A] rounded-xl p-6 w-[440px] shadow-2xl border border-[#2A3F5F]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ fontFamily: '"Noto Serif SC", serif' }}>预约律师</h3>
              <button onClick={() => setBookingMode(false)} className="p-1 rounded hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            {(() => {
              const lawyer = store.lawyers.find(l => l.id === selectedSlot.lawyerId)
              return (
                <div className="mb-4 bg-[#0F1923] rounded-lg p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4A843] to-[#B8912E] flex items-center justify-center text-[#1B2A4A] font-bold">
                    {lawyer?.avatar}
                  </div>
                  <div>
                    <div className="font-medium">{lawyer?.name}</div>
                    <div className="text-xs text-gray-500">{lawyer?.specialty} · {PERIOD_LABEL[selectedSlot.period]}</div>
                  </div>
                </div>
              )
            })()}
            <label className="block text-sm text-gray-400 mb-1">案件描述</label>
            <textarea
              value={caseDesc}
              onChange={e => setCaseDesc(e.target.value)}
              placeholder="请简要描述您的法律问题，如：合同纠纷、劳动争议等"
              rows={3}
              className="w-full bg-[#0F1923] border border-[#2A3F5F] rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-[#D4A843] placeholder:text-gray-600 resize-none"
            />
            {store.hasCitizenAppointmentOnDate(store.currentCitizenId, selectedDate) && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">您在该日期已有预约，同一天只能保留一个预约</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setBookingMode(false)}
                className="flex-1 py-2 rounded-lg border border-[#2A3F5F] text-gray-400 hover:bg-white/5 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmitBooking}
                disabled={!caseDesc}
                className="flex-1 py-2 rounded-lg bg-[#D4A843] text-[#1B2A4A] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#E0B85A] transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                确认预约
              </button>
            </div>
          </div>
        </div>
      )}

      {conflictInfo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => { setConflictInfo(null); setConflictAptId('') }}>
          <div className="bg-[#1B2A4A] rounded-xl p-6 w-[480px] shadow-2xl border border-red-500/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-400" style={{ fontFamily: '"Noto Serif SC", serif' }}>
                  利益冲突提示
                </h3>
                <p className="text-xs text-gray-500">请改派其他律师</p>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-300">{conflictInfo.reason}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {conflictInfo.conflictingKeywords.map(kw => (
                  <span key={kw} className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <h4 className="text-sm font-medium mb-3">可改派律师</h4>
            {availableLawyersForReassign.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">该时段暂无其他可用律师</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {availableLawyersForReassign.map(l => (
                  <button
                    key={l.id}
                    onClick={() => handleReassign(l.id)}
                    className="w-full bg-[#0F1923] rounded-lg p-3 flex items-center gap-3 hover:bg-[#1A2A3E] transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#D4A843]/20 flex items-center justify-center text-[#D4A843] font-bold text-sm">
                      {l.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{l.name}</div>
                      <div className="text-xs text-gray-500">{l.specialty}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#D4A843]" />
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => { setConflictInfo(null); setConflictAptId('') }}
              className="mt-4 w-full py-2 rounded-lg border border-[#2A3F5F] text-gray-400 hover:bg-white/5 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-[#D4A843] text-[#1B2A4A] px-6 py-3 rounded-lg font-bold shadow-lg animate-bounce">
          {toast}
        </div>
      )}
    </div>
  )
}
