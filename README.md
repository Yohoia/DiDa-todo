# DiDa-todo

基于 Next.js App Router 的单体 Web 应用。已完成 [技术栈规划](docs/TechStack.md) 的 Phase 0 基础框架，以及按 `docs/reference/` 复现的首页和登录／注册弹窗。账号与任务后端尚未接入。

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

当前不需要环境变量或外部服务。未来新增配置时，在 `.env.example` 中记录变量名，把本地值放入 `.env.local`；不要提交密钥。只有可以公开到浏览器的配置才能使用 `NEXT_PUBLIC_` 前缀。

## 常用命令

| 命令                | 用途                                   |
| ------------------- | -------------------------------------- |
| `pnpm dev`          | 启动开发服务                           |
| `pnpm build`        | 创建生产构建                           |
| `pnpm start`        | 启动生产服务，需先 build               |
| `pnpm lint`         | ESLint 检查，警告视为失败              |
| `pnpm lint:fix`     | 自动修复可修复的 ESLint 问题           |
| `pnpm typecheck`    | 生成 Next.js 路由类型并检查 TypeScript |
| `pnpm format`       | 格式化项目，保留原始 PRD 和技术栈文档  |
| `pnpm format:check` | 检查格式                               |
| `pnpm check`        | 依次执行 lint、typecheck、format:check |

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

组件源码进入 `src/components/ui`，CLI 会补充所需依赖。浅色主题为默认，`.dark` 变量已预留；尚未实现主题切换。

## 质量与后续开发

GitHub Actions 在 push / pull request 时使用锁文件安装依赖，运行 `pnpm check` 和 `pnpm build`。代码通过后再合并；分支保护需在实际 GitHub 仓库中配置。

下一阶段进入 Todo + Auth 时，再按技术栈文档引入 Supabase、RLS、Zod、React Hook Form、TanStack Query，并建立 Service / Repository 边界。Vitest、Testing Library、Playwright 随实际业务逻辑和关键流程引入，当前不预装。

安装配置参考 [Next.js 官方安装文档](https://nextjs.org/docs/app/getting-started/installation) 和 [shadcn/ui 手动配置文档](https://ui.shadcn.com/docs/installation/manual)。
