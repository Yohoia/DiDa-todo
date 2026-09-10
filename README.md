<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="DiDa-todo：从想法到完成，掌控每一天">
</p>

<p align="center">
  一个以任务为核心，串联日程、专注与成长反馈的双语 Web 工作台。
  <br>
  <sub>Phase 0 · 前端交互原型 · 数据暂存于浏览器会话</sub>
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> ·
  <a href="#核心体验">核心体验</a> ·
  <a href="#项目结构">项目结构</a> ·
  <a href="./docs/Development.md">开发约定</a>
</p>

## 先看产品

<p align="center">
  <img src="./assets/readme/showcase.webp" width="100%" alt="DiDa-todo 的首页、周日历和统计洞察界面">
</p>

从首页进入工作台后，可以在同一套安静、紧凑的视觉语言中完成任务收集、时间安排、深度专注与进度回顾。界面支持简体中文与 English，也支持浅色、暗色和跟随系统外观。

> [!IMPORTANT]
> 当前仓库是可交互的前端原型。账号、数据库、远程 API 与真实 AI 服务尚未接入；首页指标、评价、统计与 AI 寄语均为展示内容。

## 核心体验

| 工作流     | 可以体验什么                          | 入口                                 |
| ---------- | ------------------------------------- | ------------------------------------ |
| 规划今天   | One Thing、容量提示、冻结任务与时间线 | `/today`                             |
| 收集与整理 | Inbox 快速添加、任务详情、清单与标签  | `/inbox`、`/list-detail`             |
| 安排时间   | 日／周／月视图、日期切换、任务时段    | `/calendar`、`/upcoming`             |
| 保持专注   | 可暂停、继续与退出的专注计时          | `/today`                             |
| 回顾成长   | 已完成任务、专注热力图、等级与花园    | `/completed`、`/insight`、`/profile` |

- 使用 Dock 或 `⌘K / Ctrl+K` 快速添加任务；输入 `/` 可搜索页面并跳转。
- 在任务详情中编辑标题、描述、日期、优先级、清单、标签、预估、提醒与子任务。
- 任务完成／恢复状态会同步到相关视图；语言和主题偏好通过 Cookie 跨刷新保留。
- 键盘焦点、Esc 关闭、弹层焦点约束和减少动态效果均有对应处理。

## 快速开始

需要 Node.js `24.x` 与 pnpm `11.22.0`。

```bash
git clone https://github.com/Yohoia/DiDa-todo.git
cd DiDa-todo
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

打开 <http://localhost:3000/today>，即可跳过尚未接入的账号流程，直接体验工作台。当前不需要环境变量或外部服务。

## 技术设计

```text
Next.js App Router
├── Server Components        页面骨架、服务端偏好读取
├── Client feature islands   任务、弹层、计时与导航状态
├── Typed i18n               中英词典、日期与数字格式化
└── Semantic design tokens   浅色、暗色与系统主题
```

核心栈为 Next.js 16、React 19、TypeScript、Tailwind CSS v4、Radix UI 与 Framer Motion。字体通过 `@fontsource` 本地打包，运行和构建不依赖 Google Fonts。

任务数据与业务设置目前集中在工作台布局的 React 状态中：路由切换时保留，刷新后恢复示例数据。后续接入 Supabase 时，计划通过 `UI → Service → Repository → Supabase` 保持数据访问边界。

## 项目结构

```text
src/
├── app/              路由、布局与错误边界
├── components/       UI、布局、任务与共享组件
├── features/         landing、tasks、calendar、focus 等业务域
├── i18n/             类型化词典与服务端偏好
├── lib/              日期与通用工具
└── styles/           全局主题与工作台公共样式

docs/                 PRD、技术规划、设计规范与开发约定
public/               品牌与错误状态资源
```

更完整的职责边界见 [开发约定](./docs/Development.md)，视觉变量与组件配方见 [界面设计规范](./docs/style.md)。

## 质量检查

```bash
pnpm check
pnpm build
```

`pnpm check` 会依次运行 ESLint、TypeScript 路由类型检查、国际化测试与 Prettier 检查。GitHub Actions 会在 push 和 pull request 时执行同样的检查并创建生产构建。

## 当前边界

- 没有数据库、持久化任务、真实认证或多用户能力。
- 音效、自动休息和通知开关仅保存前端偏好，不会启动系统能力。
- 日期以 `2026-09-09` 为演示锚点；统计、经验值和花园均为示例。
- 当前使用 Cookie 管理语言与主题，因此根布局按请求渲染，不适用于纯静态导出。

## 路线与文档

- [产品需求](./docs/PRD.md)
- [技术栈规划](./docs/TechStack.md)
- [界面设计规范](./docs/style.md)
- [开发约定](./docs/Development.md)

下一阶段将进入 Todo + Auth：接入 Supabase、RLS、表单校验与数据访问边界，并为真实业务逻辑补充 Vitest、Testing Library 和 Playwright。
