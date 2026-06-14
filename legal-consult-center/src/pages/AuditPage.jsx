import React, { useState, useEffect, useMemo } from 'react';
import { Table, Tag, Input, DatePicker, Button, Space, Card, Typography, Modal, Descriptions } from 'antd';
import { DownloadOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getData, subscribe, APPOINTMENT_STATUS_TEXT } from '../store/dataStore';

const { RangePicker } = DatePicker;
const { Title } = Typography;

export default function AuditPage() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    return subscribe(() => setTick((t) => t + 1));
  }, []);
  const data = getData();

  const [dateRange, setDateRange] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentLog, setCurrentLog] = useState(null);

  const filteredLogs = useMemo(() => {
    let logs = [...(data.auditLogs || [])].reverse();

    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf('day');
      const end = dateRange[1].endOf('day');
      logs = logs.filter((log) => {
        const t = dayjs(log.timestamp);
        return (t.isAfter(start) || t.isSame(start)) && (t.isBefore(end) || t.isSame(end));
      });
    }

    if (searchText.trim()) {
      const keyword = searchText.trim().toLowerCase();
      logs = logs.filter(
        (log) =>
          (log.action || '').toLowerCase().includes(keyword) ||
          (log.operator || '').toLowerCase().includes(keyword) ||
          (log.details || '').toLowerCase().includes(keyword)
      );
    }

    return logs;
  }, [data.auditLogs, dateRange, searchText, tick]);

  const handleViewDetail = (log) => {
    setCurrentLog(log);
    setDetailVisible(true);
  };

  const parseExtraData = (log) => {
    if (!log.extraData) return null;
    try {
      return typeof log.extraData === 'string' ? JSON.parse(log.extraData) : log.extraData;
    } catch (e) {
      return null;
    }
  };

  const handleExportCSV = () => {
    const headers = ['时间', '操作', '操作人', '详情'];
    const rows = filteredLogs.map((log) => [
      log.timestamp,
      log.action,
      log.operator,
      `"${(log.details || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `审计日志_${dayjs().format('YYYYMMDDHHmmss')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getActionColor = (action) => {
    if (action?.includes('紧急')) return 'red';
    if (action?.includes('顺延')) return 'orange';
    if (action?.includes('取消')) return 'volcano';
    if (action?.includes('审批') || action?.includes('通过')) return 'green';
    if (action?.includes('迟到') || action?.includes('爽约')) return 'red';
    if (action?.includes('报到') || action?.includes('签到')) return 'cyan';
    return 'geekblue';
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (ts) => <Tag color="blue">{ts}</Tag>,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 160,
      render: (action) => <Tag color={getActionColor(action)} style={{ fontWeight: 'bold' }}>{action}</Tag>,
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 120,
    },
    {
      title: '详情',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'view',
      width: 80,
      render: (_, record) =>
        record.extraData ? (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
        ) : null,
    },
  ];

  const extraData = parseExtraData(currentLog);

  return (
    <div>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
            <Space wrap>
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates)}
                placeholder={['开始日期', '结束日期']}
                allowClear
              />
              <Input
                placeholder="搜索操作/操作人/详情"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ width: 260 }}
              />
            </Space>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
            >
              导出CSV
            </Button>
          </Space>

          <Table
            dataSource={filteredLogs.map((log) => ({ ...log, key: log.id }))}
            columns={columns}
            size="small"
            pagination={{ pageSize: 15, showTotal: (total) => `共 ${total} 条记录` }}
          />
        </Space>
      </Card>

      <Modal
        title="操作详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
        ]}
        width={640}
      >
        {currentLog && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="操作时间">{currentLog.timestamp}</Descriptions.Item>
              <Descriptions.Item label="操作类型">
                <Tag color={getActionColor(currentLog.action)}>{currentLog.action}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="操作人">{currentLog.operator}</Descriptions.Item>
              <Descriptions.Item label="详情说明">{currentLog.details}</Descriptions.Item>
            </Descriptions>

            {extraData && (
              <Card
                size="small"
                title="结构化数据"
                style={{ background: '#fafafa' }}
              >
                {extraData.affectedList && extraData.affectedList.length > 0 ? (
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                      受影响预约列表（{extraData.affectedList.length} 个）
                    </div>
                    <Table
                      dataSource={extraData.affectedList}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      columns={[
                        { title: '预约编号', dataIndex: 'id', key: 'id', width: 90 },
                        { title: '群众', dataIndex: 'citizenName', key: 'citizenName', width: 70 },
                        {
                          title: '原时段',
                          dataIndex: 'originalTimeSlot',
                          key: 'originalTimeSlot',
                          width: 100,
                          render: (t) => (
                            <span style={{ color: '#ff4d4f', textDecoration: 'line-through' }}>
                              {t}
                            </span>
                          ),
                        },
                        {
                          title: '调整后',
                          dataIndex: 'adjustedTimeSlot',
                          key: 'adjustedTimeSlot',
                          width: 100,
                          render: (t, r) => {
                            if (r.status === 'affected') return <Tag color="red">无法顺延</Tag>;
                            return t ? <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{t}</span> : '-';
                          },
                        },
                        {
                          title: '状态',
                          dataIndex: 'status',
                          key: 'status',
                          width: 90,
                          render: (s) => {
                            const info = APPOINTMENT_STATUS_TEXT[s];
                            return info ? (
                              <Tag color={info.color}>{info.text}</Tag>
                            ) : (
                              <Tag>{s}</Tag>
                            );
                          },
                        },
                        { title: '备注', dataIndex: 'reason', key: 'reason' },
                      ]}
                    />
                  </div>
                ) : (
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(extraData, null, 2)}
                  </pre>
                )}
              </Card>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
}
