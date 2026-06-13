import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tabs,
  Badge,
  message,
  Popconfirm,
  Descriptions,
  Alert,
  Statistic,
  Row,
  Col,
  Checkbox,
  DatePicker,
} from 'antd';
import dayjs from 'dayjs';
import {
  getData,
  subscribe,
  checkInAppointment,
  markNoShow,
  createEmergencyAid,
  createAddSlotRequest,
  promoteWaitlist,
  updateAppointmentMaterials,
  LAWYERS,
  CASE_TYPES,
  MATERIALS,
  TIME_SLOTS,
} from '../store/dataStore';

const STATUS_MAP = {
  confirmed: { text: '已确认', color: 'green' },
  pending_materials: { text: '待补正', color: 'gold' },
  checked_in: { text: '已签到', color: 'blue' },
  no_show: { text: '爽约', color: 'red' },
  cancelled: { text: '已取消', color: 'default' },
  reallocated: { text: '已改派', color: 'purple' },
};

export default function OnSitePage() {
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

  const [filterDate, setFilterDate] = useState(dayjs());
  const [materialModalVisible, setMaterialModalVisible] = useState(false);
  const [currentApt, setCurrentApt] = useState(null);
  const [checkedMats, setCheckedMats] = useState([]);
  const [emergencyForm] = Form.useForm();
  const [addSlotForm] = Form.useForm();

  const dateStr = filterDate ? filterDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');

  const dayAppointments = useMemo(
    () => data.appointments.filter((a) => a.date === dateStr),
    [data.appointments, dateStr, tick]
  );

  const stats = useMemo(() => {
    const total = dayAppointments.filter((a) => a.status !== 'cancelled').length;
    const checkedIn = dayAppointments.filter((a) => a.status === 'checked_in').length;
    const pending = dayAppointments.filter((a) => a.status === 'confirmed' || a.status === 'pending_materials').length;
    const noShow = dayAppointments.filter((a) => a.status === 'no_show').length;
    return { total, checkedIn, pending, noShow };
  }, [dayAppointments]);

  const dayWaitlist = useMemo(
    () => data.waitlist.filter((w) => w.date === dateStr),
    [data.waitlist, dateStr, tick]
  );

  const handleCheckIn = (id) => {
    checkInAppointment(id);
    message.success('签到成功');
  };

  const handleNoShow = (id) => {
    markNoShow(id);
    message.info('已标记为爽约');
  };

  const openMaterialModal = (apt) => {
    setCurrentApt(apt);
    setCheckedMats(apt.materials || []);
    setMaterialModalVisible(true);
  };

  const handleMaterialSubmit = () => {
    if (!currentApt) return;
    updateAppointmentMaterials(currentApt.id, checkedMats);
    message.success('材料已更新');
    setMaterialModalVisible(false);
    setCurrentApt(null);
  };

  const handlePromoteWaitlist = (entry) => {
    const schedule = data.schedules.find(
      (s) => s.lawyerId === entry.lawyerId && s.date === entry.date
    );
    if (!schedule) {
      message.warning('该律师当日无排班，无法转正');
      return;
    }
    const ts = schedule.timeSlots.find((t) => t.key === entry.timeSlot);
    if (!ts) {
      message.warning('该时段不在排班内，无法转正');
      return;
    }
    const booked = data.appointments.filter(
      (a) =>
        a.lawyerId === entry.lawyerId &&
        a.date === entry.date &&
        a.timeSlot === entry.timeSlot &&
        a.status !== 'cancelled'
    ).length;
    if (booked >= ts.capacity) {
      message.warning('该时段已满，无法转正');
      return;
    }
    const result = promoteWaitlist(entry.date, entry.lawyerId, entry.timeSlot);
    if (result) {
      message.success('候补已转正');
    } else {
      message.warning('转正失败');
    }
  };

  const handleEmergencySubmit = (values) => {
    createEmergencyAid({
      citizenName: values.citizenName,
      citizenIdCard: values.citizenIdCard,
      lawyerId: values.lawyerId,
      date: values.date.format('YYYY-MM-DD'),
      timeSlot: values.timeSlot,
      caseType: values.caseType,
      reason: values.reason,
      materials: [],
    });
    message.success('紧急法律援助已创建');
    emergencyForm.resetFields();
  };

  const handleAddSlotSubmit = (values) => {
    createAddSlotRequest({
      lawyerId: values.lawyerId,
      date: values.date.format('YYYY-MM-DD'),
      timeSlot: values.timeSlot,
      reason: values.reason,
      requestedBy: '现场工作人员',
    });
    message.success('加号申请已提交，请等待审批');
    addSlotForm.resetFields();
  };

  const appointmentColumns = [
    {
      title: '预约编号',
      dataIndex: 'id',
      key: 'id',
      width: 120,
    },
    {
      title: '群众姓名',
      dataIndex: 'citizenName',
      key: 'citizenName',
      width: 100,
    },
    {
      title: '律师',
      dataIndex: 'lawyerId',
      key: 'lawyer',
      width: 80,
      render: (id) => lawyerMap[id]?.name || id,
    },
    {
      title: '时段',
      dataIndex: 'timeSlot',
      key: 'timeSlot',
      width: 120,
    },
    {
      title: '案件类型',
      dataIndex: 'caseType',
      key: 'caseType',
      width: 100,
      render: (ct) => CASE_TYPES.find((c) => c.id === ct)?.name || ct,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (s) => {
        const info = STATUS_MAP[s] || { text: s, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => {
        if (record.status === 'confirmed') {
          return (
            <Space size="small">
              <Popconfirm
                title="确认签到？"
                onConfirm={() => handleCheckIn(record.id)}
                okText="确认"
                cancelText="取消"
              >
                <Button type="primary" size="small">签到</Button>
              </Popconfirm>
              <Popconfirm
                title="确认标记为爽约？"
                onConfirm={() => handleNoShow(record.id)}
                okText="确认"
                cancelText="取消"
              >
                <Button danger size="small">爽约</Button>
              </Popconfirm>
            </Space>
          );
        }
        if (record.status === 'pending_materials') {
          return (
            <Space size="small">
              <Button size="small" onClick={() => openMaterialModal(record)}>
                补正材料
              </Button>
              <Popconfirm
                title="确认签到？"
                onConfirm={() => handleCheckIn(record.id)}
                okText="确认"
                cancelText="取消"
              >
                <Button type="primary" size="small">签到</Button>
              </Popconfirm>
            </Space>
          );
        }
        return null;
      },
    },
  ];

  const waitlistColumns = [
    {
      title: '序号',
      key: 'position',
      width: 60,
      render: (_, record, index) => {
        const waiting = dayWaitlist
          .filter((w) => w.status === 'waiting' && w.lawyerId === record.lawyerId && w.timeSlot === record.timeSlot)
          .sort((a, b) => a.position - b.position);
        const pos = waiting.findIndex((w) => w.id === record.id);
        return record.status === 'waiting' ? pos + 1 : '-';
      },
    },
    {
      title: '群众姓名',
      dataIndex: 'citizenName',
      key: 'citizenName',
      width: 100,
    },
    {
      title: '律师',
      dataIndex: 'lawyerId',
      key: 'lawyer',
      width: 80,
      render: (id) => lawyerMap[id]?.name || id,
    },
    {
      title: '时段',
      dataIndex: 'timeSlot',
      key: 'timeSlot',
      width: 120,
    },
    {
      title: '案件类型',
      dataIndex: 'caseType',
      key: 'caseType',
      width: 100,
      render: (ct) => CASE_TYPES.find((c) => c.id === ct)?.name || ct,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s) => {
        if (s === 'waiting') return <Tag color="orange">等待中</Tag>;
        if (s === 'promoted') return <Tag color="green">已转正</Tag>;
        return <Tag>{s}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => {
        if (record.status !== 'waiting') return null;
        return (
          <Popconfirm
            title="确认将此候补转正？需确认该时段有空余名额。"
            onConfirm={() => handlePromoteWaitlist(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="primary" size="small">转正</Button>
          </Popconfirm>
        );
      },
    },
  ];

  const currentAptRequiredMaterials = useMemo(() => {
    if (!currentApt) return [];
    const ct = CASE_TYPES.find((c) => c.id === currentApt.caseType);
    if (!ct) return [];
    return ct.requiredMaterialIds
      .map((mId) => MATERIALS.find((m) => m.id === mId))
      .filter(Boolean);
  }, [currentApt]);

  const tabItems = [
    {
      key: 'checkin',
      label: '预约签到',
      children: (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic title="今日预约数" value={stats.total} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="已签到"
                  value={stats.checkedIn}
                  valueStyle={{ color: '#1677ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="待签到"
                  value={stats.pending}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="爽约"
                  value={stats.noShow}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
          </Row>

          <Space style={{ marginBottom: 16 }}>
            <span>筛选日期：</span>
            <DatePicker
              value={filterDate}
              onChange={(d) => setFilterDate(d || dayjs())}
              allowClear={false}
            />
          </Space>

          <Table
            dataSource={dayAppointments}
            columns={appointmentColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: '当日暂无预约' }}
          />
        </>
      ),
    },
    {
      key: 'waitlist',
      label: (
        <Space>
          候补队列
          <Badge
            count={dayWaitlist.filter((w) => w.status === 'waiting').length}
            size="small"
          />
        </Space>
      ),
      children: (
        <>
          <Space style={{ marginBottom: 16 }}>
            <span>筛选日期：</span>
            <DatePicker
              value={filterDate}
              onChange={(d) => setFilterDate(d || dayjs())}
              allowClear={false}
            />
          </Space>
          <Table
            dataSource={dayWaitlist}
            columns={waitlistColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: '当日暂无候补' }}
          />
        </>
      ),
    },
    {
      key: 'emergency',
      label: '紧急法律援助',
      children: (
        <>
          <Alert
            type="warning"
            message="紧急法律援助将直接创建已确认的预约，无需审批"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Card title="创建紧急法律援助">
            <Form
              form={emergencyForm}
              layout="vertical"
              onFinish={handleEmergencySubmit}
              initialValues={{ timeSlot: TIME_SLOTS[0]?.key }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="citizenName"
                    label="群众姓名"
                    rules={[{ required: true, message: '请输入姓名' }]}
                  >
                    <Input placeholder="请输入群众姓名" maxLength={20} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="citizenIdCard"
                    label="身份证号"
                    rules={[{ required: true, message: '请输入身份证号' }]}
                  >
                    <Input placeholder="请输入身份证号" maxLength={18} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="phone"
                    label="联系电话"
                    rules={[{ required: true, message: '请输入联系电话' }]}
                  >
                    <Input placeholder="请输入联系电话" maxLength={11} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="caseType"
                    label="案件类型"
                    rules={[{ required: true, message: '请选择案件类型' }]}
                  >
                    <Select placeholder="请选择案件类型">
                      {CASE_TYPES.map((ct) => (
                        <Select.Option key={ct.id} value={ct.id}>
                          {ct.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="lawyerId"
                    label="指派律师"
                    rules={[{ required: true, message: '请选择律师' }]}
                  >
                    <Select placeholder="请选择律师" showSearch optionFilterProp="children">
                      {LAWYERS.filter((l) => l.licenseStatus === 'active').map((l) => (
                        <Select.Option key={l.id} value={l.id}>
                          {l.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="date"
                    label="日期"
                    rules={[{ required: true, message: '请选择日期' }]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="timeSlot"
                    label="时段"
                    rules={[{ required: true, message: '请选择时段' }]}
                  >
                    <Select placeholder="请选择时段">
                      {TIME_SLOTS.map((ts) => (
                        <Select.Option key={ts.key} value={ts.key}>
                          {ts.label}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="reason"
                label="紧急原因"
                rules={[{ required: true, message: '请输入紧急原因' }]}
              >
                <Input.TextArea rows={3} placeholder="请描述紧急法律援助的原因" maxLength={200} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  提交紧急援助
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </>
      ),
    },
    {
      key: 'addslot',
      label: '现场加号',
      children: (
        <>
          <Alert
            type="info"
            message="现场加号申请提交后，需在排班管理页面审批通过后生效"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Card title="申请加号">
            <Form
              form={addSlotForm}
              layout="vertical"
              onFinish={handleAddSlotSubmit}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    name="lawyerId"
                    label="律师"
                    rules={[{ required: true, message: '请选择律师' }]}
                  >
                    <Select placeholder="请选择律师" showSearch optionFilterProp="children">
                      {LAWYERS.filter((l) => l.licenseStatus === 'active').map((l) => (
                        <Select.Option key={l.id} value={l.id}>
                          {l.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="date"
                    label="日期"
                    rules={[{ required: true, message: '请选择日期' }]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="timeSlot"
                    label="时段"
                    rules={[{ required: true, message: '请选择时段' }]}
                  >
                    <Select placeholder="请选择时段">
                      {TIME_SLOTS.map((ts) => (
                        <Select.Option key={ts.key} value={ts.key}>
                          {ts.label}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="reason"
                label="加号原因"
                rules={[{ required: true, message: '请输入加号原因' }]}
              >
                <Input.TextArea rows={3} placeholder="请描述需要加号的原因" maxLength={200} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  提交加号申请
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </>
      ),
    },
  ];

  return (
    <div>
      <Tabs items={tabItems} />

      <Modal
        title="补正材料"
        open={materialModalVisible}
        onOk={handleMaterialSubmit}
        onCancel={() => {
          setMaterialModalVisible(false);
          setCurrentApt(null);
        }}
        okText="确认补正"
        cancelText="取消"
      >
        {currentApt && (
          <>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="预约编号">{currentApt.id}</Descriptions.Item>
              <Descriptions.Item label="群众姓名">{currentApt.citizenName}</Descriptions.Item>
              <Descriptions.Item label="案件类型">
                {CASE_TYPES.find((c) => c.id === currentApt.caseType)?.name || currentApt.caseType}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>必要材料：</div>
            <Checkbox.Group
              value={checkedMats}
              onChange={(vals) => setCheckedMats(vals)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {currentAptRequiredMaterials.map((mat) => (
                  <Checkbox key={mat.id} value={mat.id}>
                    {mat.name}
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
            <div style={{ marginTop: 12, fontWeight: 'bold' }}>其他材料：</div>
            <Checkbox.Group
              value={checkedMats}
              onChange={(vals) => setCheckedMats(vals)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {MATERIALS.filter(
                  (m) => !currentAptRequiredMaterials.some((rm) => rm.id === m.id)
                ).map((mat) => (
                  <Checkbox key={mat.id} value={mat.id}>
                    {mat.name}
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </>
        )}
      </Modal>
    </div>
  );
}
