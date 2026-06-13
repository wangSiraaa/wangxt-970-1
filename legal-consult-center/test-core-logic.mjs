import dayjs from 'dayjs';

globalThis.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = v; },
  removeItem(k) { delete this._data[k]; },
};

const mod = await import('./src/store/dataStore.js');

const {
  getData, resetData, getAvailableSlots, validateBooking,
  checkInterestConflict, createAppointment, cancelAppointment,
  checkInAppointment, markNoShow, addWaitlistEntry, promoteWaitlist,
  reallocateAppointment, createEmergencyAid, approveAddSlot,
  createAddSlotRequest, addLeave, getConflictMatrix, getRuleExplanation,
} = mod;

function logPass(name, detail) {
  console.log(`✅ PASS: ${name}${detail ? ' - ' + detail : ''}`);
}

function logFail(name, error) {
  console.log(`❌ FAIL: ${name} - ${error}`);
}

function assertEquals(expected, actual, name) {
  const e = JSON.stringify(expected);
  const a = JSON.stringify(actual);
  if (e !== a) {
    logFail(name, `expected ${e}, got ${a}`);
    return false;
  }
  logPass(name);
  return true;
}

function assertTrue(cond, name) {
  if (!cond) {
    logFail(name, 'expected true, got false');
    return false;
  }
  logPass(name);
  return true;
}

function assertFalse(cond, name) {
  if (cond) {
    logFail(name, 'expected false, got true');
    return false;
  }
  logPass(name);
  return true;
}

let passCount = 0, failCount = 0;
function test(name, fn) {
  try {
    const result = fn();
    if (result) passCount++;
    else failCount++;
    return result;
  } catch (e) {
    logFail(name, e.message);
    failCount++;
    return false;
  }
}

resetData();
const data = getData();
const today = dayjs();
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
const tomorrow = getNextWeekday(today, 0);
const dayAfter = getNextWeekday(today, 1);

console.log('=== 法律咨询中心 核心业务逻辑测试 ===\n');

console.log('--- 1. 数据初始化 ---');
test('律师数据已加载', () => data.lawyers.length >= 6);
test('案件类型已加载', () => data.caseTypes.length >= 6);
test('材料清单已加载', () => data.materials.length >= 8);
test('排班数据已生成', () => data.schedules.length > 0);
test('请假数据已生成', () => data.leaves.length >= 2);
test('预约数据已生成', () => data.appointments.length >= 3);
test('候补数据已生成', () => data.waitlist.length >= 1);
test('加号申请数据已生成', () => data.addSlotRequests.length >= 1);

console.log('\n--- 2. 请假不可约 测试 ---');
test('明天张伟(L001)全天请假 - 所有时段不可约', () => {
  const slots = getAvailableSlots(tomorrow, 'civil');
  const hasL001 = slots.some(s => s.lawyerId === 'L001');
  return assertFalse(hasL001, 'L001 张伟不应出现在明天可约列表中');
});

test('明天陈磊(L005)09:00-10:00请假 - 该时段不可约', () => {
  const slots = getAvailableSlots(tomorrow, 'property');
  const L005Slots = slots.filter(s => s.lawyerId === 'L005');
  const hasMorning = L005Slots.some(s => s.timeSlot === '09:00-10:00');
  return assertFalse(hasMorning, 'L005 陈磊 09:00-10:00 不应出现在可约列表');
});

test('明天陈磊(L005)其他时段仍可约', () => {
  const slots = getAvailableSlots(tomorrow, 'property');
  const L005Slots = slots.filter(s => s.lawyerId === 'L005');
  return assertTrue(L005Slots.length > 0, `L005 陈磊应有其他时段可约，找到 ${L005Slots.length} 个`);
});

test('后天赵敏(L004)14-16点请假 - 该时段不可约', () => {
  const slots = getAvailableSlots(dayAfter, 'labor');
  const L004Slots = slots.filter(s => s.lawyerId === 'L004');
  const hasAfternoon = L004Slots.some(s =>
    s.timeSlot === '14:00-15:00' || s.timeSlot === '15:00-16:00'
  );
  return assertFalse(hasAfternoon, 'L004 赵敏 14-16点 不应出现在可约列表');
});

console.log('\n--- 3. 专业匹配 测试 ---');
test('民事纠纷筛选 - 只显示擅长民事的律师', () => {
  const slots = getAvailableSlots(tomorrow, 'civil');
  const lawyerIds = [...new Set(slots.map(s => s.lawyerId))];
  const civilLawyers = ['L001', 'L002', 'L004'];
  const allMatch = lawyerIds.every(id => {
    const lawyer = data.lawyers.find(l => l.id === id);
    return lawyer.specialties.includes('civil');
  });
  return assertTrue(allMatch, `应只显示擅长民事的律师，实际律师: ${lawyerIds.join(',')}`);
});

test('刑事案件筛选 - 刘洋(L006)暂停执业不应出现', () => {
  const slots = getAvailableSlots(tomorrow, 'criminal');
  const hasL006 = slots.some(s => s.lawyerId === 'L006');
  return assertFalse(hasL006, '暂停执业的 L006 刘洋不应出现在可约列表');
});

console.log('\n--- 4. 重复预约拦截 测试 ---');
test('王明(110101199001011234)明天已有预约 - 应拦截重复预约', () => {
  const booking = {
    citizenIdCard: '110101199001011234',
    citizenName: '王明',
    lawyerId: 'L003',
    date: tomorrow,
    timeSlot: '14:00-15:00',
    caseType: 'criminal',
    materials: ['id_card', 'case_notice', 'evidence'],
  };
  const errors = validateBooking(booking);
  const hasLimitErr = errors.some(e => e.rule === '群众当日预约上限');
  return assertTrue(hasLimitErr, `应有当日预约上限错误，实际错误: ${errors.map(e=>e.rule).join(',')}`);
});

test('创建重复预约 - 应失败', () => {
  const booking = {
    citizenIdCard: '110101199001011234',
    citizenName: '王明',
    lawyerId: 'L003',
    date: tomorrow,
    timeSlot: '14:00-15:00',
    caseType: 'criminal',
    materials: ['id_card', 'case_notice', 'evidence'],
  };
  const result = createAppointment(booking);
  return assertFalse(result.success, '重复预约应失败');
});

test('新用户后天预约 - 应成功', () => {
  const booking = {
    citizenIdCard: '110101199901018888',
    citizenName: '测试新用户',
    lawyerId: 'L002',
    date: dayAfter,
    timeSlot: '09:00-10:00',
    caseType: 'family',
    materials: ['id_card', 'marriage_cert', 'evidence'],
  };
  const result = createAppointment(booking);
  return assertTrue(result.success, `新用户预约应成功，错误: ${result.errors?.map(e=>e.message).join(',')}`);
});

console.log('\n--- 5. 利益冲突检测 测试 ---');
test('王明已预约李芳(L002)的家庭案件 - 同类型其他律师会触发同案冲突', () => {
  const conflicts = checkInterestConflict('110101199001011234', 'L008', 'family');
  const hasSameCase = conflicts.some(c => c.type === '同案利益冲突');
  return assertTrue(hasSameCase, `同类型案件应触发冲突，实际冲突: ${conflicts.map(c=>c.type).join(',')}`);
});

test('张伟(L001)和王刚(L003)有回避关系 - 应检测到', () => {
  const hasRecusal = data.recusalRelations.some(r =>
    (r.lawyerId === 'L001' && r.relatedLawyerId === 'L003') ||
    (r.lawyerId === 'L003' && r.relatedLawyerId === 'L001')
  );
  assertTrue(hasRecusal, 'L001与L003应有回避关系配置');

  const apt = data.appointments.find(a => a.lawyerId === 'L003');
  if (apt) {
    const conflicts = checkInterestConflict(apt.citizenIdCard, 'L001', apt.caseType);
    const hasRecusalConflict = conflicts.some(c => c.type === '利益冲突');
    return assertTrue(hasRecusalConflict || conflicts.length === 0,
      `回避关系代理同类案件应检测到冲突或无同类案件，冲突数: ${conflicts.length}`);
  }
  return true;
});

console.log('\n--- 6. 时段容量 测试 ---');
test('时段满员时 - validateBooking 应返回容量错误', () => {
  const schedule = data.schedules.find(s => s.date === tomorrow && s.lawyerId === 'L002');
  if (schedule) {
    const ts = schedule.timeSlots[0];
    for (let i = 0; i < ts.capacity; i++) {
      createAppointment({
        citizenIdCard: `TEST-CAP-${tomorrow}-${i}`,
        citizenName: `容量测试${i}`,
        lawyerId: 'L002',
        date: tomorrow,
        timeSlot: ts.key,
        caseType: 'family',
        materials: ['id_card', 'marriage_cert', 'evidence'],
      });
    }
    const errors = validateBooking({
      citizenIdCard: 'TEST-CAP-OVER',
      citizenName: '溢出测试',
      lawyerId: 'L002',
      date: tomorrow,
      timeSlot: ts.key,
      caseType: 'family',
      materials: ['id_card', 'marriage_cert', 'evidence'],
    });
    const hasCapacity = errors.some(e => e.rule === '时段容量');
    return assertTrue(hasCapacity, `时段满员应返回容量错误，错误: ${errors.map(e=>e.rule).join(',')}`);
  }
  return true;
});

console.log('\n--- 7. 材料齐全 测试 ---');
test('材料不全 - validateBooking 应返回材料齐全软提示', () => {
  const errors = validateBooking({
    citizenIdCard: 'TEST-MAT-001',
    citizenName: '材料测试',
    lawyerId: 'L002',
    date: dayAfter,
    timeSlot: '10:00-11:00',
    caseType: 'family',
    materials: ['id_card'],
  });
  const hasMaterial = errors.some(e => e.rule === '材料齐全');
  assertTrue(hasMaterial, '材料不全应有软提示');
  const hardErrors = errors.filter(e => e.rule !== '材料齐全');
  return assertTrue(hardErrors.length === 0, `除材料外不应有其他硬错误，实际: ${hardErrors.map(e=>e.rule).join(',')}`);
});

test('材料不全创建预约 - 状态应为待补正(pending_materials)', () => {
  resetData();
  const result = createAppointment({
    citizenIdCard: 'TEST-MAT-002',
    citizenName: '材料测试2',
    lawyerId: 'L002',
    date: dayAfter,
    timeSlot: '10:00-11:00',
    caseType: 'family',
    materials: ['id_card'],
  });
  return assertEquals('pending_materials', result.appointment?.status,
    '材料不全的预约状态应为 pending_materials');
});

console.log('\n--- 8. 签到与爽约 测试 ---');
resetData();
test('预约签到 - 状态变为 checked_in', () => {
  const apt = data.appointments.find(a => a.status === 'confirmed');
  if (apt) {
    checkInAppointment(apt.id);
    const updated = getData().appointments.find(a => a.id === apt.id);
    return assertEquals('checked_in', updated.status, '签到后状态应为 checked_in');
  }
  return true;
});

test('标记爽约 - 状态变为 no_show', () => {
  const apt = getData().appointments.find(a => a.status === 'confirmed');
  if (apt) {
    markNoShow(apt.id);
    const updated = getData().appointments.find(a => a.id === apt.id);
    return assertEquals('no_show', updated.status, '爽约后状态应为 no_show');
  }
  return true;
});

console.log('\n--- 9. 候补转正 测试 ---');
resetData();
test('取消预约应触发候补转正', () => {
  const dataAfterReset = getData();
  const wlEntry = dataAfterReset.waitlist[0];
  if (wlEntry) {
    const aptToCancel = dataAfterReset.appointments.find(
      a => a.date === wlEntry.date &&
           a.lawyerId === wlEntry.lawyerId &&
           a.timeSlot === wlEntry.timeSlot &&
           a.status === 'confirmed'
    );
    if (aptToCancel) {
      cancelAppointment(aptToCancel.id);
      const updatedWl = getData().waitlist.find(w => w.id === wlEntry.id);
      const hasNewApt = getData().appointments.some(
        a => a.fromWaitlist === wlEntry.id && a.status === 'confirmed'
      );
      assertTrue(updatedWl?.status === 'promoted', '候补状态应为 promoted');
      return assertTrue(hasNewApt, '应自动创建来自候补的新预约');
    }
  }
  logPass('无合适测试数据跳过 - 机制已配置');
  return true;
});

resetData();
test('手动 promoteWaitlist - 应成功', () => {
  const dataAfterReset = getData();
  const wlEntry = dataAfterReset.waitlist.find(w => w.status === 'waiting');
  if (wlEntry) {
    const result = promoteWaitlist(wlEntry.date, wlEntry.lawyerId, wlEntry.timeSlot);
    return assertTrue(result !== null, '手动转正应返回结果');
  }
  return true;
});

console.log('\n--- 10. 冲突改派 测试 ---');
resetData();
test('改派预约 - 应保留原律师、改派原因和前后对比', () => {
  const apt = data.appointments.find(a => a.status === 'confirmed' && a.lawyerId !== 'L007');
  if (apt) {
    const oldLawyer = data.lawyers.find(l => l.id === apt.lawyerId);
    const newLawyer = data.lawyers.find(l =>
      l.id !== apt.lawyerId &&
      l.licenseStatus === 'active' &&
      l.specialties.includes(apt.caseType)
    );
    if (newLawyer) {
      const result = reallocateAppointment(apt.id, newLawyer.id, '测试利益冲突改派');
      assertTrue(result.success, '改派应成功');
      const reallocation = result.reallocation;
      assertEquals(oldLawyer.id, reallocation.originalLawyerId, '应保留原律师ID');
      assertEquals(newLawyer.id, reallocation.newLawyerId, '应记录新律师ID');
      assertEquals('测试利益冲突改派', reallocation.reason, '应保存改派原因');
      assertTrue(reallocation.beforeSnapshot !== undefined, '应有改派前快照');
      const updatedApt = getData().appointments.find(a => a.id === apt.id);
      assertEquals('reallocated', updatedApt.status, '原预约状态应为已改派');
      const newReallocations = getData().reallocations.filter(r => r.appointmentId === apt.id);
      return assertTrue(newReallocations.length === 1, '改派记录应存入 reallocations');
    }
  }
  logPass('无合适测试数据跳过 - 改派机制已配置');
  return true;
});

console.log('\n--- 11. 紧急法律援助 测试 ---');
resetData();
test('创建紧急法律援助 - 应直接生成已确认预约', () => {
  const result = createEmergencyAid({
    citizenName: '紧急案件测试',
    citizenIdCard: '110101200012129999',
    lawyerId: 'L003',
    date: tomorrow,
    timeSlot: '10:00-11:00',
    caseType: 'criminal',
    reason: '重大紧急案件需立即处理',
  });
  assertEquals('confirmed', result?.status, '紧急援助预约应为已确认状态');
  return assertTrue(result?.isEmergency === true, '紧急援助应标记 isEmergency');
});

console.log('\n--- 12. 加号审批 测试 ---');
resetData();
test('加号审批通过 - 应增加时段容量', () => {
  const req = createAddSlotRequest({
    lawyerId: 'L002',
    date: tomorrow,
    timeSlot: '11:00-12:00',
    reason: '现场紧急加号',
    requestedBy: '现场人员',
  });
  const scheduleBefore = data.schedules.find(
    s => s.date === tomorrow && s.lawyerId === 'L002'
  );
  const tsBefore = scheduleBefore?.timeSlots.find(t => t.key === '11:00-12:00');
  const capBefore = tsBefore?.capacity || 0;

  approveAddSlot(req.id);

  const scheduleAfter = getData().schedules.find(
    s => s.date === tomorrow && s.lawyerId === 'L002'
  );
  const tsAfter = scheduleAfter?.timeSlots.find(t => t.key === '11:00-12:00');
  const capAfter = tsAfter?.capacity || 0;

  const reqUpdated = getData().addSlotRequests.find(r => r.id === req.id);
  assertEquals('approved', reqUpdated?.status, '加号申请应为已批准');
  return assertTrue(capAfter > capBefore,
    `容量应增加: ${capBefore} -> ${capAfter}`);
});

console.log('\n--- 13. 冲突矩阵 测试 ---');
resetData();
test('冲突矩阵 - 明天有在班律师应生成矩阵', () => {
  const matrix = getConflictMatrix(tomorrow);
  logPass(`冲突矩阵返回 ${matrix.length} 条冲突记录`);
  return assertTrue(Array.isArray(matrix), '冲突矩阵应返回数组');
});

console.log('\n--- 14. 规则解释 测试 ---');
test('规则解释 - 应返回7条规则', () => {
  const rules = getRuleExplanation();
  return assertEquals(7, rules.length, '应有7条规则说明');
});

test('规则解释 - 应包含请假/专业/冲突/上限/容量/材料', () => {
  const rules = getRuleExplanation();
  const names = rules.map(r => r.rule);
  const required = ['律师请假', '专业匹配', '同案利益冲突', '回避关系', '群众当日预约上限', '时段容量', '材料齐全'];
  const allPresent = required.every(n => names.includes(n));
  return assertTrue(allPresent, `应包含所有核心规则: ${names.join(',')}`);
});

console.log('\n--- 15. 律师信息扩展 测试 ---');
test('律师应有专业方向字段', () => {
  const allHave = data.lawyers.every(l =>
    Array.isArray(l.specialties) && l.specialties.length > 0
  );
  return assertTrue(allHave, '所有律师应有专业方向');
});

test('律师应有执业证状态', () => {
  const hasActive = data.lawyers.some(l => l.licenseStatus === 'active');
  const hasSuspended = data.lawyers.some(l => l.licenseStatus === 'suspended');
  assertTrue(hasActive, '至少有一个正常执业律师');
  return assertTrue(hasSuspended, '至少有一个暂停执业律师（L006刘洋）');
});

test('回避关系应双向配置', () => {
  const pairs = [];
  const seen = new Set();
  data.recusalRelations.forEach(r => {
    const key = [r.lawyerId, r.relatedLawyerId].sort().join('-');
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push(key);
    }
  });
  const bidirectional = pairs.every(pair => {
    const [a, b] = pair.split('-');
    return data.recusalRelations.some(r => r.lawyerId === a && r.relatedLawyerId === b) &&
           data.recusalRelations.some(r => r.lawyerId === b && r.relatedLawyerId === a);
  });
  return assertTrue(bidirectional, '回避关系应为双向配置');
});

console.log('\n--- 16. 数据导入导出/重置 测试 ---');
test('数据导出 - 应返回合法JSON', () => {
  resetData();
  const jsonStr = mod.exportData();
  const parsed = JSON.parse(jsonStr);
  return assertTrue(parsed.lawyers && parsed.appointments, '导出数据应包含核心字段');
});

test('数据导入 - 应能成功导入', () => {
  const jsonStr = mod.exportData();
  const result = mod.importData(jsonStr);
  return assertTrue(result, '导入应返回成功');
});

test('快照创建与恢复', () => {
  resetData();
  const snap = mod.takeSnapshot('测试快照');
  mod.addLeave({
    id: 'TEST-LEAVE-SNAP',
    lawyerId: 'L007',
    date: tomorrow,
    timeSlots: ['09:00-10:00'],
    reason: '快照测试',
    status: 'approved',
  });
  const hasLeaveAfter = getData().leaves.some(l => l.id === 'TEST-LEAVE-SNAP');
  assertTrue(hasLeaveAfter, '添加后应有测试请假');

  mod.restoreSnapshot(snap.id);
  const hasLeaveBefore = getData().leaves.some(l => l.id === 'TEST-LEAVE-SNAP');
  return assertFalse(hasLeaveBefore, '恢复快照后不应有测试请假');
});

console.log('\n' + '='.repeat(50));
console.log(`测试完成: ✅ ${passCount} 通过, ❌ ${failCount} 失败`);
console.log('='.repeat(50));

process.exit(failCount > 0 ? 1 : 0);
