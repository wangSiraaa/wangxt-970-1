import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography } from 'antd';
import {
  CalendarOutlined,
  FormOutlined,
  TeamOutlined,
  WarningOutlined,
  FileSearchOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { subscribe, getData } from './store/dataStore';
import SchedulePage from './pages/SchedulePage';
import BookingPage from './pages/BookingPage';
import OnSitePage from './pages/OnSitePage';
import ConflictPage from './pages/ConflictPage';
import AuditPage from './pages/AuditPage';
import DataPage from './pages/DataPage';

const { Sider, Content, Header } = Layout;
const { Title } = Typography;

const menuItems = [
  { key: 'schedule', icon: <CalendarOutlined />, label: '排班管理' },
  { key: 'booking', icon: <FormOutlined />, label: '群众预约' },
  { key: 'onsite', icon: <TeamOutlined />, label: '现场管理' },
  { key: 'conflict', icon: <WarningOutlined />, label: '冲突处理' },
  { key: 'audit', icon: <FileSearchOutlined />, label: '审计日志' },
  { key: 'data', icon: <DatabaseOutlined />, label: '数据管理' },
];

export default function App() {
  const [page, setPage] = useState('schedule');
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribe(() => setTick((t) => t + 1));
  }, []);

  const renderPage = () => {
    switch (page) {
      case 'schedule': return <SchedulePage />;
      case 'booking': return <BookingPage />;
      case 'onsite': return <OnSitePage />;
      case 'conflict': return <ConflictPage />;
      case 'audit': return <AuditPage />;
      case 'data': return <DataPage />;
      default: return <SchedulePage />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={5} style={{ margin: 0, color: '#1677ff' }}>法律咨询中心</Title>
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>排班预约系统</div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[page]}
          items={menuItems}
          onClick={({ key }) => setPage(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            {menuItems.find((m) => m.key === page)?.label}
          </Title>
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5', overflow: 'auto' }}>
          {renderPage()}
        </Content>
      </Layout>
    </Layout>
  );
}
