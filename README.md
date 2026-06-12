# 法律咨询中心 - 排班与预约系统

法律咨询中心前端排班系统，支持值班主管排班、群众预约、现场人员处理冲突等全流程业务。

## ✨ 核心功能

### 1. 排班日历（值班主管视角）
- 月视图日历展示律师每日排班情况
- 添加/删除律师每日上下午排班
- 登记律师请假（请假时段自动从可约列表移除，并触发已有预约的冲突状态）
- 每日预约数量直观展示

### 2. 预约详情（群众视角）
- 周视图快速选择预约日期
- 智能展示可选律师（已过滤请假、已被预约时段）
- 案件描述填写
- **业务规则**：
  - 同一群众同一天只能保留一个预约
  - 律师请假时段不出现在可约列表
  - 提交前自动进行利益冲突检测

### 3. 冲突处理（现场人员视角）
- 集中展示所有待处理冲突预约（利益冲突或律师请假）
- 一键改派其他可用律师
- 完整的改派记录时间线
- 全部预约表格化概览
- 请假记录管理

### 4. 利益冲突检测
- 根据律师擅长案件关键词匹配案件描述
- 检测律师已有预约是否存在关键词重合
- 检测到冲突后提示明确原因及涉及关键词
- 自动列出可改派的备选律师

## 🏗️ 技术栈

- **框架**: React 18 + TypeScript
- **构建**: Vite 6
- **状态管理**: Zustand（含本地持久化）
- **样式**: Tailwind CSS 3
- **路由**: React Router 7
- **图标**: Lucide React
- **部署**: Nginx + Docker

## 📁 项目结构

```
src/
├── components/
│   └── Layout.tsx          # 整体布局 + 导航 + 角色切换
├── pages/
│   ├── Schedule.tsx        # 排班日历页面
│   ├── Booking.tsx         # 预约详情页面
│   └── Conflict.tsx        # 冲突处理页面
├── store/
│   └── useScheduleStore.ts # 状态管理（含本地数据）
├── types/
│   └── index.ts            # TypeScript 类型定义
├── lib/
│   └── utils.ts
├── App.tsx
├── main.tsx
└── index.css
```

## 🚀 本地开发

### 环境要求
- Node.js >= 20
- pnpm >= 8

### 安装依赖
```bash
pnpm install
```

### 启动开发服务器
```bash
pnpm dev
```
访问 http://localhost:5173 (或终端提示的端口)

### 代码检查
```bash
# TypeScript 类型检查
pnpm check

# ESLint 检查
pnpm lint
```

### 生产构建
```bash
pnpm build
```

## 🐳 Docker 容器运行

### 构建镜像
```bash
docker build -t legal-schedule .
```

### 运行容器
```bash
docker run -d -p 8080:80 --name legal-schedule-app legal-schedule
```

访问 http://localhost:8080

### 使用 docker-compose（可选）
```yaml
version: '3.8'
services:
  legal-schedule:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

## 🔄 完整业务流程演示

使用顶部右侧的**角色切换器**模拟不同用户操作：

1. **切换到「值班主管」**
   - 进入「排班日历」
   - 点击日期右上角「+」添加律师排班
   - 点击日期右上角「请假」图标登记律师请假

2. **切换到「群众」**
   - 进入「预约详情」
   - 选择日期 → 点击律师卡片「预约此律师」
   - 填写案件描述（如涉及冲突关键词会自动检测）
   - 提交预约
   - 可在右侧查看/取消自己的预约

3. **切换到「现场人员」**
   - 进入「冲突处理」
   - 查看顶部待处理冲突列表
   - 点击「改派律师」选择其他可用律师
   - 右侧查看改派记录时间线和请假记录

## 💾 数据说明

系统使用浏览器 localStorage 持久化数据（`legal-schedule-store`），初始预置：
- 6 名专业律师（不同领域：民商事、婚姻家事、刑事辩护、知识产权、劳动争议、行政法务）
- 3 名示例群众
- 本周一至周日的基础排班
- 2 条请假记录
- 3 条初始预约记录

如需重置数据，在浏览器控制台执行：
```js
localStorage.removeItem('legal-schedule-store')
```
