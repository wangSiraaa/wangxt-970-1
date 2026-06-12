import { useState, useMemo } from 'react'
import { useScheduleStore } from '@/store/useScheduleStore'
import type { Period } from '@/types'
import { ChevronLeft, ChevronRight, UserPlus, CalendarOff, X, Check, Clock } from 'lucide-react'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const PERIOD_LABEL: Record<Period, string> = { morning: '上午', afternoon: '下午' }

function formatDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function SchedulePage() {
  const store = useScheduleStore()
  const [viewDate, setViewDate] = useState(() => new Date())
  const [showSchedulePanel, setShowSchedulePanel] = useState(false)
  const [showLeavePanel, setShowLeavePanel] = useState(false)
  const [panelDate, setPanelDate] = useState('')
  const [selectedLawyerId, setSelectedLawyerId] = useState('')
  const [selectedPeriods, setSelectedPeriods] = useState<Period[]>([])
  const [leaveReason, setLeaveReason] = useState('')
  const [leavePeriod, setLeavePeriod] = useState<Period>('morning')
  const [leaveLawyerId, setLeaveLawyerId] = useState('')

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) startOffset = 6
    const days: (Date | null)[] = []
    for (let i = 0; i < startOffset; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d))
    }
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 0; i < remaining; i++) days.push(null)
    }
    return days
  }, [year, month])

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  const getScheduleInfo = (dateStr: string) => {
    const lawyersScheduled = store.schedules
      .filter(s => s.date === dateStr)
      .reduce<Record<string, Period[]>>((acc, s) => {
        if (!acc[s.lawyerId]) acc[s.lawyerId] = []
        acc[s.lawyerId].push(s.period)
        return acc
      }, {})
    const leavesOnDate = store.leaves.filter(l => l.date === dateStr)
    const appointmentsOnDate = store.appointments.filter(
      a => a.date === dateStr && a.status !== 'cancelled'
    )
    return { lawyersScheduled, leavesOnDate, appointmentsOnDate }
  }

  const openSchedulePanel = (dateStr: string) => {
    setPanelDate(dateStr)
    setSelectedLawyerId('')
    setSelectedPeriods([])
    setShowSchedulePanel(true)
  }

  const openLeavePanel = (dateStr: string, lawyerId?: string) => {
    setPanelDate(dateStr)
    setLeaveLawyerId(lawyerId || '')
    setLeaveReason('')
    setLeavePeriod('morning')
    setShowLeavePanel(true)
  }

  const handleAddSchedule = () => {
    if (!selectedLawyerId || selectedPeriods.length === 0) return
    for (const period of selectedPeriods) {
      store.addSchedule(selectedLawyerId, panelDate, period)
    }
    setShowSchedulePanel(false)
  }

  const handleAddLeave = () => {
    if (!leaveLawyerId || !leaveReason) return
    store.addLeave(leaveLawyerId, panelDate, leavePeriod, leaveReason)
    setShowLeavePanel(false)
  }

  const today = formatDateKey(new Date())

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ fontFamily: '"Noto Serif SC", serif' }}>
            排班日历
          </h2>
          <div className="flex items-center gap-4">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-medium min-w-[140px] text-center">
              {year}年{month + 1}月
            </span>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-[#2A3F5F]/30 rounded-xl overflow-hidden">
          {WEEKDAYS.map(d => (
            <div key={d} className="bg-[#1B2A4A] py-3 text-center text-sm text-gray-400 font-medium">
              周{d}
            </div>
          ))}
          {calendarDays.map((day, i) => {
            if (!day) {
              return <div key={`empty-${i}`} className="bg-[#131E2E] min-h-[120px]" />
            }
            const dateStr = formatDateKey(day)
            const info = getScheduleInfo(dateStr)
            const isToday = dateStr === today
            const isSelected = dateStr === store.selectedDate

            return (
              <div
                key={dateStr}
                onClick={() => store.setSelectedDate(dateStr)}
                className={`bg-[#131E2E] min-h-[120px] p-2 cursor-pointer transition-all duration-200 hover:bg-[#1A2A3E] relative ${
                  isSelected ? 'ring-2 ring-[#D4A843] ring-inset' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    isToday
                      ? 'bg-[#D4A843] text-[#1B2A4A] w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold'
                      : 'text-gray-300'
                  }`}>
                    {day.getDate()}
                  </span>
                  {store.currentRole === 'manager' && (
                    <div className="flex gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); openSchedulePanel(dateStr) }}
                        className="p-1 rounded hover:bg-[#D4A843]/20 transition-colors"
                        title="添加排班"
                      >
                        <UserPlus className="w-3 h-3 text-[#D4A843]" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); openLeavePanel(dateStr) }}
                        className="p-1 rounded hover:bg-red-500/20 transition-colors"
                        title="添加请假"
                      >
                        <CalendarOff className="w-3 h-3 text-red-400" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-0.5">
                  {Object.entries(info.lawyersScheduled).map(([lid, periods]) => {
                    const lawyer = store.lawyers.find(l => l.id === lid)
                    if (!lawyer) return null
                    const hasLeave = info.leavesOnDate.some(
                      l => l.lawyerId === lid && periods.includes(l.period)
                    )
                    const hasMorning = periods.includes('morning')
                    const hasAfternoon = periods.includes('afternoon')
                    const morningLeave = info.leavesOnDate.find(
                      l => l.lawyerId === lid && l.period === 'morning'
                    )
                    const afternoonLeave = info.leavesOnDate.find(
                      l => l.lawyerId === lid && l.period === 'afternoon'
                    )

                    return (
                      <div
                        key={lid}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                          hasLeave ? 'bg-red-500/10 line-through text-red-400' : 'bg-[#1B2A4A] text-gray-300'
                        }`}
                        onClick={e => {
                          if (store.currentRole === 'lawyer') {
                            e.stopPropagation()
                            openLeavePanel(dateStr, lid)
                          }
                        }}
                      >
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          hasLeave ? 'bg-red-500/20 text-red-300' : 'bg-[#D4A843]/20 text-[#D4A843]'
                        }`}>
                          {lawyer.avatar}
                        </span>
                        <span className="truncate flex-1">{lawyer.name}</span>
                        <span className="text-[10px] text-gray-500 shrink-0">
                          {hasMorning && hasAfternoon
                            ? '全天'
                            : hasMorning
                              ? '上午'
                              : hasAfternoon
                                ? '下午'
                                : ''}
                        </span>
                        {morningLeave && <X className="w-3 h-3 text-red-400 shrink-0" />}
                        {afternoonLeave && <X className="w-3 h-3 text-red-400 shrink-0" />}
                      </div>
                    )
                  })}
                  {info.appointmentsOnDate.length > 0 && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-[#D4A843]">
                      <Clock className="w-3 h-3" />
                      {info.appointmentsOnDate.length}个预约
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-[#D4A843]/20 flex items-center justify-center text-[10px] text-[#D4A843]">律</span>
            排班中
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center text-[10px] text-red-300 line-through">律</span>
            已请假
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-[#D4A843]" />
            有预约
          </div>
        </div>
      </div>

      {showSchedulePanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowSchedulePanel(false)}>
          <div
            className="bg-[#1B2A4A] rounded-xl p-6 w-[400px] shadow-2xl border border-[#2A3F5F]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ fontFamily: '"Noto Serif SC", serif' }}>
                添加排班
              </h3>
              <button onClick={() => setShowSchedulePanel(false)} className="p-1 rounded hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">日期：{panelDate}</p>

            <label className="block text-sm text-gray-400 mb-1">选择律师</label>
            <select
              value={selectedLawyerId}
              onChange={e => setSelectedLawyerId(e.target.value)}
              className="w-full bg-[#0F1923] border border-[#2A3F5F] rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-[#D4A843]"
            >
              <option value="">请选择律师</option>
              {store.lawyers.map(l => (
                <option key={l.id} value={l.id}>{l.name} - {l.specialty}</option>
              ))}
            </select>

            <label className="block text-sm text-gray-400 mb-1">选择时段</label>
            <div className="flex gap-3 mb-6">
              {(['morning', 'afternoon'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => {
                    setSelectedPeriods(prev =>
                      prev.includes(p) ? prev.filter(pp => pp !== p) : [...prev, p]
                    )
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm transition-all duration-200 ${
                    selectedPeriods.includes(p)
                      ? 'bg-[#D4A843] text-[#1B2A4A] font-bold'
                      : 'bg-[#0F1923] border border-[#2A3F5F] text-gray-400 hover:border-[#D4A843]/50'
                  }`}
                >
                  {PERIOD_LABEL[p]}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSchedulePanel(false)}
                className="flex-1 py-2 rounded-lg border border-[#2A3F5F] text-gray-400 hover:bg-white/5 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddSchedule}
                disabled={!selectedLawyerId || selectedPeriods.length === 0}
                className="flex-1 py-2 rounded-lg bg-[#D4A843] text-[#1B2A4A] font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#E0B85A] transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                确认排班
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeavePanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowLeavePanel(false)}>
          <div
            className="bg-[#1B2A4A] rounded-xl p-6 w-[400px] shadow-2xl border border-[#2A3F5F]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ fontFamily: '"Noto Serif SC", serif' }}>
                添加请假
              </h3>
              <button onClick={() => setShowLeavePanel(false)} className="p-1 rounded hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">日期：{panelDate}</p>

            <label className="block text-sm text-gray-400 mb-1">选择律师</label>
            <select
              value={leaveLawyerId}
              onChange={e => setLeaveLawyerId(e.target.value)}
              className="w-full bg-[#0F1923] border border-[#2A3F5F] rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-[#D4A843]"
            >
              <option value="">请选择律师</option>
              {store.lawyers.map(l => (
                <option key={l.id} value={l.id}>{l.name} - {l.specialty}</option>
              ))}
            </select>

            <label className="block text-sm text-gray-400 mb-1">请假时段</label>
            <div className="flex gap-3 mb-4">
              {(['morning', 'afternoon'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setLeavePeriod(p)}
                  className={`flex-1 py-2 rounded-lg text-sm transition-all duration-200 ${
                    leavePeriod === p
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50 font-bold'
                      : 'bg-[#0F1923] border border-[#2A3F5F] text-gray-400 hover:border-red-500/30'
                  }`}
                >
                  {PERIOD_LABEL[p]}
                </button>
              ))}
            </div>

            <label className="block text-sm text-gray-400 mb-1">请假原因</label>
            <input
              value={leaveReason}
              onChange={e => setLeaveReason(e.target.value)}
              placeholder="请输入请假原因"
              className="w-full bg-[#0F1923] border border-[#2A3F5F] rounded-lg px-3 py-2 text-sm mb-6 focus:outline-none focus:border-red-500/50 placeholder:text-gray-600"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowLeavePanel(false)}
                className="flex-1 py-2 rounded-lg border border-[#2A3F5F] text-gray-400 hover:bg-white/5 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddLeave}
                disabled={!leaveLawyerId || !leaveReason}
                className="flex-1 py-2 rounded-lg bg-red-500/80 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-500 transition-colors"
              >
                确认请假
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
