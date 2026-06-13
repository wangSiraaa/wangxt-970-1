import dayjs from 'dayjs';

const STORAGE_KEY = 'legal_consult_center_data';

const TIME_SLOTS = [
  { key: '09:00-10:00', label: '09:00-10:00', start: '09:00', end: '10:00' },
  { key: '10:00-11:00', label: '10:00-11:00', start: '10:00', end: '11:00' },
  { key: '11:00-12:00', label: '11:00-12:00', start: '11:00', end: '12:00' },
  { key: '14:00-15:00', label: '14:00-15:00', start: '14:00', end: '15:00' },
  { key: '15:00-16:00', label: '15:00-16:00', start: '15:00', end: '16:00' },
  { key: '16:00-17:00', label: '16:00-17:00', start: '16:00', end: '17:00' },
];

const URGENCY_LEVELS = [
  { id: 'normal', name: '普通', color: 'default', priority: 3, description: '常规咨询，按预约顺序安排' },
  { id: 'urgent', name: '紧急', color: 'orange', priority: 2, description: '较为紧急，优先安排' },
  { id: 'emergency', name: '特急', color: 'red', priority: 1, description: '紧急法律援助，可插队处理' },
];

const REPRESENTED_UNITS = [
  { id: 'U001', name: '华东科技有限公司', type: '企业' },
  { id: 'U002', name: '蓝海贸易集团', type: '企业' },
  { id: 'U003', name: '星辰物流公司', type: '企业' },
  { id: 'U004', name: '金桥房地产开发公司', type: '企业' },
  { id: 'U005', name: '市民政局', type: '政府' },
  { id: 'U006', name: '市教育局', type: '政府' },
  { id: 'U007', name: '阳光社区居委会', type: '社区' },
  { id: 'U008', name: '和平街道办事处', type: '社区' },
];

const CASE_TYPES = [
  { id: 'civil', name: '民事纠纷', requiredMaterialIds: ['id_card', 'evidence', 'claim'] },
  { id: 'criminal', name: '刑事案件', requiredMaterialIds: ['id_card', 'case_notice', 'evidence'] },
  { id: 'admin', name: '行政争议', requiredMaterialIds: ['id_card', 'admin_decision', 'evidence'] },
  { id: 'labor', name: '劳动争议', requiredMaterialIds: ['id_card', 'labor_contract', 'evidence'] },
  { id: 'family', name: '婚姻家庭', requiredMaterialIds: ['id_card', 'marriage_cert', 'evidence'] },
  { id: 'contract', name: '合同纠纷', requiredMaterialIds: ['id_card', 'contract', 'evidence'] },
  { id: 'property', name: '房产纠纷', requiredMaterialIds: ['id_card', 'property_cert', 'evidence'] },
  { id: 'injury', name: '交通事故', requiredMaterialIds: ['id_card', 'traffic_report', 'evidence'] },
];

const MATERIALS = [
  { id: 'id_card', name: '身份证' },
  { id: 'evidence', name: '证据材料' },
  { id: 'claim', name: '诉求书' },
  { id: 'case_notice', name: '案件通知书' },
  { id: 'admin_decision', name: '行政决定书' },
  { id: 'labor_contract', name: '劳动合同' },
  { id: 'marriage_cert', name: '结婚证' },
  { id: 'contract', name: '合同文本' },
  { id: 'property_cert', name: '房产证明' },
  { id: 'traffic_report', name: '事故认定书' },
];

const LAWYERS = [
  { id: 'L001', name: '张伟', specialties: ['civil', 'contract'], licenseStatus: 'active', phone: '13800001001', representedUnitIds: ['U001', 'U005'] },
  { id: 'L002', name: '李芳', specialties: ['family', 'civil'], licenseStatus: 'active', phone: '13800001002', representedUnitIds: ['U002', 'U007'] },
  { id: 'L003', name: '王刚', specialties: ['criminal', 'admin'], licenseStatus: 'active', phone: '13800001003', representedUnitIds: ['U003', 'U006'] },
  { id: 'L004', name: '赵敏', specialties: ['labor', 'civil'], licenseStatus: 'active', phone: '13800001004', representedUnitIds: ['U004', 'U008'] },
  { id: 'L005', name: '陈磊', specialties: ['property', 'contract'], licenseStatus: 'active', phone: '13800001005', representedUnitIds: ['U001', 'U004'] },
  { id: 'L006', name: '刘洋', specialties: ['injury', 'criminal'], licenseStatus: 'suspended', phone: '13800001006', representedUnitIds: ['U002'] },
  { id: 'L007', name: '孙婷', specialties: ['admin', 'labor'], licenseStatus: 'active', phone: '13800001007', representedUnitIds: ['U005', 'U006'] },
  { id: 'L008', name: '周峰', specialties: ['family', 'property'], licenseStatus: 'active', phone: '13800001008', representedUnitIds: ['U003', 'U007'] },
];

const RECUSAL_RELATIONS = [
  { lawyerId: 'L001', relatedLawyerId: 'L003', reason: '同一律所合伙人' },
  { lawyerId: 'L003', relatedLawyerId: 'L001', reason: '同一律所合伙人' },
  { lawyerId: 'L002', relatedLawyerId: 'L008', reason: '亲属关系' },
  { lawyerId: 'L008', relatedLawyerId: 'L002', reason: '亲属关系' },
];

function generateSeedData() {
  const today = dayjs();
  const schedules = [];
  const leaves = [];

  function getNextWeekday(fromDate, offset = 0) {
    let d = fromDate.clone();
    let count = 0;
    while (true) {
      const dow = d.day();
      if (dow !== 0 && dow !== 6) {
        if (count >= offset) return d.format('YYYY-MM-DD');
        count++;
      }
      d = d.add(1, 'day');
    }
  }

  for (let d = 0; d < 14; d++) {
    const date = today.add(d, 'day').format('YYYY-MM-DD');
    const dow = today.add(d, 'day').day();
    if (dow === 0 || dow === 6) continue;
    LAWYERS.forEach((lawyer) => {
      if (lawyer.licenseStatus !== 'active') return;
      const slots = TIME_SLOTS.map((ts) => ({
        ...ts,
        capacity: 2,
        booked: 0,
      }));
      schedules.push({
        id: `SCH-${date}-${lawyer.id}`,
        lawyerId: lawyer.id,
        date,
        timeSlots: slots,
      });
    });
  }

  const wd1 = getNextWeekday(today, 0);
  const wd2 = getNextWeekday(today, 1);

  leaves.push({
    id: 'LV-001',
    lawyerId: 'L001',
    date: wd1,
    timeSlots: TIME_SLOTS.map((ts) => ts.key),
    reason: '年假',
    status: 'approved',
  });
  leaves.push({
    id: 'LV-002',
    lawyerId: 'L004',
    date: wd2,
    timeSlots: ['14:00-15:00', '15:00-16:00'],
    reason: '事假',
    status: 'approved',
  });
  leaves.push({
    id: 'LV-003',
    lawyerId: 'L005',
    date: wd1,
    timeSlots: ['09:00-10:00'],
    reason: '开庭',
    status: 'approved',
  });

  const tomorrow = wd1;
  const dayAfter = wd2;
  const appointments = [
    {
      id: 'APT-001',
      citizenName: '王明',
      citizenIdCard: '110101199001011234',
      citizenPhone: '13900001001',
      lawyerId: 'L002',
      date: tomorrow,
      timeSlot: '09:00-10:00',
      caseType: 'family',
      caseReason: '离婚财产分割纠纷，涉及房产和子女抚养权',
      opposingParty: '李华（配偶）',
      opposingPartyUnit: '',
      materials: ['id_card', 'marriage_cert', 'evidence'],
      urgency: 'normal',
      status: 'confirmed',
      createdAt: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      isEmergency: false,
      invalidReason: '',
    },
    {
      id: 'APT-002',
      citizenName: '刘红',
      citizenIdCard: '110101198505052345',
      citizenPhone: '13900001002',
      lawyerId: 'L005',
      date: tomorrow,
      timeSlot: '10:00-11:00',
      caseType: 'property',
      caseReason: '二手房买卖纠纷，卖方拖延过户',
      opposingParty: '张强（卖方）',
      opposingPartyUnit: '华东科技有限公司',
      materials: ['id_card', 'property_cert'],
      urgency: 'urgent',
      status: 'confirmed',
      createdAt: dayjs().subtract(12, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      isEmergency: false,
      invalidReason: '',
    },
    {
      id: 'APT-003',
      citizenName: '陈强',
      citizenIdCard: '110101199203033456',
      citizenPhone: '13900001003',
      lawyerId: 'L003',
      date: dayAfter,
      timeSlot: '14:00-15:00',
      caseType: 'criminal',
      caseReason: '涉嫌寻衅滋事，被公安机关刑事拘留',
      opposingParty: '市公安局',
      opposingPartyUnit: '市民政局',
      materials: ['id_card', 'case_notice', 'evidence'],
      urgency: 'urgent',
      status: 'confirmed',
      createdAt: dayjs().subtract(6, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      isEmergency: false,
      invalidReason: '',
    },
    {
      id: 'APT-004',
      citizenName: '赵丽',
      citizenIdCard: '110101198812124567',
      citizenPhone: '13900001004',
      lawyerId: 'L007',
      date: dayAfter,
      timeSlot: '15:00-16:00',
      caseType: 'labor',
      caseReason: '公司违法解除劳动合同，要求经济赔偿',
      opposingParty: '蓝海贸易集团',
      opposingPartyUnit: '蓝海贸易集团',
      materials: ['id_card', 'labor_contract'],
      urgency: 'normal',
      status: 'confirmed',
      createdAt: dayjs().subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      isEmergency: false,
      invalidReason: '',
    },
  ];

  const waitlist = [
    {
      id: 'WL-001',
      citizenName: '孙伟',
      citizenIdCard: '110101199506065678',
      citizenPhone: '13900001005',
      lawyerId: 'L002',
      date: tomorrow,
      timeSlot: '09:00-10:00',
      caseType: 'civil',
      caseReason: '民间借贷纠纷，债务人逾期不还',
      opposingParty: '周明（债务人）',
      opposingPartyUnit: '',
      materials: ['id_card', 'evidence', 'claim'],
      urgency: 'normal',
      position: 1,
      status: 'waiting',
      createdAt: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  const addSlotRequests = [
    {
      id: 'AS-001',
      lawyerId: 'L003',
      date: tomorrow,
      timeSlot: '16:00-17:00',
      reason: '紧急案件加号',
      status: 'pending',
      requestedBy: '现场工作人员',
      createdAt: dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  const auditLogs = [
    {
      id: 'LOG-001',
      timestamp: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      action: '系统初始化',
      operator: '系统',
      details: '排班预约系统初始化，载入演示数据',
    },
  ];

  const reallocations = [];

  return {
    lawyers: LAWYERS,
    schedules,
    leaves,
    appointments,
    waitlist,
    addSlotRequests,
    auditLogs,
    reallocations,
    caseTypes: CASE_TYPES,
    materials: MATERIALS,
    timeSlots: TIME_SLOTS,
    recusalRelations: RECUSAL_RELATIONS,
    urgencyLevels: URGENCY_LEVELS,
    representedUnits: REPRESENTED_UNITS,
    snapshots: [],
    idCounters: {
      schedule: 100,
      leave: 10,
      appointment: 10,
      waitlist: 5,
      addSlot: 5,
      log: 5,
      reallocation: 5,
      snapshot: 1,
    },
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load data from localStorage', e);
  }
  return null;
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data to localStorage', e);
  }
}

let data = loadData() || generateSeedData();

const listeners = new Set();

function notify() {
  saveData(data);
  listeners.forEach((fn) => fn(data));
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(data);
  return () => listeners.delete(fn);
}

export function getData() {
  return data;
}

export function nextId(prefix) {
  const counter = data.idCounters[prefix] || 0;
  data.idCounters[prefix] = counter + 1;
  return `${prefix.toUpperCase().padEnd(3, '0').slice(0, 3)}-${String(counter + 1).padStart(3, '0')}`;
}

export function addAuditLog(action, operator, details) {
  data.auditLogs.push({
    id: nextId('log'),
    timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    action,
    operator,
    details,
  });
}

export function resetData() {
  data = generateSeedData();
  addAuditLog('数据重置', '系统', '系统已重置为演示数据');
  notify();
}

export function exportData() {
  return JSON.stringify(data, null, 2);
}

export function importData(jsonStr) {
  try {
    const imported = JSON.parse(jsonStr);
    data = imported;
    addAuditLog('数据导入', '系统', '已导入外部数据');
    notify();
    return true;
  } catch (e) {
    return false;
  }
}

export function takeSnapshot(label) {
  const snap = {
    id: nextId('snapshot'),
    label: label || `快照-${dayjs().format('HH:mm:ss')}`,
    timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    data: JSON.parse(JSON.stringify(data)),
  };
  data.snapshots.push(snap);
  addAuditLog('创建快照', '系统', `创建快照: ${snap.label}`);
  notify();
  return snap;
}

export function restoreSnapshot(snapshotId) {
  const snap = data.snapshots.find((s) => s.id === snapshotId);
  if (!snap) return false;
  const snapData = JSON.parse(JSON.stringify(snap.data));
  data = { ...data, ...snapData, snapshots: data.snapshots };
  addAuditLog('恢复快照', '系统', `恢复快照: ${snap.label}`);
  notify();
  return true;
}

export function addSchedule(schedule) {
  data.schedules.push(schedule);
  addAuditLog('添加排班', '值班主管', `为律师 ${schedule.lawyerId} 添加 ${schedule.date} 排班`);
  notify();
}

export function updateSchedule(id, updates) {
  const idx = data.schedules.findIndex((s) => s.id === id);
  if (idx >= 0) {
    data.schedules[idx] = { ...data.schedules[idx], ...updates };
    addAuditLog('修改排班', '值班主管', `修改排班 ${id}`);
    notify();
  }
}

export function deleteSchedule(id) {
  data.schedules = data.schedules.filter((s) => s.id !== id);
  addAuditLog('删除排班', '值班主管', `删除排班 ${id}`);
  notify();
}

export function addLeave(leave) {
  data.leaves.push(leave);
  addAuditLog('律师请假', '值班主管', `律师 ${leave.lawyerId} 请假 ${leave.date} ${leave.timeSlots.join(',')}`);
  notify();
}

export function removeLeave(id) {
  const leave = data.leaves.find((l) => l.id === id);
  data.leaves = data.leaves.filter((l) => l.id !== id);
  if (leave) {
    addAuditLog('撤销请假', '值班主管', `撤销律师 ${leave.lawyerId} 请假 ${leave.date}`);
  }
  notify();
}

export function getAvailableSlots(date, caseType) {
  const dayLeaves = data.leaves.filter(
    (l) => l.date === date && l.status === 'approved'
  );
  const lawyerLeaveMap = {};
  dayLeaves.forEach((l) => {
    if (!lawyerLeaveMap[l.lawyerId]) lawyerLeaveMap[l.lawyerId] = new Set();
    l.timeSlots.forEach((ts) => lawyerLeaveMap[l.lawyerId].add(ts));
  });

  const daySchedules = data.schedules.filter((s) => s.date === date);

  const dayAppointments = data.appointments.filter(
    (a) => a.date === date && a.status !== 'cancelled'
  );
  const slotBookedMap = {};
  dayAppointments.forEach((a) => {
    const key = `${a.lawyerId}-${a.timeSlot}`;
    if (!slotBookedMap[key]) slotBookedMap[key] = 0;
    slotBookedMap[key]++;
  });

  const results = [];
  daySchedules.forEach((sch) => {
    const lawyer = data.lawyers.find((l) => l.id === sch.lawyerId);
    if (!lawyer || lawyer.licenseStatus !== 'active') return;

    if (caseType && !lawyer.specialties.includes(caseType)) return;

    const leaveSlots = lawyerLeaveMap[sch.lawyerId] || new Set();

    sch.timeSlots.forEach((ts) => {
      if (leaveSlots.has(ts.key)) return;

      const booked = slotBookedMap[`${sch.lawyerId}-${ts.key}`] || 0;
      if (booked >= ts.capacity) return;

      results.push({
        scheduleId: sch.id,
        lawyerId: sch.lawyerId,
        lawyerName: lawyer.name,
        date,
        timeSlot: ts.key,
        remaining: ts.capacity - booked,
        specialties: lawyer.specialties,
      });
    });
  });

  return results;
}

export function validateBooking(booking) {
  const errors = [];

  const lawyer = data.lawyers.find((l) => l.id === booking.lawyerId);
  if (!lawyer) {
    errors.push({ rule: '律师不存在', message: '所选律师不存在' });
    return errors;
  }

  if (lawyer.licenseStatus !== 'active') {
    errors.push({ rule: '执业证状态', message: `律师 ${lawyer.name} 执业证状态异常（${lawyer.licenseStatus === 'suspended' ? '暂停执业' : '已注销'}），不可预约` });
  }

  const dayLeaves = data.leaves.filter(
    (l) => l.lawyerId === booking.lawyerId && l.date === booking.date && l.status === 'approved'
  );
  const leaveSlots = new Set();
  dayLeaves.forEach((l) => l.timeSlots.forEach((ts) => leaveSlots.add(ts)));
  if (leaveSlots.has(booking.timeSlot)) {
    errors.push({ rule: '律师请假', message: `律师 ${lawyer.name} 在 ${booking.timeSlot} 时段已请假，不可预约` });
  }

  if (booking.caseType && !lawyer.specialties.includes(booking.caseType)) {
    const ct = data.caseTypes.find((c) => c.id === booking.caseType);
    errors.push({ rule: '专业匹配', message: `律师 ${lawyer.name} 不擅长${ct ? ct.name : booking.caseType}类案件` });
  }

  const dayAppointments = data.appointments.filter(
    (a) =>
      a.citizenIdCard === booking.citizenIdCard &&
      a.date === booking.date &&
      a.status !== 'cancelled'
  );
  if (dayAppointments.length > 0) {
    errors.push({ rule: '群众当日预约上限', message: `该身份证号在 ${booking.date} 已有预约，每人每天只能保留一个预约` });
  }

  const schedule = data.schedules.find(
    (s) => s.lawyerId === booking.lawyerId && s.date === booking.date
  );
  if (schedule) {
    const ts = schedule.timeSlots.find((t) => t.key === booking.timeSlot);
    if (ts) {
      const booked = data.appointments.filter(
        (a) =>
          a.lawyerId === booking.lawyerId &&
          a.date === booking.date &&
          a.timeSlot === booking.timeSlot &&
          a.status !== 'cancelled'
      ).length;
      if (booked >= ts.capacity) {
        errors.push({ rule: '时段容量', message: `律师 ${lawyer.name} 在 ${booking.timeSlot} 时段已满` });
      }
    } else {
      errors.push({ rule: '时段不存在', message: '该时段不在排班内' });
    }
  } else {
    errors.push({ rule: '排班不存在', message: '该律师在此日期无排班' });
  }

  const caseType = data.caseTypes.find((c) => c.id === booking.caseType);
  if (caseType) {
    const missing = caseType.requiredMaterialIds.filter(
      (mId) => !(booking.materials || []).includes(mId)
    );
    if (missing.length > 0) {
      const missingNames = missing.map((mId) => data.materials.find((m) => m.id === mId)?.name || mId);
      errors.push({ rule: '材料齐全', message: `缺少必要材料: ${missingNames.join('、')}。可先预约，到场后补正` });
    }
  }

  return errors;
}

export function checkInterestConflict(citizenIdCard, lawyerId, caseType, opposingPartyUnit) {
  const conflicts = [];
  const lawyer = data.lawyers.find((l) => l.id === lawyerId);
  if (!lawyer) return conflicts;

  const recusals = data.recusalRelations.filter((r) => r.lawyerId === lawyerId);
  recusals.forEach((rec) => {
    const relatedLawyer = data.lawyers?.find((l) => l.id === rec.relatedLawyerId);
    const relatedApps = data.appointments.filter(
      (a) =>
        a.lawyerId === rec.relatedLawyerId &&
        a.status !== 'cancelled' &&
        a.caseType === caseType
    );
    if (relatedApps.length > 0) {
      conflicts.push({
        type: '回避关系冲突',
        severity: 'hard',
        description: `与律师 ${relatedLawyer?.name || rec.relatedLawyerId} 存在回避关系（${rec.reason}），且该律师正代理同类案件`,
        relatedLawyerId: rec.relatedLawyerId,
        relatedAppointments: relatedApps,
        conflictReason: rec.reason,
      });
    }
  });

  const sameCaseApps = data.appointments.filter(
    (a) =>
      a.citizenIdCard === citizenIdCard &&
      a.caseType === caseType &&
      a.status !== 'cancelled' &&
      a.lawyerId !== lawyerId
  );
  if (sameCaseApps.length > 0) {
    sameCaseApps.forEach((app) => {
      const otherLawyer = data.lawyers.find((l) => l.id === app.lawyerId);
      conflicts.push({
        type: '同案利益冲突',
        severity: 'soft',
        description: `您在同类型案件中已预约律师 ${otherLawyer?.name || app.lawyerId}，可能存在利益冲突`,
        relatedLawyerId: app.lawyerId,
        relatedAppointments: [app],
        conflictReason: '同案多律师代理',
      });
    });
  }

  if (opposingPartyUnit && lawyer.representedUnitIds?.includes(opposingPartyUnit)) {
    const unit = data.representedUnits?.find((u) => u.id === opposingPartyUnit);
    conflicts.push({
      type: '单位代理冲突',
      severity: 'hard',
      description: `律师 ${lawyer.name} 正在为对方当事人单位 ${unit?.name || opposingPartyUnit} 提供法律服务，存在利益冲突`,
      relatedUnitId: opposingPartyUnit,
      conflictReason: '律师已代理对方单位',
    });
  }

  if (opposingPartyUnit) {
    const sameUnitApps = data.appointments.filter(
      (a) =>
        a.lawyerId === lawyerId &&
        a.status !== 'cancelled' &&
        a.opposingPartyUnit === opposingPartyUnit
    );
    if (sameUnitApps.length > 0) {
      conflicts.push({
        type: '对方单位重复代理',
        severity: 'hard',
        description: `律师 ${lawyer.name} 已在其他案件中代理过该对方单位，可能存在利益冲突`,
        relatedAppointments: sameUnitApps,
        conflictReason: '对方单位重复代理',
      });
    }
  }

  const opposingPartySameSide = data.appointments.filter(
    (a) =>
      a.lawyerId === lawyerId &&
      a.status !== 'cancelled' &&
      a.caseType === caseType &&
      a.citizenIdCard !== citizenIdCard &&
      a.opposingPartyUnit &&
      lawyer.representedUnitIds?.includes(a.opposingPartyUnit)
  );
  if (opposingPartySameSide.length > 0) {
    conflicts.push({
      type: '对立双方代理冲突',
      severity: 'hard',
      description: `律师 ${lawyer.name} 正在为同类案件中的对方当事人提供代理，存在直接利益冲突`,
      relatedAppointments: opposingPartySameSide,
      conflictReason: '同一案件双方代理',
    });
  }

  return conflicts;
}

export function generateReallocationSuggestions(appointmentId, conflictType) {
  const apt = data.appointments.find((a) => a.id === appointmentId);
  if (!apt) return { suggestions: [], invalidReasons: [] };
  return _calcReallocationSuggestions(apt, conflictType);
}

export function getReallocationSuggestions(aptInfo, conflictType = 'all') {
  return _calcReallocationSuggestions(aptInfo, conflictType, true);
}

function _calcReallocationSuggestions(apt, conflictType, isTemp = false) {
  const oldLawyer = data.lawyers.find((l) => l.id === apt.lawyerId);
  const invalidReasons = [];

  if ((conflictType === 'recusal' || conflictType === 'all') && oldLawyer) {
    const recusals = data.recusalRelations.filter((r) => r.lawyerId === apt.lawyerId);
    recusals.forEach((rec) => {
      const relatedApps = data.appointments.filter(
        (a) =>
          a.lawyerId === rec.relatedLawyerId &&
          a.status !== 'cancelled' &&
          a.caseType === apt.caseType
      );
      if (relatedApps.length > 0) {
        invalidReasons.push({
          type: '回避关系冲突',
          reason: `与律师 ${getLawyerName(rec.relatedLawyerId)} 存在${rec.reason}关系，且该律师代理同类案件`,
        });
      }
    });
  }

  if ((conflictType === 'unit' || conflictType === 'all') && oldLawyer) {
    if (apt.opposingPartyUnit && oldLawyer?.representedUnitIds?.includes(apt.opposingPartyUnit)) {
      invalidReasons.push({
        type: '单位代理冲突',
        reason: `律师 ${oldLawyer.name} 正在为对方单位提供法律服务`,
      });
    }
  }

  if (conflictType === 'all' && oldLawyer) {
    const sameCaseApps = data.appointments.filter(
      (a) =>
        a.citizenIdCard === apt.citizenIdCard &&
        a.caseType === apt.caseType &&
        a.status !== 'cancelled' &&
        a.lawyerId !== apt.lawyerId &&
        (isTemp ? true : a.id !== apt.id)
    );
    if (sameCaseApps.length > 0) {
      invalidReasons.push({
        type: '同案利益冲突',
        reason: '您在同类型案件中已预约其他律师',
      });
    }

    if (apt.opposingPartyUnit) {
      const sameUnitApps = data.appointments.filter(
        (a) =>
          a.lawyerId === apt.lawyerId &&
          a.status !== 'cancelled' &&
          a.opposingPartyUnit === apt.opposingPartyUnit &&
          (isTemp ? true : a.id !== apt.id)
      );
      if (sameUnitApps.length > 0) {
        invalidReasons.push({
          type: '对方单位重复代理',
          reason: '该律师已在其他案件中代理过该对方单位',
        });
      }
    }

    const opposingSameSide = data.appointments.filter(
      (a) =>
        a.lawyerId === apt.lawyerId &&
        a.status !== 'cancelled' &&
        a.caseType === apt.caseType &&
        a.citizenIdCard !== apt.citizenIdCard &&
        a.opposingPartyUnit &&
        oldLawyer.representedUnitIds?.includes(a.opposingPartyUnit)
    );
    if (opposingSameSide.length > 0) {
      invalidReasons.push({
        type: '对立双方代理冲突',
        reason: '该律师正在为同类案件中的对方当事人提供代理',
      });
    }
  }

  const dayLeaves = data.leaves.filter(
    (l) => l.date === apt.date && l.status === 'approved'
  );
  const leaveLawyerSlots = {};
  dayLeaves.forEach((l) => {
    if (!leaveLawyerSlots[l.lawyerId]) leaveLawyerSlots[l.lawyerId] = new Set();
    l.timeSlots.forEach((ts) => leaveLawyerSlots[l.lawyerId].add(ts));
  });

  const daySchedules = data.schedules.filter((s) => s.date === apt.date);
  const dayBooked = data.appointments.filter(
    (a) => a.date === apt.date && a.status !== 'cancelled' && (isTemp ? true : a.id !== apt.id)
  );
  const slotBookedMap = {};
  dayBooked.forEach((a) => {
    const key = `${a.lawyerId}-${a.timeSlot}`;
    if (!slotBookedMap[key]) slotBookedMap[key] = 0;
    slotBookedMap[key]++;
  });

  const suggestions = data.lawyers
    .filter((l) => {
      if (l.id === apt.lawyerId) return false;
      if (l.licenseStatus !== 'active') return false;
      if (!l.specialties.includes(apt.caseType)) return false;

      const hasRecusal = data.recusalRelations.some(
        (r) =>
          (r.lawyerId === apt.lawyerId && r.relatedLawyerId === l.id) ||
          (r.lawyerId === l.id && r.relatedLawyerId === apt.lawyerId)
      );
      if (hasRecusal) return false;

      if (apt.opposingPartyUnit && l.representedUnitIds?.includes(apt.opposingPartyUnit)) {
        return false;
      }

      const sameUnitConflict = data.appointments.some(
        (a) =>
          a.lawyerId === l.id &&
          a.status !== 'cancelled' &&
          a.caseType === apt.caseType &&
          a.citizenIdCard !== apt.citizenIdCard &&
          a.opposingPartyUnit &&
          l.representedUnitIds?.includes(a.opposingPartyUnit)
      );
      if (sameUnitConflict) return false;

      const leaveSlots = leaveLawyerSlots[l.id];
      if (leaveSlots && leaveSlots.has(apt.timeSlot)) return false;

      const sch = daySchedules.find((s) => s.lawyerId === l.id);
      if (!sch) return false;
      const ts = sch.timeSlots.find((t) => t.key === apt.timeSlot);
      if (!ts) return false;

      const booked = slotBookedMap[`${l.id}-${apt.timeSlot}`] || 0;
      if (booked >= ts.capacity) return false;

      return true;
    })
    .map((l) => {
      const sch = daySchedules.find((s) => s.lawyerId === l.id);
      const ts = sch?.timeSlots.find((t) => t.key === apt.timeSlot);
      const booked = slotBookedMap[`${l.id}-${apt.timeSlot}`] || 0;
      const remaining = ts ? ts.capacity - booked : 0;

      let score = 0;
      if (l.specialties[0] === apt.caseType) score += 30;
      score += remaining * 5;
      const sameTypeApps = data.appointments.filter(
        (a) => a.lawyerId === l.id && a.caseType === apt.caseType && a.status !== 'cancelled'
      ).length;
      score += sameTypeApps * 2;

      return {
        lawyerId: l.id,
        lawyerName: l.name,
        specialties: l.specialties,
        remaining,
        score,
        reason: `专业匹配度高，还有 ${remaining} 个名额`,
      };
    })
    .sort((a, b) => b.score - a.score);

  return { suggestions, invalidReasons };
}

function getLawyerName(id) {
  return data.lawyers.find((l) => l.id === id)?.name || id;
}

export function markLate(id, operator = '现场人员') {
  const apt = data.appointments.find((a) => a.id === id);
  if (!apt) return false;
  apt.status = 'late';
  apt.lateTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
  addAuditLog('迟到标记', operator, `${apt.citizenName} 迟到，预约 ${id}`);
  notify();
  return true;
}

export function getEmergencyImpact(date, timeSlot, lawyerId) {
  const dayAppointments = data.appointments.filter(
    (a) => a.date === date && a.lawyerId === lawyerId && a.status !== 'cancelled'
  );

  const slotIndex = TIME_SLOTS.findIndex((ts) => ts.key === timeSlot);
  if (slotIndex === -1) return { affectedCount: 0, affectedAppointments: [], delaySlots: 0 };

  const subsequentSlots = TIME_SLOTS.slice(slotIndex + 1);
  const affectedAppointments = dayAppointments.filter(
    (a) => subsequentSlots.some((ts) => ts.key === a.timeSlot)
  );

  return {
    affectedCount: affectedAppointments.length,
    affectedAppointments,
    delaySlots: subsequentSlots.length,
    suggestion: affectedAppointments.length > 0
      ? `紧急援助插入 ${timeSlot} 时段后，将影响后续 ${affectedAppointments.length} 个预约，可能导致顺延`
      : '紧急援助插入后，后续时段无预约，无顺延影响',
  };
}

export function createAppointment(booking, operator = '群众') {
  const errors = validateBooking(booking);
  const hardErrors = errors.filter((e) => e.rule !== '材料齐全');
  if (hardErrors.length > 0) return { success: false, errors };

  const conflicts = checkInterestConflict(
    booking.citizenIdCard,
    booking.lawyerId,
    booking.caseType,
    booking.opposingPartyUnit
  );
  const apt = {
    id: nextId('appointment'),
    citizenName: booking.citizenName,
    citizenIdCard: booking.citizenIdCard,
    citizenPhone: booking.citizenPhone || '',
    lawyerId: booking.lawyerId,
    date: booking.date,
    timeSlot: booking.timeSlot,
    caseType: booking.caseType,
    caseReason: booking.caseReason || '',
    opposingParty: booking.opposingParty || '',
    opposingPartyUnit: booking.opposingPartyUnit || '',
    materials: booking.materials || [],
    urgency: booking.urgency || 'normal',
    status: booking.materials && booking.materials.length >= (data.caseTypes.find((c) => c.id === booking.caseType)?.requiredMaterialIds.length || 0) ? 'confirmed' : 'pending_materials',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    isEmergency: booking.isEmergency || false,
    conflictWarnings: conflicts,
    invalidReason: '',
  };

  data.appointments.push(apt);
  addAuditLog('创建预约', operator, `${booking.citizenName} 预约律师 ${booking.lawyerId} ${booking.date} ${booking.timeSlot}，案件类型: ${booking.caseType}，紧急程度: ${booking.urgency || '普通'}`);
  notify();
  return { success: true, appointment: apt, errors, conflicts };
}

export function cancelAppointment(id, operator = '群众', reason = '') {
  const apt = data.appointments.find((a) => a.id === id);
  if (!apt) return false;
  apt.status = 'cancelled';
  apt.invalidReason = reason || '群众主动取消';
  addAuditLog('取消预约', operator, `取消预约 ${id}，群众: ${apt.citizenName}，原因: ${apt.invalidReason}`);
  promoteWaitlist(apt.date, apt.lawyerId, apt.timeSlot);
  notify();
  return true;
}

export function checkInAppointment(id, operator = '现场人员') {
  const apt = data.appointments.find((a) => a.id === id);
  if (!apt) return false;
  apt.status = 'checked_in';
  apt.checkInTime = dayjs().format('YYYY-MM-DD HH:mm:ss');
  addAuditLog('预约签到', operator, `${apt.citizenName} 已签到，预约 ${id}`);
  notify();
  return true;
}

export function markNoShow(id, operator = '现场人员') {
  const apt = data.appointments.find((a) => a.id === id);
  if (!apt) return false;
  apt.status = 'no_show';
  addAuditLog('爽约标记', operator, `${apt.citizenName} 爽约，预约 ${id}`);
  promoteWaitlist(apt.date, apt.lawyerId, apt.timeSlot);
  notify();
  return true;
}

export function addWaitlistEntry(entry) {
  const wl = {
    id: nextId('waitlist'),
    ...entry,
    position: data.waitlist.filter(
      (w) => w.date === entry.date && w.lawyerId === entry.lawyerId && w.timeSlot === entry.timeSlot && w.status === 'waiting'
    ).length + 1,
    status: 'waiting',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  };
  data.waitlist.push(wl);
  addAuditLog('加入候补', '群众', `${entry.citizenName} 加入候补 ${entry.date} ${entry.timeSlot}`);
  notify();
  return wl;
}

export function promoteWaitlist(date, lawyerId, timeSlot) {
  const waiting = data.waitlist.filter(
    (w) =>
      w.date === date &&
      w.lawyerId === lawyerId &&
      w.timeSlot === timeSlot &&
      w.status === 'waiting'
  ).sort((a, b) => a.position - b.position);

  if (waiting.length === 0) return null;

  const first = waiting[0];
  first.status = 'promoted';
  first.promotedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');

  const newApt = {
    id: nextId('appointment'),
    citizenName: first.citizenName,
    citizenIdCard: first.citizenIdCard,
    lawyerId: first.lawyerId,
    date: first.date,
    timeSlot: first.timeSlot,
    caseType: first.caseType,
    materials: first.materials || [],
    status: 'confirmed',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    isEmergency: false,
    fromWaitlist: first.id,
  };
  data.appointments.push(newApt);

  addAuditLog('候补转正', '系统', `${first.citizenName} 候补转正，预约 ${newApt.id}`);
  notify();
  return { waitlistEntry: first, appointment: newApt };
}

export function reallocateAppointment(appointmentId, newLawyerId, reason, operator = '现场人员') {
  const apt = data.appointments.find((a) => a.id === appointmentId);
  if (!apt) return { success: false, error: '预约不存在' };

  const oldLawyer = data.lawyers.find((l) => l.id === apt.lawyerId);
  const newLawyer = data.lawyers.find((l) => l.id === newLawyerId);

  if (!newLawyer) return { success: false, error: '目标律师不存在' };

  const reallocation = {
    id: nextId('reallocation'),
    appointmentId,
    originalLawyerId: apt.lawyerId,
    originalLawyerName: oldLawyer?.name || apt.lawyerId,
    newLawyerId,
    newLawyerName: newLawyer.name,
    reason,
    originalTimeSlot: apt.timeSlot,
    date: apt.date,
    timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    beforeSnapshot: {
      lawyerId: apt.lawyerId,
      lawyerName: oldLawyer?.name || apt.lawyerId,
      timeSlot: apt.timeSlot,
      status: apt.status,
    },
  };

  const oldLawyerId = apt.lawyerId;
  apt.lawyerId = newLawyerId;
  apt.status = 'reallocated';
  apt.reallocationId = reallocation.id;

  data.reallocations.push(reallocation);

  addAuditLog(
    '冲突改派',
    operator,
    `预约 ${appointmentId} 从律师 ${reallocation.originalLawyerName} 改派至 ${newLawyer.name}，原因: ${reason}`
  );

  promoteWaitlist(apt.date, oldLawyerId, apt.timeSlot);
  notify();
  return { success: true, reallocation };
}

export function createAddSlotRequest(request) {
  const req = {
    id: nextId('addSlot'),
    ...request,
    status: 'pending',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  };
  data.addSlotRequests.push(req);
  addAuditLog('申请加号', request.requestedBy || '现场人员', `律师 ${request.lawyerId} ${request.date} ${request.timeSlot} 加号申请`);
  notify();
  return req;
}

export function approveAddSlot(id, operator = '值班主管') {
  const req = data.addSlotRequests.find((r) => r.id === id);
  if (!req) return false;
  req.status = 'approved';

  const schedule = data.schedules.find(
    (s) => s.lawyerId === req.lawyerId && s.date === req.date
  );
  if (schedule) {
    const existingTs = schedule.timeSlots.find((t) => t.key === req.timeSlot);
    if (existingTs) {
      existingTs.capacity += 1;
    } else {
      schedule.timeSlots.push({ key: req.timeSlot, label: req.timeSlot, capacity: 1, booked: 0 });
    }
  } else {
    const newSchedule = {
      id: nextId('schedule'),
      lawyerId: req.lawyerId,
      date: req.date,
      timeSlots: [{ key: req.timeSlot, label: req.timeSlot, capacity: 1, booked: 0 }],
    };
    data.schedules.push(newSchedule);
  }

  addAuditLog('批准加号', operator, `批准加号 ${id}，律师 ${req.lawyerId} ${req.date} ${req.timeSlot}`);
  notify();
  return true;
}

export function rejectAddSlot(id, operator = '值班主管') {
  const req = data.addSlotRequests.find((r) => r.id === id);
  if (!req) return false;
  req.status = 'rejected';
  addAuditLog('拒绝加号', operator, `拒绝加号 ${id}`);
  notify();
  return true;
}

export function createEmergencyAid(aid) {
  const req = {
    id: nextId('addSlot'),
    lawyerId: aid.lawyerId,
    date: aid.date,
    timeSlot: aid.timeSlot || '09:00-10:00',
    reason: `紧急法律援助: ${aid.reason}`,
    status: 'approved',
    requestedBy: '紧急援助',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  };
  data.addSlotRequests.push(req);

  const apt = {
    id: nextId('appointment'),
    citizenName: aid.citizenName,
    citizenIdCard: aid.citizenIdCard,
    lawyerId: aid.lawyerId,
    date: aid.date,
    timeSlot: aid.timeSlot || '09:00-10:00',
    caseType: aid.caseType,
    materials: aid.materials || [],
    status: 'confirmed',
    createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    isEmergency: true,
  };
  data.appointments.push(apt);

  addAuditLog('紧急法律援助', '现场人员', `${aid.citizenName} 紧急援助，指派律师 ${aid.lawyerId}`);
  notify();
  return apt;
}

export function updateAppointmentMaterials(id, materials, operator = '现场人员') {
  const apt = data.appointments.find((a) => a.id === id);
  if (!apt) return false;
  apt.materials = materials;
  const caseType = data.caseTypes.find((c) => c.id === apt.caseType);
  if (caseType) {
    const allPresent = caseType.requiredMaterialIds.every((mId) => materials.includes(mId));
    if (allPresent && apt.status === 'pending_materials') {
      apt.status = 'confirmed';
    }
  }
  addAuditLog('材料补正', operator, `预约 ${id} 材料已更新`);
  notify();
  return true;
}

export function getConflictMatrix(date) {
  const dayApts = data.appointments.filter(
    (a) => a.date === date && a.status !== 'cancelled'
  );
  const matrix = [];
  const lawyerIds = [...new Set(dayApts.map((a) => a.lawyerId))];

  for (let i = 0; i < lawyerIds.length; i++) {
    for (let j = i + 1; j < lawyerIds.length; j++) {
      const recusal = data.recusalRelations.find(
        (r) =>
          (r.lawyerId === lawyerIds[i] && r.relatedLawyerId === lawyerIds[j]) ||
          (r.lawyerId === lawyerIds[j] && r.relatedLawyerId === lawyerIds[i])
      );
      if (recusal) {
        const apts1 = dayApts.filter((a) => a.lawyerId === lawyerIds[i]);
        const apts2 = dayApts.filter((a) => a.lawyerId === lawyerIds[j]);
        const sameCaseApts = apts1.filter((a1) =>
          apts2.some((a2) => a2.caseType === a1.caseType)
        );
        if (sameCaseApts.length > 0) {
          matrix.push({
            lawyer1: { id: lawyerIds[i], name: data.lawyers.find((l) => l.id === lawyerIds[i])?.name },
            lawyer2: { id: lawyerIds[j], name: data.lawyers.find((l) => l.id === lawyerIds[j])?.name },
            reason: recusal.reason,
            conflictingCases: sameCaseApts.map((a) => ({
              caseType: a.caseType,
              caseTypeName: data.caseTypes.find((c) => c.id === a.caseType)?.name,
              citizenName: a.citizenName,
            })),
          });
        }
      }
    }
  }
  return matrix;
}

export function getRuleExplanation() {
  return [
    {
      rule: '律师请假',
      description: '律师已请假的时段不会出现在可预约列表中，已请假律师的排班自动隐藏',
      severity: '硬拦截',
    },
    {
      rule: '专业匹配',
      description: '预约时律师的专业方向必须与案件类型匹配，不匹配的律师不会出现在可选列表',
      severity: '硬拦截',
    },
    {
      rule: '同案利益冲突',
      description: '同一群众在同类型案件中已预约其他律师时，系统会提示利益冲突，建议改派',
      severity: '冲突提示',
    },
    {
      rule: '回避关系',
      description: '存在回避关系的律师代理同类案件时，系统会明确提示并建议改派其他律师',
      severity: '冲突提示',
    },
    {
      rule: '单位代理冲突',
      description: '对方当事人所在单位是律师当前代理的单位时，系统判定为利益冲突，禁止预约',
      severity: '硬拦截',
    },
    {
      rule: '对方单位重复代理',
      description: '律师同期代理了对方当事人所在单位的其他案件，存在利益冲突风险',
      severity: '冲突提示',
    },
    {
      rule: '对立双方代理冲突',
      description: '律师同时代理了案件对立双方的当事人，存在直接利益冲突，禁止预约',
      severity: '硬拦截',
    },
    {
      rule: '群众当日预约上限',
      description: '同一身份证号同一天只能保留一个有效预约，重复预约将被拦截',
      severity: '硬拦截',
    },
    {
      rule: '时段容量',
      description: '每个时段有最大容量限制，满员后不再接受预约，可加入候补',
      severity: '硬拦截',
    },
    {
      rule: '材料齐全',
      description: '预约时检查必要材料是否齐全，材料不全可先预约但状态为"待补正"，到场后需补正',
      severity: '软提示',
    },
    {
      rule: '紧急程度分级',
      description: '预约分为普通、紧急、特急三个等级，特急法律援助可插队优先处理',
      severity: '软提示',
    },
    {
      rule: '紧急援助插队',
      description: '特急紧急援助可插队处理，系统自动计算受影响预约数量并给出顺延建议',
      severity: '冲突提示',
    },
    {
      rule: '智能改派建议',
      description: '发生利益冲突时，系统自动推荐可改派的律师，按专业匹配度、剩余名额等综合评分排序',
      severity: '软提示',
    },
    {
      rule: '现场秩序管理',
      description: '现场加号、迟到、爽约、候补转正和改派等操作均需写入本地审计日志',
      severity: '软提示',
    },
    {
      rule: '审计留痕',
      description: '所有关键操作均记录审计日志，包括操作人、操作时间、操作内容和操作前后状态',
      severity: '软提示',
    },
  ];
}

export {
  TIME_SLOTS,
  CASE_TYPES,
  MATERIALS,
  LAWYERS,
  RECUSAL_RELATIONS,
  URGENCY_LEVELS,
  REPRESENTED_UNITS,
  getLawyerName,
};
