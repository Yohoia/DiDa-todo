# DiDa-todo Web 技术栈规划

> 版本：V0.3  
> 平台范围：**仅 Web**
>  
> 技术策略：**按阶段逐步引入，不提前加载暂时用不到的基础设施**
>  
> 产品方向：Todo + Focus + Growth + AI Capture + AI Intelligence + Agent

---

# 1. 技术选型目标

DiDa-todo 当前只考虑 Web 端，因此整个技术体系围绕：

```text
Browser
   ↓
Next.js Web App
   ↓
Application / Service Layer
   ↓
Database / Auth / Background Jobs / AI
```

进行设计。

当前不考虑：

```text
React Native
Expo
iOS App
Android App
Flutter
Native Push SDK
Mobile Offline Sync
```

---

# 2. 核心技术原则

整个项目后续技术选型遵循以下原则。

## 2.1 Web First

当前所有产品体验优先针对：

```text
Desktop Browser
+
Responsive Web
```

进行优化。

后期可以做：

```text
PWA
```

但仍属于 Web 产品，而不是独立移动 App。

---

## 2.2 技术逐阶段引入

不采用：

```text
项目创建
↓
一次安装 30 个库
↓
以后也不知道哪些真正需要
```

而采用：

```text
Todo
↓
Planning
↓
Focus
↓
Growth
↓
AI
↓
Automation
↓
Agent
```

每进入一个产品阶段，再增加对应技术。

---

## 2.3 不为未来规模提前过度架构

初期不引入：

- Microservices
- Redis
- Kafka
- RabbitMQ
- Kubernetes
- ClickHouse
- Data Warehouse
- 独立 Vector Database
- 独立 Backend Service
- LangGraph
- 多种 ORM

这些技术不是永远不用，而是：

> **等出现明确问题以后再解决。**

---

# 3. 长期总体架构

虽然工具逐阶段引入，但架构边界从第一天就需要清楚。

```text
                     Browser
                        │
                        ▼
                  Next.js Web
                  React / TS
                        │
              ┌─────────┴─────────┐
              │                   │
              ▼                   ▼
             UI               Feature Layer
                                  │
                                  ▼
                            Service Layer
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
          Supabase            Background             AI
                              Jobs / Events
              │
       PostgreSQL/Auth
```

后期逐步演变：

```text
                        DiDa-todo Web
                              │
                         Next.js
                              │
                      Service Layer
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
     Supabase              Inngest            AI Provider
        │                                         │
 PostgreSQL/Auth                            Vercel AI SDK
 RLS/Search                                      │
 Storage                                     LLM Providers
 pgvector
```

---

# 4. Phase 0 — 项目骨架

## 阶段目标

首先建立一个：

> 干净、稳定、可以持续开发的 Web 项目。

这个阶段甚至不需要数据库业务逻辑。

---

# 5. Phase 0 引入技术

### Core

```text
Node.js
pnpm
Next.js
React
TypeScript
```

### UI

```text
Tailwind CSS
shadcn/ui
Lucide
```

### Code Quality

```text
ESLint
Prettier
```

### Git

```text
Git
GitHub
```

---

# 6. 为什么现在只需要这些

因为此时主要解决：

- 项目启动
- Layout
- Sidebar
- Today UI
- Task Row
- Task Detail UI
- Auth UI
- Design System

还不需要：

```text
AI
Background Jobs
Charts
Vector DB
Redis
Realtime
```

---

# 7. Phase 0 推荐目录

```text
src/

├── app/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── task/
│   └── shared/
│
├── features/
│
├── lib/
│
├── hooks/
│
├── types/
│
└── styles/
```

---

# 8. Phase 0 实际安装

核心：

```bash
next
react
react-dom
typescript
```

UI：

```bash
tailwindcss
lucide-react
```

然后通过：

```text
shadcn/ui
```

按需添加组件。

---

# 9. Phase 0 暂不引入

暂时不要：

```text
TanStack Query
Zustand
Supabase
React Hook Form
Zod
Recharts
Inngest
AI SDK
pgvector
PostHog
Sentry
```

只有真正进入对应业务阶段以后再加入。

---

# 10. Phase 1 — 基础 Todo + Auth

## 阶段目标

这一阶段要做出真正能使用的 DiDa Todo。

包含：

### Account

- Email OTP 注册（邮箱 + 密码 + 六位验证码，验证通过后设置密码）
- Email OTP 登录 / 密码登录（双模式）
- 忘记密码（邮件链接经 /auth/callback 回跳至设置页）
- Session
- Logout
- Profile（默认用户名取邮箱前缀，默认头像内置）
- 用户数据隔离

### Task

- Create
- Read
- Update
- Delete
- Complete
- Restore

### Task Properties

- Title
- Description
- Due Date
- Priority
- List
- Tags
- Subtasks

### Views

- Inbox
- Today
- Upcoming
- Lists
- Completed
- Search

---

# 11. Phase 1 新增技术

## Database / Auth

```text
Supabase
PostgreSQL
Supabase Auth
PostgreSQL RLS
```

---

## Validation

```text
Zod
```

---

## Form

```text
React Hook Form
```

主要用于：

- Login
- OTP
- Task Form
- Profile
- Settings

---

## Server State

```text
TanStack Query
```

主要负责：

- Tasks
- Lists
- Tags
- Completed
- Search Results

以及：

- Query Cache
- Mutation
- Optimistic Update

---

## UI State

此阶段如果 UI 状态已经明显变复杂，再引入：

```text
Zustand
```

负责：

```text
Task Detail Drawer
Quick Add
当前选中 Task
Sidebar 状态
```

如果状态还很少：

> Zustand 可以继续推迟。

---

# 12. Phase 1 为什么引入 Supabase

因为当前已经真正出现：

```text
User
↓
Authentication
↓
User-owned Data
↓
Task CRUD
```

使用 Supabase 可以同时提供：

- PostgreSQL
- Auth
- RLS
- Storage 预留

而且不需要自己先开发：

```text
JWT
Refresh Token
Password
OTP Database
Session System
```

---

# 13. RLS 从第一阶段开始

这个不能后补。

例如：

```text
tasks

id
user_id
title
...
```

数据库必须限制：

```text
auth.uid() = user_id
```

形成：

```text
Application Permission
+
Database RLS
```

双重数据隔离。

---

# 14. Service Layer 从第一阶段建立

这是长期非常重要的一点。

不要：

```text
Task Component
↓
supabase.from("tasks")
```

到处直接访问数据库。

建议：

```text
Task Component
↓
Task Service
↓
Task Repository
↓
Supabase
```

例如：

```text
createTask()

updateTask()

completeTask()

deleteTask()
```

---

# 15. 推荐 Feature 结构

此阶段升级目录：

```text
src/

├── app/
│
├── components/
│
├── features/
│   │
│   ├── auth/
│   │
│   ├── tasks/
│   │
│   ├── lists/
│   │
│   ├── tags/
│   │
│   └── search/
│
├── services/
│   ├── task-service.ts
│   ├── auth-service.ts
│   └── list-service.ts
│
├── repositories/
│
├── schemas/
│
├── hooks/
│
├── lib/
│
└── types/
```

---

# 16. Phase 1 Search

暂时只使用：

```text
PostgreSQL
```

支持：

- Title Search
- Description
- List
- Tag

后续可以增加：

```text
PostgreSQL Full Text Search
pg_trgm
```

现在完全不需要：

```text
Elasticsearch
Algolia
Vector Search
```

---

# 17. Phase 1 Testing

此时开始引入：

```text
Vitest
Testing Library
Playwright
```

但是测试重点放在关键逻辑。

## Unit

例如：

```text
Task validation
Date utility
Priority
```

## E2E

最重要的一条流程：

```text
Register
↓
Login
↓
Create Task
↓
Edit
↓
Complete
↓
Logout
```

---

# 18. Phase 1 最终技术

```text
Next.js
React
TypeScript

Tailwind
shadcn/ui
Lucide

Supabase
PostgreSQL
Supabase Auth
RLS

Zod
React Hook Form

TanStack Query

Zustand（按需）

Vitest
Playwright
```

---

# 19. Phase 2 — Planning + Calendar + Focus

## 阶段目标

从：

> 记录 Todo

升级到：

> 真正安排和执行 Todo。

新增：

### Planning

- Calendar
- One Thing
- Task Freeze
- Daily Capacity
- Estimated Time
- Estimated Pomodoros

### Focus

- Pomodoro
- Task × Pomodoro
- Focus Mode
- Break
- Focus History
- Focus Goal

---

# 20. Phase 2 新增 date-fns

使用：

```text
date-fns
```

处理：

- Today
- Tomorrow
- This Week
- Calendar
- Recurring Date
- Due Date
- Date Formatting

不要自己写大量时间处理函数。

---

# 21. Phase 2 新增 dnd-kit

当真正开始：

- Today 排序
- Calendar 拖拽
- List 排序
- Subtask 排序

再加入：

```text
dnd-kit
```

不要 Phase 0 就安装。

---

# 22. Calendar 技术

初期 Calendar 推荐：

```text
React
+
date-fns
+
dnd-kit
+
自定义 UI
```

暂时不引入：

```text
FullCalendar
```

因为 DiDa Calendar 核心并不是复杂会议系统。

而是：

```text
Task
+
Capacity
+
Focus
+
One Thing
```

如果后期 Calendar 复杂度明显提高，再考虑成熟 Calendar Framework。

---

# 23. Pomodoro 核心技术原则

Pomodoro 不能依赖：

```text
setInterval
```

作为真实时间。

必须保存：

```text
started_at

planned_duration

ends_at
```

前端：

```text
remaining =
ends_at - currentTime
```

因此：

> Timestamp 才是真实状态。

`setInterval` 只负责刷新画面。

---

# 24. Focus 数据结构

新建：

```text
focus_sessions
```

建议：

```text
id

user_id
task_id

started_at
ended_at

planned_seconds
actual_seconds

status
```

例如：

```text
running
completed
interrupted
abandoned
```

---

# 25. Phase 2 Web Notification

Pomodoro 完成以后用户可能已经切换 Tab。

此时可以增加：

```text
Web Notifications API
```

用途：

```text
Focus finished

Break finished

Task reminder
```

这属于浏览器原生 API。

暂时不需要额外 Push 服务。

---

# 26. Reminder 暂时分两级

### 简单版本

用户打开 DiDa 时：

```text
浏览器内 Reminder
```

即可。

### 可靠后台提醒

如果要求：

> 用户关闭网页以后也必须触发提醒。

那就属于后面的 Background Job 阶段。

此时不要提前引入 Inngest。

---

# 27. Daily Capacity 技术实现

无需 AI。

例如：

```text
daily_capacity = 8 Pomodoros
```

Today Tasks：

```text
Task A = 2
Task B = 3
Task C = 2
```

计算：

```text
7 / 8
```

这是纯业务逻辑。

放：

```text
Planning Service
```

中即可。

---

# 28. One Thing / Freeze

同样不需要特殊技术。

可以通过：

```text
daily_plans
```

或者任务关联数据实现。

例如：

```text
daily_task_commitments

user_id
task_id
date
type
```

type：

```text
one_thing
freeze
```

---

# 29. Phase 2 技术增加

新增：

```text
date-fns
dnd-kit
Web Notifications API
```

其他沿用 Phase 1。

---

# 30. Phase 3 — Growth + Reflection + Insights

## 阶段目标

现在用户已经开始产生：

```text
Task Data
Focus Data
Planning Data
```

这时候才值得做 Growth 和 Insights。

新增：

### Growth

- XP
- Level
- Coins
- Achievements
- Streak
- Daily Goal
- Focus Garden

### Reflection

- Task Check-in

### Insights

- Task Statistics
- Focus Statistics
- Heatmap
- Estimated vs Actual

---

# 31. XP 使用 Ledger

不要只在：

```text
profiles.xp
```

中不断 `+10`。

使用：

```text
xp_events
```

例如：

```text
task_completed
+20

focus_completed
+10

one_thing_completed
+30
```

这样以后可以：

- Audit
- Recalculate
- Fix bugs
- Analyze

---

# 32. Coins 同样使用 Ledger

新建：

```text
coin_transactions
```

例如：

```text
daily_goal
+20

reward_purchase
-500
```

---

# 33. Task Events

这一阶段建议正式强化：

```text
task_events
```

但其实最好 Phase 1 已经建立基础结构。

事件：

```text
task.created
task.completed
task.rescheduled

task.frozen
task.unfrozen

focus.started
focus.completed

checkin.created
```

后期 AI 会高度依赖这些事件。

---

# 34. Task Check-in

不需要额外技术框架。

建立：

```text
task_checkins
```

保存：

```text
difficulty

estimate_accuracy

energy

created_at
```

后面才用于 Energy Profile。

---

# 35. Phase 3 图表

此时才引入：

```text
Recharts
```

用于：

- Focus Trend
- Task Trend
- Estimated vs Actual
- List Distribution

Heatmap 可以：

```text
CSS Grid
+
普通 React
```

自己实现。

---

# 36. Phase 3 Monitoring

如果产品此时开始公开使用，建议加入：

```text
Sentry
```

用于：

- Frontend Error
- Server Error
- Production Debug

---

# 37. Phase 3 Product Analytics

如果已经有真实用户，再加入：

```text
PostHog
```

追踪：

```text
first_task_created

first_focus_started

one_thing_used

freeze_used

calendar_used
```

注意：

> PostHog 是产品分析。

不是用户自己的 Insights。

---

# 38. Phase 3 Animation

如果 Growth 反馈确实需要更好的动画：

再引入：

```text
Motion
```

用于：

- XP Animation
- Achievement
- Level Up
- Drawer Transitions

Phase 0 不一定需要安装。

---

# 39. Phase 3 新增技术

```text
Recharts

Sentry

PostHog

Motion（按需要）
```

---

# 40. Phase 4 — AI Capture

## 阶段目标

AI 第一阶段只解决：

> 降低 Task 输入和整理成本。

新增：

- Natural Language Task
- Text Brain Dump
- Voice Brain Dump
- Auto Date
- Auto List
- Auto Tags
- Auto Priority
- Auto Estimate

---

# 41. Phase 4 才加入 Vercel AI SDK

使用：

```text
Vercel AI SDK
```

作为 AI Provider 层。

结构：

```text
AIService
↓
Vercel AI SDK
↓
OpenAI / Claude / Gemini
```

不要在业务代码到处直接调用某一家模型 SDK。

---

# 42. AI Structured Output

AI 输出不直接进入数据库。

流程：

```text
User Input
↓
LLM
↓
Structured Output
↓
Zod Validation
↓
TaskDraft[]
↓
User Confirm
↓
TaskService
↓
Database
```

---

# 43. AI TaskDraft

例如：

```text
TaskDraft

title

dueDate

priority

list

tags

estimatedMinutes

estimatedPomodoros
```

AI 只能生成 Draft。

不能直接：

```text
INSERT INTO tasks
```

---

# 44. Text Brain Dump

用户输入：

```text
今天把登录做完，
周五交论文，
服务器这个月也要续费。
```

AI：

```text
3 Tasks
```

结构化输出以后：

```text
用户确认
↓
批量创建
```

---

# 45. Voice Brain Dump

Web 端：

```text
MediaRecorder API
```

获取 Audio。

然后：

```text
Audio
↓
Speech-to-Text Provider
↓
Text
↓
同一个 Brain Dump Parser
```

核心原则：

```text
Voice
和
Text
```

最终共用：

```text
parseBrainDump(text)
```

---

# 46. Voice Provider 不提前确定死

可以采用 Provider Layer：

```text
TranscriptionProvider
```

未来具体可以：

```text
OpenAI
Deepgram
其他 Speech Provider
```

根据：

- 成本
- 中文识别
- 延迟

再选择。

---

# 47. Phase 4 Search 仍然不用 Vector

普通 AI Capture 不需要：

```text
pgvector
```

因此 pgvector 继续暂缓。

---

# 48. Phase 4 新增技术

```text
Vercel AI SDK

LLM Provider

Speech-to-Text Provider

MediaRecorder API
```

其余全部复用已有技术。

---

# 49. Phase 5 — Automation + AI Intelligence

## 阶段目标

此时 AI 不再只是：

> 创建 Task。

而开始：

> 理解用户历史和主动协助规划。

新增：

### Automation

- Reliable Reminder
- Recurring Task
- Weekly Summary
- Conditional Jobs

### AI Intelligence

- AI Task Breakdown
- AI Today Planner
- Smart Reschedule
- Procrastination Analysis
- Productivity Coach
- Semantic Search

---

# 50. Phase 5 才加入 Inngest

为什么现在才引入？

因为之前：

```text
CRUD
Pomodoro
Growth
```

主要都是即时请求。

现在开始出现：

```text
明天执行

每周执行

失败重试

等待事件

异步 AI
```

这时 Background Job 才真正必要。

使用：

```text
Inngest
```

处理：

- Reminder
- Recurring Task
- Weekly Summary
- Async AI
- Embedding
- Automation

---

# 51. Reminder 升级

例如：

```text
Task Due
10:00

Reminder
09:30
```

此时：

```text
Database
↓
Inngest
↓
Reminder Job
↓
Notification / Email
```

即使网页关闭，也可以可靠运行。

---

# 52. Recurring Task

例如：

```text
Every Monday 09:00
Weekly Review
```

使用后台任务自动生成新的 Task。

不要把这种逻辑依赖用户打开页面。

---

# 53. Resend 已于 Phase 1 提前引入（认证邮件）

Phase 1 的 Supabase OTP 生产环境需要自定义 SMTP，因此 Resend 已在本阶段作为 Supabase 自定义 SMTP 启用（Dashboard → Auth → SMTP Settings 配置，代码无需邮件密钥）：

```text
Resend → smtp.resend.com → Supabase Auth 发信
```

当前承担的邮件：

- 注册验证码（Confirm Signup 模板，`{{ .Token }}`）
- 验证码登录（Magic Link 模板，`{{ .Token }}`）
- 密码重置链接（Reset Password 模板）

模板维护在 `docs/email-templates/`。

如果后续阶段需要：

- Email Reminder
- Weekly Summary
- AI Report

再扩展这些业务邮件，而不是强制某个阶段。

---

# 54. Phase 5 Semantic Search

这时候任务历史已经比较多。

用户开始需要：

> 找一下上个月那个服务器相关的任务。

此时才加入：

```text
pgvector
```

做：

```text
Task Embedding
```

---

# 55. Hybrid Search

长期搜索应该：

```text
PostgreSQL Keyword Search
+
pgvector Semantic Search
```

而不是完全依赖 Vector。

---

# 56. 为什么不需要独立向量数据库

当前已经有：

```text
PostgreSQL
```

因此直接：

```text
pgvector
```

就够。

暂时不要：

```text
Pinecone
Milvus
Weaviate
```

---

# 57. AI Planner

数据来源：

```text
Tasks
Due Date
Priority
Capacity
Focus History
One Thing
Freeze
Task Check-in
```

AI 输出：

```text
Planning Suggestion
```

仍然必须：

```text
User Confirm
↓
TaskService
```

---

# 58. Phase 5 新增技术

```text
Inngest

pgvector
```

---

# 59. Phase 6 — AI Agent

## 阶段目标

从：

> AI 给建议

升级为：

> AI 可以执行部分任务。

例如：

```text
调研 10 个 AI Todo 产品
```

交给：

```text
DiDa Agent
```

---

# 60. Agent 架构

必须：

```text
User
↓
Agent
↓
Tool
↓
Permission
↓
Service
↓
Database / External API
↓
Event Log
```

绝对不要：

```text
Agent
↓
直接 SQL
```

---

# 61. Agent Tools

例如：

```text
createTask()

updateTask()

searchTasks()

completeTask()

createList()

readCalendar()

searchWeb()
```

以后外部 Integration 再扩展。

---

# 62. Agent Approval

高风险操作：

```text
Delete

Send

Publish

Modify external data
```

必须：

```text
Approve
Reject
```

---

# 63. Agent History

建立：

```text
agent_runs

agent_steps

agent_actions
```

用户能够看到：

```text
Started

Planning

Tool Called

Waiting Approval

Completed
```

---

# 64. Phase 6 是否需要 LangGraph

默认：

> 不需要。

先使用：

```text
Vercel AI SDK
+
Inngest
+
Tools
```

如果未来 Agent 出现：

- 非常复杂状态机
- 多 Agent
- 大量循环
- 分支图
- Agent Graph

再评估：

```text
LangGraph
```

不要现在预装。

---

# 65. Phase 6 新增技术

理论上主要复用：

```text
AI SDK
Inngest
Zod
Service Layer
```

不需要突然引入一整套新基础设施。

---

# 66. Web-only 后期增强：PWA

如果以后希望：

- 安装到桌面
- Browser Push
- Offline
- 更接近应用体验

可以增加：

```text
PWA
Service Worker
IndexedDB
```

---

# 67. IndexedDB

只有出现真实 Offline 需求时考虑：

```text
IndexedDB
+
Dexie
```

例如：

```text
Offline Create Task

Offline Complete

网络恢复后 Sync
```

现在完全不要加入。

---

# 68. 技术引入路线总图

```text
Phase 0
Project Foundation

Next.js
React
TypeScript
Tailwind
shadcn
Lucide

        ↓

Phase 1
Todo + Auth

Supabase
PostgreSQL
Auth
RLS
Zod
React Hook Form
TanStack Query
Zustand
Vitest
Playwright

        ↓

Phase 2
Planning + Focus

date-fns
dnd-kit
Web Notifications

        ↓

Phase 3
Growth + Insights

Recharts
Sentry
PostHog
Motion

        ↓

Phase 4
AI Capture

Vercel AI SDK
LLM Provider
Speech-to-Text

        ↓

Phase 5
Automation + Intelligence

Inngest
pgvector

        ↓

Phase 6
Agent

Agent Tools
Approval
Agent History
```

---

# 69. 当前真正应该安装的技术

如果今天开始开发，我建议第一批只安装：

```text
next

react

react-dom

typescript

tailwindcss

lucide-react
```

然后：

```text
shadcn/ui
```

按组件逐个添加。

---

# 70. 当开始连接数据库再添加

```text
@supabase/supabase-js

zod

react-hook-form

@hookform/resolvers

@tanstack/react-query
```

如果 UI 状态需要：

```text
zustand
```

---

# 71. 当开始 Calendar / Focus 再添加

```text
date-fns

@dnd-kit/core

@dnd-kit/sortable
```

---

# 72. 当开始 Insights 再添加

```text
recharts
```

---

# 73. 当开始 AI 再添加

```text
ai
```

以及对应模型 Provider。

---

# 74. 当开始后台任务再添加

```text
inngest
```

---

# 75. 当开始 Production Observability 再添加

```text
@sentry/nextjs
```

PostHog 同理。

---

# 76. 技术栈与产品功能对应

| 产品功能 | 技术 |
|---|---|
| Login / Register | Supabase Auth |
| User Isolation | PostgreSQL RLS |
| Task CRUD | PostgreSQL + Supabase |
| Lists / Tags | PostgreSQL |
| Today / Inbox | Next.js + Query |
| Search | PostgreSQL |
| Calendar | date-fns |
| Drag Task | dnd-kit |
| Pomodoro | Browser Timer + Timestamp |
| Focus History | PostgreSQL |
| One Thing | Business Logic |
| Task Freeze | Business Logic |
| Daily Capacity | Business Logic |
| XP / Level | PostgreSQL Ledger |
| Task Check-in | PostgreSQL |
| Insights | PostgreSQL + Recharts |
| Brain Dump | AI SDK |
| Voice | MediaRecorder + STT |
| AI Planner | AI SDK |
| Semantic Search | pgvector |
| Reminder | Inngest |
| Recurring Task | Inngest |
| Email | Resend（认证邮件已于 Phase 1 经 Supabase SMTP 启用） |
| Agent | AI SDK + Tools + Inngest |

---

# 77. 长期数据库领域

建议最终按领域拆分。

## Account

```text
profiles
```

## Task

```text
tasks

subtasks

lists

tags

task_tags

reminders

recurring_rules

task_events
```

## Focus

```text
focus_sessions

focus_settings
```

## Planning

```text
daily_plans

daily_task_commitments

daily_capacity
```

## Growth

```text
xp_events

coin_transactions

achievements

user_achievements

streaks
```

## Reflection

```text
task_checkins
```

## AI

```text
ai_runs

ai_suggestions
```

## Agent

```text
agent_runs

agent_steps
```

注意：

> 不需要第一天就创建所有这些表。

按照产品阶段逐渐创建。

---

# 78. Service Layer 长期规划

建议：

```text
services/

auth-service

task-service

list-service

planning-service

focus-service

growth-service

insight-service

ai-service

automation-service
```

也不是第一天创建所有文件。

按照功能出现再创建。

---

# 79. Provider Layer

对于未来可能被替换的外部能力：

```text
DatabaseProvider

EmailProvider

AIProvider

TranscriptionProvider
```

这样以后更换基础设施，不需要修改核心业务逻辑。

---

# 80. Pomodoro 架构原则

再次明确：

```text
Database timestamp
=
真实时间
```

而不是：

```text
JavaScript interval
=
真实时间
```

这是 Focus 模块最重要的技术原则之一。

---

# 81. Task Event 原则

重要行为应该产生事件：

```text
task.created

task.completed

task.rescheduled

task.frozen

focus.completed

checkin.created
```

未来：

- Growth
- Insights
- AI
- Agent

都会从这些事件中获益。

---

# 82. XP / Coin 原则

不要只保存：

```text
xp = 5000
coin = 800
```

核心应该保存：

```text
XP Ledger
Coin Ledger
```

Balance 可以缓存。

但 Ledger 是真实历史。

---

# 83. AI 原则

AI 的权限永远低于 Application Service。

正确：

```text
AI
↓
Structured Output / Tool
↓
Zod
↓
Permission
↓
Service
↓
Database
```

---

# 84. 当前明确不要加入的技术

初期明确排除：

```text
NestJS

Express 独立 Backend

Microservices

Redis

Kafka

RabbitMQ

Kubernetes

Docker Swarm

Elasticsearch

Pinecone

Milvus

Weaviate

ClickHouse

BigQuery

Snowflake

LangGraph

复杂 Event Bus

Prisma + Drizzle 同时存在
```

---

# 85. ORM 策略

初期：

```text
Supabase Client
+
SQL Migration
```

即可。

不要马上再叠加：

```text
Prisma
Drizzle
```

如果未来：

- Server Query 极其复杂
- Transaction 大量增加
- Worker 变多

再评估：

```text
Drizzle
```

---

# 86. Realtime

虽然 Supabase 支持 Realtime，但：

> 初期不启用。

普通 Todo CRUD 不需要 WebSocket。

未来可能使用：

- 多标签页同步
- Agent 实时状态
- Collaboration

再启用。

---

# 87. Storage

初期如果只有：

```text
Avatar
```

可以使用：

```text
Supabase Storage
```

如果甚至 Avatar 都暂时不做上传：

> Storage 也可以先不配置。

Voice Audio 后期：

- 临时上传
- 转录
- 删除

默认不长期保存。

---

# 88. 最终长期 Web 技术栈

在所有阶段完成以后，完整技术体系大约会是：

```text
Frontend
────────────────

Next.js
React
TypeScript
Tailwind
shadcn/ui
Lucide
Motion


Application
────────────────

Zod
React Hook Form
TanStack Query
Zustand
date-fns
dnd-kit


Data
────────────────

Supabase
PostgreSQL
Supabase Auth
RLS
Storage
pgvector


Focus
────────────────

Browser Timer
Web Notifications


Growth / Insights
────────────────

Recharts


Background
────────────────

Inngest


Email
────────────────

Resend


AI
────────────────

Vercel AI SDK
LLM Providers
Speech-to-Text


Observability
────────────────

Sentry
PostHog


Testing
────────────────

Vitest
Testing Library
Playwright


Deployment
────────────────

Vercel
Supabase
```

但最重要的是：

> **这是一张最终地图，不是一张第一天 npm install 清单。**

---

# 89. 最终阶段策略总结

## 第一阶段

只关注：

> Todo 能不能稳定工作。

## 第二阶段

关注：

> 用户能不能真正专注完成。

## 第三阶段

关注：

> 用户有没有成长反馈。

## 第四阶段

关注：

> AI 能不能降低输入成本。

## 第五阶段

关注：

> AI 能不能理解和辅助规划。

## 第六阶段

关注：

> AI 能不能安全地执行任务。

---

# 90. 当前推荐起步技术栈

当前真正开始编码时建议只从：

```text
Next.js
React
TypeScript
pnpm

Tailwind
shadcn/ui
Lucide
```

开始。

等正式开发：

```text
Auth
Task CRUD
```

以后加入：

```text
Supabase
Zod
React Hook Form
TanStack Query
```

之后每一个工具都必须回答一个问题：

> **当前已经出现了什么实际需求，让我们必须引入它？**

如果没有明确答案：

> 就暂时不引入。

这应该成为 DiDa-todo 技术选型的长期原则。

---

# 91. 推荐最终决策

DiDa-todo 当前采用：

> **Next.js + TypeScript 单体 Web 应用**

作为核心架构。

不是：

```text
Frontend
+
独立 Backend
+
Microservices
+
复杂基础设施
```

而是：

```text
Next.js
↓
Service Layer
↓
Supabase
```

然后随着产品成熟逐渐挂接：

```text
Focus
↓
Browser APIs

Growth
↓
Analytics

AI
↓
AI SDK

Automation
↓
Inngest

Intelligence
↓
pgvector

Agent
↓
Tools + Approval
```

这套结构既能保证前期开发效率，也不会堵死 DiDa-todo 后期向 AI Agent 产品发展的空间。