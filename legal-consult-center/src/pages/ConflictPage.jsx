import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Select,
  Input,
  Space,
  Alert,
  Descriptions,
  DatePicker,
  Steps,
  Timeline,
  message,
  Popconfirm,
  Tooltip,
  Statistic,
  Row,
  Col,
  Tabs,
  Result,
} from 'antd';
import {
  WarningOutlined,
  SwapOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getData,
  subscribe,
  getConflictMatrix,
  reallocateAppointment,
  checkInterestConflict,
  generateReallocationSuggestions,
  LAWYERS,
  CASE_TYPES,
  TIME_SLOTS,
  RECUSAL_RELATIONS,
  URGENCY_LEVELS,
} from '../store/dataStore';

const { TextArea } = Input;

function getLawyerName(id) {
  return LAWYERS.find((l) => l.id === id)?.name || id;
}

function getCaseTypeName(id) {
  return CASE_TYPES.find((c) => c.id === id)?.name || id;
}

export default function ConflictPage() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    return subscribe(() => setTick((t) => t + 1));
  }, []);
  const data = getData();

  const [activeTab, setActiveTab] = useState('matrix');

  // Tab 1: 冲突矩阵
  const [matrixDate, setMatrixDate] = useState(dayjs().add(1, 'day'));

  // Tab 2: 冲突改派
  const [reallocateStep, setReallocateStep] = useState(0);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [newLawyerId, setNewLawyerId] = useState(null);
  const [reallocateReason, setReallocateReason] = useState('');
  const [reallocateResult, setReallocateResult] = useState(null);
  const [reallocationModalVisible, setReallocationModalVisible] = useState(false);
  const [reallocationSuggestions, setReallocationSuggestions] = useState(null);

  // Tab 4: 回避关系维护
  const [addRecusalVisible, setAddRecusalVisible] = useState(false);
  const [newRecusalLawyer1, setNewRecusalLawyer1] = useState(null);
  const [newRecusalLawyer2, setNewRecusalLawyer2] = useState(null);
  const [newRecusalReason, setNewRecusalReason] = useState('');

  const dateStr = matrixDate ? matrixDate.format('YYYY-MM-DD') : null;

  const conflictMatrix = useMemo(() => {
    if (!dateStr) return [];
    return getConflictMatrix(dateStr);
  }, [dateStr, tick]);

  const dayAppointments = useMemo(() => {
    if (!dateStr) return [];
    return data.appointments.filter(
      (a) => a.date === dateStr && a.status !== 'cancelled'
    );
  }, [dateStr, tick]);

  const dayLawyerIds = useMemo(() => {
    return [...new Set(dayAppointments.map((a) => a.lawyerId))];
  }, [dayAppointments]);

  const matrixTableColumns = useMemo(() => {
    return [
      {
        title: '律师',
        dataIndex: 'lawyerName',
        key: 'lawyerName',
        fixed: 'left',
        width: 100,
        render: (name, record) => (
          <Tooltip title={`专业: ${record.specialties.map(getCaseTypeName).join('、')}`}>
            <span>{name}</span>
          </Tooltip>
        ),
      },
      ...dayLawyerIds.map((colId) => ({
        title: getLawyerName(colId),
        key: colId,
        width: 100,
        align: 'center',
        render: (_, record) => {
          if (record.lawyerId === colId) {
            return <span style={{ color: '#d9d9d9' }}>-</span>;
          }
          const hasConflict = conflictMatrix.some(
            (c) =>
              (c.lawyer1.id === record.lawyerId && c.lawyer2.id === colId) ||
              (c.lawyer1.id === colId && c.lawyer2.id === record.lawyerId)
          );
          if (hasConflict) {
            const conflict = conflictMatrix.find(
              (c) =>
                (c.lawyer1.id === record.lawyerId && c.lawyer2.id === colId) ||
                (c.lawyer1.id === colId && c.lawyer2.id === record.lawyerId)
            );
            return (
              <Tooltip
                title={`${conflict.conflictingCases.map((cc) => cc.caseTypeName).join('、')} - ${conflict.reason}`}
              >
                <Tag color="error" icon={<WarningOutlined />}>
                  冲突
                </Tag>
              </Tooltip>
            );
          }
          const recusal = data.recusalRelations.find(
            (r) =>
              (r.lawyerId === record.lawyerId && r.relatedLawyerId === colId) ||
              (r.lawyerId === colId && r.relatedLawyerId === record.lawyerId)
          );
          if (recusal) {
            return (
              <Tooltip title={`回避关系: ${recusal.reason}（无同类案件冲突）`}>
                <Tag color="warning">回避</Tag>
              </Tooltip>
            );
          }
          return <Tag color="success">安全</Tag>;
        },
      })),
    ];
  }, [dayLawyerIds, conflictMatrix, data.recusalRelations]);

  const matrixTableData = useMemo(() => {
    return dayLawyerIds.map((id) => {
      const lawyer = LAWYERS.find((l) => l.id === id);
      return {
        key: id,
        lawyerId: id,
        lawyerName: lawyer?.name || id,
        specialties: lawyer?.specialties || [],
      };
    });
  }, [dayLawyerIds]);

  const conflictDetailColumns = [
    {
      title: '律师1',
      dataIndex: ['lawyer1', 'name'],
      key: 'lawyer1',
      render: (name) => <Tag color="blue">{name}</Tag>,
    },
    {
      title: '律师2',
      dataIndex: ['lawyer2', 'name'],
      key: 'lawyer2',
      render: (name) => <Tag color="blue">{name}</Tag>,
    },
    {
      title: '回避原因',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason) => <Tag color="orange">{reason}</Tag>,
    },
    {
      title: '冲突案件类型',
      dataIndex: 'conflictingCases',
      key: 'conflictingCases',
      render: (cases) =>
        cases.map((c, i) => (
          <Tag key={i} color="red">
            {c.caseTypeName}
          </Tag>
        )),
    },
    {
      title: '涉及群众',
      dataIndex: 'conflictingCases',
      key: 'citizens',
      render: (cases) =>
        [...new Set(cases.map((c) => c.citizenName))].map((name, i) => (
          <Tag key={i}>{name}</Tag>
        )),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          type="primary"
          danger
          size="small"
          icon={<SwapOutlined />}
          onClick={() => handleConflictReallocate(record)}
        >
          处理冲突
        </Button>
      ),
    },
  ];

  const handleConflictReallocate = (conflict) => {
    setSelectedConflict(conflict);
    const apts = dayAppointments.filter(
      (a) =>
        a.lawyerId === conflict.lawyer1.id || a.lawyerId === conflict.lawyer2.id
    );
    const conflictApts = apts.filter((a) =>
      conflict.conflictingCases.some((cc) => cc.caseType === a.caseType)
    );
    setSelectedAppointment(conflictApts.length > 0 ? conflictApts[0] : null);
    setReallocateStep(0);
    setNewLawyerId(null);
    setReallocateReason('');
    setReallocateResult(null);
    setActiveTab('reallocate');
    setReallocationModalVisible(true);
  };

  const openReallocateManual = () => {
    setSelectedConflict(null);
    setSelectedAppointment(null);
    setReallocateStep(0);
    setNewLawyerId(null);
    setReallocateReason('');
    setReallocateResult(null);
    setReallocationModalVisible(true);
  };

  const appointmentsWithConflict = useMemo(() => {
    return dayAppointments.filter(
      (a) => a.conflictWarnings && a.conflictWarnings.length > 0
    );
  }, [dayAppointments]);

  const allAppointmentsForReallocate = useMemo(() => {
    return data.appointments.filter(
      (a) => a.status !== 'cancelled' && a.status !== 'reallocated'
    );
  }, [tick]);

  useEffect(() => {
    if (selectedAppointment && reallocationModalVisible) {
      const result = generateReallocationSuggestions(selectedAppointment.id, 'all');
      setReallocationSuggestions(result);
    } else {
      setReallocationSuggestions(null);
    }
  }, [selectedAppointment, reallocationModalVisible]);

  const candidateLawyers = useMemo(() => {
    if (!reallocationSuggestions?.suggestions) return [];
    return reallocationSuggestions.suggestions.map((s) => {
      const lawyer = LAWYERS.find((l) => l.id === s.lawyerId);
      return {
        ...lawyer,
        score: s.score,
        remaining: s.remaining,
        reason: s.reason,
      };
    }).filter(Boolean);
  }, [reallocationSuggestions]);

  const handleReallocateNext = () => {
    if (reallocateStep === 0 && !selectedAppointment) {
      message.warning('请选择需要改派的预约');
      return;
    }
    if (reallocateStep === 2 && !newLawyerId) {
      message.warning('请选择新律师');
      return;
    }
    if (reallocateStep === 3 && !reallocateReason.trim()) {
      message.warning('请填写改派原因');
      return;
    }
    if (reallocateStep === 4) {
      const result = reallocateAppointment(
        selectedAppointment.id,
        newLawyerId,
        reallocateReason.trim()
      );
      if (result.success) {
        setReallocateResult(result.reallocation);
        setReallocateStep(5);
        message.success('改派成功');
      } else {
        message.error(result.error || '改派失败');
      }
      return;
    }
    setReallocateStep(reallocateStep + 1);
  };

  const handleReallocatePrev = () => {
    if (reallocateStep > 0) setReallocateStep(reallocateStep - 1);
  };

  const handleReallocateReset = () => {
    setReallocationModalVisible(false);
    setSelectedConflict(null);
    setSelectedAppointment(null);
    setReallocateStep(0);
    setNewLawyerId(null);
    setReallocateReason('');
    setReallocateResult(null);
  };

  const reallocateStepItems = [
    { title: '选择预约' },
    { title: '冲突信息' },
    { title: '选择新律师' },
    { title: '填写原因' },
    { title: '确认改派' },
    { title: '完成' },
  ];

  const renderReallocateContent = () => {
    switch (reallocateStep) {
      case 0:
        return (
          <Card title="选择需要改派的预约" size="small">
            {selectedConflict && (
              <Alert
                type="warning"
                message="来自冲突矩阵"
                description={`${selectedConflict.lawyer1.name} 与 ${selectedConflict.lawyer2.name} 存在回避关系，且代理同类案件`}
                showIcon
                style={{ marginBottom: 12 }}
              />
            )}
            <Table
              dataSource={
                selectedConflict
                  ? dayAppointments.filter(
                      (a) =>
                        a.lawyerId === selectedConflict.lawyer1.id ||
                        a.lawyerId === selectedConflict.lawyer2.id
                    )
                  : allAppointmentsForReallocate
              }
              rowKey="id"
              size="small"
              pagination={false}
              rowSelection={{
                type: 'radio',
                selectedRowKeys: selectedAppointment ? [selectedAppointment.id] : [],
                onChange: (keys, rows) => {
                  setSelectedAppointment(rows[0]);
                  setNewLawyerId(null);
                },
              }}
              columns={[
                { title: '预约编号', dataIndex: 'id', key: 'id' },
                { title: '群众', dataIndex: 'citizenName', key: 'citizenName' },
                {
                  title: '律师',
                  dataIndex: 'lawyerId',
                  key: 'lawyerId',
                  render: (id) => getLawyerName(id),
                },
                { title: '日期', dataIndex: 'date', key: 'date' },
                { title: '时段', dataIndex: 'timeSlot', key: 'timeSlot' },
                {
                  title: '案件类型',
                  dataIndex: 'caseType',
                  key: 'caseType',
                  render: (ct) => getCaseTypeName(ct),
                },
                {
                  title: '紧急程度',
                  dataIndex: 'urgency',
                  key: 'urgency',
                  render: (u) => {
                    const level = URGENCY_LEVELS.find((l) => l.id === u);
                    return level ? <Tag color={level.color}>{level.name}</Tag> : '-';
                  },
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  key: 'status',
                  render: (s) => {
                    const map = {
                      confirmed: { text: '已确认', color: 'green' },
                      pending_materials: { text: '待补正', color: 'gold' },
                      checked_in: { text: '已签到', color: 'blue' },
                    };
                    const info = map[s] || { text: s, color: 'default' };
                    return <Tag color={info.color}>{info.text}</Tag>;
                  },
                },
                {
                  title: '冲突',
                  key: 'conflict',
                  render: (_, record) =>
                    record.conflictWarnings && record.conflictWarnings.length > 0 ? (
                      <Tag color="error" icon={<WarningOutlined />}>
                        有冲突
                      </Tag>
                    ) : (
                      <Tag color="success">无</Tag>
                    ),
                },
              ]}
            />
          </Card>
        );

      case 1:
        return (
          <Card title="原律师信息与冲突原因" size="small">
            {selectedAppointment && (
              <>
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="预约编号">{selectedAppointment.id}</Descriptions.Item>
                  <Descriptions.Item label="群众姓名">{selectedAppointment.citizenName}</Descriptions.Item>
                  <Descriptions.Item label="原律师">{getLawyerName(selectedAppointment.lawyerId)}</Descriptions.Item>
                  <Descriptions.Item label="原律师专业">
                    {LAWYERS.find((l) => l.id === selectedAppointment.lawyerId)?.specialties
                      .map(getCaseTypeName)
                      .join('、')}
                  </Descriptions.Item>
                  <Descriptions.Item label="日期">{selectedAppointment.date}</Descriptions.Item>
                  <Descriptions.Item label="时段">{selectedAppointment.timeSlot}</Descriptions.Item>
                  <Descriptions.Item label="案件类型">
                    {getCaseTypeName(selectedAppointment.caseType)}
                  </Descriptions.Item>
                  <Descriptions.Item label="紧急程度">
                    {(() => {
                      const level = URGENCY_LEVELS.find((l) => l.id === selectedAppointment.urgency);
                      return level ? <Tag color={level.color}>{level.name}</Tag> : '-';
                    })()}
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Tag color="blue">{selectedAppointment.status}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="对方当事人">
                    {selectedAppointment.opposingParty || '-'}
                  </Descriptions.Item>
                </Descriptions>
                {reallocationSuggestions?.invalidReasons?.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
                      <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                      原预约失效原因
                    </div>
                    {reallocationSuggestions.invalidReasons.map((r, i) => (
                      <Alert
                        key={i}
                        type="error"
                        message={r.type}
                        description={r.reason}
                        showIcon
                        style={{ marginBottom: 8 }}
                      />
                    ))}
                  </div>
                )}
                {selectedConflict && (
                  <div style={{ marginTop: 16 }}>
                    <Alert
                      type="error"
                      message="冲突详情"
                      description={
                        <Timeline
                          items={[
                            {
                              color: 'red',
                              children: (
                                <>
                                  <strong>回避关系：</strong>
                                  {selectedConflict.lawyer1.name} 与 {selectedConflict.lawyer2.name}（{selectedConflict.reason}）
                                </>
                              ),
                            },
                            ...selectedConflict.conflictingCases.map((cc, i) => ({
                              color: 'orange',
                              children: (
                                <>
                                  <strong>冲突案件类型 {i + 1}：</strong>
                                  {cc.caseTypeName}，涉及群众：{cc.citizenName}
                                </>
                              ),
                            })),
                          ]}
                        />
                      }
                      showIcon
                      icon={<ExclamationCircleOutlined />}
                    />
                  </div>
                )}
                {selectedAppointment.conflictWarnings &&
                  selectedAppointment.conflictWarnings.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      {selectedAppointment.conflictWarnings.map((cw, i) => (
                        <Alert
                          key={i}
                          type="warning"
                          message={cw.type}
                          description={cw.description}
                          showIcon
                          style={{ marginBottom: 8 }}
                        />
                      ))}
                    </div>
                  )}
              </>
            )}
          </Card>
        );

      case 2:
        return (
          <Card title="选择新律师（智能推荐）" size="small">
            <Alert
              type="info"
              message="智能推荐：综合专业匹配度、剩余名额、同类案件经验评分排序"
              showIcon
              style={{ marginBottom: 12 }}
            />
            {candidateLawyers.length === 0 ? (
              <Alert
                type="warning"
                message="没有符合条件的律师可改派"
                description="当前日期没有符合所有筛选条件的律师，请考虑更换日期或手动处理"
                showIcon
              />
            ) : (
              <Table
                dataSource={candidateLawyers.map((l, index) => ({
                  ...l,
                  key: l.id,
                  rank: index + 1,
                  specialtyNames: l.specialties.map(getCaseTypeName).join('、'),
                }))}
                size="small"
                pagination={false}
                rowSelection={{
                  type: 'radio',
                  selectedRowKeys: newLawyerId ? [newLawyerId] : [],
                  onChange: (keys) => setNewLawyerId(keys[0]),
                }}
                columns={[
                  {
                    title: '排名',
                    dataIndex: 'rank',
                    key: 'rank',
                    width: 60,
                    render: (r) => (
                      <Tag color={r === 1 ? 'red' : r === 2 ? 'orange' : 'green'}>
                        {r}
                      </Tag>
                    ),
                  },
                  { title: '律师姓名', dataIndex: 'name', key: 'name' },
                  { title: '专业方向', dataIndex: 'specialtyNames', key: 'specialties' },
                  {
                    title: '剩余名额',
                    dataIndex: 'remaining',
                    key: 'remaining',
                    width: 90,
                    render: (r) => <Tag color="green">{r} 个</Tag>,
                  },
                  {
                    title: '综合评分',
                    dataIndex: 'score',
                    key: 'score',
                    width: 90,
                    render: (s) => (
                      <Tag color="blue" style={{ fontWeight: 'bold' }}>
                        {s} 分
                      </Tag>
                    ),
                  },
                  {
                    title: '推荐理由',
                    dataIndex: 'reason',
                    key: 'reason',
                    ellipsis: true,
                  },
                  {
                    title: '执业状态',
                    dataIndex: 'licenseStatus',
                    key: 'licenseStatus',
                    width: 80,
                    render: (s) =>
                      s === 'active' ? (
                        <Tag color="success">有效</Tag>
                      ) : (
                        <Tag color="error">暂停</Tag>
                      ),
                  },
                ]}
              />
            )}
          </Card>
        );

      case 3:
        return (
          <Card title="填写改派原因" size="small">
            {selectedAppointment && (
              <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                <Descriptions.Item label="原律师">{getLawyerName(selectedAppointment.lawyerId)}</Descriptions.Item>
                <Descriptions.Item label="新律师">
                  {newLawyerId ? getLawyerName(newLawyerId) : '未选择'}
                </Descriptions.Item>
              </Descriptions>
            )}
            <TextArea
              rows={4}
              placeholder="请输入改派原因（必填）"
              value={reallocateReason}
              onChange={(e) => setReallocateReason(e.target.value)}
              maxLength={200}
              showCount
            />
          </Card>
        );

      case 4:
        return (
          <Card title="确认改派信息" size="small">
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Card
                  size="small"
                  title="改派前"
                  style={{ borderColor: '#ff4d4f' }}
                  headStyle={{ background: '#fff1f0' }}
                >
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="原律师">
                      {getLawyerName(selectedAppointment?.lawyerId)}
                    </Descriptions.Item>
                    <Descriptions.Item label="时段">
                      {selectedAppointment?.timeSlot}
                    </Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Tag color="orange">{selectedAppointment?.status}</Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  size="small"
                  title="改派后"
                  style={{ borderColor: '#52c41a' }}
                  headStyle={{ background: '#f6ffed' }}
                >
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="新律师">
                      {newLawyerId ? getLawyerName(newLawyerId) : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="时段">
                      {selectedAppointment?.timeSlot}
                    </Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <Tag color="purple">已改派</Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            </Row>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="改派原因">{reallocateReason}</Descriptions.Item>
              <Descriptions.Item label="预约编号">{selectedAppointment?.id}</Descriptions.Item>
              <Descriptions.Item label="群众姓名">{selectedAppointment?.citizenName}</Descriptions.Item>
              <Descriptions.Item label="案件类型">
                {getCaseTypeName(selectedAppointment?.caseType)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        );

      case 5:
        return (
          <Result
            status="success"
            title="改派成功"
            subTitle={`改派编号: ${reallocateResult?.id || ''}`}
            extra={[
              <Button key="close" type="primary" onClick={handleReallocateReset}>
                关闭
              </Button>,
            ]}
          >
            {reallocateResult && (
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="预约编号">{reallocateResult.appointmentId}</Descriptions.Item>
                <Descriptions.Item label="原律师">{reallocateResult.originalLawyerName}</Descriptions.Item>
                <Descriptions.Item label="新律师">{reallocateResult.newLawyerName}</Descriptions.Item>
                <Descriptions.Item label="日期">{reallocateResult.date}</Descriptions.Item>
                <Descriptions.Item label="时段">{reallocateResult.originalTimeSlot}</Descriptions.Item>
                <Descriptions.Item label="改派原因">{reallocateResult.reason}</Descriptions.Item>
                <Descriptions.Item label="改派时间">{reallocateResult.timestamp}</Descriptions.Item>
              </Descriptions>
            )}
          </Result>
        );

      default:
        return null;
    }
  };

  // Tab 3: 改派记录
  const reallocationColumns = [
    { title: '改派编号', dataIndex: 'id', key: 'id', width: 120 },
    { title: '预约编号', dataIndex: 'appointmentId', key: 'appointmentId', width: 120 },
    {
      title: '原律师',
      dataIndex: 'originalLawyerName',
      key: 'originalLawyerName',
      render: (name) => <Tag color="orange">{name}</Tag>,
    },
    {
      title: '新律师',
      dataIndex: 'newLawyerName',
      key: 'newLawyerName',
      render: (name) => <Tag color="green">{name}</Tag>,
    },
    { title: '日期', dataIndex: 'date', key: 'date' },
    { title: '时段', dataIndex: 'originalTimeSlot', key: 'originalTimeSlot' },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    { title: '改派时间', dataIndex: 'timestamp', key: 'timestamp' },
  ];

  // Tab 4: 回避关系维护
  const recusalColumns = [
    {
      title: '律师1',
      dataIndex: 'lawyerId',
      key: 'lawyer1',
      render: (id) => getLawyerName(id),
    },
    {
      title: '律师2',
      dataIndex: 'relatedLawyerId',
      key: 'lawyer2',
      render: (id) => getLawyerName(id),
    },
    {
      title: '回避原因',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason) => <Tag color="orange">{reason}</Tag>,
    },
  ];

  const uniqueRecusalRelations = useMemo(() => {
    const seen = new Set();
    return data.recusalRelations.filter((r) => {
      const key = [r.lawyerId, r.relatedLawyerId].sort().join('-');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [tick]);

  const handleAddRecusal = () => {
    if (!newRecusalLawyer1 || !newRecusalLawyer2) {
      message.warning('请选择两位律师');
      return;
    }
    if (newRecusalLawyer1 === newRecusalLawyer2) {
      message.warning('不能选择同一位律师');
      return;
    }
    if (!newRecusalReason.trim()) {
      message.warning('请填写回避原因');
      return;
    }
    const exists = data.recusalRelations.some(
      (r) =>
        (r.lawyerId === newRecusalLawyer1 && r.relatedLawyerId === newRecusalLawyer2) ||
        (r.lawyerId === newRecusalLawyer2 && r.relatedLawyerId === newRecusalLawyer1)
    );
    if (exists) {
      message.warning('该回避关系已存在');
      return;
    }
    data.recusalRelations.push(
      { lawyerId: newRecusalLawyer1, relatedLawyerId: newRecusalLawyer2, reason: newRecusalReason.trim() },
      { lawyerId: newRecusalLawyer2, relatedLawyerId: newRecusalLawyer1, reason: newRecusalReason.trim() }
    );
    setAddRecusalVisible(false);
    setNewRecusalLawyer1(null);
    setNewRecusalLawyer2(null);
    setNewRecusalReason('');
    message.success('回避关系已添加');
  };

  const conflictCount = conflictMatrix.length;
  const recusalCount = uniqueRecusalRelations.length;
  const reallocationCount = data.reallocations.length;

  const renderTab1 = () => (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Statistic
            title="当日冲突数"
            value={conflictCount}
            valueStyle={{ color: conflictCount > 0 ? '#cf1322' : '#3f8600' }}
            prefix={conflictCount > 0 ? <WarningOutlined /> : <SafetyOutlined />}
          />
        </Col>
        <Col span={8}>
          <Statistic title="当日在班律师" value={dayLawyerIds.length} />
        </Col>
        <Col span={8}>
          <Statistic title="当日预约数" value={dayAppointments.length} />
        </Col>
      </Row>

      <Card
        title={`冲突矩阵 — ${dateStr || ''}`}
        size="small"
        extra={
          <DatePicker
            value={matrixDate}
            onChange={(d) => d && setMatrixDate(d)}
            placeholder="选择日期"
          />
        }
        style={{ marginBottom: 16 }}
      >
        {dayLawyerIds.length === 0 ? (
          <Alert type="info" message="当日无在班律师" showIcon />
        ) : (
          <Table
            dataSource={matrixTableData}
            columns={matrixTableColumns}
            rowKey="key"
            size="small"
            pagination={false}
            bordered
            scroll={{ x: (dayLawyerIds.length + 1) * 100 }}
          />
        )}
      </Card>

      <Card title="冲突详情" size="small">
        {conflictMatrix.length === 0 ? (
          <Alert
            type="success"
            message="当日无利益冲突"
            description="所有在班律师之间不存在回避关系冲突或同案件代理冲突"
            showIcon
          />
        ) : (
          <Table
            dataSource={conflictMatrix.map((c, i) => ({ ...c, key: i }))}
            columns={conflictDetailColumns}
            size="small"
            pagination={false}
            bordered
          />
        )}
      </Card>
    </div>
  );

  const renderTab2 = () => (
    <div>
      <Card
        title="冲突改派"
        size="small"
        extra={
          <Button
            type="primary"
            icon={<SwapOutlined />}
            onClick={openReallocateManual}
          >
            手动改派
          </Button>
        }
      >
        <Alert
          type="info"
          message={'您可以从冲突矩阵的「处理冲突」按钮进入改派流程，或点击「手动改派」自行选择预约进行改派'}
          showIcon
          style={{ marginBottom: 16 }}
        />
        {appointmentsWithConflict.length > 0 && (
          <>
            <Alert
              type="warning"
              message={`${dateStr || ''} 存在 ${appointmentsWithConflict.length} 条有冲突预警的预约`}
              showIcon
              style={{ marginBottom: 12 }}
            />
            <Table
              dataSource={appointmentsWithConflict}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: '预约编号', dataIndex: 'id', key: 'id' },
                { title: '群众', dataIndex: 'citizenName', key: 'citizenName' },
                {
                  title: '律师',
                  dataIndex: 'lawyerId',
                  key: 'lawyerId',
                  render: (id) => getLawyerName(id),
                },
                { title: '时段', dataIndex: 'timeSlot', key: 'timeSlot' },
                {
                  title: '案件类型',
                  dataIndex: 'caseType',
                  key: 'caseType',
                  render: (ct) => getCaseTypeName(ct),
                },
                {
                  title: '冲突',
                  dataIndex: 'conflictWarnings',
                  key: 'conflictWarnings',
                  render: (warnings) =>
                    warnings.map((w, i) => (
                      <Tag key={i} color="error">
                        {w.type}
                      </Tag>
                    )),
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_, record) => (
                    <Button
                      type="primary"
                      size="small"
                      danger
                      onClick={() => {
                        setSelectedConflict(null);
                        setSelectedAppointment(record);
                        setReallocateStep(0);
                        setNewLawyerId(null);
                        setReallocateReason('');
                        setReallocateResult(null);
                        setReallocationModalVisible(true);
                      }}
                    >
                      改派
                    </Button>
                  ),
                },
              ]}
            />
          </>
        )}
      </Card>

      <Modal
        title="冲突改派流程"
        open={reallocationModalVisible}
        onCancel={handleReallocateReset}
        width={720}
        footer={
          reallocateStep === 5
            ? null
            : [
                reallocateStep > 0 && (
                  <Button key="prev" onClick={handleReallocatePrev}>
                    上一步
                  </Button>
                ),
                <Button
                  key="next"
                  type="primary"
                  onClick={handleReallocateNext}
                  disabled={
                    (reallocateStep === 0 && !selectedAppointment) ||
                    (reallocateStep === 2 && !newLawyerId) ||
                    (reallocateStep === 3 && !reallocateReason.trim())
                  }
                >
                  {reallocateStep === 4 ? '确认改派' : '下一步'}
                </Button>,
                <Button key="cancel" onClick={handleReallocateReset}>
                  取消
                </Button>,
              ]
        }
      >
        <Steps
          current={reallocateStep}
          items={reallocateStepItems}
          size="small"
          style={{ marginBottom: 24 }}
        />
        {renderReallocateContent()}
      </Modal>
    </div>
  );

  const renderTab3 = () => (
    <Card title="改派记录" size="small">
      {data.reallocations.length === 0 ? (
        <Alert type="info" message="暂无改派记录" showIcon />
      ) : (
        <Table
          dataSource={data.reallocations.map((r) => ({ ...r, key: r.id }))}
          columns={reallocationColumns}
          size="small"
          expandable={{
            expandedRowRender: (record) => (
              <Descriptions bordered size="small" column={2} title="改派前后对比">
                <Descriptions.Item label="改派前-律师">
                  {record.beforeSnapshot?.lawyerName}
                </Descriptions.Item>
                <Descriptions.Item label="改派后-律师">
                  {record.newLawyerName}
                </Descriptions.Item>
                <Descriptions.Item label="改派前-时段">
                  {record.beforeSnapshot?.timeSlot}
                </Descriptions.Item>
                <Descriptions.Item label="改派后-时段">
                  {record.originalTimeSlot}
                </Descriptions.Item>
                <Descriptions.Item label="改派前-状态">
                  <Tag color="orange">{record.beforeSnapshot?.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="改派后-状态">
                  <Tag color="purple">已改派</Tag>
                </Descriptions.Item>
              </Descriptions>
            ),
          }}
          pagination={false}
        />
      )}
    </Card>
  );

  const renderTab4 = () => (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Statistic
            title="回避关系数"
            value={recusalCount}
            prefix={<SafetyOutlined />}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="改派记录数"
            value={reallocationCount}
            prefix={<SwapOutlined />}
          />
        </Col>
      </Row>

      <Card
        title="回避关系列表"
        size="small"
        extra={
          <Button
            type="primary"
            icon={<SafetyOutlined />}
            onClick={() => setAddRecusalVisible(true)}
          >
            新增回避关系
          </Button>
        }
      >
        <Table
          dataSource={uniqueRecusalRelations.map((r, i) => ({ ...r, key: i }))}
          columns={recusalColumns}
          size="small"
          pagination={false}
        />
      </Card>

      <Modal
        title="新增回避关系"
        open={addRecusalVisible}
        onCancel={() => {
          setAddRecusalVisible(false);
          setNewRecusalLawyer1(null);
          setNewRecusalLawyer2(null);
          setNewRecusalReason('');
        }}
        onOk={handleAddRecusal}
        okText="确认添加"
        cancelText="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <div>
            <div style={{ marginBottom: 8 }}>律师1</div>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择律师1"
              value={newRecusalLawyer1}
              onChange={setNewRecusalLawyer1}
            >
              {LAWYERS.filter((l) => l.id !== newRecusalLawyer2).map((l) => (
                <Select.Option key={l.id} value={l.id}>
                  {l.name}（{l.specialties.map(getCaseTypeName).join('、')}）
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>律师2</div>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择律师2"
              value={newRecusalLawyer2}
              onChange={setNewRecusalLawyer2}
            >
              {LAWYERS.filter((l) => l.id !== newRecusalLawyer1).map((l) => (
                <Select.Option key={l.id} value={l.id}>
                  {l.name}（{l.specialties.map(getCaseTypeName).join('、')}）
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>回避原因</div>
            <Input
              placeholder="请输入回避原因"
              value={newRecusalReason}
              onChange={(e) => setNewRecusalReason(e.target.value)}
              maxLength={50}
            />
          </div>
        </div>
      </Modal>
    </div>
  );

  const tabItems = [
    {
      key: 'matrix',
      label: (
        <span>
          <WarningOutlined /> 冲突矩阵
        </span>
      ),
      children: renderTab1(),
    },
    {
      key: 'reallocate',
      label: (
        <span>
          <SwapOutlined /> 冲突改派
        </span>
      ),
      children: renderTab2(),
    },
    {
      key: 'records',
      label: (
        <span>
          <CheckCircleOutlined /> 改派记录
        </span>
      ),
      children: renderTab3(),
    },
    {
      key: 'recusal',
      label: (
        <span>
          <SafetyOutlined /> 回避关系维护
        </span>
      ),
      children: renderTab4(),
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />
    </div>
  );
}
