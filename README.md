# DiDa-todo

基于 Next.js App Router 的单体 Web 应用。已完成 [技术栈规划](docs/TechStack.md) 的 Phase 0 基础框架，以及按 `docs/reference/` 复现的首页、登录／注册弹窗和全部九个工作台页面。账号与任务后端尚未接入。

## 本地启动

要求 Node.js 24.x、pnpm 11.22.0（版本约束见 `.nvmrc` 和 `package.json`）。

```bash
# 已安装 nvm 时可使用；否则直接安装 Node.js 24
nvm use

# 尚未安装指定版本 pnpm 时执行
npm install --global pnpm@11.22.0

pnpm install --frozen-lockfile
pnpm dev
```

打开终端输出的本地地址，默认是 http://localhost:3000。

可直接访问 `/today` 预览工作台，也可从首页登录／注册弹窗中的「直接预览工作台」进入。

当前不需要环境变量或外部服务。未来新增配置时，在 `.env.example` 中记录变量名，把本地值放入 `.env.local`；不要提交密钥。只有可以公开到浏览器的配置才能使用 `NEXT_PUBLIC_` 前缀。

## 常用命令

| 命令                | 用途                                              |
| ------------------- | ------------------------------------------------- |
| `pnpm dev`          | 启动开发服务                                      |
| `pnpm build`        | 创建生产构建                                      |
| `pnpm start`        | 启动生产服务，需先 build                          |
| `pnpm lint`         | ESLint 检查，警告视为失败                         |
| `pnpm lint:fix`     | 自动修复可修复的 ESLint 问题                      |
| `pnpm typecheck`    | 生成 Next.js 路由类型并检查 TypeScript            |
| `pnpm format`       | 格式化项目，保留原始 PRD 和技术栈文档             |
| `pnpm format:check` | 检查格式                                          |
| `pnpm test:i18n`    | 检查词条、插值、日期格式和偏好值                  |
| `pnpm check`        | 依次执行 lint、typecheck、test:i18n、format:check |

## 项目结构

```text
.
├── .github/workflows/ci.yml  # 安装、代码检查、生产构建
├── docs/                    # 产品、技术栈与开发约定
├── public/                  # 静态资源
├── src/
│   ├── app/                 # App Router：路由、layout、页面组合
│   ├── components/
│   │   ├── ui/              # 按需添加的 shadcn/ui 基础组件
│   │   ├── layout/          # 应用布局组件
│   │   ├── task/            # 任务展示组件
│   │   └── shared/          # 跨功能通用组件
│   ├── features/            # 按业务域组织的功能模块
│   ├── i18n/                # 类型化词典、格式化、服务端偏好读取
│   ├── hooks/               # 跨功能复用的 React Hooks
│   ├── lib/                 # 无业务依赖的工具、外部库配置
│   ├── types/               # 跨功能共享的类型
│   └── styles/              # Tailwind 入口、全局样式、主题变量
├── components.json          # shadcn/ui CLI 配置
├── next.config.ts
├── tsconfig.json            # 严格模式，@/* 指向 src/*
├── package.json
└── pnpm-lock.yaml           # 提交并用于可复现安装
```

空目录通过 `.gitkeep` 保留，开始实现时可以删除对应占位文件。具体职责和后续扩展方式见 [开发约定](docs/Development.md)。

## UI 基础

后续界面开发统一参考 [界面设计规范](docs/style.md)，其中记录当前首页与登录弹窗的样式，以及向工作台扩展时的约定。

已配置 Tailwind CSS v4、Lucide、shadcn/ui 的目录别名、`cn()` 工具和基础主题变量。Dialog 和 Tabs 使用 shadcn/ui 官方源码及 Radix 基础能力，样式通过功能模块的 CSS Modules 定制。

- `src/features/landing`：首页内容、任务预览与响应式样式；页面主体保持 Server Component。
- `src/features/auth`：登录／注册弹窗、表单交互和共享触发入口；只在交互边界使用 Client Component。
- 首页右上角 Log In 打开登录弹窗，Start Now 和主要 CTA 打开注册弹窗。关闭按钮、遮罩和 Esc 均可关闭，关闭后焦点返回触发按钮。
- 表单支持浏览器必填／邮箱校验和注册密码长度校验。提交与忘记密码入口显示服务尚未接入的提示，不发送、保存或记录凭证。
- 登录 UI 按参考保留密码字段；后续接入实际账号服务时，需与技术栈规划中的 Email OTP 方案统一。
- 首页任务、指标和评价沿用参考展示内容，不代表真实业务数据；预览任务勾选不持久化。Pricing 链接定位到首页底部入口，尚未配置套餐。
- Inter、Playfair Display 通过 `@fontsource` 本地打包，运行和构建不依赖 Google Fonts。参考 HTML 保持原样，不参与格式化。

需要实际使用组件时再添加，例如：

```bash
pnpm dlx shadcn@latest add button
```

组件源码进入 `src/components/ui`，CLI 会补充所需依赖。颜色统一使用语义变量，适配浅色、暗色与跟随系统三种外观。

## 工作台页面与交互

| 路由           | 对应参考         | 内容                                      |
| -------------- | ---------------- | ----------------------------------------- |
| `/today`       | today.html       | 今日双栏手账、One Thing、时间轴、专注入口 |
| `/inbox`       | inbox.html       | 收件箱、快速添加、Inbox Zero              |
| `/upcoming`    | upcoming.html    | 按日期分组、Work / Study / Life 筛选      |
| `/calendar`    | calendar.html    | 日、周、月视图及日期切换                  |
| `/list-detail` | list-detail.html | Work & Projects 项目清单、排序、添加任务  |
| `/completed`   | completed.html   | 已完成任务、恢复、删除                    |
| `/profile`     | profile.html     | 等级、花园、全部工作台页面入口            |
| `/insight`     | insight.html     | 统计卡片、专注热力图                      |
| `/settings`    | settings.html    | 偏好表单、设置分类切换                    |

- `(workspace)/layout.tsx` 共享 Dock 与前端状态，页面使用 Next Link 导航。个人主页提供全部辅助页面入口，Today、Upcoming 与 Calendar 之间也有快捷链接。
- `features/tasks` 管理示例任务、详情抽屉、快速添加及完成／恢复状态；`components/task/task-row.tsx` 是共用任务展示组件。任务的修改会同步到相关视图；工作项目清单默认展示标记为 `inWorkList` 的项目任务，也可切换 All Work、Study、Life，查看被分配或恢复到其他清单的任务。
- Dock 的加号或 `⌘K / Ctrl+K` 打开快速添加。输入 `/` 可搜索页面并用 Enter 跳转；点击任务正文打开详情，圆形复选框完成任务。
- 抽屉支持修改标题、描述、日期、优先级、清单、标签、预估和提醒，以及子任务添加／勾选。弹层支持 Esc、焦点约束和关闭后的焦点恢复。
- 专注计时支持暂停、继续和退出；设置中的番茄钟时长、每周起始日及每日容量会分别影响专注、日历和 Today。音效、自动休息与通知开关仅保留前端偏好，不启动音频、后台计时或系统通知。
- 日期以设计稿中的 2026-09-09 为演示锚点。任务截止日期与安排的工作时段分开保存：日／周视图展示工作时段，月视图展示截止日期。实际任务数动态计算，修正原稿中数量不一致及星期／日期不匹配的问题。
- 任务数据和业务设置仅在工作台布局的 React 状态中保留，刷新或离开工作台后恢复示例。不使用数据库、远程 API 或真实登录；语言与主题偏好例外，使用 Cookie 保存。AI 寄语、统计、经验值和花园为展示内容，不是实际 AI 或统计服务。
- 页面级标题和布局保持 Server Components；交互按功能模块划分 Client Components。公共页面配方位于 `src/styles/workspace.module.css`，各功能的独有样式使用 CSS Modules。

## 语言与外观

- 支持简体中文和 English，默认简体中文；外观支持浅色、暗色、跟随系统，默认跟随系统。
- 首页顶栏右侧与工作台内容区右上角提供快捷切换；设置页的「通用」管理语言，「外观」管理主题。底部 Dock 继续承担任务导航。偏好即时生效，无需点击保存。
- 翻译覆盖页面、导航、登录弹窗、任务抽屉、提示、无障碍名称和页面标题。任务标题、描述、标签等用户内容保持原文，清单和排序的内部值不随语言变化。
- `src/i18n` 提供类型化词典和 Intl 日期／数字格式化；`features/preferences` 统一管理客户端状态与切换控件。没有新增运行时依赖或修改现有路由路径。
- `dida-locale`、`dida-theme` Cookie 保存一年，跨页面与刷新保留。服务端读取偏好，首屏直接输出对应语言与主题；系统主题通过 CSS 媒体查询适配首屏，并监听系统外观变化。
- 根布局读取 Cookie，因此页面使用按请求渲染；不适用于纯静态导出。当前使用同一 URL 的语言偏好，尚未引入语言前缀路由或独立多语言 SEO 页面。

## 质量与后续开发

GitHub Actions 在 push / pull request 时使用锁文件安装依赖，运行 `pnpm check` 和 `pnpm build`。代码通过后再合并；分支保护需在实际 GitHub 仓库中配置。

下一阶段进入 Todo + Auth 时，再按技术栈文档引入 Supabase、RLS、Zod、React Hook Form、TanStack Query，并建立 Service / Repository 边界。Vitest、Testing Library、Playwright 随实际业务逻辑和关键流程引入，当前不预装。

安装配置参考 [Next.js 官方安装文档](https://nextjs.org/docs/app/getting-started/installation) 和 [shadcn/ui 手动配置文档](https://ui.shadcn.com/docs/installation/manual)。
