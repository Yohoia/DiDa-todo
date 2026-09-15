# DiDa-todo 页面级 PRD 与信息架构

> 版本：V0.1  
> 产品阶段：产品结构确认 / UI 原型前置  
> 产品核心：**Todo + Focus + Growth + AI Capture**  
> 核心闭环：**记录 → 规划 → 专注 → 完成 → 成长 → 理解自己**

---

# 1. 文档目标

本阶段不再继续扩充功能，而是解决以下问题：

1. DiDa-todo 一共有多少个核心页面？
2. 用户登录之后第一眼看到什么？
3. Tasks、Focus、Growth、Insights 应该如何组织？
4. 哪些功能属于独立页面？
5. 哪些功能应该隐藏在 Task Detail 或弹窗中？
6. Today、Inbox、Calendar 之间是什么关系？
7. One Thing、Task Freeze、Daily Capacity 放在哪里？
8. Pomodoro 如何和 Task 自然结合？
9. Growth 如何存在但不喧宾夺主？
10. 后期 AI 应该插入现有结构，而不是重新建立一套结构。

---

# 2. 信息架构设计原则

## 2.1 Task 是第一层核心对象

DiDa-todo 中最核心的数据对象始终是：

```text
Task
```

所有其他模块都围绕 Task 服务：

```text
Task
├── Planning
├── Focus
├── Growth
├── Reflection
└── AI
```

因此首页不能变成：

```text
统计 Dashboard
AI Dashboard
成长 Dashboard
```

而应该首先让用户看到：

> 今天我要做什么。

---

## 2.2 页面数量控制

第一阶段核心导航建议控制在：

```text
Today
Inbox
Upcoming
Calendar
Lists
Completed
Insights
```

辅助页面：

```text
Focus
Profile
Settings
```

AI 后期融入现有页面，不在早期增加巨大独立入口。

---

# 3. 产品整体信息架构

```text
DiDa-todo
│
├── Authentication
│   ├── Login
│   ├── Register
│   └── Verify Email
│
├── Main App
│   │
│   ├── Today
│   │   ├── One Thing
│   │   ├── Daily Capacity
│   │   ├── Frozen Tasks
│   │   └── Today Tasks
│   │
│   ├── Inbox
│   │   └── Unorganized Tasks
│   │
│   ├── Upcoming
│   │   ├── Tomorrow
│   │   ├── This Week
│   │   └── Later
│   │
│   ├── Calendar
│   │   ├── Day
│   │   ├── Week
│   │   └── Month
│   │
│   ├── Lists
│   │   ├── Work
│   │   ├── Study
│   │   ├── Life
│   │   └── Custom Lists
│   │
│   ├── Completed
│   │
│   └── Insights
│       ├── Tasks
│       ├── Focus
│       ├── Heatmap
│       └── Estimate vs Actual
│
├── Global Components
│   ├── Quick Add
│   ├── Search
│   ├── Task Detail
│   ├── Reminder
│   ├── Tag Selector
│   ├── Pomodoro
│   └── Task Check-in
│
├── Growth
│   ├── Profile
│   ├── XP
│   ├── Level
│   ├── Coins
│   ├── Achievements
│   └── Focus Garden
│
└── Settings
    ├── General
    ├── Tasks
    ├── Focus
    ├── Notifications
    ├── Growth
    ├── Appearance
    └── Account
```

---

# 4. URL / Route 建议

```text
/
├── /login
├── /register
├── /verify
│
└── /app
    ├── /today
    ├── /inbox
    ├── /upcoming
    ├── /calendar
    ├── /list/:listId
    ├── /completed
    ├── /insights
    ├── /profile
    └── /settings
```

Task Detail 初期不建议独立页面。

使用：

```text
Drawer
或
Modal
```

打开。

后续为了分享或深链接，可以支持：

```text
/task/:taskId
```

---

# 5. 全局布局

Desktop 采用：

```text
┌──────────────┬─────────────────────────────┐
│              │                             │
│   Sidebar    │          Main               │
│              │         Content             │
│              │                             │
└──────────────┴─────────────────────────────┘
```

任务详情打开：

```text
┌────────────┬───────────────────┬──────────────┐
│ Sidebar    │ Main Content      │ Task Detail  │
└────────────┴───────────────────┴──────────────┘
```

---

# 6. Sidebar 信息架构

建议：

```text
DiDa

＋ New Task

Today               5
Inbox                3
Upcoming
Calendar

────────────

Lists

● Work               4
● Study              6
● Life               2

＋ New List

────────────

Completed
Insights

────────────

Profile
Settings
```

---

# 7. Sidebar 设计原则

## 一级导航

只保留高频功能：

- Today
- Inbox
- Upcoming
- Calendar

## 二级导航

用户自己创建：

- Lists

## 低频入口

放底部：

- Completed
- Insights
- Profile
- Settings

不建议把：

```text
Pomodoro
XP
Achievements
AI
```

全部放进 Sidebar。

这些功能应该自然融入 Task 和 Today。

---

# 8. 全局 Quick Add

这是整个产品最重要的全局组件之一。

入口：

```text
＋ New Task
```

同时支持：

```text
N
或
Cmd / Ctrl + N
```

---

# 9. Quick Add 默认状态

尽可能简单：

```text
┌─────────────────────────────┐
│ What needs to be done?      │
│                             │
│                     Add     │
└─────────────────────────────┘
```

用户只输入：

```text
完成登录页面
```

就可以创建。

---

# 10. Quick Add 展开状态

用户点击更多：

```text
完成登录页面

Date
Priority
List
Tags
Estimate
Reminder
Repeat
```

原则：

> 默认轻量，高级配置按需展开。

---

# 11. 页面 PRD — Login

## 页面目标

让用户以最低成本登录 DiDa。

## 页面内容

登录弹窗内含两种模式，可切换：

```text
DiDa-todo

Welcome back

Email
[                    ]

（密码模式）Password          （验证码模式）验证码 + [发送验证码/重发 60s]

Sign In / 登录

使用验证码登录 ⇄ 使用密码登录
```

## 用户操作

密码模式：

1. 输入 Email 与密码
2. 点击 Sign In 登录
3. 可点忘记密码，邮件链接经 `/auth/callback` 回跳至设置页修改

验证码模式：

1. 输入 Email，点击发送验证码
2. 输入六位验证码
3. 点击登录

## 页面状态

- 默认
- Email 格式错误
- Loading
- 密码错误 / Email 不存在
- 验证码错误或过期（验证码模式）
- 发送验证码成功（顶部 toast，60 秒重发倒计时）

---

# 12. 页面 PRD — Register

## 页面目标

创建新账号。

## 页面内容

```text
Join DiDa-todo

Email
[                    ]

Password（强度五规则：≥8 位、大写、小写、数字、特殊字符）
[          ] [👁] [!]

验证码 + [发送验证码/重发 60s]
[ ] [ ] [ ] [ ] [ ] [ ]

Create Account
```

流程：

```text
Email + Password
↓
发送邮箱六位验证码
↓
Verify（弹窗内六格输入）
↓
验证通过，自动设置密码并登录
↓
Today
```

默认值：

- 用户名：取邮箱前缀（异常时随机「用户XXXX」），可事后在资料页修改
- 头像：react-nice-avatar 按邮箱/随机种子本地生成；在设置 → Account & Sync 可「换一个头像」

无需 Profile Setup 环节。

---

# 13. 页面 PRD — Verify

## 页面目标

完成邮箱验证码验证（注册与验证码登录共用，嵌于弹窗内而非独立页面）。

## 页面布局

```text
验证码
[ ] [ ] [ ] [ ] [ ] [ ]    （居中六格，输入自动跳格、粘贴分发）

发送验证码 / Resend in 60s
```

## 交互细节

- 输入一位自动跳下一格，退格回退，整段粘贴自动分发
- 首格支持系统验证码自动填充（one-time-code）

## 状态

- 正常
- 验证码错误 / 过期（表单下方提示）
- 重新发送成功（顶部 toast）
- Loading

---

# 14. 页面 PRD — Today

Today 是 DiDa-todo 最重要的页面。

产品应该优先把最高质量的设计投入 Today。

---

# 15. Today 页面目标

解决三个问题：

```text
今天最重要什么？
今天必须做什么？
今天能做多少？
```

---

# 16. Today 页面结构

建议：

```text
Good morning

Wednesday, Sep 9

────────────────────────

Today's One Thing

完成 DiDa 登录系统
🍅 2

[Start Focus]

────────────────────────

Daily Capacity

6 / 8 🍅
████████░░

2 Pomodoros available

────────────────────────

Frozen

🔒 提交论文
🔒 完成登录接口

────────────────────────

Today

□ Landing Page
□ 邮件回复
□ 买牛奶
□ 阅读论文

＋ Add task
```

---

# 17. Today's One Thing

Today 顶部独立区域。

如果未设置：

```text
What is the one thing
that matters most today?

[Choose a task]
```

设置后：

```text
Today's One Thing

完成登录系统

🍅 2 · P1 · Work

[Start Focus]
```

操作：

- Change
- Remove
- Start Focus
- Complete

规则：

```text
每天最多 1 个
```

---

# 18. Daily Capacity

位置：

> One Thing 下方。

展示：

```text
Daily Capacity

6 / 8 Pomodoros

████████░░
```

状态：

### Normal

```text
6 / 8
```

### Near capacity

```text
8 / 8
```

### Overloaded

```text
10 / 8

Today is overloaded by 2 Pomodoros.
```

不禁止继续添加。

只提供反馈。

---

# 19. Frozen Tasks

位置：

> Capacity 下方。

展示：

```text
Frozen

🔒 完成登录接口
🔒 提交论文
```

操作：

- Start Focus
- Complete
- Unfreeze

延期时：

```text
This task is frozen for today.

Are you sure you want to reschedule it?
```

---

# 20. Today Task List

每一行建议：

```text
○  完成 Landing Page
   Work · 🍅2          10:00
```

不要一次显示太多信息。

Hover 后显示：

```text
Focus
Edit
Freeze
More
```

---

# 21. Today 空状态

```text
You're clear for today.

Add something small,
or enjoy the space.

＋ Add Task
```

避免：

> “你今天还没有任何任务！”

这种制造压力的表达。

---

# 22. 页面 PRD — Inbox

## 页面目标

实现：

> 快速记录，不要求立即整理。

---

# 23. Inbox 页面结构

```text
Inbox

3 unorganized tasks

────────────────────

□ 看一下新的 UI 框架

□ 服务器续费

□ 和老师聊一下论文

────────────────────

＋ Add Task
```

每条 Task hover 出现：

```text
Today
Date
List
Priority
```

---

# 24. Inbox 整理模式

用户可以选择：

```text
Organize
```

进入：

```text
看一下新的 UI 框架

Date
List
Priority
Estimate

[Next]
```

快速逐条整理 Inbox。

后期 AI：

```text
✨ Organize Inbox
```

---

# 25. Inbox 空状态

```text
Inbox Zero

Everything is organized.
```

可以触发：

```text
Clean Slate Achievement
```

但动画要克制。

---

# 26. 页面 PRD — Upcoming

## 页面目标

让用户快速理解未来任务，而不是进行复杂时间规划。

---

# 27. Upcoming 页面布局

```text
Upcoming

Tomorrow
────────────────
□ 完成注册页面
□ 续费服务器

Friday
────────────────
□ 给老师发论文

Saturday
────────────────
□ 健身
```

---

# 28. Upcoming 功能

支持：

- 按日期分组
- 展开未来日期
- 修改 Task Date
- Drag & Drop 调整日期
- Quick Add

筛选：

```text
All
Work
Study
Life
```

---

# 29. 页面 PRD — Calendar

Calendar 用于更强的时间规划。

---

# 30. Calendar 顶部

```text
Calendar

< September 2026 >

Day
Week
Month
```

默认建议：

```text
Week
```

---

# 31. Calendar Week View

```text
          Mon Tue Wed Thu Fri

09:00             Task A

10:00       Task B

11:00

12:00

14:00             Task C
```

支持：

- 拖入 Task
- 调整开始时间
- 调整日期
- 点击 Task 打开详情

---

# 32. Calendar Month View

主要用于：

> 看任务密度。

不是复杂日程安排。

每天显示：

```text
9

● Landing
● Meeting
+ 3
```

---

# 33. Calendar 与 Today 的关系

Calendar：

> 我什么时候做。

Today：

> 我今天真正要完成什么。

因此 Calendar 不替代 Today。

---

# 34. 页面 PRD — List Detail

例如：

```text
Work
```

页面：

```text
Work

12 tasks

────────────────

Today

□ 完成登录
□ 回邮件

Upcoming

□ Landing Page

No date

□ 学习 Redis
```

---

# 35. List Detail 功能

支持：

- Add Task
- Rename List
- List Color
- List Icon
- Archive List
- Delete List
- Filter
- Sort

排序：

```text
Manual
Due Date
Priority
Created Date
```

---

# 36. Tags 在页面中的使用

Tags 不独立占据主导航。

建议入口：

```text
Search / Filter
```

或：

```text
Task Detail
```

后续可以支持点击：

```text
#Design
```

进入 filtered task view。

---

# 37. 页面 PRD — Completed

## 页面目标

帮助用户看到：

> 我已经完成了什么。

而不是简单垃圾桶。

---

# 38. Completed 页面结构

```text
Completed

Today

✓ Landing Page
✓ Reply email

Yesterday

✓ Database schema
✓ Login UI
```

支持：

```text
Today
Week
Month
All
```

---

# 39. Completed Task 操作

点击可以：

- 查看 Task Detail
- Restore
- Delete permanently

完成数据保留：

- Completed At
- Actual Focus
- XP
- Check-in

---

# 40. 页面 PRD — Task Detail

Task Detail 是产品第二重要的交互组件。

Desktop 推荐：

```text
Right Drawer
```

Mobile 推荐：

```text
Full Screen Sheet
```

---

# 41. Task Detail 页面结构

```text
○ 完成登录系统

Description
────────────────
实现 OTP 登录和 Session。

Properties
────────────────

Date
Sep 10

Priority
P1

List
DiDa

Tags
#development
#auth

Estimate
🍅 2

Reminder
10 min before

Repeat
None

────────────────

Subtasks

✓ Login UI
□ OTP
□ Session
□ Test

＋ Add Subtask

────────────────

Focus

Estimated     🍅2
Completed     🍅1
Focus time    25m

[Start Focus]

────────────────

Delete
```

---

# 42. Task Detail 核心操作

支持：

- Edit title
- Edit description
- Complete
- Date
- Priority
- List
- Tags
- Estimate
- Reminder
- Repeat
- Subtasks
- Freeze
- Set as One Thing
- Start Focus
- Delete

---

# 43. Task Detail 设计原则

不要设计成复杂表单。

使用：

```text
Property Row
```

例如：

```text
Date             Today
Priority         P2
List             Work
Tags             Design
Estimate         🍅2
```

点击单行才弹出选择器。

---

# 44. 页面 PRD — Focus Mode

Focus Mode 应当和整个 App 有明显视觉区别。

---

# 45. Focus 页面结构

```text
DiDa Focus

完成登录系统

24:32

████████████░░

Pomodoro 1 / 2

[Pause]

End Session
```

底部弱化显示：

```text
After focus:
5 min break
```

---

# 46. Focus 完成

番茄结束：

```text
Nice work.

25 minutes focused.

完成登录系统

🍅 1 / 2

[Take a Break]

[Continue Focus]

[Complete Task]
```

---

# 47. Focus 中断

用户选择 Stop：

```text
End this focus session?

18 minutes completed.

Keep this session?
```

选项：

```text
Save 18 min
Discard
Continue
```

---

# 48. Break 页面

```text
Break

04:32

Step away for a moment.

Skip Break
```

不要在 Break 页面继续塞 Todo。

---

# 49. Task 完成反馈

用户点击 Complete：

```text
✓ Task completed

+20 XP
```

动效控制在：

```text
0.5 - 1.5 秒
```

不要每个任务都大面积庆祝。

---

# 50. Task Check-in

在部分 Task 完成后触发。

推荐形式：

```text
Quick check-in

How did this task feel?

Easy
About right
Hard
```

或：

```text
Compared with your estimate?

Faster
About right
Longer
```

按钮：

```text
Skip
```

必须存在。

---

# 51. 页面 PRD — Insights

Insights 不应该变成企业 BI Dashboard。

目标：

> 帮用户理解自己。

---

# 52. Insights 页面结构

```text
Insights

This Week

Tasks completed
28

Focus
11h 35m

Daily goal
4 / 5 days

────────────────

Activity

Heatmap

────────────────

Focus Trend

[Chart]

────────────────

Estimated vs Actual

Estimated  8h
Actual     10h

────────────────

Lists

Work      45%
Study     35%
Life      20%
```

---

# 53. Insights 第一阶段内容

保留：

- Tasks Completed
- Focus Time
- Daily Goal
- Heatmap
- Estimated vs Actual
- List Distribution

暂时不要：

- 太多复杂 KPI
- Productivity Score
- 情绪分数
- AI 评分

---

# 54. 后期 Insights

加入：

```text
Energy Profile
```

例如：

```text
Your strongest focus window

09:00 — 11:00
```

以及：

```text
Deep Work performs best in the morning.
```

后期再让 AI 解释。

---

# 55. 页面 PRD — Profile / Growth

Growth 不占据主导航高优先级。

Profile 承担成长展示。

---

# 56. Profile 页面结构

```text
Avatar

User Name

Level 8

1240 / 1500 XP
████████░░

────────────────

Focus
132h

Tasks completed
842

Current streak
8 weeks

────────────────

Achievements

Deep Worker
Clean Slate
One Thing

────────────────

Focus Garden

[Garden Visual]

────────────────

Coins
1,250

Rewards
```

---

# 57. Growth 反馈层级

建议控制三个层级：

## Level 1

每次完成：

```text
+ XP
```

## Level 2

达到阶段：

```text
Achievement unlocked
```

## Level 3

长期：

```text
Level
Garden
Profile
```

这样不会让整个 Todo 体验过度游戏化。

---

# 58. Reward Store

后期入口从 Profile：

```text
Rewards
```

而不是放 Sidebar。

结构：

```text
Your coins
1250

Themes
Focus Sounds
Garden
Profile
```

---

# 59. 页面 PRD — Settings

Settings 分组建议：

```text
General
Tasks
Focus
Notifications
Growth
Appearance
Account
```

---

# 60. General Settings

- Language
- Timezone
- Start of week
- Time format

---

# 61. Task Settings

- Default List
- Default Priority
- Completed Task Behavior
- Recurring Task Rules

---

# 62. Focus Settings

```text
Focus Duration
25 min

Short Break
5 min

Long Break
15 min

Long Break After
4 sessions

Auto Start Break
On / Off

Sound
...
```

---

# 63. Notification Settings

- Browser Notification
- Email
- Reminder Default
- Daily Summary

后期：

- Mobile Push

---

# 64. Growth Settings

用户应该能够关闭部分游戏化反馈：

- XP Animation
- Coin Animation
- Streak
- Garden
- Achievement Popups

这是重要设计。

不是所有人都喜欢游戏化。

---

# 65. Appearance

支持：

```text
System
Light
Dark
```

后期：

```text
Theme
```

与 Reward Store 联动。

---

# 66. Account Settings

- Email
- Profile
- Logout
- Export Data
- Delete Account

---

# 67. Search 信息架构

Search 推荐全局弹窗：

```text
Cmd + K
```

打开：

```text
Search DiDa

[                       ]

Recent

Tasks
Lists
Tags
Commands
```

---

# 68. Command Menu

不仅是 Search。

可以同时执行：

```text
New Task

Go to Today

Go to Inbox

Start Focus

Create List

Search Tasks
```

让高级用户效率更高。

---

# 69. AI Capture 在信息架构中的位置

AI Capture 不建立：

```text
AI Sidebar
```

第一阶段从：

```text
Quick Add
```

进入。

---

# 70. Quick Add AI 状态

普通：

```text
Add a task...
```

后期：

```text
Add a task or dump what's on your mind...
```

右侧：

```text
🎙
✨
```

---

# 71. Text Brain Dump

用户输入：

```text
今天把登录做完，明天买牛奶，
周五给老师交论文。
```

系统识别：

```text
3 tasks found

□ 完成登录
  Today

□ 买牛奶
  Tomorrow

□ 给老师交论文
  Friday
```

用户：

```text
Create all
```

---

# 72. Voice Brain Dump

点击：

```text
🎙
```

出现：

```text
Listening...

说出你需要处理的事情
```

完成后进入和 Text Brain Dump 相同的确认页面。

AI 只是改变输入方式。

不会改变 Task 结构。

---

# 73. AI Planner 未来入口

建议放 Today：

```text
✨ Plan today
```

而不是独立 AI 页面。

分析：

- Today Tasks
- One Thing
- Freeze
- Capacity
- Estimate

输出计划建议。

---

# 74. AI Breakdown 入口

放 Task Detail：

```text
✨ Break down task
```

AI 生成 Subtasks。

---

# 75. AI Estimate 入口

放 Estimate property：

```text
Estimate

✨ Suggest
```

AI 给建议。

---

# 76. AI Reflection 入口

放 Insights：

```text
✨ What can I learn from this week?
```

AI 根据真实数据解释。

这样 AI 始终出现在：

> 用户需要它的地方。

---

# 77. Mobile 信息架构

移动端底部导航建议最多 4～5 个：

```text
Today

Inbox

＋

Calendar

More
```

`＋` 是全局 Quick Add。

More：

```text
Upcoming
Lists
Completed
Insights
Profile
Settings
```

---

# 78. Desktop 与 Mobile 的区别

Desktop：

```text
Sidebar
Main
Drawer
```

Mobile：

```text
Bottom Navigation
Main
Full-screen Task Sheet
```

不要简单把 Desktop 缩小。

---

# 79. 核心用户流程 1：快速创建任务

```text
任意页面
↓
New Task
↓
输入 Title
↓
Enter
↓
Task 创建
```

目标：

> 3 秒以内完成。

---

# 80. 核心用户流程 2：创建完整任务

```text
New Task
↓
Title
↓
展开 More
↓
Date
List
Tags
Priority
Estimate
↓
Create
```

---

# 81. 核心用户流程 3：开始 Focus

```text
Today
↓
Task
↓
Start Focus
↓
Pomodoro
↓
Focus Complete
↓
继续 / Break / Complete Task
```

---

# 82. 核心用户流程 4：One Thing

```text
Today
↓
Choose One Thing
↓
选择 Task
↓
置顶
↓
Start Focus
↓
Complete
↓
额外 Growth Feedback
```

---

# 83. 核心用户流程 5：Freeze

```text
Task
↓
Freeze
↓
Today Frozen
↓
当天保持承诺
↓
Complete
```

如果延期：

```text
Reschedule
↓
Confirmation
```

---

# 84. 核心用户流程 6：Brain Dump

```text
Quick Add
↓
输入文字 / 语音
↓
AI Parse
↓
多个 Task Preview
↓
用户确认
↓
批量创建
```

---

# 85. 页面优先级

## P0 — 第一批必须设计

这些页面最先做 UI：

```text
Login
Verify
Today
Inbox
Task Detail
Quick Add
Focus Mode
```

这些页面决定产品第一印象。

---

# 86. P1 — 第二批

```text
Upcoming
List Detail
Calendar
Completed
Settings
```

---

# 87. P2 — 第三批

```text
Insights
Profile
Growth
Achievements
Focus Garden
Reward Store
```

---

# 88. P3 — AI 与后期

```text
Brain Dump
Voice
AI Planner
AI Breakdown
AI Coach
Automation
Agent
```

---

# 89. 第一版原型建议覆盖页面

下一轮正式 UI Prototype 建议至少包含：

### Auth

1. Login
2. Verify

### Core

3. Today
4. Inbox
5. Upcoming
6. Calendar
7. List Detail

### Interaction

8. Quick Add
9. Task Detail
10. Focus Mode
11. Focus Complete
12. Task Check-in

### Growth

13. Insights
14. Profile

总计：

> **14 个主要页面 / 状态**

这样基本可以完整看到 DiDa-todo 的产品体验。

---

# 90. 最重要的页面关系

最终整个产品结构应该让用户感觉非常简单：

```text
Inbox
我想到什么
     ↓

Today
我今天做什么
     ↓

Focus
我现在做什么
     ↓

Complete
我完成了什么
     ↓

Growth / Insights
我正在变成什么样的人
```

Calendar、Lists、Tags 都只是帮助用户组织这个过程。

AI 则是在未来逐渐帮助用户减少：

```text
整理
判断
规划
复盘
```

而不是改变整个产品。

---

# 91. 当前 UI 设计重点

下一阶段进行 UI 时，优先解决以下体验：

## ① Today 不要像 Dashboard

Today 应该像：

> 一个安静的个人任务空间。

不是大量数据卡片。

---

## ② Growth 弱化展示

主页只需要轻量看到：

```text
Lv.8
+20 XP
```

完整 Growth 放 Profile。

---

## ③ Capacity 一眼能懂

不要复杂图表。

优先：

```text
6 / 8 🍅
```

---

## ④ One Thing 必须有视觉地位

但不能巨大到压过所有 Tasks。

---

## ⑤ Freeze 必须和 Priority 不同

Priority：

> 这个任务重要程度如何。

Freeze：

> 我今天承诺一定处理它。

这两个概念不能混淆。

---

## ⑥ Focus 必须足够沉浸

Focus 页面应该是整个产品中：

> UI 最简单的页面。

---

## ⑦ AI 不抢占界面

用户在需要时看到：

```text
✨
```

而不是到处：

```text
Ask AI
Ask AI
Ask AI
```

---

# 92. 后续设计顺序

基于当前 PRD，建议 UI 设计按照：

```text
1. Design System

↓

2. Main App Shell
Sidebar + Layout

↓

3. Today

↓

4. Task Components

↓

5. Task Detail

↓

6. Quick Add

↓

7. Inbox / Upcoming

↓

8. Focus

↓

9. Calendar

↓

10. Growth / Insights

↓

11. Auth

↓

12. AI States
```

其中 Today + Task Component + Task Detail 是整个产品 UI 的核心资产。

---

# 93. 当前产品结构总结

DiDa-todo 最终不是：

```text
Todo App
+
Pomodoro App
+
Game App
+
AI App
```

而应该是一套连贯体验：

```text
Capture
↓
Task

Plan
↓
Today / Calendar

Commit
↓
One Thing / Freeze

Capacity
↓
Estimate / Pomodoro

Execute
↓
Focus

Complete
↓
XP / Level

Reflect
↓
Insights / Check-in

Improve
↓
AI
```

用户感受到的是一个产品，而不是多个模块拼在一起。

---

# 94. 下一阶段产物

基于本 PRD，下一阶段建议输出：

1. **完整 Sitemap / User Flow 图**
2. **核心页面低保真 Wireframe**
3. **Today 高保真 UI**
4. **Task Detail 高保真 UI**
5. **Focus 高保真 UI**
6. **统一 Design System**
7. **数据库 ERD**
8. **API / Server Action 设计**
9. **开发任务拆分**

其中最适合优先做的是：

> **Today + Task Detail + Quick Add + Focus**

这四个部分基本决定 DiDa-todo 的核心产品体验。

