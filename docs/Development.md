# 开发约定

## 当前范围

项目已具备 Next.js、React、TypeScript、pnpm、Tailwind CSS、Radix UI、ESLint、Prettier 和 CI 基础。首页、登录／注册弹窗与工作台已实现，清单并入 Inbox；支持中英文及浅色／暗色／跟随系统，显示偏好通过 Cookie 保存。

账号接入 Supabase Auth，支持注册、密码／验证码登录、邮箱验证码重置密码与邮箱换绑。设置页统一验证邮箱，网址参数不能跳过验证；云端认证策略单独配置。任务、子任务、资料、偏好、通知、语音确认、成长事实及专注记录已写入 Supabase Postgres（RLS 与归属约束见迁移），不再用示例任务作为个人数据。本人数据导出与删除走服务端接口，服务角色密钥仅留在服务端。

后续按 [实施计划](implementation-plan.md) 的稳定编号推进；本次见 [修复记录](review-remediation-20260917.md)。旧审查文档是历史记录，不是当前功能状态。

这是单一 Next.js 工程，当前不需要 monorepo、独立后端、全局状态库或任务队列。原始 `PRD.md` 和 `TechStack.md` 保持原样。

## 目录与依赖边界

新增或调整界面前，先阅读 [界面设计规范](style.md)，按当前配色、字体、组件状态和响应式规则实现。公共设计变更需同步更新该规范。

- `app`：遵循 App Router 文件约定，负责路由、页面组合、布局和路由级边界，避免堆积业务逻辑。
- `features/<domain>`：组织一个业务域的功能组件、专用 Hooks、类型和逻辑。仅供该域使用的内容与功能放在一起。
- `components/ui`：通过 shadcn/ui 按需添加的基础组件，不依赖业务模块。
- `components/layout`：应用外壳和导航等布局，出现实际需求时实现。
- `components/task`：任务展示组件；数据读取、业务编排归 `features/tasks`。
- `components/shared`：跨功能的通用展示组件，不承载数据访问。
- `hooks`、`types`：只存放已经出现跨功能复用需求的 Hooks 和类型；不要把所有文件都提升到全局。
- `i18n`：语言与主题标识、类型化词典、Intl 格式化和服务端偏好读取；不依赖功能组件。
- `features/preferences`：全站显示偏好 Provider 与可复用切换控件。
- `lib`：通用工具和外部 SDK 配置。避免把业务逻辑集中到 utils 文件。
- `styles`：全局 CSS、设计变量、Tailwind 配置入口；通用组件使用 Tailwind，参考页面的细节样式使用功能域内的 CSS Modules，避免选择器污染。

默认使用 Server Components，只有需要状态、事件或浏览器 API 的组件才添加 `"use client"`，尽量缩小客户端边界。服务器密钥和仅服务端依赖不能进入客户端模块。

任务数据已接入，继续维持以下边界，不为未确认功能提前创建空抽象：

```text
页面 / 功能模块 → Service（业务规则）→ Repository（数据访问）→ Supabase
```

UI 不直接调用 `supabase.from(...)`。账号数据已按此边界接入（`src/lib/supabase/` 客户端 + RLS 策略，迁移文件见 `supabase/migrations/`）；不提前生成空的服务、接口、数据库表或 Provider 抽象。

## 国际化与外观

- 服务端组件调用 `await getI18n()`（`@/i18n/server`），客户端调用 `useI18n()`（`@/features/preferences/preferences-provider`）。保持原有 Server / Client 边界，不为翻译把整个页面改成客户端组件。
- 界面固定文案使用 `t()`；词条集中在 `src/i18n/messages.ts`，以可读源文案作为键，新增时同时补齐 `zh-CN` 和 `en`。计数词条的英文可使用 `{ one, other }`，由 `Intl.PluralRules` 根据 `count` 选择单复数。完整动态句子使用命名键及占位符，不通过拼接词语生成句子。`label()` 仅用于已有配置枚举的显示名。
- 业务数据保持稳定：`select` 的 `value`、清单 ID、排序值等不得翻译；只翻译显示标签。用户任务内容保持原文。需要跨语言切换保留的提示存储词条键与参数，在渲染时翻译。
- 日期与数字使用 `date()` / `number()`；日期时区来自账户偏好（默认 `Asia/Shanghai`），纯日期输入按当天中午解释，避免时区转换造成前后一天偏移。时区值必须是 IANA 名称，切换显示格式或时区不能改动任务事实。
- Cookie `dida-locale` / `dida-theme` 保存一年；服务端校验未知值并回退到简体中文／跟随系统。语言切换通过 `router.refresh()` 同步服务端文案，不清空工作台客户端状态。
- 主题由根元素 `data-theme` 和语义 CSS 变量控制，系统模式在 CSS 中处理首屏，在客户端监听系统变化。不要为功能页面另建主题状态或硬编码白色卡片背景。
- 首页和工作台右上角提供快捷入口；设置的通用／外观页复用相同控件。两种入口使用同一个 Provider，选择后立即生效。
- 根布局读取 Cookie，页面采用动态服务端渲染。保持现有 URL，当前不按语言拆分路由；后续若需要可分享的多语言页面及 SEO，再考虑语言前缀。

## 命名和导入

- 文件和目录使用 kebab-case，例如 `task-row.tsx`、`use-task-detail.ts`。
- React 组件和类型使用 PascalCase；函数和变量使用 camelCase。
- Next.js 约定文件保留原名，例如 `page.tsx`、`layout.tsx`。
- 跨目录引用优先使用 `@/` 别名，同目录引用可以使用相对路径。
- TypeScript 已启用 strict，避免使用 `any`；类型导入使用 `import type`。
- 不提前创建大量 barrel exports；有稳定公开接口需求时再增加 `index.ts`。

## 提交前检查

```bash
pnpm check
pnpm build
```

格式不符时执行 `pnpm format`；检查失败先修复原因。`pnpm check` 包含 lint、类型、国际化、认证、持久化、同步恢复、审查回归、阶段一至三、语音回归和格式检查，构建不能替代这些检查。测试使用 Node.js 测试运行器；隔离测试不替代真实 Supabase、邮箱或麦克风验收。界面还需检查两种语言、三种主题、移动端与弹窗键盘操作。

阶段功能见 [交付记录](stage-delivery-20260917.md)。`test:stage-one` 使用开发依赖 PGlite 在内存 PostgreSQL 中实际执行迁移，并模拟 Auth/RLS，测试重复事务与跨账号约束；不读取生产数据库、不进入应用客户端包。`test:stage-two` 使用模拟时钟验证专注周期和实际 Timer 的保存/切换/退出。两者都纳入 `pnpm check`。

CI 构建并启动服务后单独设置 `WORKSPACE_TEST_ORIGIN` 执行匿名 HTTP/RSC 验证；构建和服务使用隔离占位 Supabase 配置，不需要生产密钥。本地已有运行服务时也可显式设置此变量运行 `test:auth-security`；没有变量时只跳过该 HTTP 用例。

建议提交信息使用 `feat:`、`fix:`、`chore:`、`docs:` 等前缀。依赖升级时同步提交 `package.json` 与 `pnpm-lock.yaml`，不要混用 npm / yarn 锁文件。

## 环境与部署

Node.js 固定 24 主版本，pnpm 版本由 `packageManager` 固定。所有直接依赖精确保存，CI 使用 `--frozen-lockfile`。

TypeScript 固定在与当前 ESLint 工具链兼容的 5.9 版本。pnpm 的 `saveExact` 和 `engineStrict` 配置位于 `pnpm-workspace.yaml`；该文件只承载包管理配置，项目仍然是单包工程。

开发和生产构建默认使用 Next.js 内置的 Webpack（`--webpack`）。初始化环境限制了 Turbopack 的工作进程端口绑定，因此采用已通过构建验证的 Webpack。以后在目标环境验证 Turbopack 后，可以移除这两个脚本中的 `--webpack` 参数。

本地预览同时支持 `localhost` 和 `127.0.0.1`。`next.config.ts` 中的 `allowedDevOrigins` 仅额外允许 `127.0.0.1`，避免默认以 localhost 启动时阻止预览页的客户端脚本和热更新请求。修改此配置后需重启开发服务并刷新页面。

`.env.local` 当前承载两类配置：账号必需的 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`，以及可选的语音服务 Key（见 `.env.example` 注释）。邮件发送不使用环境变量——通过 Resend 自定义 SMTP 在 Supabase Dashboard 配置，模板见 `docs/email-templates/`；`/auth/callback` 需加入 Supabase Auth 的 Redirect URLs。新增环境变量时同步维护 `.env.example`。不在日志、源码或提交记录中写入实际密钥。

部署面向 Vercel（`vercel.json` 已就位）；Supabase 侧需依次完成：执行 `supabase/migrations/` 迁移、配置 Resend SMTP、替换邮件模板、登记 Site URL 与 Redirect URLs（含 `/auth/callback`）。
