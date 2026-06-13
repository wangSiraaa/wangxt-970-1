import React, { useState, useEffect, useMemo } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Checkbox,
  Button,
  Card,
  Table,
  Tag,
  Modal,
  Alert,
  Steps,
  Result,
  Space,
  message,
  Tooltip,
  Descriptions,
  Popconfirm,
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  FileProtectOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getData,
  subscribe,
  getAvailableSlots,
  createAppointment,
  checkInterestConflict,
  validateBooking,
  addWaitlistEntry,
  cancelAppointment,
  CASE_TYPES,
  MATERIALS,
  TIME_SLOTS,
  LAWYERS,
} from '../store/dataStore';

const STATUS_MAP = {
  confirmed: { text: '已确认', color: 'green' },
  pending_materials: { text: '待补正', color: 'gold' },
  checked_in: { text: '已签到', color: 'blue' },
  cancelled: { text: '已取消', color: 'default' },
  no_show: { text: '爽约', color: 'red' },
  reallocated: { text: '已改派', color: 'purple' },
};

const HARD_RULES = ['律师请假', '专业匹配', '群众当日预约上限', '时段容量', '执业证状态', '排班不存在', '时段不存在'];

function specialtyNames(specialties) {
  return specialties
    .map((sid) => CASE_TYPES.find((c) => c.id === sid)?.name || sid)
    .join('、');
}

export default function BookingPage() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    return subscribe(() => setTick((t) => t + 1));
  }, []);
  const data = getData();

  const lawyerMap = useMemo(() => {
    const m = {};
    LAWYERS.forEach((l) => (m[l.id] = l));
    return m;
  }, []);

  const [currentStep, setCurrentStep] = useState(0);
  const [caseType, setCaseType] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [citizenName, setCitizenName] = useState('');
  const [citizenIdCard, setCitizenIdCard] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [checkedMaterials, setCheckedMaterials] = useState([]);
  const [validationResults, setValidationResults] = useState(null);
  const [conflictResults, setConflictResults] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const [conflictConfirmed, setConflictConfirmed] = useState(false);
  const [materialAlertDismissed, setMaterialAlertDismissed] = useState(false);

  const [myIdCard, setMyIdCard] = useState('');
  const [myAppointments, setMyAppointments] = useState([]);
  const [mySearched, setMySearched] = useState(false);

  const [waitlistSlot, setWaitlistSlot] = useState(null);
  const [waitlistVisible, setWaitlistVisible] = useState(false);

  const dateStr = selectedDate ? selectedDate.format('YYYY-MM-DD') : null;

  const availableSlots = useMemo(() => {
    if (!dateStr || !caseType) return [];
    return getAvailableSlots(dateStr, caseType);
  }, [dateStr, caseType, tick]);

  const currentCaseType = useMemo(
    () => CASE_TYPES.find((c) => c.id === caseType),
    [caseType]
  );

  const requiredMaterials = useMemo(() => {
    if (!currentCaseType) return [];
    return currentCaseType.requiredMaterialIds
      .map((mId) => MATERIALS.find((m) => m.id === mId))
      .filter(Boolean);
  }, [currentCaseType]);

  const slotColumns = [
    {
      title: '律师姓名',
      dataIndex: 'lawyerName',
      key: 'lawyerName',
    },
    {
      title: '时段',
      dataIndex: 'timeSlot',
      key: 'timeSlot',
    },
    {
      title: '剩余名额',
      dataIndex: 'remaining',
      key: 'remaining',
      render: (v) => (
        <Tag color={v > 0 ? 'blue' : 'default'}>{v}</Tag>
      ),
    },
    {
      title: '专业方向',
      dataIndex: 'specialties',
      key: 'specialties',
      render: (sps) => specialtyNames(sps),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) =>
        record.remaining > 0 ? (
          <Button
            type="primary"
            size="small"
            onClick={() => handleSelectSlot(record)}
          >
            预约
          </Button>
        ) : (
          <Button size="small" onClick={() => handleJoinWaitlist(record)}>
            加入候补
          </Button>
        ),
    },
  ];

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setCheckedMaterials([]);
    setValidationResults(null);
    setConflictResults(null);
    setConflictConfirmed(false);
    setMaterialAlertDismissed(false);
    setCurrentStep(2);
  };

  const handleJoinWaitlist = (slot) => {
    setWaitlistSlot(slot);
    setWaitlistVisible(true);
  };

  const canGoStep1 = caseType && selectedDate;

  const handleStep1Next = () => {
    if (canGoStep1) {
      setCurrentStep(1);
    }
  };

  const handleStep2Back = () => {
    setCurrentStep(0);
    setSelectedSlot(null);
  };

  const handleStep3Next = () => {
    if (!citizenName.trim()) {
      message.warning('请输入姓名');
      return;
    }
    if (!citizenIdCard.trim()) {
      message.warning('请输入身份证号');
      return;
    }
    if (!citizenPhone.trim()) {
      message.warning('请输入联系电话');
      return;
    }
    setCurrentStep(3);
  };

  const handleStep3Back = () => {
    setCurrentStep(1);
  };

  const handleStep4Next = () => {
    setCurrentStep(4);
    runValidation();
  };

  const handleStep4Back = () => {
    setCurrentStep(2);
  };

  const runValidation = () => {
    const booking = {
      lawyerId: selectedSlot.lawyerId,
      date: dateStr,
      timeSlot: selectedSlot.timeSlot,
      caseType,
      citizenName: citizenName.trim(),
      citizenIdCard: citizenIdCard.trim(),
      citizenPhone: citizenPhone.trim(),
      materials: checkedMaterials,
    };
    const errors = validateBooking(booking);
    const conflicts = checkInterestConflict(
      booking.citizenIdCard,
      booking.lawyerId,
      booking.caseType
    );
    setValidationResults(errors);
    setConflictResults(conflicts);
    setConflictConfirmed(false);
    setMaterialAlertDismissed(false);
  };

  const hardErrors = useMemo(() => {
    if (!validationResults) return [];
    return validationResults.filter((e) => HARD_RULES.includes(e.rule));
  }, [validationResults]);

  const materialWarnings = useMemo(() => {
    if (!validationResults) return [];
    return validationResults.filter((e) => e.rule === '材料齐全');
  }, [validationResults]);

  const canSubmit = useMemo(() => {
    if (hardErrors.length > 0) return false;
    if (conflictResults && conflictResults.length > 0 && !conflictConfirmed) return false;
    if (materialWarnings.length > 0 && !materialAlertDismissed) return false;
    return true;
  }, [hardErrors, conflictResults, conflictConfirmed, materialWarnings, materialAlertDismissed]);

  const handleSubmit = () => {
    const booking = {
      lawyerId: selectedSlot.lawyerId,
      date: dateStr,
      timeSlot: selectedSlot.timeSlot,
      caseType,
      citizenName: citizenName.trim(),
      citizenIdCard: citizenIdCard.trim(),
      citizenPhone: citizenPhone.trim(),
      materials: checkedMaterials,
    };
    const result = createAppointment(booking);
    if (result.success) {
      setBookingResult(result.appointment);
      setCurrentStep(5);
      message.success('预约成功！');
    } else {
      const hardList = result.errors.filter((e) => HARD_RULES.includes(e.rule));
      if (hardList.length > 0) {
        setValidationResults(result.errors);
        setConflictResults(result.conflicts);
        message.error('预约失败，请检查校验结果');
      }
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setCaseType(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setCitizenName('');
    setCitizenIdCard('');
    setCitizenPhone('');
    setCheckedMaterials([]);
    setValidationResults(null);
    setConflictResults(null);
    setBookingResult(null);
    setConflictConfirmed(false);
    setMaterialAlertDismissed(false);
  };

  const handleSearchMyAppointments = () => {
    if (!myIdCard.trim()) {
      message.warning('请输入身份证号');
      return;
    }
    const apts = data.appointments.filter(
      (a) => a.citizenIdCard === myIdCard.trim()
    );
    setMyAppointments(apts);
    setMySearched(true);
  };

  const handleCancelAppointment = (id) => {
    cancelAppointment(id);
    message.success('预约已取消');
    const apts = data.appointments.filter(
      (a) => a.citizenIdCard === myIdCard.trim()
    );
    setMyAppointments(apts);
  };

  const handleWaitlistSubmit = (values) => {
    addWaitlistEntry({
      citizenName: values.citizenName,
      citizenIdCard: values.citizenIdCard,
      lawyerId: waitlistSlot.lawyerId,
      date: dateStr,
      timeSlot: waitlistSlot.timeSlot,
      caseType,
      materials: values.materials || [],
    });
    message.success('已加入候补列表');
    setWaitlistVisible(false);
  };

  const myAppointmentColumns = [
    {
      title: '律师',
      dataIndex: 'lawyerId',
      key: 'lawyer',
      render: (id) => lawyerMap[id]?.name || id,
    },
    { title: '日期', dataIndex: 'date', key: 'date' },
    { title: '时段', dataIndex: 'timeSlot', key: 'timeSlot' },
    {
      title: '案件类型',
      dataIndex: 'caseType',
      key: 'caseType',
      render: (ct) => CASE_TYPES.find((c) => c.id === ct)?.name || ct,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s) => {
        const info = STATUS_MAP[s] || { text: s, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) =>
        record.status === 'confirmed' ? (
          <Popconfirm
            title="确认取消此预约？"
            onConfirm={() => handleCancelAppointment(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" danger size="small">
              取消预约
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  const stepItems = [
    { title: '选择类型与日期' },
    { title: '选择时段' },
    { title: '填写信息' },
    { title: '材料确认' },
    { title: '校验提交' },
  ];

  const renderStepContent = () => {
    if (bookingResult) {
      return (
        <Result
          status="success"
          title="预约成功"
          subTitle={`您的预约编号: ${bookingResult.id}`}
          extra={[
            <Button type="primary" key="again" onClick={handleReset}>
              继续预约
            </Button>,
          ]}
        >
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="预约编号">{bookingResult.id}</Descriptions.Item>
            <Descriptions.Item label="姓名">{bookingResult.citizenName}</Descriptions.Item>
            <Descriptions.Item label="律师">
              {lawyerMap[bookingResult.lawyerId]?.name || bookingResult.lawyerId}
            </Descriptions.Item>
            <Descriptions.Item label="日期">{bookingResult.date}</Descriptions.Item>
            <Descriptions.Item label="时段">{bookingResult.timeSlot}</Descriptions.Item>
            <Descriptions.Item label="案件类型">
              {CASE_TYPES.find((c) => c.id === bookingResult.caseType)?.name || bookingResult.caseType}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={STATUS_MAP[bookingResult.status]?.color || 'default'}>
                {STATUS_MAP[bookingResult.status]?.text || bookingResult.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="已备材料">
              {bookingResult.materials
                .map((mId) => MATERIALS.find((m) => m.id === mId)?.name || mId)
                .join('、') || '无'}
            </Descriptions.Item>
            {bookingResult.conflictWarnings && bookingResult.conflictWarnings.length > 0 && (
              <Descriptions.Item label="冲突提示">
                {bookingResult.conflictWarnings.map((cw, i) => (
                  <Alert
                    key={i}
                    type="warning"
                    message={cw.description}
                    showIcon
                    style={{ marginBottom: 4 }}
                  />
                ))}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Result>
      );
    }

    switch (currentStep) {
      case 0:
        return (
          <Card title="选择案件类型与日期">
            <Form layout="vertical">
              <Form.Item label="案件类型" required>
                <Select
                  placeholder="请选择案件类型"
                  value={caseType}
                  onChange={(v) => {
                    setCaseType(v);
                    setSelectedSlot(null);
                  }}
                  style={{ width: '100%' }}
                >
                  {CASE_TYPES.map((ct) => (
                    <Select.Option key={ct.id} value={ct.id}>
                      {ct.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item label="预约日期" required>
                <DatePicker
                  style={{ width: '100%' }}
                  value={selectedDate}
                  onChange={(d) => {
                    setSelectedDate(d);
                    setSelectedSlot(null);
                  }}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                  placeholder="请选择预约日期"
                />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  disabled={!canGoStep1}
                  onClick={handleStep1Next}
                >
                  下一步：查看可用时段
                </Button>
              </Form.Item>
            </Form>
          </Card>
        );

      case 1:
        return (
          <Card
            title={`可用时段 — ${currentCaseType?.name || ''} ${dateStr || ''}`}
            extra={
              <Button onClick={handleStep2Back}>返回上一步</Button>
            }
          >
            {availableSlots.length === 0 ? (
              <Alert
                type="info"
                message="暂无可用时段"
                description="所选日期和案件类型没有可用时段，请更换日期或案件类型"
                showIcon
              />
            ) : (
              <Table
                dataSource={availableSlots}
                columns={slotColumns}
                rowKey={(r) => `${r.lawyerId}-${r.timeSlot}`}
                size="small"
                pagination={false}
              />
            )}
          </Card>
        );

      case 2:
        return (
          <Card
            title="填写群众信息"
            extra={
              <Button onClick={handleStep3Back}>返回选择时段</Button>
            }
          >
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="律师">{selectedSlot?.lawyerName}</Descriptions.Item>
              <Descriptions.Item label="时段">{selectedSlot?.timeSlot}</Descriptions.Item>
              <Descriptions.Item label="日期">{dateStr}</Descriptions.Item>
              <Descriptions.Item label="案件类型">{currentCaseType?.name}</Descriptions.Item>
            </Descriptions>
            <Form layout="vertical">
              <Form.Item label="姓名" required>
                <Input
                  prefix={<UserOutlined />}
                  placeholder="请输入姓名"
                  value={citizenName}
                  onChange={(e) => setCitizenName(e.target.value)}
                  maxLength={20}
                />
              </Form.Item>
              <Form.Item label="身份证号" required>
                <Input
                  placeholder="请输入身份证号"
                  value={citizenIdCard}
                  onChange={(e) => setCitizenIdCard(e.target.value)}
                  maxLength={18}
                />
              </Form.Item>
              <Form.Item label="联系电话" required>
                <Input
                  placeholder="请输入联系电话"
                  value={citizenPhone}
                  onChange={(e) => setCitizenPhone(e.target.value)}
                  maxLength={11}
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" onClick={handleStep3Next}>
                  下一步：材料确认
                </Button>
              </Form.Item>
            </Form>
          </Card>
        );

      case 3:
        return (
          <Card
            title="材料清单确认"
            extra={
              <Button onClick={handleStep4Back}>返回填写信息</Button>
            }
          >
            <Alert
              type="info"
              message="请勾选您已准备好的材料"
              description="材料不全也可先预约，到场后补正即可"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Checkbox.Group
              value={checkedMaterials}
              onChange={(vals) => setCheckedMaterials(vals)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {requiredMaterials.map((mat) => (
                  <Checkbox key={mat.id} value={mat.id}>
                    <Tooltip title={`必要材料：${mat.name}`}>
                      <span>
                        <FileProtectOutlined style={{ marginRight: 4, color: '#faad14' }} />
                        {mat.name}
                      </span>
                    </Tooltip>
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
            {checkedMaterials.length < requiredMaterials.length && (
              <Alert
                type="warning"
                message="材料未齐"
                description={`还需准备: ${requiredMaterials
                  .filter((m) => !checkedMaterials.includes(m.id))
                  .map((m) => m.name)
                  .join('、')}`}
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
            <div style={{ marginTop: 16 }}>
              <Button type="primary" onClick={handleStep4Next}>
                下一步：校验并提交
              </Button>
            </div>
          </Card>
        );

      case 4:
        return (
          <Card
            title="预约校验与提交"
            extra={
              <Button onClick={handleStep4Back}>返回材料确认</Button>
            }
          >
            {validationResults === null && (
              <Alert type="info" message="正在校验…" showIcon />
            )}

            {hardErrors.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {hardErrors.map((err, i) => (
                  <Alert
                    key={i}
                    type="error"
                    message={`【硬拦截】${err.rule}`}
                    description={err.message}
                    showIcon
                    style={{ marginBottom: 8 }}
                  />
                ))}
              </div>
            )}

            {conflictResults && conflictResults.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {conflictResults.map((conflict, i) => (
                  <Alert
                    key={i}
                    type="warning"
                    message={`【冲突提示】${conflict.type}`}
                    description={conflict.description}
                    showIcon
                    style={{ marginBottom: 8 }}
                    action={
                      !conflictConfirmed && (
                        <Button
                          size="small"
                          type="primary"
                          danger
                          onClick={() => setConflictConfirmed(true)}
                        >
                          确认知悉，继续预约
                        </Button>
                      )
                    }
                  />
                ))}
                {conflictConfirmed && (
                  <Alert
                    type="success"
                    message="已确认冲突提示"
                    showIcon
                    style={{ marginBottom: 8 }}
                  />
                )}
              </div>
            )}

            {materialWarnings.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                {materialWarnings.map((w, i) => (
                  <Alert
                    key={i}
                    type="warning"
                    message={`【软提示】${w.rule}`}
                    description={`${w.message}（预约状态将为"待补正"）`}
                    showIcon
                    style={{ marginBottom: 8 }}
                    action={
                      !materialAlertDismissed && (
                        <Button
                          size="small"
                          onClick={() => setMaterialAlertDismissed(true)}
                        >
                          知悉，继续预约
                        </Button>
                      )
                    }
                  />
                ))}
                {materialAlertDismissed && (
                  <Alert
                    type="success"
                    message={'已确认材料提示，预约状态将为「待补正」'}
                    showIcon
                    style={{ marginBottom: 8 }}
                  />
                )}
              </div>
            )}

            {validationResults && hardErrors.length === 0 && conflictResults?.length === 0 && materialWarnings.length === 0 && (
              <Alert
                type="success"
                message="校验通过"
                description="所有校验项均通过，可以提交预约"
                showIcon
                style={{ marginBottom: 12 }}
              />
            )}

            {validationResults && (
              <div style={{ marginTop: 16 }}>
                <Space>
                  <Button
                    type="primary"
                    disabled={!canSubmit}
                    onClick={handleSubmit}
                    icon={<CheckCircleOutlined />}
                  >
                    确认提交预约
                  </Button>
                  {hardErrors.length > 0 && (
                    <Button onClick={handleReset}>重新预约</Button>
                  )}
                </Space>
              </div>
            )}

            <Descriptions
              bordered
              size="small"
              column={2}
              style={{ marginTop: 16 }}
              title="预约信息摘要"
            >
              <Descriptions.Item label="姓名">{citizenName}</Descriptions.Item>
              <Descriptions.Item label="身份证号">{citizenIdCard}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{citizenPhone}</Descriptions.Item>
              <Descriptions.Item label="案件类型">{currentCaseType?.name}</Descriptions.Item>
              <Descriptions.Item label="律师">{selectedSlot?.lawyerName}</Descriptions.Item>
              <Descriptions.Item label="日期">{dateStr}</Descriptions.Item>
              <Descriptions.Item label="时段">{selectedSlot?.timeSlot}</Descriptions.Item>
              <Descriptions.Item label="已备材料">
                {checkedMaterials.length > 0
                  ? checkedMaterials
                      .map((mId) => MATERIALS.find((m) => m.id === mId)?.name || mId)
                      .join('、')
                  : '无'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {currentStep < 5 && (
          <Steps
            current={currentStep}
            items={stepItems}
            style={{ marginBottom: 24 }}
            size="small"
          />
        )}
        {renderStepContent()}
      </div>

      <div style={{ width: 380, flexShrink: 0 }}>
        <Card title="我的预约" size="small" style={{ marginBottom: 16 }}>
          <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
            <Input
              placeholder="输入身份证号查询"
              value={myIdCard}
              onChange={(e) => setMyIdCard(e.target.value)}
              onPressEnter={handleSearchMyAppointments}
              maxLength={18}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearchMyAppointments}
            >
              查询
            </Button>
          </Space.Compact>
          {mySearched && (
            <Table
              dataSource={myAppointments}
              columns={myAppointmentColumns}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ y: 300 }}
              locale={{ emptyText: '暂无预约记录' }}
            />
          )}
        </Card>

        <Card title="预约规则说明" size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              type="error"
              message="硬拦截"
              description="律师请假、专业不匹配、当日预约上限、时段满员"
              showIcon
              style={{ marginBottom: 4 }}
            />
            <Alert
              type="warning"
              message="冲突提示"
              description="利益冲突、回避关系，确认后可继续"
              showIcon
              style={{ marginBottom: 4 }}
            />
            <Alert
              type="info"
              message="软提示"
              description={'材料不全可先预约，状态为「待补正」'}
              showIcon
            />
          </Space>
        </Card>
      </div>

      <Modal
        title="加入候补"
        open={waitlistVisible}
        onCancel={() => setWaitlistVisible(false)}
        footer={null}
        width={480}
      >
        {waitlistSlot && (
          <>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="律师">{waitlistSlot.lawyerName}</Descriptions.Item>
              <Descriptions.Item label="日期">{dateStr}</Descriptions.Item>
              <Descriptions.Item label="时段">{waitlistSlot.timeSlot}</Descriptions.Item>
              <Descriptions.Item label="案件类型">{currentCaseType?.name}</Descriptions.Item>
            </Descriptions>
            <Alert
              type="info"
              message="该时段已满，加入候补后，有预约取消时系统将自动为您安排"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Form
              layout="vertical"
              onFinish={handleWaitlistSubmit}
              initialValues={{ materials: [] }}
            >
              <Form.Item
                name="citizenName"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" maxLength={20} />
              </Form.Item>
              <Form.Item
                name="citizenIdCard"
                label="身份证号"
                rules={[{ required: true, message: '请输入身份证号' }]}
              >
                <Input placeholder="请输入身份证号" maxLength={18} />
              </Form.Item>
              <Form.Item name="materials" label="已备材料">
                <Checkbox.Group>
                  <Space direction="vertical">
                    {requiredMaterials.map((mat) => (
                      <Checkbox key={mat.id} value={mat.id}>
                        {mat.name}
                      </Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    确认加入候补
                  </Button>
                  <Button onClick={() => setWaitlistVisible(false)}>取消</Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}
