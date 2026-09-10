# 开发约定

## 当前范围

Phase 0 建立开发基础：Next.js、React、TypeScript、pnpm、Tailwind CSS、shadcn/ui 配置、Lucide、ESLint、Prettier 和 CI。当前首页、登录／注册弹窗及九个工作台页面已按 `docs/reference/` 实现；交互仅使用前端示例状态，尚未接入业务后端。已实现简体中文／英文和浅色／暗色／跟随系统切换，显示偏好用 Cookie 保存。

这是单一 Next.js 工程，当前不需要 monorepo、独立后端、数据库、认证、全局状态库或任务队列。原始 `PRD.md` 和 `TechStack.md` 保持原样。

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

Phase 1 实际接入数据时，按需求增加 `services/`、`repositories/`、`schemas/`，形成：

```text
页面 / 功能模块 → Service（业务规则）→ Repository（数据访问）→ Supabase
```

UI 不直接调用 `supabase.from(...)`。接入账号数据时同步配置数据库 RLS；不提前生成空的服务、接口、数据库表或 Provider 抽象。

## 国际化与外观

- 服务端组件调用 `await getI18n()`（`@/i18n/server`），客户端调用 `useI18n()`（`@/features/preferences/preferences-provider`）。保持原有 Server / Client 边界，不为翻译把整个页面改成客户端组件。
- 界面固定文案使用 `t()`；词条集中在 `src/i18n/messages.ts`，以可读源文案作为键，新增时同时补齐 `zh-CN` 和 `en`。计数词条的英文可使用 `{ one, other }`，由 `Intl.PluralRules` 根据 `count` 选择单复数。完整动态句子使用命名键及占位符，不通过拼接词语生成句子。`label()` 仅用于已有配置枚举的显示名。
- 业务数据保持稳定：`select` 的 `value`、清单 ID、排序值等不得翻译；只翻译显示标签。用户任务内容保持原文。需要跨语言切换保留的提示存储词条键与参数，在渲染时翻译。
- 日期与数字使用 `date()` / `number()`；日期时区明确为 `Asia/Shanghai`，纯日期输入按当天中午解释，避免时区转换造成前后一天偏移。
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

格式不符时执行 `pnpm format`；代码检查失败时优先修复原因。`pnpm check` 包含 lint、类型、国际化测试和格式检查，因为生产构建不能替代这些质量检查。`pnpm test:i18n` 使用项目现有 TypeScript 和 Node.js 测试运行器，验证词条完整性、占位符一致性、插值、日期和偏好校验。界面改动还需检查两种语言、三种主题、移动端布局及弹窗键盘操作。

建议提交信息使用 `feat:`、`fix:`、`chore:`、`docs:` 等前缀。依赖升级时同步提交 `package.json` 与 `pnpm-lock.yaml`，不要混用 npm / yarn 锁文件。

## 环境与部署

Node.js 固定 24 主版本，pnpm 版本由 `packageManager` 固定。所有直接依赖精确保存，CI 使用 `--frozen-lockfile`。

TypeScript 固定在与当前 ESLint 工具链兼容的 5.9 版本。pnpm 的 `saveExact` 和 `engineStrict` 配置位于 `pnpm-workspace.yaml`；该文件只承载包管理配置，项目仍然是单包工程。

开发和生产构建默认使用 Next.js 内置的 Webpack（`--webpack`）。初始化环境限制了 Turbopack 的工作进程端口绑定，因此采用已通过构建验证的 Webpack。以后在目标环境验证 Turbopack 后，可以移除这两个脚本中的 `--webpack` 参数。

本地预览同时支持 `localhost` 和 `127.0.0.1`。`next.config.ts` 中的 `allowedDevOrigins` 仅额外允许 `127.0.0.1`，避免默认以 localhost 启动时阻止预览页的客户端脚本和热更新请求。修改此配置后需重启开发服务并刷新页面。

当前基础框架无需 `.env.local`。新增环境变量时同步维护 `.env.example`。不在日志、源码或提交记录中写入实际密钥。

本阶段只准备本地开发工程及 CI 配置，不创建远程仓库或部署资源。后续按技术栈文档选择 Vercel / Supabase，并在接入时补充对应配置。
