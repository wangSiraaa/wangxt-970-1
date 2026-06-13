import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Input,
  Upload,
  Space,
  Steps,
  Descriptions,
  Tag,
  Alert,
  message,
  Tabs,
  Collapse,
  Typography,
  Popconfirm,
} from 'antd';
import {
  ExportOutlined,
  ImportOutlined,
  UndoOutlined,
  CameraOutlined,
  HistoryOutlined,
  BookOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getData,
  subscribe,
  exportData,
  importData,
  resetData,
  takeSnapshot,
  restoreSnapshot,
  getRuleExplanation,
} from '../store/dataStore';

const { TextArea } = Input;
const { Title } = Typography;

function downloadJson(content, filename) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function TabImportExport() {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJson, setImportJson] = useState('');

  const handleExport = () => {
    const content = exportData();
    const filename = `法律咨询中心数据_${dayjs().format('YYYYMMDDHHmmss')}.json`;
    downloadJson(content, filename);
    message.success('数据已导出');
  };

  const handleImport = () => {
    if (!importJson.trim()) {
      message.warning('请输入JSON数据');
      return;
    }
    const success = importData(importJson.trim());
    if (success) {
      message.success('数据导入成功');
      setImportModalVisible(false);
      setImportJson('');
    } else {
      message.error('数据导入失败，请检查JSON格式是否正确');
    }
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setImportJson(content);
    };
    reader.readAsText(file);
    return false;
  };

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Card title="数据导入导出" size="small">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              type="info"
              message="您可以导出当前系统数据为JSON文件，也可以从JSON文件或文本导入数据来恢复或迁移系统状态"
              showIcon
            />
            <Space wrap>
              <Button type="primary" icon={<ExportOutlined />} onClick={handleExport}>
                导出数据
              </Button>
              <Button icon={<ImportOutlined />} onClick={() => setImportModalVisible(true)}>
                导入数据
              </Button>
              <Popconfirm
                title="确认重置"
                description="重置后所有当前数据将被清除，恢复为演示数据，确定继续吗？"
                onConfirm={() => {
                  resetData();
                  message.success('已重置为演示数据');
                }}
                okText="确定"
                cancelText="取消"
              >
                <Button danger icon={<UndoOutlined />}>
                  重置演示数据
                </Button>
              </Popconfirm>
            </Space>
          </Space>
        </Card>
      </Space>

      <Modal
        title="导入数据"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportJson('');
        }}
        onOk={handleImport}
        okText="导入"
        cancelText="取消"
        width={640}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Alert
            type="warning"
            message="导入数据将覆盖当前所有数据，请确保已备份重要数据"
            showIcon
          />
          <div>
            <div style={{ marginBottom: 8 }}>粘贴JSON数据：</div>
            <TextArea
              rows={8}
              placeholder="请粘贴JSON格式的数据"
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>或上传JSON文件：</div>
            <Upload
              accept=".json"
              maxCount={1}
              showUploadList={false}
              beforeUpload={handleFileUpload}
            >
              <Button icon={<ImportOutlined />}>选择文件</Button>
            </Upload>
          </div>
        </Space>
      </Modal>
    </div>
  );
}

function TabSnapshotReplay() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    return subscribe(() => setTick((t) => t + 1));
  }, []);
  const data = getData();

  const [snapshotLabel, setSnapshotLabel] = useState('');

  const handleTakeSnapshot = () => {
    const label = snapshotLabel.trim() || undefined;
    takeSnapshot(label);
    setSnapshotLabel('');
    message.success('快照已创建');
  };

  const snapshotColumns = [
    {
      title: '快照编号',
      dataIndex: 'id',
      key: 'id',
      width: 140,
    },
    {
      title: '标签',
      dataIndex: 'label',
      key: 'label',
      render: (label) => <Tag color="blue">{label}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (ts) => <Tag color="geekblue">{ts}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Popconfirm
          title="确认恢复"
          description="恢复快照将替换当前所有数据，确定继续吗？"
          onConfirm={() => {
            const success = restoreSnapshot(record.id);
            if (success) {
              message.success('快照已恢复');
            } else {
              message.error('快照恢复失败');
            }
          }}
          okText="确定"
          cancelText="取消"
        >
          <Button type="primary" size="small" danger>
            恢复
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Card title="状态回放" size="small">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              type="info"
              message="您可以创建当前数据状态的快照，并在需要时恢复到指定快照的状态"
              showIcon
            />
            <Space wrap>
              <Input
                placeholder="快照标签（可选）"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                style={{ width: 240 }}
                onPressEnter={handleTakeSnapshot}
              />
              <Button type="primary" icon={<CameraOutlined />} onClick={handleTakeSnapshot}>
                创建快照
              </Button>
            </Space>
          </Space>
        </Card>

        <Card title="快照列表" size="small">
          {(data.snapshots || []).length === 0 ? (
            <Alert type="info" message="暂无快照记录" showIcon />
          ) : (
            <Table
              dataSource={(data.snapshots || []).map((s) => ({ ...s, key: s.id }))}
              columns={snapshotColumns}
              size="small"
              pagination={false}
            />
          )}
        </Card>
      </Space>
    </div>
  );
}

function TabRuleExplanation() {
  const rules = useMemo(() => getRuleExplanation(), []);

  const severityTagMap = {
    硬拦截: 'red',
    冲突提示: 'orange',
    软提示: 'gold',
  };

  const collapseItems = rules.map((rule, index) => ({
    key: String(index),
    label: (
      <Space>
        <Tag color={severityTagMap[rule.severity] || 'default'}>{rule.severity}</Tag>
        <span>{rule.rule}</span>
      </Space>
    ),
    children: <Typography.Text>{rule.description}</Typography.Text>,
  }));

  const tableColumns = [
    {
      title: '规则名称',
      dataIndex: 'rule',
      key: 'rule',
      width: 160,
      render: (rule) => <Tag color="blue">{rule}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 120,
      render: (severity) => (
        <Tag color={severityTagMap[severity] || 'default'}>{severity}</Tag>
      ),
    },
  ];

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Card title="规则说明" size="small">
          <Alert
            type="info"
            message="以下是系统预约规则的说明，不同严重程度代表不同的处理方式"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Descriptions bordered size="small" column={3} style={{ marginBottom: 16 }}>
            <Descriptions.Item label={<Tag color="red">硬拦截</Tag>}>
              不满足条件时直接阻止操作，无法绕过
            </Descriptions.Item>
            <Descriptions.Item label={<Tag color="orange">冲突提示</Tag>}>
              提示存在冲突，由用户决定是否继续
            </Descriptions.Item>
            <Descriptions.Item label={<Tag color="gold">软提示</Tag>}>
              仅作提醒，不影响操作流程
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="规则详情" size="small">
          <Table
            dataSource={rules.map((r, i) => ({ ...r, key: i }))}
            columns={tableColumns}
            size="small"
            pagination={false}
            expandable={{
              expandedRowRender: (record) => (
                <Typography.Text type="secondary">{record.description}</Typography.Text>
              ),
            }}
          />
        </Card>

        <Card title="规则分类浏览" size="small">
          <Collapse items={collapseItems} />
        </Card>
      </Space>
    </div>
  );
}

export default function DataPage() {
  const tabItems = [
    {
      key: 'import-export',
      label: (
        <span>
          <ExportOutlined /> 数据导入导出
        </span>
      ),
      children: <TabImportExport />,
    },
    {
      key: 'snapshot',
      label: (
        <span>
          <HistoryOutlined /> 状态回放
        </span>
      ),
      children: <TabSnapshotReplay />,
    },
    {
      key: 'rules',
      label: (
        <span>
          <BookOutlined /> 规则说明
        </span>
      ),
      children: <TabRuleExplanation />,
    },
  ];

  return (
    <div>
      <Tabs items={tabItems} />
    </div>
  );
}
