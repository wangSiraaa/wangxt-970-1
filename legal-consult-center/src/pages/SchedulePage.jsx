import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Table,
  Modal,
  Form,
  Select,
  Tag,
  Badge,
  Button,
  Card,
  Space,
  message,
  Descriptions,
  Popconfirm,
  DatePicker,
  Checkbox,
  Input,
} from 'antd';
import dayjs from 'dayjs';
import {
  getData,
  subscribe,
  addSchedule,
  deleteSchedule,
  addLeave,
  removeLeave,
  approveAddSlot,
  rejectAddSlot,
  nextId,
  TIME_SLOTS,
  LAWYERS,
  getEmergencyImpact,
  URGENCY_LEVELS,
  getLawyerName,
} from '../store/dataStore';

const LICENSE_MAP = { active: '正常执业', suspended: '暂停执业' };

const LAWYER_COLORS = [
  '#1677ff', '#52c41a', '#fa8c16', '#722ed1',
  '#eb2f96', '#13c2c2', '#f5222d', '#2f54eb',
];

export default function SchedulePage() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    return subscribe(() => setTick((t) => t + 1));
  }, []);
  const data = getData();

  const [selectedDate, setSelectedDate] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [addLeaveVisible, setAddLeaveVisible] = useState(false);
  const [filterLawyer, setFilterLawyer] = useState(null);
  const [calendarDate, setCalendarDate] = useState(dayjs());
  const [leaveForm] = Form.useForm();
  const [impactModalVisible, setImpactModalVisible] = useState(false);
  const [impactLawyerId, setImpactLawyerId] = useState(null);
  const [impactTimeSlot, setImpactTimeSlot] = useState(null);
  const [emergencyImpact, setEmergencyImpact] = useState(null);

  const lawyerMap = useMemo(() => {
    const m = {};
    LAWYERS.forEach((l) => (m[l.id] = l));
    return m;
  }, []);

  const leaveMap = useMemo(() => {
    const m = {};
    data.leaves
      .filter((l) => l.status === 'approved')
      .forEach((l) => {
        if (!m[l.date]) m[l.date] = {};
        if (!m[l.date][l.lawyerId]) m[l.date][l.lawyerId] = new Set();
        l.timeSlots.forEach((ts) => m[l.date][l.lawyerId].add(ts));
      });
    return m;
  }, [data.leaves]);

  const scheduleMap = useMemo(() => {
    const m = {};
    data.schedules.forEach((s) => {
      if (!m[s.date]) m[s.date] = [];
      m[s.date].push(s);
    });
    return m;
  }, [data.schedules]);

  const dateCellRender = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    const daySchedules = scheduleMap[dateStr] || [];
    const dayLeaves = leaveMap[dateStr] || {};

    const filtered = filterLawyer
      ? daySchedules.filter((s) => s.lawyerId === filterLawyer)
      : daySchedules;

    return (
      <div style={{ padding: '0 4px' }}>
        {filtered.map((sch) => {
          const lawyer = lawyerMap[sch.lawyerId];
          if (!lawyer) return null;
          const colorIdx = LAWYERS.findIndex((l) => l.id === sch.lawyerId) % LAWYER_COLORS.length;
          const hasLeave = dayLeaves[sch.lawyerId];
          const leaveSlotCount = hasLeave ? hasLeave.size : 0;
          const totalSlots = sch.timeSlots.length;
          const availableCount = totalSlots - leaveSlotCount;

          let status = 'processing';
          let statusText = '已排班';
          if (availableCount <= 0) {
            status = 'error';
            statusText = '已请假';
          } else if (availableCount === totalSlots) {
            status = 'success';
            statusText = '可预约';
          }

          return (
            <div key={sch.lawyerId} style={{ marginBottom: 2 }}>
              <Badge
                status={status}
                text={
                  <span style={{ fontSize: 11, color: LAWYER_COLORS[colorIdx] }}>
                    {lawyer.name}({statusText})
                  </span>
                }
              />
            </div>
          );
        })}
      </div>
    );
  };

  const onSelectDate = (value) => {
    setSelectedDate(value.format('YYYY-MM-DD'));
    setDetailVisible(true);
  };

  const dayDetails = useMemo(() => {
    if (!selectedDate) return { schedules: [], leaves: [] };
    const daySchedules = scheduleMap[selectedDate] || [];
    const dayLeaves = data.leaves.filter(
      (l) => l.date === selectedDate && l.status === 'approved'
    );
    const dayAppointments = data.appointments.filter(
      (a) => a.date === selectedDate && a.status !== 'cancelled'
    );
    const bookedMap = {};
    dayAppointments.forEach((a) => {
      const key = `${a.lawyerId}-${a.timeSlot}`;
      if (!bookedMap[key]) bookedMap[key] = 0;
      bookedMap[key]++;
    });
    return { schedules: daySchedules, leaves: dayLeaves, bookedMap };
  }, [selectedDate, scheduleMap, data.leaves, data.appointments]);

  const handleAddLeave = () => {
    leaveForm.validateFields().then((values) => {
      const lawyer = lawyerMap[values.lawyerId];
      const leave = {
        id: nextId('leave'),
        lawyerId: values.lawyerId,
        date: values.date.format('YYYY-MM-DD'),
        timeSlots: values.timeSlots,
        reason: values.reason,
        status: 'approved',
      };
      addLeave(leave);
      message.success(`已为律师 ${lawyer?.name} 添加请假记录`);
      leaveForm.resetFields();
      setAddLeaveVisible(false);
    });
  };

  const handleCancelLeave = (id) => {
    removeLeave(id);
    message.success('已撤销请假');
  };

  const handleViewEmergencyImpact = (lawyerId, timeSlot) => {
    const impact = getEmergencyImpact(selectedDate, timeSlot, lawyerId);
    setImpactLawyerId(lawyerId);
    setImpactTimeSlot(timeSlot);
    setEmergencyImpact(impact);
    setImpactModalVisible(true);
  };

  const leaveColumns = [
    {
      title: '律师',
      dataIndex: 'lawyerId',
      key: 'lawyer',
      render: (id) => lawyerMap[id]?.name || id,
    },
    { title: '日期', dataIndex: 'date', key: 'date' },
    {
      title: '请假时段',
      dataIndex: 'timeSlots',
      key: 'timeSlots',
      render: (slots) => slots.map((s) => <Tag key={s}>{s}</Tag>),
    },
    { title: '原因', dataIndex: 'reason', key: 'reason' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s) => {
        const map = { approved: '已批准', pending: '待审批', rejected: '已拒绝' };
        const colorMap = { approved: 'green', pending: 'orange', rejected: 'red' };
        return <Tag color={colorMap[s] || 'default'}>{map[s] || s}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="确认撤销此请假记录？"
          onConfirm={() => handleCancelLeave(record.id)}
          okText="确认"
          cancelText="取消"
        >
          <Button type="link" danger size="small">
            撤销
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const addSlotColumns = [
    {
      title: '律师',
      dataIndex: 'lawyerId',
      key: 'lawyer',
      render: (id) => lawyerMap[id]?.name || id,
    },
    { title: '日期', dataIndex: 'date', key: 'date' },
    { title: '时段', dataIndex: 'timeSlot', key: 'timeSlot' },
    { title: '原因', dataIndex: 'reason', key: 'reason' },
    { title: '申请人', dataIndex: 'requestedBy', key: 'requestedBy' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s) => {
        const map = { pending: '待审批', approved: '已批准', rejected: '已拒绝' };
        const colorMap = { pending: 'orange', approved: 'green', rejected: 'red' };
        return <Tag color={colorMap[s] || 'default'}>{map[s] || s}</Tag>;
      },
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) =>
        record.status !== 'pending' ? null : (
          <Space>
            <Popconfirm
              title="确认批准此加号申请？"
              onConfirm={() => {
                approveAddSlot(record.id);
                message.success('已批准加号');
              }}
              okText="确认"
              cancelText="取消"
            >
              <Button type="link" size="small">批准</Button>
            </Popconfirm>
            <Popconfirm
              title="确认拒绝此加号申请？"
              onConfirm={() => {
                rejectAddSlot(record.id);
                message.info('已拒绝加号');
              }}
              okText="确认"
              cancelText="取消"
            >
              <Button type="link" danger size="small">拒绝</Button>
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <div>
      <Card title="排班日历" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }} wrap>
          <span>筛选律师：</span>
          <Select
            allowClear
            placeholder="全部律师"
            style={{ width: 160 }}
            value={filterLawyer}
            onChange={(v) => setFilterLawyer(v || null)}
          >
            {LAWYERS.map((l) => (
              <Select.Option key={l.id} value={l.id}>
                {l.name}（{LICENSE_MAP[l.licenseStatus]}）
              </Select.Option>
            ))}
          </Select>
        </Space>
        <Calendar
          value={calendarDate}
          onChange={(v) => setCalendarDate(v)}
          onSelect={onSelectDate}
          cellRender={(current, info) => {
            if (info.type === 'date') return dateCellRender(current);
            return info.originNode;
          }}
        />
      </Card>

      <Modal
        title={`${selectedDate} 排班详情`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={720}
      >
        {dayDetails.schedules.length === 0 && dayDetails.leaves.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>
            当日无排班和请假记录
          </div>
        ) : (
          <>
            {dayDetails.schedules.map((sch) => {
              const lawyer = lawyerMap[sch.lawyerId];
              if (!lawyer) return null;
              const lawyerLeaves = dayDetails.leaves.filter(
                (l) => l.lawyerId === sch.lawyerId
              );
              const leaveSlots = new Set();
              lawyerLeaves.forEach((l) => l.timeSlots.forEach((ts) => leaveSlots.add(ts)));

              return (
                <Descriptions
                  key={sch.id}
                  title={
                    <Space>
                      <span>{lawyer.name}</span>
                      <Tag color={lawyer.licenseStatus === 'active' ? 'green' : 'red'}>
                        {LICENSE_MAP[lawyer.licenseStatus]}
                      </Tag>
                    </Space>
                  }
                  bordered
                  size="small"
                  column={1}
                  style={{ marginBottom: 16 }}
                >
                  <Descriptions.Item label="排班时段">
                    <Space wrap direction="vertical" style={{ width: '100%' }}>
                      {sch.timeSlots.map((ts) => {
                        const booked = dayDetails.bookedMap[`${sch.lawyerId}-${ts.key}`] || 0;
                        const isLeave = leaveSlots.has(ts.key);
                        return (
                          <div key={ts.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Tag
                              color={isLeave ? 'red' : booked >= ts.capacity ? 'default' : 'blue'}
                            >
                              {ts.key}{' '}
                              {isLeave
                                ? '(请假)'
                                : `${booked}/${ts.capacity}`}
                            </Tag>
                            {!isLeave && (
                              <Button
                                type="link"
                                size="small"
                                onClick={() => handleViewEmergencyImpact(sch.lawyerId, ts.key)}
                              >
                                查看插队影响
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </Space>
                  </Descriptions.Item>
                  {lawyerLeaves.length > 0 && (
                    <Descriptions.Item label="请假信息">
                      {lawyerLeaves.map((l) => (
                        <div key={l.id}>
                          <Tag color="red">请假</Tag>
                          时段: {l.timeSlots.join('、')} | 原因: {l.reason}
                        </div>
                      ))}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              );
            })}
            {dayDetails.leaves.filter(
              (l) => !dayDetails.schedules.some((s) => s.lawyerId === l.lawyerId)
            ).length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>其他请假记录：</div>
                {dayDetails.leaves
                  .filter((l) => !dayDetails.schedules.some((s) => s.lawyerId === l.lawyerId))
                  .map((l) => (
                    <div key={l.id} style={{ marginBottom: 4 }}>
                      <Tag color="red">请假</Tag>
                      {lawyerMap[l.lawyerId]?.name || l.lawyerId} — 时段: {l.timeSlots.join('、')} | 原因: {l.reason}
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </Modal>

      <Card
        title="请假管理"
        style={{ marginBottom: 16 }}
        extra={
          <Button type="primary" onClick={() => setAddLeaveVisible(true)}>
            新增请假
          </Button>
        }
      >
        <Table
          dataSource={data.leaves}
          columns={leaveColumns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 5 }}
        />
      </Card>

      <Modal
        title="新增请假"
        open={addLeaveVisible}
        onOk={handleAddLeave}
        onCancel={() => {
          leaveForm.resetFields();
          setAddLeaveVisible(false);
        }}
        okText="提交"
        cancelText="取消"
      >
        <Form form={leaveForm} layout="vertical">
          <Form.Item
            name="lawyerId"
            label="律师"
            rules={[{ required: true, message: '请选择律师' }]}
          >
            <Select placeholder="请选择律师">
              {LAWYERS.map((l) => (
                <Select.Option key={l.id} value={l.id}>
                  {l.name}（{LICENSE_MAP[l.licenseStatus]}）
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="date"
            label="请假日期"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="timeSlots"
            label="请假时段"
            rules={[{ required: true, message: '请选择时段' }]}
          >
            <Checkbox.Group>
              {TIME_SLOTS.map((ts) => (
                <Checkbox key={ts.key} value={ts.key}>
                  {ts.label}
                </Checkbox>
              ))}
            </Checkbox.Group>
          </Form.Item>
          <Form.Item
            name="reason"
            label="请假原因"
            rules={[{ required: true, message: '请输入原因' }]}
          >
            <Input placeholder="请输入请假原因" />
          </Form.Item>
        </Form>
      </Modal>

      <Card title="加号审批">
        <Table
          dataSource={data.addSlotRequests}
          columns={addSlotColumns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 5 }}
        />
      </Card>

      <Modal
        title="紧急援助插队影响分析"
        open={impactModalVisible}
        onCancel={() => setImpactModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setImpactModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {emergencyImpact && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="律师">
                {getLawyerName(impactLawyerId)}
              </Descriptions.Item>
              <Descriptions.Item label="插队时段">
                {impactTimeSlot}
              </Descriptions.Item>
              <Descriptions.Item label="受影响预约数">
                <Tag color="orange" style={{ fontWeight: 'bold' }}>
                  {emergencyImpact.affectedCount} 个
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="是否需顺延">
                <Tag color={emergencyImpact.needsPostpone ? 'red' : 'green'}>
                  {emergencyImpact.needsPostpone ? '是' : '否'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="最后受影响时段" span={2}>
                {emergencyImpact.lastAffectedSlot || '无'}
              </Descriptions.Item>
            </Descriptions>

            {emergencyImpact.needsPostpone && (
              <Alert
                type="warning"
                message="容量不足提示"
                description={emergencyImpact.postponeReason}
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {emergencyImpact.affectedAppointments.length > 0 ? (
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                  受影响预约列表：
                </div>
                <Table
                  dataSource={emergencyImpact.affectedAppointments}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: '预约编号',
                      dataIndex: 'id',
                      key: 'id',
                      width: 100,
                    },
                    {
                      title: '群众姓名',
                      dataIndex: 'citizenName',
                      key: 'citizenName',
                    },
                    {
                      title: '原时段',
                      dataIndex: 'timeSlot',
                      key: 'timeSlot',
                      width: 100,
                    },
                    {
                      title: '案件类型',
                      dataIndex: 'caseType',
                      key: 'caseType',
                      render: (ct) => {
                        const CASE_TYPES = [
                          { id: 'civil', name: '民事' },
                          { id: 'criminal', name: '刑事' },
                          { id: 'administrative', name: '行政' },
                          { id: 'labor', name: '劳动争议' },
                          { id: 'family', name: '婚姻家庭' },
                          { id: 'contract', name: '合同纠纷' },
                          { id: 'traffic', name: '交通事故' },
                        ];
                        return CASE_TYPES.find((t) => t.id === ct)?.name || ct;
                      },
                    },
                    {
                      title: '紧急程度',
                      dataIndex: 'urgency',
                      key: 'urgency',
                      width: 90,
                      render: (u) => {
                        const level = URGENCY_LEVELS.find((l) => l.id === u);
                        return level ? <Tag color={level.color}>{level.name}</Tag> : '-';
                      },
                    },
                    {
                      title: '顺延至',
                      dataIndex: 'postponedTo',
                      key: 'postponedTo',
                      width: 100,
                      render: (p) => p || <Tag color="green">无需顺延</Tag>,
                    },
                  ]}
                />
              </div>
            ) : (
              <Alert
                type="success"
                message="无受影响预约"
                description="该时段容量充足，紧急援助插队不会影响其他预约"
                showIcon
              />
            )}

            <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                💡 插队处理建议
              </div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {emergencyImpact.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
