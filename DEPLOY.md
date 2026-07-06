# 部署指南

将校园工单管理系统部署到公网，让所有人都能访问。

## 方案：Vercel（前端）+ Railway（后端+数据库）

| 部分 | 平台 | 费用 |
|------|------|------|
| 前端 | Vercel | 免费 |
| 后端 | Railway | 试用金 $5，之后按量付费 |
| 数据库 | Railway MySQL | 包含在 Railway 中 |

---

## 第一步：推送代码到 GitHub

先用 GitHub Desktop 将代码推送到你的 GitHub 仓库。

---

## 第二步：部署后端 + 数据库（Railway）

### 2.1 注册 Railway
1. 打开 [railway.com](https://railway.com)
2. 点击 **Start a New Project** → **Deploy from GitHub repo**
3. 授权并选择你的仓库

### 2.2 添加 MySQL 数据库
1. 在项目面板中点击 **+ New** → **Database** → **MySQL**
2. Railway 会自动创建一个 MySQL 实例
3. 点击 MySQL → **Connect**，复制 `DATABASE_URL`

### 2.3 配置后端服务
1. 点击 **+ New** → **Service** → 选择同一个 GitHub 仓库
2. 在服务设置中：
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm run dev`

### 2.4 设置环境变量
在服务 → **Variables** 中添加：

```
DATABASE_URL=上面复制的 MySQL 连接地址
JWT_SECRET=你自定义的随机密钥（如 campus-workorder-jwt-2024）
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=production
CORS_ORIGIN=*
```

### 2.5 运行数据库迁移
1. 点击服务的 **Shell** 标签
2. 执行：
```bash
npx prisma migrate deploy
npx tsx src/seed.ts
```
3. seed 脚本会创建测试账号

### 2.6 获取后端地址
部署成功后，Railway 会生成一个域名（如 `xxx.up.railway.app`），记下这个地址。

---

## 第三步：部署前端（Vercel）

### 3.1 注册 Vercel
1. 打开 [vercel.com](https://vercel.com)
2. 点击 **New Project**，导入你的 GitHub 仓库

### 3.2 配置部署参数
- **Framework**: Vite
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 3.3 设置环境变量
在 **Environment Variables** 中添加：

```
VITE_API_URL=https://你的Railway域名/api/v1
```

> 例如：`VITE_API_URL=https://campus-workorder.railway.app/api/v1`

### 3.4 部署
点击 **Deploy**，Vercel 会自动构建并部署前端。

成功后你会得到一个域名，如 `campus-workorder.vercel.app`。

---

## 第四步：验证

1. 打开 Vercel 生成的域名
2. 使用测试账号登录：
   - 管理员：`admin` / `123456`
   - 学生：`student1` / `123456`
3. 确认各项功能正常

---

## 常见问题

### 前端请求 404
检查 Vercel 的 `VITE_API_URL` 是否设置正确，末尾不要带斜杠。

### CORS 报错
确认 Railway 后端环境变量 `CORS_ORIGIN=*`。如果前端有固定域名，可改为 `CORS_ORIGIN=https://你的Vercel域名`。

### 数据库连接失败
检查 Railway MySQL 是否已启动，`DATABASE_URL` 是否完整复制。

---

## 备选：Railway 一站式部署

如果不想用 Vercel，也可以完全用 Railway：

1. 在 Railway 后端服务中，将 **Start Command** 改为：
   ```bash
   cd ../client && npm install && npm run build && cd ../server && npm run dev
   ```
   或者预先本地构建前端，把 `client/dist` 也提交到 Git，Express 会自动托管。

2. 这样前后端都在同一个 Railway 域名下，无需配置 `VITE_API_URL`。
