# 校园工单管理系统 (Campus Work Order Management System)

基于 React + Express + Prisma 的校园工单全栈管理系统。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Tailwind CSS + Framer Motion |
| 后端 | Express.js + TypeScript + Prisma ORM |
| 数据库 | MySQL |
| 认证 | JWT + bcrypt |
| UI 组件 | shadcn/ui + Recharts |

## 功能特性

- 🔐 多角色认证（学生 / 教师 / 维修工 / 管理员）
- 📋 工单全生命周期管理（提交 → 派单 → 接单 → 处理 → 完成 → 评价）
- 📊 数据看板与趋势分析
- 🎨 沉浸式叙事型 UI（玻璃拟态 + 滚动驱动动画）
- 📱 响应式设计（移动端 / 平板 / 桌面端）

## 快速开始

### 前置要求

- Node.js >= 18
- MySQL >= 8.0

### 安装

```bash
# 克隆项目
git clone <your-repo-url>
cd campus-workorder

# 安装后端依赖
cd server
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的数据库连接信息和 JWT 密钥

# 初始化数据库
npx prisma migrate dev

# 安装前端依赖
cd ../client
npm install
```

### 启动

```bash
# 终端 1：启动后端（端口 3000）
cd server
npm run dev

# 终端 2：启动前端（端口 5173）
cd client
npm run dev
```

### 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | 123456 |
| 维修工 | worker1 | 123456 |
| 学生 | student1 | 123456 |
| 教师 | teacher1 | 123456 |

## 项目结构

```
campus-workorder/
├── client/                # React 前端
│   ├── src/
│   │   ├── components/    # 组件库
│   │   │   ├── animations/  # 动画组件
│   │   │   └── ui/          # shadcn/ui 基础组件
│   │   ├── layouts/       # 布局组件
│   │   ├── pages/         # 页面组件
│   │   ├── store/         # Zustand 状态管理
│   │   └── lib/           # 工具函数
│   └── ...
├── server/                # Express 后端
│   ├── src/
│   │   ├── routes/        # 路由处理
│   │   ├── middleware/    # 认证/授权中间件
│   │   ├── utils/         # 工具函数
│   │   └── types/         # TypeScript 类型
│   ├── prisma/            # 数据库 Schema
│   └── ...
└── README.md
```
