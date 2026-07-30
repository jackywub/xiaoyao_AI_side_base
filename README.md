# 萧遥AI副业基地

个人品牌官网：使用 Next.js、React、TypeScript、Tailwind CSS 搭建前台页面，并在第二阶段接入 MySQL + Prisma 数据层。

## 已完成内容

- 首页
- 个人简介页面
- AI 副业页面
- 天赋数字页面
- 个人成长页面
- 案例反馈页面
- 联系我页面
- 固定顶部导航栏
- Footer 组件
- 深色/浅色模式切换
- 响应式布局
- 成长工作台（任务四象限、子任务、时间块、项目、目标、习惯、副业账本与成长记录）
- Hermes AI 助手（计划拆解与复盘）
- AI 工具库与数据库文章详情页
- 管理员登录与数据库会话
- 成长工作台 MySQL 持久化
- 浏览器 LocalStorage 一次性迁移
- 工作台个人资料、头像与微信二维码设置
- 登录密码修改与安全重置
- 微信读书、Obsidian、IMA 加密连接配置
- 网站内容管理（七个前台页面、文章、副业项目、天赋服务与案例反馈）

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- MySQL
- Prisma

## 本地启动

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

打开浏览器访问：

```text
http://localhost:3003
```

生产构建检查：

```bash
npm run build
```

## 数据库配置

完整的数据库选型、表结构、字段关系、数据安全和 LocalStorage 迁移方案见
[数据库设计文档](docs/DATABASE_DESIGN.md)。

复制环境变量示例文件：

```bash
cp .env.example .env
```

修改 `.env` 中的 `DATABASE_URL`，指向本地或线上 MySQL 数据库：

```env
DATABASE_URL="mysql://root:password@127.0.0.1:3306/xiaoyao_ai_base"
```

首次使用前先创建数据库：

```sql
CREATE DATABASE xiaoyao_ai_base CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

校验 Prisma schema：

```bash
npm run db:validate
```

生成 Prisma Client：

```bash
npm run db:generate
```

运行数据库迁移：

```bash
npm run db:migrate
```

部署到云服务器时，只应用已经提交的迁移文件：

```bash
npm run db:migrate:deploy
```

不要在生产环境运行 `prisma migrate dev`。

初始化站点内容与管理员账号：

```bash
npm run db:seed
```

`db:seed` 会使用 `.env` 中的 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 创建或更新管理员密码。密码至少需要 12 个字符。

外部服务的 API Key 使用 `.env` 中的 `SETTINGS_ENCRYPTION_KEY` 加密。该密钥上线后不能随意更换，否则已有连接配置将无法解密。

头像和二维码默认保存到 `storage/uploads`。部署云服务器时需要把该目录放在持久磁盘中，并与 MySQL 一起纳入备份。

登录地址：

```text
http://localhost:3003/login
```

登录后进入“成长工作台 → 网站内容”，可以管理：

- 首页、个人简介、副业项目、天赋数字、个人成长、案例反馈、联系我页面文案
- 页面 SEO、首屏、栏目内容项和底部行动区
- AI 副业项目、成长文章、天赋数字服务和案例反馈的草稿、发布与归档状态

页面内容保存在 MySQL 的 `pages` 与 `page_sections` 表中；文章、项目、服务和案例分别保存在对应业务表中。已发布内容保存后，刷新前台页面即可看到更新。

打开 Prisma Studio：

```bash
npm run db:studio
```

### 旧工作台数据迁移

迁移脚本会读取 Chrome LocalStorage 的只读快照，把旧工作台与 WorkBuddy
数据按业务日期和规范化内容合并。先执行干跑检查数量：

```bash
npm run db:migrate:legacy
```

确认无误后写入 MySQL：

```bash
npm run db:migrate:legacy -- --apply
```

脚本使用 `workspace_import_items` 保存导入指纹，可以安全重复执行；已经迁移的
记录不会再次写入。Chrome 使用非默认配置目录时，可通过
`--chrome-leveldb /absolute/path/to/leveldb` 指定路径。

### 两套外部系统合并

`db:merge:systems` 会把“小遥的管理系统”的项目、任务、子任务、时间块、
目标与 AI 对话，以及 `WorkBuddy/my_website` 的文章、AI 工具、公开项目和
咨询记录合并到当前 MySQL。数据按规范化标题、业务日期和来源标识去重，
重复运行不会创建第二份记录。

```bash
npm run db:merge:systems
```

默认读取本机原项目路径；迁移文件位置变化时，在 `.env` 中配置：

```env
MANAGEMENT_STATE_PATH="/absolute/path/to/app-state.json"
CONTENT_DATABASE_PATH="/absolute/path/to/payload.db"
```

运行迁移前应先备份 MySQL，迁移完成后以当前数据库为唯一主存储，避免继续
在旧系统中同时维护相同业务数据。

### 工作台 AI 助手

工作台 AI 助手调用本机 Hermes CLI，并把对话保存到 MySQL。Hermes 不在
系统 PATH 中时，可通过 `HERMES_BIN` 指定可执行文件；
`HERMES_TIMEOUT_MS` 用于调整单次响应超时。

## 阶段说明

第一阶段已完成前台静态展示。

第二阶段已完成 Prisma schema、MySQL 迁移文件和 seed 数据配置。数据库模型已覆盖网站内容、预约留言，以及成长工作台的任务、子任务、时间块、项目、目标、习惯、副业账本、成长记录和 AI 对话。

成长工作台已使用 MySQL 作为主存储，并接入管理员登录、HttpOnly 数据库会话、工作台 API 和 LocalStorage 一次性导入。导入成功后旧数据会保留在浏览器备份键中。当前仍不包含会员、支付功能。

设置模块目前负责保存外部服务入口和加密凭据；微信读书、Obsidian、IMA 的实际数据同步任务尚未启用。
