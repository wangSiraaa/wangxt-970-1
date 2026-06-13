import React, { useState, useEffect, useMemo } from 'react';
import { Table, Tag, Input, DatePicker, Button, Space, Card, Typography } from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getData, subscribe } from '../store/dataStore';

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
      width: 140,
      render: (action) => <Tag color="geekblue">{action}</Tag>,
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
  ];

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
    </div>
  );
}
