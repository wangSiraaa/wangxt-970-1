import { useState, useMemo } from 'react'
import { useScheduleStore } from '@/store/useScheduleStore'
import type { Period } from '@/types'
import { AlertTriangle, ArrowRight, Check, Clock, RefreshCw, User, X } from 'lucide-react'

const PERIOD_LABEL: Record<Period, string> = { morning: '上午', afternoon: '下午' }
const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending: { text: '待确认', color: 'bg-yellow-500/15 text-yellow-400' },
  confirmed: { text: '已确认', color: 'bg-green-500/15 text-green-400' },
  conflict: { text: '冲突中', color: 'bg-red-500/15 text-red-400' },
  reassigned: { text: '已改派', color: 'bg-blue-500/15 text-blue-400' },
  cancelled: { text: '已取消', color: 'bg-gray-500/15 text-gray-400' },
}

export default function ConflictPage() {
  const store = useScheduleStore()
  const [reassigningAptId, setReassigningAptId] = useState('')
  const [toast, setToast] = useState('')

  const conflictAppointments = useMemo(
    () => store.appointments.filter(a => a.status === 'conflict'),
    [store.appointments]
  )

  const allAppointments = useMemo(
    () => store.appointments.filter(a => a.status !== 'cancelled'),
    [store.appointments]
  )

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const getAvailableLawyers = (aptId: string) => {
    const apt = store.appointments.find(a => a.id === aptId)
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
  }

  const handleReassign = (aptId: string, newLawyerId: string) => {
    store.reassignAppointment(aptId, newLawyerId)
    setReassigningAptId('')
    showToast('改派成功！')
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: '"Noto Serif SC", serif' }}>
          冲突处理
        </h2>

        {conflictAppointments.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-medium text-red-400">待处理冲突 ({conflictAppointments.length})</h3>
            </div>
            <div className="space-y-3">
              {conflictAppointments.map(apt => {
                const lawyer = store.lawyers.find(l => l.id === apt.lawyerId)
                const citizen = store.citizens.find(c => c.id === apt.citizenId)
                const availableLawyers = getAvailableLawyers(apt.id)
                const isReassigning = reassigningAptId === apt.id

                return (
                  <div key={apt.id} className="bg-[#1B2A4A] rounded-xl p-4 border border-red-500/30">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{apt.date}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${STATUS_LABEL.conflict.color}`}>
                            冲突中
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 mt-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5" />
                            <span>预约人：{citizen?.name} → 律师：{lawyer?.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{PERIOD_LABEL[apt.period]}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">案件：{apt.caseDesc}</p>
                      </div>
                      <button
                        onClick={() => setReassigningAptId(isReassigning ? '' : apt.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isReassigning
                            ? 'bg-gray-500/20 text-gray-400'
                            : 'bg-[#D4A843] text-[#1B2A4A] hover:bg-[#E0B85A]'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5" />
                          {isReassigning ? '取消改派' : '改派律师'}
                        </span>
                      </button>
                    </div>

                    {isReassigning && (
                      <div className="mt-3 pt-3 border-t border-[#2A3F5F]">
                        <p className="text-sm text-gray-400 mb-2">选择改派律师：</p>
                        {availableLawyers.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-3 bg-[#0F1923] rounded-lg">
                            该时段暂无其他可用律师
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {availableLawyers.map(l => (
                              <button
                                key={l.id}
                                onClick={() => handleReassign(apt.id, l.id)}
                                className="w-full bg-[#0F1923] rounded-lg p-3 flex items-center gap-3 hover:bg-[#1A2A3E] transition-colors text-left group"
                              >
                                <div className="w-8 h-8 rounded-full bg-[#D4A843]/20 flex items-center justify-center text-[#D4A843] font-bold text-sm">
                                  {l.avatar}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{l.name}</div>
                                  <div className="text-xs text-gray-500">{l.specialty}</div>
                                </div>
                                <span className="text-xs text-[#D4A843] opacity-0 group-hover:opacity-100 transition-opacity">
                                  选择改派
                                </span>
                                <ArrowRight className="w-4 h-4 text-[#D4A843] opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {conflictAppointments.length === 0 && (
          <div className="bg-[#1B2A4A] rounded-xl p-8 text-center mb-6 border border-[#2A3F5F]">
            <Check className="w-8 h-8 mx-auto mb-3 text-green-400" />
            <p className="text-gray-400">暂无待处理冲突</p>
            <p className="text-xs text-gray-600 mt-1">所有预约均无利益冲突</p>
          </div>
        )}

        <div>
          <h3 className="text-lg font-medium mb-3">全部预约</h3>
          {allAppointments.length === 0 ? (
            <div className="bg-[#1B2A4A] rounded-xl p-6 text-center text-gray-500">
              暂无预约记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-[#2A3F5F]">
                    <th className="py-2 px-3 text-left">日期</th>
                    <th className="py-2 px-3 text-left">时段</th>
                    <th className="py-2 px-3 text-left">预约人</th>
                    <th className="py-2 px-3 text-left">律师</th>
                    <th className="py-2 px-3 text-left">案件</th>
                    <th className="py-2 px-3 text-left">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {allAppointments.map(apt => {
                    const lawyer = store.lawyers.find(l => l.id === apt.lawyerId)
                    const citizen = store.citizens.find(c => c.id === apt.citizenId)
                    const statusInfo = STATUS_LABEL[apt.status] || STATUS_LABEL.pending
                    return (
                      <tr key={apt.id} className="border-b border-[#2A3F5F]/50 hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3">{apt.date}</td>
                        <td className="py-2.5 px-3">{PERIOD_LABEL[apt.period]}</td>
                        <td className="py-2.5 px-3">{citizen?.name}</td>
                        <td className="py-2.5 px-3">{lawyer?.name}</td>
                        <td className="py-2.5 px-3 max-w-[200px] truncate text-gray-400">{apt.caseDesc}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${statusInfo.color}`}>
                            {statusInfo.text}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="w-[360px] shrink-0">
        <h3 className="text-lg font-medium mb-4">改派记录</h3>
        {store.conflicts.length === 0 ? (
          <div className="bg-[#1B2A4A] rounded-xl p-6 text-center text-gray-500">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 text-gray-600" />
            <p className="text-sm">暂无改派记录</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[15px] top-4 bottom-4 w-px bg-[#2A3F5F]" />
            <div className="space-y-4">
              {store.conflicts.map(log => {
                const origLawyer = store.lawyers.find(l => l.id === log.originalLawyerId)
                const newLawyer = store.lawyers.find(l => l.id === log.reassignedLawyerId)
                return (
                  <div key={log.id} className="relative pl-10">
                    <div className="absolute left-[11px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#D4A843] border-2 border-[#1B2A4A]" />
                    <div className="bg-[#1B2A4A] rounded-lg p-3 border border-[#2A3F5F]">
                      <p className="text-xs text-gray-500 mb-2">
                        {new Date(log.createdAt).toLocaleString('zh-CN')}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-red-400 line-through">{origLawyer?.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#D4A843]" />
                        <span className="text-green-400">{newLawyer?.name}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{log.conflictReason}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">请假记录</h3>
          {store.leaves.length === 0 ? (
            <div className="bg-[#1B2A4A] rounded-xl p-6 text-center text-gray-500">
              <p className="text-sm">暂无请假记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {store.leaves.map(leave => {
                const lawyer = store.lawyers.find(l => l.id === leave.lawyerId)
                return (
                  <div key={leave.id} className="bg-[#1B2A4A] rounded-lg p-3 border border-[#2A3F5F] flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{lawyer?.name}</div>
                      <div className="text-xs text-gray-500">
                        {leave.date} · {PERIOD_LABEL[leave.period]} · {leave.reason}
                      </div>
                    </div>
                    {(store.currentRole === 'manager' || store.currentRole === 'lawyer') && (
                      <button
                        onClick={() => { store.cancelLeave(leave.id); showToast('请假已取消') }}
                        className="p-1.5 rounded hover:bg-white/5 transition-colors"
                        title="取消请假"
                      >
                        <X className="w-4 h-4 text-gray-500 hover:text-gray-300" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-[#D4A843] text-[#1B2A4A] px-6 py-3 rounded-lg font-bold shadow-lg animate-bounce">
          {toast}
        </div>
      )}
    </div>
  )
}
