// Message IDs are source copy; keep UI labels separate from task content.
export const messages = {
  "focus.lifecycleHint": {
    "zh-CN":
      "刷新可在当前标签页恢复；关闭或退出保留已专注时长。短休息 5 分钟，每 4 轮长休息 15 分钟，休息不计入专注。",
    en: "Reload to restore in this tab. Closing retains focused time. Take a 5-minute break, or 15 minutes every four rounds. Breaks do not count as focus.",
  },
  "focus.shortBreak": { "zh-CN": "短休息", en: "Short break" },
  "focus.longBreak": { "zh-CN": "长休息", en: "Long break" },
  "focus.round": { "zh-CN": "第 {count} 轮专注", en: "Focus round {count}" },
  "focus.remainingBreak": { "zh-CN": "剩余休息时间", en: "Remaining break time" },
  "focus.breakComplete": {
    "zh-CN": "休息结束，可以开始下一轮。",
    en: "Break complete. Ready for the next round.",
  },
  "focus.storageUnavailable": {
    "zh-CN": "浏览器存储不可用，刷新后无法恢复计时；仍会尝试保存专注记录。",
    en: "Browser storage is unavailable. The timer cannot survive a reload; focus records will still be saved when possible.",
  },
  "focus.autoNext": {
    "zh-CN": "本次休息结束后自动开始下一轮",
    en: "Automatically start the next round after this break",
  },
  "focus.startBreak": { "zh-CN": "开始休息", en: "Start break" },
  "focus.nextRound": { "zh-CN": "继续下一轮", en: "Next round" },
  "focus.skipBreak": { "zh-CN": "跳过休息并继续", en: "Skip break and continue" },
  "focus.completeTask": { "zh-CN": "完成任务并退出", en: "Complete task and exit" },
  "focus.saveExit": { "zh-CN": "保存并退出", en: "Save and exit" },
  "capture.notConfigured": {
    "zh-CN": "智能解析尚未配置，仍可直接创建任务。",
    en: "AI parsing is not configured. You can still create tasks directly.",
  },
  "capture.authRequired": {
    "zh-CN": "请重新登录后再使用智能解析。",
    en: "Sign in again to use AI parsing.",
  },
  "capture.rateLimited": {
    "zh-CN": "解析请求过于频繁，请稍后重试。",
    en: "Too many parsing requests. Try again later.",
  },
  "repeat.confirm": { "zh-CN": "确认间隔", en: "Confirm interval" },
  "repeat.migrationNeeded": {
    "zh-CN": "重复任务需部署数据库升级后启用，其余任务功能不受影响。",
    en: "Deploy the database upgrade to enable repeating tasks. Other task features remain available.",
  },
  "capture.reviewTitle": { "zh-CN": "核对并调整待办", en: "Review and adjust tasks" },
  "capture.reviewHint": {
    "zh-CN": "勾选要添加的事项，可逐项修改标题、日期、时间和清单。取消不会保存未提交的草稿。",
    en: "Select tasks and edit their titles, dates, times and lists. Unsubmitted drafts are not saved on cancel.",
  },
  "capture.title": { "zh-CN": "任务标题", en: "Task title" },
  "capture.item": { "zh-CN": "事项 {count}", en: "Task {count}" },
  "capture.invalidTitle": {
    "zh-CN": "标题需为 1–200 个字符。",
    en: "Title must contain 1–200 characters.",
  },
  "capture.invalidDate": { "zh-CN": "请选择有效日期。", en: "Choose a valid date." },
  "capture.saveResult": {
    "zh-CN": "已保存 {saved} 项，失败 {failed} 项。",
    en: "Saved {saved}; failed {failed}.",
  },
  "capture.parse": { "zh-CN": "智能解析并调整", en: "Parse and adjust" },
  "capture.parsing": { "zh-CN": "正在解析…", en: "Parsing…" },
  "capture.parseHint": {
    "zh-CN": "支持“明天下午三点开会”。多件事可点击智能解析，核对后再保存。",
    en: "Try “meeting tomorrow at 15:00”. Use Parse and adjust for multiple tasks, then confirm.",
  },
  "capture.noTasks": {
    "zh-CN": "未识别到待办，请补充具体要做的事。",
    en: "No tasks recognized. Describe what needs doing.",
  },
  "capture.adjustAll": { "zh-CN": "逐项调整", en: "Adjust tasks" },
  "repeat.label": { "zh-CN": "重复", en: "Repeat" },
  "repeat.never": { "zh-CN": "不重复", en: "Never" },
  "repeat.daily": { "zh-CN": "每天", en: "Daily" },
  "repeat.weekly": { "zh-CN": "每周", en: "Weekly" },
  "repeat.custom": { "zh-CN": "自定义间隔", en: "Custom interval" },
  "repeat.days": { "zh-CN": "间隔天数（1–365）", en: "Interval in days (1–365)" },
  "organize.humanAdjusted": { "zh-CN": "人工已调整", en: "Adjusted by you" },
  "organize.aiSuggestion": { "zh-CN": "AI 建议", en: "AI suggestion" },
  "organize.adjust": { "zh-CN": "调整细节", en: "Adjust details" },
  "organize.editTask": { "zh-CN": "调整任务：{title}", en: "Adjust task: {title}" },
  "organize.apply": { "zh-CN": "应用", en: "Apply" },
  "organize.applyBeforeActions": {
    "zh-CN": "请先应用整理，再从任务详情执行此操作。",
    en: "Apply organization first, then perform this action from task details.",
  },
  "organize.invalidDetails": {
    "zh-CN": "请检查重复设置、提醒和子任务内容。",
    en: "Check recurrence, reminders and subtasks.",
  },
  "organize.accessibleDescription": {
    "zh-CN": "查看并编辑所选日期的任务整理草稿。",
    en: "Review and edit task organization drafts for the selected day.",
  },
  "organize.invalidTitle": {
    "zh-CN": "请填写任务标题，最多 200 个字符。",
    en: "Enter a task title, up to 200 characters.",
  },
  "organize.invalidDescription": {
    "zh-CN": "任务描述最多 50 个字符。",
    en: "Use up to 50 characters for the description.",
  },
  "organize.collapse": { "zh-CN": "收起编辑", en: "Collapse editor" },
  "organize.restoreAi": { "zh-CN": "恢复 AI 建议", en: "Restore AI suggestion" },
  "organize.tagsHint": {
    "zh-CN": "用逗号分隔，最多 3 个标签",
    en: "Comma-separated, up to 3 tags",
  },
  "organize.draftHint": {
    "zh-CN": "时间留空表示随时。调整只保存在本次草稿中，确认后才更新任务。",
    en: "Leave time empty for Anytime. Edits remain local until confirmed.",
  },
  "organize.invalidList": { "zh-CN": "请选择现有清单。", en: "Choose an existing list." },
  "organize.invalidTime": { "zh-CN": "请输入有效时间。", en: "Enter a valid time." },
  "organize.invalidPriority": {
    "zh-CN": "优先级应为 P1、P2 或 P3。",
    en: "Priority must be P1, P2 or P3.",
  },
  "organize.invalidEstimate": {
    "zh-CN": "预估应为 1–16 个番茄钟。",
    en: "Estimate must be 1–16 pomodoros.",
  },
  "organize.invalidTags": {
    "zh-CN": "最多 3 个标签，每个不超过 12 个字符。",
    en: "Use up to 3 tags, at most 12 characters each.",
  },
  "organize.reviewHint": {
    "zh-CN": "可调整细节或取消勾选，确认后保存",
    en: "Adjust details or deselect tasks before saving",
  },
  "auth.recoveryHint": {
    "zh-CN": "修改密码前需要验证当前账号的邮箱。",
    en: "Verify your account email before changing your password.",
  },
  "today.focusTodayOnly": {
    "zh-CN": "One Thing 只能选择今天未完成的任务，请先调整任务日期。",
    en: "Choose an unfinished task scheduled for today as your One Thing.",
  },
  "tasks.unscheduled": { "zh-CN": "未安排", en: "Unscheduled" },
  "tasks.unscheduledHint": {
    "zh-CN": "尚未选择日期的任务，可打开详情安排到合适的一天。",
    en: "Tasks without a date. Open a task to schedule it.",
  },
  "organize.saving": { "zh-CN": "正在保存…", en: "Saving…" },
  "organize.conflict": {
    "zh-CN": "任务已发生变化，已跳过过期的 AI 建议，请重新整理。",
    en: "Tasks changed. Outdated AI suggestions were skipped; organize again.",
  },
  "organize.applicationResult": {
    "zh-CN": "已应用 {applied} 条，已跳过 {skipped} 条，保存失败 {failed} 条。",
    en: "Applied {applied}, skipped {skipped}, failed {failed}.",
  },
  Today: {
    "zh-CN": "今天",
    en: "Today",
  },
  Inbox: {
    "zh-CN": "收件箱",
    en: "Inbox",
  },
  今日待办: {
    "zh-CN": "今日待办",
    en: "Today",
  },
  个人中心: {
    "zh-CN": "个人中心",
    en: "Account",
  },
  Profile: {
    "zh-CN": "个人主页",
    en: "Profile",
  },
  Settings: {
    "zh-CN": "设置",
    en: "Settings",
  },
  Insights: {
    "zh-CN": "统计洞察",
    en: "Insights",
  },
  Archive: {
    "zh-CN": "已完成",
    en: "Archive",
  },
  Study: {
    "zh-CN": "学习",
    en: "Study",
  },
  Life: {
    "zh-CN": "生活",
    en: "Life",
  },
  Work: {
    "zh-CN": "工作",
    en: "Work",
  },
  "Study & Learning": {
    "zh-CN": "学习与成长",
    en: "Study & Learning",
  },
  "Life & Personal": {
    "zh-CN": "生活与个人",
    en: "Life & Personal",
  },
  General: {
    "zh-CN": "通用",
    en: "General",
  },
  "Tasks & Rules": {
    "zh-CN": "任务与规则",
    en: "Tasks & Rules",
  },
  "Focus (Pomodoro)": {
    "zh-CN": "专注（番茄钟）",
    en: "Focus (Pomodoro)",
  },
  Notifications: {
    "zh-CN": "通知",
    en: "Notifications",
  },
  Appearance: {
    "zh-CN": "外观",
    en: "Appearance",
  },
  "Account & Sync": {
    "zh-CN": "账号与同步",
    en: "Account & Sync",
  },
  Language: {
    "zh-CN": "语言",
    en: "Language",
  },
  Theme: {
    "zh-CN": "主题",
    en: "Theme",
  },
  Light: {
    "zh-CN": "浅色",
    en: "Light",
  },
  Dark: {
    "zh-CN": "深色",
    en: "Dark",
  },
  "Switch to light mode": {
    "zh-CN": "切换到浅色模式",
    en: "Switch to light mode",
  },
  "Switch to dark mode": {
    "zh-CN": "切换到深色模式",
    en: "Switch to dark mode",
  },
  "View source on GitHub": {
    "zh-CN": "在 GitHub 上查看源码",
    en: "View source on GitHub",
  },
  "Display preferences": {
    "zh-CN": "语言与主题",
    en: "Display preferences",
  },
  Home: {
    "zh-CN": "首页",
    en: "Home",
  },
  Features: {
    "zh-CN": "功能",
    en: "Features",
  },
  Pricing: {
    "zh-CN": "方案",
    en: "Pricing",
  },
  About: {
    "zh-CN": "关于",
    en: "About",
  },
  "Log In": {
    "zh-CN": "登录",
    en: "Log In",
  },
  "Sign Up": {
    "zh-CN": "注册",
    en: "Sign Up",
  },
  "Sign In": {
    "zh-CN": "登录",
    en: "Sign In",
  },
  "Create Account": {
    "zh-CN": "创建账号",
    en: "Create Account",
  },
  Welcome: {
    "zh-CN": "欢迎",
    en: "Welcome",
  },
  Back: {
    "zh-CN": "回来",
    en: "Back",
  },
  返回: {
    "zh-CN": "返回",
    en: "Back",
  },
  "notifications.taskDueBody": {
    "zh-CN": "{title} · {time} 开始",
    en: "{title} · due at {time}",
  },
  "notifications.clear": {
    "zh-CN": "清空通知",
    en: "Clear notifications",
  },
  "notifications.clearConfirm": {
    "zh-CN": "清空所有通知？不会删除待办，已清空的旧提醒不会再次出现。",
    en: "Clear all notifications? Tasks will stay, and cleared reminders will not appear again.",
  },
  "notifications.confirmClear": {
    "zh-CN": "确认清空",
    en: "Confirm clear",
  },
  "notifications.retentionHint": {
    "zh-CN": "通知不会自动过期；已读仍保留，可手动清空。",
    en: "Notifications do not expire. Read notifications stay until you clear them.",
  },
  全部已读: {
    "zh-CN": "全部已读",
    en: "Mark all read",
  },
  暂无提醒: {
    "zh-CN": "暂无提醒",
    en: "No reminders yet",
  },
  "notifications.inAppHint": {
    "zh-CN": "提醒会在应用内通知中心显示；关闭页面期间错过的提醒，回来后可在右上角铃铛中查看。",
    en: "Reminders appear in the in-app notification center; ones missed while away will be waiting under the bell when you return.",
  },
  Join: {
    "zh-CN": "加入",
    en: "Join",
  },
  "Full Name": {
    "zh-CN": "姓名",
    en: "Full Name",
  },
  "Email Address": {
    "zh-CN": "邮箱地址",
    en: "Email Address",
  },
  Password: {
    "zh-CN": "密码",
    en: "Password",
  },
  "Elegant Productivity": {
    "zh-CN": "优雅而高效",
    en: "Elegant Productivity",
  },
  "Global Elites": {
    "zh-CN": "全球用户",
    en: "Global Elites",
  },
  Satisfaction: {
    "zh-CN": "满意度",
    en: "Satisfaction",
  },
  "Core Features": {
    "zh-CN": "核心功能",
    en: "Core Features",
  },
  "Minimalism Meets Power": {
    "zh-CN": "极简之中，蕴藏力量",
    en: "Minimalism Meets Power",
  },
  "Beyond Todo": {
    "zh-CN": "不止于待办",
    en: "Beyond Todo",
  },
  Testimonials: {
    "zh-CN": "用户评价",
    en: "Testimonials",
  },
  "Product Architect": {
    "zh-CN": "产品架构师",
    en: "Product Architect",
  },
  "Independent Designer": {
    "zh-CN": "独立设计师",
    en: "Independent Designer",
  },
  "Web3 Developer": {
    "zh-CN": "Web3 开发者",
    en: "Web3 Developer",
  },
  Priority: {
    "zh-CN": "优先级",
    en: "Priority",
  },
  Research: {
    "zh-CN": "研究",
    en: "Research",
  },
  Personal: {
    "zh-CN": "个人",
    en: "Personal",
  },
  Review: {
    "zh-CN": "复盘",
    en: "Review",
  },
  "General Preferences": {
    "zh-CN": "通用偏好",
    en: "General Preferences",
  },
  "First Day of Week": {
    "zh-CN": "每周起始日",
    en: "First Day of Week",
  },
  "Set the starting day for calendar and weekly views.": {
    "zh-CN": "设置日历与周视图从哪一天开始。",
    en: "Set the starting day for calendar and weekly views.",
  },
  Monday: {
    "zh-CN": "星期一",
    en: "Monday",
  },
  Sunday: {
    "zh-CN": "星期日",
    en: "Sunday",
  },
  "Sound Effects": {
    "zh-CN": "音效",
    en: "Sound Effects",
  },
  "Play gentle chime upon completing a task.": {
    "zh-CN": "完成任务时播放轻柔提示音。",
    en: "Play gentle chime upon completing a task.",
  },
  "Focus (Pomodoro) Settings": {
    "zh-CN": "专注（番茄钟）设置",
    en: "Focus (Pomodoro) Settings",
  },
  "Pomodoro Duration": {
    "zh-CN": "番茄钟时长",
    en: "Pomodoro Duration",
  },
  "Standard deep work session length in minutes.": {
    "zh-CN": "每次深度专注的时长，单位为分钟。",
    en: "Standard deep work session length in minutes.",
  },
  "Auto-start Breaks": {
    "zh-CN": "自动开始休息",
    en: "Auto-start Breaks",
  },
  "focus.autoBreakUnavailable": {
    "zh-CN": "休息计时尚未提供，暂不可开启。专注结束后会提示你休息。",
    en: "Break timers are not available yet. This option is disabled; focus sessions end with a break reminder.",
  },
  "Automatically start break timer when focus session finishes.": {
    "zh-CN": "专注结束后自动开始休息计时。",
    en: "Automatically start break timer when focus session finishes.",
  },
  "Daily Capacity": {
    "zh-CN": "每日任务容量",
    en: "Daily Capacity",
  },
  "Choose a comfortable number of tasks for your day.": {
    "zh-CN": "选择适合自己节奏的每日任务数量。",
    en: "Choose a comfortable number of tasks for your day.",
  },
  "View today's capacity →": {
    "zh-CN": "查看今日任务容量 →",
    en: "View today's capacity →",
  },
  "Task Reminders": {
    "zh-CN": "任务提醒",
    en: "Task Reminders",
  },
  "Keep track of upcoming tasks and focus sessions.": {
    "zh-CN": "关注即将到来的任务和专注时段。",
    en: "Keep track of upcoming tasks and focus sessions.",
  },
  "A quiet, warm space for focused work.": {
    "zh-CN": "营造安静、温暖的专注空间。",
    en: "A quiet, warm space for focused work.",
  },
  "Preview account": {
    "zh-CN": "预览账号",
    en: "Preview account",
  },
  "View Profile": {
    "zh-CN": "查看个人主页",
    en: "View Profile",
  },
  "Select your preferred interface language.": {
    "zh-CN": "选择界面显示语言，任务内容保持原文。",
    en: "Select your preferred interface language.",
  },
  "Your display preferences are saved on this device.": {
    "zh-CN": "语言与主题偏好会保存在当前浏览器中。",
    en: "Your display preferences are saved on this device.",
  },
  "Focusing on:": {
    "zh-CN": "正在专注：",
    en: "Focusing on:",
  },
  "Session complete. Take a gentle break.": {
    "zh-CN": "本次专注已完成，休息一下吧。",
    en: "Session complete. Take a gentle break.",
  },
  Pause: {
    "zh-CN": "暂停",
    en: "Pause",
  },
  Resume: {
    "zh-CN": "继续",
    en: "Resume",
  },
  "Pause & Exit": {
    "zh-CN": "暂停并退出",
    en: "Pause & Exit",
  },
  "Finish Session": {
    "zh-CN": "结束专注",
    en: "Finish Session",
  },
  "Tasks Completed": {
    "zh-CN": "已完成任务",
    en: "Tasks Completed",
  },
  "Deep Work Focused": {
    "zh-CN": "深度专注时长",
    en: "Deep Work Focused",
  },
  "Consistency Map": {
    "zh-CN": "专注热力图",
    en: "Consistency Map",
  },
  "Current Streak:": {
    "zh-CN": "当前连续：",
    en: "Current Streak:",
  },
  "5 Days": {
    "zh-CN": "5 天",
    en: "5 Days",
  },
  h: {
    "zh-CN": "小时",
    en: "h",
  },
  "Member since Sep 2026": {
    "zh-CN": "加入于 2026 年 9 月",
    en: "Member since Sep 2026",
  },
  "Level 5 Architect": {
    "zh-CN": "5 级 · 架构师",
    en: "Level 5 Architect",
  },
  "LVL 5": {
    "zh-CN": "等级 5",
    en: "LVL 5",
  },
  "3,450 / 5,000 XP to next level": {
    "zh-CN": "3,450 / 5,000 经验值升至下一级",
    en: "3,450 / 5,000 XP to next level",
  },
  "Focus Garden": {
    "zh-CN": "专注花园",
    en: "Focus Garden",
  },
  '"Every 2 hours of deep work grows a new tree."': {
    "zh-CN": "“每两小时的深度专注，都能培育一棵新树。”",
    en: '"Every 2 hours of deep work grows a new tree."',
  },
  Architect: {
    "zh-CN": "架构师",
    en: "Architect",
  },
  "All day": {
    "zh-CN": "全天",
    en: "All day",
  },
  Overdue: {
    "zh-CN": "已过期",
    en: "Overdue",
  },
  Locked: {
    "zh-CN": "已锁定",
    en: "Locked",
  },
  "Unlock task": {
    "zh-CN": "解锁任务",
    en: "Unlock task",
  },
  "Lock task": {
    "zh-CN": "锁定任务",
    en: "Lock task",
  },
  "tasks.locked": {
    "zh-CN": "已锁定",
    en: "Locked",
  },
  任务状态: {
    "zh-CN": "任务状态",
    en: "Task status",
  },
  "profile.avatarPlaceholder": {
    "zh-CN": "{name} 的默认头像",
    en: "Default avatar for {name}",
  },
  "profile.memberSince": {
    "zh-CN": "加入于 {date}",
    en: "Member since {date}",
  },
  "profile.levelTitle": {
    "zh-CN": "{level} 级 · {title}",
    en: "Level {level} · {title}",
  },
  "profile.level": {
    "zh-CN": "等级 {level}",
    en: "LVL {level}",
  },
  "profile.xpToNext": {
    "zh-CN": "{current} / {next} 经验值升至下一级",
    en: "{current} / {next} XP to next level",
  },
  "profile.weeklyGarden": {
    "zh-CN": "本周花圃",
    en: "This Week's Garden",
  },
  "profile.weeklyGoal": {
    "zh-CN": "本周目标 {count}/{goal}",
    en: "Weekly goal {count}/{goal}",
  },
  "profile.focusedThisWeek": {
    "zh-CN": "本周专注",
    en: "Focused this week",
  },
  "profile.plantsGrown": {
    "zh-CN": "已培育",
    en: "Plants grown",
  },
  "profile.plantCount": {
    "zh-CN": "{count} / {goal} 株",
    en: "{count} / {goal} plants",
  },
  "profile.currentStreak": {
    "zh-CN": "连续专注",
    en: "Current streak",
  },
  "profile.dayCount": {
    "zh-CN": "{count} 天",
    en: { one: "{count} day", other: "{count} days" },
  },
  "profile.gardenPlots": {
    "zh-CN": "本周专注花圃进度",
    en: "Weekly focus garden progress",
  },
  "profile.growingPlant": {
    "zh-CN": "正在培育的新芽",
    en: "A seedling currently growing",
  },
  "profile.emptyPlot": {
    "zh-CN": "待解锁",
    en: "Locked",
  },
  "profile.nextPlant": {
    "zh-CN": "下一株正在生长",
    en: "Your next plant is growing",
  },
  "profile.minutesRemaining": {
    "zh-CN": "再专注 {count} 分钟",
    en: { one: "{count} minute to go", other: "{count} minutes to go" },
  },
  "profile.nextPlantProgress": {
    "zh-CN": "下一株植物的培育进度",
    en: "Progress toward the next plant",
  },
  "profile.weeklyGoalReached": {
    "zh-CN": "本周花圃已全部长成，做得很好。",
    en: "Your weekly garden is fully grown. Nicely done.",
  },
  Unorganized: {
    "zh-CN": "未整理",
    en: "Unorganized",
  },
  Any: {
    "zh-CN": "随时",
    en: "Any",
  },
  "No due date": {
    "zh-CN": "无截止日期",
    en: "No due date",
  },
  Pomodoros: {
    "zh-CN": "个番茄钟",
    en: "Pomodoros",
  },
  "Task Detail": {
    "zh-CN": "任务详情",
    en: "Task Detail",
  },
  "Add a description...": {
    "zh-CN": "添加描述…",
    en: "Add a description...",
  },
  List: {
    "zh-CN": "清单",
    en: "List",
  },
  Date: {
    "zh-CN": "日期",
    en: "Date",
  },
  "P1 · High": {
    "zh-CN": "P1 · 高",
    en: "P1 · High",
  },
  "P2 · Medium": {
    "zh-CN": "P2 · 中",
    en: "P2 · Medium",
  },
  "P3 · Low": {
    "zh-CN": "P3 · 低",
    en: "P3 · Low",
  },
  Tags: {
    "zh-CN": "标签",
    en: "Tags",
  },
  "Add a tag": {
    "zh-CN": "添加标签",
    en: "Add a tag",
  },
  Estimate: {
    "zh-CN": "预计时长",
    en: "Estimate",
  },
  Reminder: {
    "zh-CN": "提醒",
    en: "Reminder",
  },
  None: {
    "zh-CN": "无",
    en: "None",
  },
  "10 min before": {
    "zh-CN": "提前 10 分钟",
    en: "10 min before",
  },
  "20 min before": {
    "zh-CN": "提前 20 分钟",
    en: "20 min before",
  },
  "提前 {min} 分钟": {
    "zh-CN": "提前 {min} 分钟",
    en: "{min} min before",
  },
  "30 min before": {
    "zh-CN": "提前 30 分钟",
    en: "30 min before",
  },
  Subtasks: {
    "zh-CN": "子任务",
    en: "Subtasks",
  },
  "Add a subtask...": {
    "zh-CN": "添加子任务…",
    en: "Add a subtask...",
  },
  "＋ Add": {
    "zh-CN": "＋ 添加",
    en: "＋ Add",
  },
  "Start Focus Session": {
    "zh-CN": "开始专注",
    en: "Start Focus Session",
  },
  "Delete Task": {
    "zh-CN": "删除任务",
    en: "Delete Task",
  },
  "Quick Add": {
    "zh-CN": "快速添加",
    en: "Quick Add",
  },
  "What needs to be done?": {
    "zh-CN": "有什么需要完成的事？",
    en: "What needs to be done?",
  },
  "No matching pages": {
    "zh-CN": "未找到匹配的页面",
    en: "No matching pages",
  },
  "Create Task": {
    "zh-CN": "创建任务",
    en: "Create Task",
  },
  已创建: {
    "zh-CN": "已创建",
    en: "Created",
  },
  下周一: {
    "zh-CN": "下周一",
    en: "Next Monday",
  },
  清除日期: {
    "zh-CN": "再次点击可清除日期",
    en: "Click again to clear the date",
  },
  语音输入: {
    "zh-CN": "语音输入",
    en: "Voice input",
  },
  "正在聆听…": {
    "zh-CN": "正在聆听…",
    en: "Listening…",
  },
  完成语音输入: {
    "zh-CN": "完成语音输入",
    en: "Finish voice input",
  },
  点击取消语音输入: {
    "zh-CN": "点击取消语音输入",
    en: "Click to cancel voice input",
  },
  语音输入不可用: {
    "zh-CN": "当前浏览器不支持语音",
    en: "Not supported in this browser",
  },
  "正在识别…": {
    "zh-CN": "正在识别…",
    en: "Recognizing…",
  },
  "已识别，按回车添加": {
    "zh-CN": "已识别，按回车添加",
    en: "Recognized — press Enter to add",
  },
  语音服务未配置: {
    "zh-CN": "语音服务未配置，请在 .env.local 填入 API Key",
    en: "Voice service not configured — add an API key to .env.local",
  },
  请先登录后再使用语音输入: {
    "zh-CN": "请先登录后再使用语音输入",
    en: "Sign in to use voice input",
  },
  "识别失败，请重试": {
    "zh-CN": "识别失败，请重试",
    en: "Recognition failed — please try again",
  },
  "识别超时，请再试一次": {
    "zh-CN": "识别超时，请再试一次",
    en: "Recognition timed out — please try again",
  },
  "尝试太频繁，请稍后再试": {
    "zh-CN": "尝试太频繁，请稍后再试",
    en: "Too many attempts — please wait a moment",
  },
  "没有听清，请再试一次": {
    "zh-CN": "没有听清，请再试一次",
    en: "Didn't catch that — please try again",
  },
  确认语音待办: {
    "zh-CN": "确认语音待办",
    en: "Confirm voice task",
  },
  这句话不太像待办: {
    "zh-CN": "这句话不太像待办",
    en: "That doesn't sound like a task",
  },
  丢弃: {
    "zh-CN": "丢弃",
    en: "Discard",
  },
  编辑: {
    "zh-CN": "编辑",
    en: "Edit",
  },
  添加: {
    "zh-CN": "添加",
    en: "Add",
  },
  "添加 {count} 项": {
    "zh-CN": "添加 {count} 项",
    en: "Add {count} tasks",
  },
  知道了: {
    "zh-CN": "知道了",
    en: "Got it",
  },
  未检测到麦克风: {
    "zh-CN": "未检测到麦克风，请检查设备与系统权限",
    en: "No microphone detected — check the device and system permission",
  },
  无法访问麦克风: {
    "zh-CN": "无法访问麦克风，请在系统设置中允许",
    en: "Microphone blocked — allow access in System Settings",
  },
  "Enter to create · Esc to close · / to navigate": {
    "zh-CN": "Enter 创建 · Esc 关闭 · / 跳转页面",
    en: "Enter to create · Esc to close · / to navigate",
  },
  "Completed at": {
    "zh-CN": "完成于",
    en: "Completed at",
  },
  Restore: {
    "zh-CN": "恢复",
    en: "Restore",
  },
  Delete: {
    "zh-CN": "删除",
    en: "Delete",
  },
  "A fresh start": {
    "zh-CN": "新的开始",
    en: "A fresh start",
  },
  "Completed tasks will appear here.": {
    "zh-CN": "完成的任务将显示在这里。",
    en: "Completed tasks will appear here.",
  },
  "Inbox Zero": {
    "zh-CN": "收件箱已清空",
    en: "Inbox Zero",
  },
  "Everything is organized. Clean slate achieved.": {
    "zh-CN": "一切已安排妥当，轻装开始。",
    en: "Everything is organized. Clean slate achieved.",
  },
  "Dump what's on your mind...": {
    "zh-CN": "记下脑海中的想法…",
    en: "Dump what's on your mind...",
  },
  Add: {
    "zh-CN": "添加",
    en: "Add",
  },
  记一笔: {
    "zh-CN": "记一笔",
    en: "Capture a thought",
  },
  收进收件箱: {
    "zh-CN": "收进收件箱",
    en: "Add to Inbox",
  },
  已收进收件箱: {
    "zh-CN": "已收进收件箱",
    en: "Added to Inbox",
  },
  "先收集，后整理": {
    "zh-CN": "先收集，后整理",
    en: "Collect first, organize later",
  },
  "＋ Add Task": {
    "zh-CN": "＋ 添加任务",
    en: "＋ Add Task",
  },
  "Sort by:": {
    "zh-CN": "排序方式：",
    en: "Sort by:",
  },
  "Priority (High to Low)": {
    "zh-CN": "优先级（从高到低）",
    en: "Priority (High to Low)",
  },
  "Due Date": {
    "zh-CN": "截止日期",
    en: "Due Date",
  },
  "Creation Date": {
    "zh-CN": "创建日期",
    en: "Creation Date",
  },
  "All caught up": {
    "zh-CN": "全部完成",
    en: "All caught up",
  },
  "Add a task when your next idea arrives.": {
    "zh-CN": "下一个想法到来时，再添加任务吧。",
    en: "Add a task when your next idea arrives.",
  },
  "Good morning,": {
    "zh-CN": "早上好，",
    en: "Good morning,",
  },
  "AI Insight:": {
    "zh-CN": "AI 寄语：",
    en: "AI Insight:",
  },
  "Today's Focus": {
    "zh-CN": "今日重点",
    en: "Today's Focus",
  },
  "today.chooseFocus": {
    "zh-CN": "今天最重要的一件事是什么？",
    en: "What matters most today?",
  },
  "today.focusHint": {
    "zh-CN": "在任务详情中设置今日重点，任务仍保留在原来的时间安排中。",
    en: "Set today's focus in task details. The task stays in its original schedule.",
  },
  "One Thing": {
    "zh-CN": "最重要的一件事",
    en: "One Thing",
  },
  "Set as today's focus": {
    "zh-CN": "设为今日重点",
    en: "Set as today's focus",
  },
  设为今日专注: {
    "zh-CN": "设为今日专注",
    en: "Set as today's focus",
  },
  取消今日专注: {
    "zh-CN": "取消今日重点",
    en: "Remove from today's focus",
  },
  "Estimate:": {
    "zh-CN": "预计：",
    en: "Estimate:",
  },
  "Project: Development": {
    "zh-CN": "项目：开发",
    en: "Project: Development",
  },
  "Start Deep Work": {
    "zh-CN": "开始深度专注",
    en: "Start Deep Work",
  },
  "A little room to breathe": {
    "zh-CN": "留一点呼吸的空间",
    en: "A little room to breathe",
  },
  "Your focus is complete. Enjoy the progress.": {
    "zh-CN": "今日重点已完成，享受这份进展吧。",
    en: "Your focus is complete. Enjoy the progress.",
  },
  Capacity: {
    "zh-CN": "任务容量",
    en: "Capacity",
  },
  "Today's Must-Dos": {
    "zh-CN": "今日必做",
    en: "Today's Must-Dos",
  },
  Timeline: {
    "zh-CN": "时间轴",
    en: "Timeline",
  },
  暂无编排: {
    "zh-CN": "暂无编排",
    en: "Nothing scheduled",
  },
  向下滚动: {
    "zh-CN": "向下滚动",
    en: "Scroll for more",
  },
  上一页: {
    "zh-CN": "上一页",
    en: "Previous page",
  },
  下一页: {
    "zh-CN": "下一页",
    en: "Next page",
  },
  今天的时间轴还空着: {
    "zh-CN": "今天的时间轴还空着",
    en: "The timeline is open for today",
  },
  回到今天: {
    "zh-CN": "回到今天",
    en: "Back to today",
  },
  上一月: {
    "zh-CN": "上一月",
    en: "Previous month",
  },
  下一月: {
    "zh-CN": "下一月",
    en: "Next month",
  },
  "schedule.calendarRegion": {
    "zh-CN": "按日期浏览待办",
    en: "Browse tasks by date",
  },
  "schedule.expandCalendar": {
    "zh-CN": "展开当月日历",
    en: "Expand month calendar",
  },
  "schedule.collapseCalendar": {
    "zh-CN": "收起日历",
    en: "Collapse calendar",
  },
  "schedule.selectDay": {
    "zh-CN": "查看 {date}",
    en: "View {date}",
  },
  "schedule.emptyDay": {
    "zh-CN": "这一天还没有安排",
    en: "Nothing planned for this day",
  },
  "收集想法，规划每一天": {
    "zh-CN": "收集想法，规划每一天",
    en: "Capture thoughts, plan your days",
  },
  "AI 整理": {
    "zh-CN": "AI 整理",
    en: "AI Organize",
  },
  "AI 整理当天待办": {
    "zh-CN": "AI 整理当天待办",
    en: "AI Organize This Day",
  },
  "正在整理 {date} 的 {count} 项未完成待办": {
    "zh-CN": "正在整理 {date} 的 {count} 项未完成待办",
    en: "Organizing {count} unfinished tasks for {date}",
  },
  "正在理解这一天要做的事…": {
    "zh-CN": "正在理解这一天要做的事…",
    en: "Understanding what needs to be done…",
  },
  "保留明确时间，其余任务保持随时": {
    "zh-CN": "保留明确时间，其余任务保持随时",
    en: "Keeping explicit times; everything else stays anytime",
  },
  "已生成 {count} 项整理建议": {
    "zh-CN": "已生成 {count} 项整理建议",
    en: "Generated {count} organization suggestions",
  },
  可取消勾选不想应用的项目: {
    "zh-CN": "可取消勾选不想应用的项目",
    en: "Uncheck anything you do not want to apply",
  },
  "应用任务整理：{title}": {
    "zh-CN": "应用任务整理：{title}",
    en: "Apply organization for task: {title}",
  },
  随时: {
    "zh-CN": "随时",
    en: "Anytime",
  },
  "{count} 个番茄钟": {
    "zh-CN": "{count} 个番茄钟",
    en: { one: "{count} Pomodoro", other: "{count} Pomodoros" },
  },
  "应用 {count} 项整理": {
    "zh-CN": "应用 {count} 项整理",
    en: "Apply to {count} tasks",
  },
  "AI 整理已应用": {
    "zh-CN": "已应用 {count} 项 AI 整理",
    en: "AI organization applied to {count} tasks",
  },
  这一天没有需要整理的待办: {
    "zh-CN": "这一天没有需要整理的待办",
    en: "There are no unfinished tasks to organize for this day",
  },
  "请先登录后再使用 AI 整理": {
    "zh-CN": "请先登录后再使用 AI 整理",
    en: "Sign in to use AI Organize",
  },
  "AI 整理服务未配置": {
    "zh-CN": "AI 整理服务未配置",
    en: "AI Organize is not configured",
  },
  "AI 整理失败，请重试": {
    "zh-CN": "AI 整理失败，请重试",
    en: "AI organization failed. Please try again",
  },
  你的任务没有被修改: {
    "zh-CN": "你的任务没有被修改",
    en: "Your tasks were not changed",
  },
  重试: {
    "zh-CN": "重试",
    en: "Try again",
  },
  "AI 整理功能开发中": {
    "zh-CN": "AI 整理功能开发中，敬请期待",
    en: "AI Organize is coming soon",
  },
  Tomorrow: {
    "zh-CN": "明天",
    en: "Tomorrow",
  },
  "Next Week": {
    "zh-CN": "下周",
    en: "Next Week",
  },
  Earlier: {
    "zh-CN": "更早",
    en: "Earlier",
  },
  Day: {
    "zh-CN": "日",
    en: "Day",
  },
  Week: {
    "zh-CN": "周",
    en: "Week",
  },
  Month: {
    "zh-CN": "月",
    en: "Month",
  },
  "September 2026": {
    "zh-CN": "2026 年 9 月",
    en: "September 2026",
  },
  "Wednesday, September 9": {
    "zh-CN": "9 月 9 日，星期三",
    en: "Wednesday, September 9",
  },
  "FRIDAY, SEP 4": {
    "zh-CN": "9 月 4 日，星期五",
    en: "FRIDAY, SEP 4",
  },
  "Today · Sep 9": {
    "zh-CN": "今天 · 9 月 9 日",
    en: "Today · Sep 9",
  },
  "Tomorrow · Sep 10": {
    "zh-CN": "明天 · 9 月 10 日",
    en: "Tomorrow · Sep 10",
  },
  "Yesterday · Sep 8": {
    "zh-CN": "昨天 · 9 月 8 日",
    en: "Yesterday · Sep 8",
  },
  跳转到主要内容: {
    "zh-CN": "跳转到主要内容",
    en: "Skip to main content",
  },
  工作台导航: {
    "zh-CN": "工作台导航",
    en: "Workspace navigation",
  },
  "DiDa-todo 首页": {
    "zh-CN": "DiDa-todo 首页",
    en: "DiDa-todo home",
  },
  已承诺: {
    "zh-CN": "已承诺",
    en: "Committed",
  },
  解除今日必做: {
    "zh-CN": "解除今日必做",
    en: "Remove from today's must-dos",
  },
  关闭弹窗: {
    "zh-CN": "关闭弹窗",
    en: "Close dialog",
  },
  登录或注册: {
    "zh-CN": "登录或注册",
    en: "Log in or sign up",
  },
  您的姓名: {
    "zh-CN": "您的姓名",
    en: "Your full name",
  },
  记住我: {
    "zh-CN": "记住我",
    en: "Remember me",
  },
  "忘记密码?": {
    "zh-CN": "忘记密码?",
    en: "Forgot password?",
  },
  "直接预览工作台 →": {
    "zh-CN": "直接预览工作台 →",
    en: "Preview workspace →",
  },
  "请输入您的凭证以进入工作台。": {
    "zh-CN": "请输入您的凭证以进入工作台。",
    en: "Enter your credentials to open your workspace.",
  },
  "注册账号，开启优雅的效率之旅。": {
    "zh-CN": "注册账号，开启优雅的效率之旅。",
    en: "Create an account for a calmer, more productive day.",
  },
  "设置密码 (不少于8位)": {
    "zh-CN": "设置密码 (不少于8位)",
    en: "Choose a password (at least 8 characters)",
  },
  "当前为界面预览，登录服务尚未接入，您的凭证不会被提交。": {
    "zh-CN": "当前为界面预览，登录服务尚未接入，您的凭证不会被提交。",
    en: "This is a preview. Sign-in is not connected and your credentials will not be submitted.",
  },
  "当前为界面预览，注册服务尚未接入，您的信息不会被提交。": {
    "zh-CN": "当前为界面预览，注册服务尚未接入，您的信息不会被提交。",
    en: "This is a preview. Registration is not connected and your information will not be submitted.",
  },
  "密码找回服务尚未开放，请在账号服务上线后使用。": {
    "zh-CN": "密码找回服务尚未开放，请在账号服务上线后使用。",
    en: "Password recovery will be available when account services are connected.",
  },
  上一时间段: {
    "zh-CN": "上一时间段",
    en: "Previous period",
  },
  下一时间段: {
    "zh-CN": "下一时间段",
    en: "Next period",
  },
  "沉浸式番茄钟，关闭后结束本次计时。": {
    "zh-CN": "沉浸式番茄钟，关闭后结束本次计时。",
    en: "An immersive focus timer. Closing it ends this session.",
  },
  剩余专注时间: {
    "zh-CN": "剩余专注时间",
    en: "Remaining focus time",
  },
  "42 天专注热力图，金色越深表示专注越多，当前连续 5 天": {
    "zh-CN": "42 天专注热力图，金色越深表示专注越多，当前连续 5 天",
    en: "42-day focus heatmap. Darker gold means more focus. Current streak: 5 days.",
  },
  "Sample activity · 示例统计": {
    "zh-CN": "示例统计",
    en: "Sample activity",
  },
  统计来自你的专注与任务记录: {
    "zh-CN": "统计来自你的专注与任务记录",
    en: "Statistics from your focus and task history",
  },
  "insights.mapLabel": {
    "zh-CN": "最近 42 天专注热力图，金色越深表示专注越多，当前连续 {count} 天",
    en: "42-day focus map. Darker gold means more focus. Current streak: {count} days",
  },
  "insights.cellDetail": {
    "zh-CN": "{date}：专注 {count} 分钟",
    en: "{date}: {count} focus minutes",
  },
  "Focus Rhythm": {
    "zh-CN": "专注节奏",
    en: "Focus Rhythm",
  },
  "insights.focusMinutes": {
    "zh-CN": "{count} 分钟",
    en: "{count} min",
  },
  "Best Day": {
    "zh-CN": "单日最高",
    en: "Best Day",
  },
  "Active Days": {
    "zh-CN": "活跃天数",
    en: "Active Days",
  },
  "Daily Average": {
    "zh-CN": "活跃日均",
    en: "Daily Average",
  },
  Less: {
    "zh-CN": "少",
    en: "Less",
  },
  More: {
    "zh-CN": "多",
    en: "More",
  },
  "Last 42 days": {
    "zh-CN": "近 42 天",
    en: "Last 42 days",
  },
  "Current Streak": {
    "zh-CN": "当前连续",
    en: "Current Streak",
  },
  主导航: {
    "zh-CN": "主导航",
    en: "Main navigation",
  },
  滴滴待办: {
    "zh-CN": "滴滴待办",
    en: "DiDa-todo",
  },
  从想法到完成: {
    "zh-CN": "从想法到完成",
    en: "From idea to done.",
  },
  "掌控每一天。": {
    "zh-CN": "掌控每一天。",
    en: "Own your day.",
  },
  "DiDa-todo 是一款克制、优雅且强大的待办事项应用。剔除繁杂，聚焦核心，将您的时间管理升华为一门艺术。":
    {
      "zh-CN":
        "DiDa-todo 是一款克制、优雅且强大的待办事项应用。剔除繁杂，聚焦核心，将您的时间管理升华为一门艺术。",
      en: "DiDa-todo is a thoughtful, elegant, and powerful task manager. Clear the clutter, focus on what matters, and make time management an art.",
    },
  立即开始探索: {
    "zh-CN": "立即开始探索",
    en: "Start exploring",
  },
  "不仅是清单，": {
    "zh-CN": "不仅是清单，",
    en: "More than a list.",
  },
  "更是您的效率挚友。": {
    "zh-CN": "更是您的效率挚友。",
    en: "A companion for your day.",
  },
  "DiDa-todo 摒弃了花哨的焦虑感设计。我们用最纯粹的视觉呈现，帮助您规划时间、追踪进度，在平静中实现那些不可思议的成就。":
    {
      "zh-CN":
        "DiDa-todo 摒弃了花哨的焦虑感设计。我们用最纯粹的视觉呈现，帮助您规划时间、追踪进度，在平静中实现那些不可思议的成就。",
      en: "DiDa-todo brings calm to busy days. Plan your time, see your progress, and achieve remarkable things in a space designed for clarity.",
    },
  探索哲学: {
    "zh-CN": "探索哲学",
    en: "Explore our philosophy",
  },
  深受全球极简主义者青睐: {
    "zh-CN": "深受全球极简主义者青睐",
    en: "Loved by focused minds everywhere",
  },
  "重塑您的时间秩序。": {
    "zh-CN": "重塑您的时间秩序。",
    en: "Make time your own.",
  },
  开启尊享体验: {
    "zh-CN": "开启尊享体验",
    en: "Begin your experience",
  },
  今日任务预览: {
    "zh-CN": "今日任务预览",
    en: "Today’s task preview",
  },
  登录以添加任务: {
    "zh-CN": "登录以添加任务",
    en: "Log in to add a task",
  },
  快速记录: {
    "zh-CN": "快速记录",
    en: "Quick capture",
  },
  "化繁为简的捕获机制，让闪现的灵感瞬间落盘，绝不打断心流。": {
    "zh-CN": "化繁为简的捕获机制，让闪现的灵感瞬间落盘，绝不打断心流。",
    en: "Capture a passing thought in an instant, without interrupting your flow.",
  },
  智能规划: {
    "zh-CN": "智能规划",
    en: "Thoughtful planning",
  },
  "基于意图识别的静默算法，自动为您编排最优的时间价值序列。": {
    "zh-CN": "基于意图识别的静默算法，自动为您编排最优的时间价值序列。",
    en: "A quiet planning experience that makes room for your most meaningful work.",
  },
  数据洞察: {
    "zh-CN": "数据洞察",
    en: "Personal insights",
  },
  "克制而精准的数据统计，以客观的视角见证您的每一次跨越。": {
    "zh-CN": "克制而精准的数据统计，以客观的视角见证您的每一次跨越。",
    en: "Clear, measured insights that help you see every step of your progress.",
  },
  习惯养成: {
    "zh-CN": "习惯养成",
    en: "Lasting habits",
  },
  "不仅是待办清空，更是通过潜移默化的正反馈，重塑您的生活秩序。": {
    "zh-CN": "不仅是待办清空，更是通过潜移默化的正反馈，重塑您的生活秩序。",
    en: "Build a rhythm that lasts, with gentle encouragement beyond checking off tasks.",
  },
  设定目标: {
    "zh-CN": "设定目标",
    en: "Set your direction",
  },
  "摒弃杂念，直击靶心": {
    "zh-CN": "摒弃杂念，直击靶心",
    en: "Clear your mind. Find your focus.",
  },
  记录成长: {
    "zh-CN": "记录成长",
    en: "See your growth",
  },
  让时间的刻度可见: {
    "zh-CN": "让时间的刻度可见",
    en: "Make the passage of time visible.",
  },
  持续进化: {
    "zh-CN": "持续进化",
    en: "Keep evolving",
  },
  在平静中蜕变: {
    "zh-CN": "在平静中蜕变",
    en: "Small changes, steady progress.",
  },
  "没有任何冗余的视觉干扰，DiDa-todo 让我找回了深度的专注力，这是一种奢侈的体验。": {
    "zh-CN": "没有任何冗余的视觉干扰，DiDa-todo 让我找回了深度的专注力，这是一种奢侈的体验。",
    en: "Without unnecessary distractions, DiDa-todo helped me rediscover deep focus. That feels like a luxury.",
  },
  "它不像一个冰冷的工具，更像是一件放在我桌面上的艺术品。极简，但不可或缺。": {
    "zh-CN": "它不像一个冰冷的工具，更像是一件放在我桌面上的艺术品。极简，但不可或缺。",
    en: "It feels less like a tool and more like a piece of art on my desk. Minimal, yet indispensable.",
  },
  "柔和的色调配合优雅的字体，让我即使在应对繁重的排期时，也能感受到一种宁静。": {
    "zh-CN": "柔和的色调配合优雅的字体，让我即使在应对繁重的排期时，也能感受到一种宁静。",
    en: "Soft colors and elegant type bring a sense of calm, even when my schedule is full.",
  },
  等级经验值: {
    "zh-CN": "等级经验值",
    en: "Level experience",
  },
  更多工作台页面: {
    "zh-CN": "更多工作台页面",
    en: "More workspace pages",
  },
  "管理工作、学习与生活清单": {
    "zh-CN": "管理工作、学习与生活清单",
    en: "Manage your work, study, and life lists",
  },
  "未登录时显示示例数据；登录后任务与专注记录会同步到你的账户。": {
    "zh-CN": "未登录时显示示例数据；登录后任务与专注记录会同步到你的账户。",
    en: "Sample data is shown while signed out. Sign in to sync tasks and focus records.",
  },
  "等级、花园和统计来自你的任务与专注记录。": {
    "zh-CN": "等级、花园和统计来自你的任务与专注记录。",
    en: "Levels, the garden, and statistics come from your task and focus history.",
  },
  回顾已完成的任务: {
    "zh-CN": "回顾已完成的任务",
    en: "Revisit completed tasks",
  },
  看见专注与成长: {
    "zh-CN": "看见专注与成长",
    en: "See your focus and growth",
  },
  让节奏适合自己: {
    "zh-CN": "让节奏适合自己",
    en: "Find a rhythm that suits you",
  },
  返回首页: {
    "zh-CN": "返回首页",
    en: "Back to home",
  },
  "前端预览 · 任务修改仅保留在本次浏览中，刷新后恢复示例；等级、花园和统计为展示数据。": {
    "zh-CN": "前端预览 · 任务修改仅保留在本次浏览中，刷新后恢复示例；等级、花园和统计为展示数据。",
    en: "Frontend preview · Task edits last for this visit and reset on reload. Levels, the garden, and statistics are sample data.",
  },
  设置分类: {
    "zh-CN": "设置分类",
    en: "Settings categories",
  },
  "提醒偏好仅用于页面预览，通知服务尚未接入。": {
    "zh-CN": "提醒偏好仅用于页面预览，通知服务尚未接入。",
    en: "Reminder preferences are for this preview. Notification services are not connected.",
  },
  "当前使用前端示例数据。账号、同步与云端保存尚未接入。": {
    "zh-CN": "当前使用前端示例数据。账号、同步与云端保存尚未接入。",
    en: "This workspace uses sample data. Accounts, sync, and cloud storage are not connected.",
  },
  已更新本次预览的偏好设置: {
    "zh-CN": "已更新本次预览的偏好设置",
    en: "Preferences updated for this preview.",
  },
  添加收件箱任务: {
    "zh-CN": "添加收件箱任务",
    en: "Add an inbox task",
  },
  选择清单: {
    "zh-CN": "选择清单",
    en: "Choose a list",
  },
  待整理: {
    "zh-CN": "待整理",
    en: "Unorganized",
  },
  "记录一个想法，或者输入 / 跳转到其他页面。": {
    "zh-CN": "记录一个想法，或者输入 / 跳转到其他页面。",
    en: "Capture a thought, or type / to navigate to another page.",
  },
  任务标题或页面名称: {
    "zh-CN": "任务标题或页面名称",
    en: "Task title or page name",
  },
  快捷页面导航: {
    "zh-CN": "快捷页面导航",
    en: "Quick page navigation",
  },
  任务日期: {
    "zh-CN": "任务日期",
    en: "Task date",
  },
  "编辑任务信息、子任务，或开始专注。": {
    "zh-CN": "编辑任务信息、子任务，或开始专注。",
    en: "Edit task details and subtasks, or start a focus session.",
  },
  任务标题: {
    "zh-CN": "任务标题",
    en: "Task title",
  },
  任务描述: {
    "zh-CN": "任务描述",
    en: "Task description",
  },
  预计番茄钟数量: {
    "zh-CN": "预计番茄钟数量",
    en: "Estimated Pomodoros",
  },
  新子任务: {
    "zh-CN": "新子任务",
    en: "New subtask",
  },
  今日任务容量: {
    "zh-CN": "今日任务容量",
    en: "Daily task capacity",
  },
  搜索与快速添加: {
    "zh-CN": "搜索与快速添加",
    en: "Search and quick add",
  },
  搜索: {
    "zh-CN": "搜索",
    en: "Search",
  },
  "搜索任务…": {
    "zh-CN": "搜索任务…",
    en: "Search tasks…",
  },
  搜索全部任务: {
    "zh-CN": "搜索全部任务",
    en: "Search all tasks",
  },
  暂无搜索记录: {
    "zh-CN": "暂无搜索记录",
    en: "No recent searches",
  },
  最近搜索: {
    "zh-CN": "最近搜索",
    en: "Recent searches",
  },
  清除搜索记录: {
    "zh-CN": "清除搜索记录",
    en: "Clear search history",
  },
  没有匹配的任务: {
    "zh-CN": "没有匹配的任务",
    en: "No matching tasks",
  },
  "正在搜索…": {
    "zh-CN": "正在搜索…",
    en: "Searching…",
  },
  显示更多: {
    "zh-CN": "显示更多",
    en: "Show more",
  },
  "正在加载…": {
    "zh-CN": "正在加载…",
    en: "Loading…",
  },
  加载更多: {
    "zh-CN": "加载更多",
    en: "Load more",
  },
  "正在加载这一天…": {
    "zh-CN": "正在加载这一天…",
    en: "Loading this day…",
  },
  选择: {
    "zh-CN": "选择",
    en: "to select",
  },
  导航: {
    "zh-CN": "导航",
    en: "to navigate",
  },
  关闭: {
    "zh-CN": "关闭",
    en: "to close",
  },
  减少: {
    "zh-CN": "减少",
    en: "Decrease",
  },
  增加: {
    "zh-CN": "增加",
    en: "Increase",
  },
  删除子任务: {
    "zh-CN": "删除子任务",
    en: "Delete subtask",
  },
  拖拽排序: {
    "zh-CN": "拖拽排序",
    en: "Drag to reorder",
  },
  完成子任务: {
    "zh-CN": "完成子任务",
    en: "Complete subtask",
  },
  折叠子任务: {
    "zh-CN": "折叠子任务",
    en: "Collapse subtasks",
  },
  展开子任务: {
    "zh-CN": "展开子任务",
    en: "Expand subtasks",
  },
  添加子任务: {
    "zh-CN": "添加子任务",
    en: "Add a subtask",
  },
  无子任务: {
    "zh-CN": "无子任务",
    en: "No subtasks",
  },
  "tasks.subtaskProgress": {
    "zh-CN": "已完成 {completed}/{count} 个子任务",
    en: {
      one: "{completed} of {count} subtask complete",
      other: "{completed} of {count} subtasks complete",
    },
  },
  "tasks.completeSubtask": {
    "zh-CN": "完成子任务：{title}",
    en: "Complete subtask: {title}",
  },
  "tasks.reopenSubtask": {
    "zh-CN": "将子任务标记为未完成：{title}",
    en: "Mark subtask incomplete: {title}",
  },
  关闭提示: {
    "zh-CN": "关闭提示",
    en: "Dismiss message",
  },
  任务已从本次预览中删除: {
    "zh-CN": "任务已从本次预览中删除",
    en: "Task deleted from this preview.",
  },
  今日计划: {
    "zh-CN": "今日计划",
    en: "Today’s plan",
  },
  收集想法: {
    "zh-CN": "收集想法",
    en: "Capture thoughts",
  },
  即将到来: {
    "zh-CN": "即将到来",
    en: "Upcoming tasks",
  },
  日历视图: {
    "zh-CN": "日历视图",
    en: "Calendar view",
  },
  工作清单: {
    "zh-CN": "工作清单",
    en: "Work lists",
  },
  已完成任务: {
    "zh-CN": "已完成任务",
    en: "Completed tasks",
  },
  效率统计: {
    "zh-CN": "效率统计",
    en: "Productivity insights",
  },
  偏好设置: {
    "zh-CN": "偏好设置",
    en: "Preferences",
  },
  个人主页: {
    "zh-CN": "个人主页",
    en: "Your profile",
  },
  "© 2026 DIDA-TODO. DESIGNED FOR THE FOCUSED MIND.": {
    "zh-CN": "© 2026 DIDA-TODO。为专注而设计。",
    en: "© 2026 DIDA-TODO. DESIGNED FOR THE FOCUSED MIND.",
  },
  "tasks.todayInsight": {
    "zh-CN": "今天有 {count} 项任务。现在适合深度专注，试着在上午 11 点前完成最重要的一件事。",
    en: {
      one: "You have {count} task today. Now is a good time for deep work. Consider tackling your One Thing before 11:00 AM.",
      other:
        "You have {count} tasks today. Now is a good time for deep work. Consider tackling your One Thing before 11:00 AM.",
    },
  },
  "tasks.inboxCount": {
    "zh-CN": "{count} 项待整理任务",
    en: { one: "{count} unorganized task", other: "{count} unorganized tasks" },
  },
  "tasks.archiveCount": {
    "zh-CN": "完成历史（{count} 项）",
    en: { one: "Completed history ({count} item)", other: "Completed history ({count} items)" },
  },
  "tasks.listCount": {
    "zh-CN": "{count} 项进行中 · 本周完成 {percent}%",
    en: {
      one: "{count} active task · {percent}% completed this week",
      other: "{count} active tasks · {percent}% completed this week",
    },
  },
  "tasks.added": {
    "zh-CN": "已添加至{list}{date}",
    en: "Added to {list}{date}",
  },
  "tasks.movedToList": {
    "zh-CN": "已移动至{list}清单",
    en: "Moved to {list}",
  },
  "tasks.restored": {
    "zh-CN": "已恢复到{list}{date}",
    en: "Restored to {list}{date}",
  },
  "tasks.open": {
    "zh-CN": "查看任务：{title}",
    en: "View task: {title}",
  },
  "tasks.complete": {
    "zh-CN": "完成任务：{title}",
    en: "Complete task: {title}",
  },
  "tasks.priority": {
    "zh-CN": "优先级 P{priority}",
    en: "P{priority} priority",
  },
  "tasks.due": {
    "zh-CN": "截止：{date}",
    en: "Due {date}",
  },
  "tasks.pomodoros": {
    "zh-CN": "{count} 个番茄钟",
    en: { one: "{count} Pomodoro", other: "{count} Pomodoros" },
  },
  "tasks.removeTag": {
    "zh-CN": "移除标签 {tag}",
    en: "Remove tag {tag}",
  },
  选择日期: {
    "zh-CN": "选择日期",
    en: "Pick a date",
  },
  选择月份: {
    "zh-CN": "选择月份",
    en: "Pick a month",
  },
  取消: {
    "zh-CN": "取消",
    en: "Cancel",
  },
  选择日期与时间: {
    "zh-CN": "选择日期与时间",
    en: "Pick date and time",
  },
  年: {
    "zh-CN": "年",
    en: "Year",
  },
  月: {
    "zh-CN": "月",
    en: "Month",
  },
  日: {
    "zh-CN": "日",
    en: "Day",
  },
  确定: {
    "zh-CN": "确定",
    en: "Done",
  },
  时: {
    "zh-CN": "时",
    en: "Hour",
  },
  分: {
    "zh-CN": "分",
    en: "Min",
  },
  Time: {
    "zh-CN": "时间",
    en: "Time",
  },
  任务时间: {
    "zh-CN": "任务时间",
    en: "Task time",
  },
  "tasks.deleted": {
    "zh-CN": "已删除任务",
    en: "Task deleted",
  },
  "profile.plant": {
    "zh-CN": "专注花园植物 {index}",
    en: "Focus garden plant {index}",
  },
  "insights.cell": {
    "zh-CN": "第 {day} 天：{count} 次专注",
    en: { one: "Day {day}: {count} focus session", other: "Day {day}: {count} focus sessions" },
  },
  "app.description": {
    "zh-CN": "DiDa-todo，从想法到完成，掌控每一天。克制、优雅的待办与时间管理体验。",
    en: "DiDa-todo. From idea to done, own your day with a thoughtful task and time management experience.",
  },
  "errors.title": {
    "zh-CN": "哎呀，出错了",
    en: "Oops, something went wrong",
  },
  "errors.description": {
    "zh-CN": "页面遇到了一点小状况，您的数据是安全的，请稍后重试。",
    en: "This page hit a small snag. Your data is safe — please try again.",
  },
  "errors.workspaceTitle": {
    "zh-CN": "工作台加载失败",
    en: "Workspace failed to load",
  },
  "errors.notFoundTitle": {
    "zh-CN": "页面走丢了",
    en: "Page not found",
  },
  "errors.notFoundDescription": {
    "zh-CN": "您访问的页面不存在或已被移动，回到首页继续您的旅程吧。",
    en: "The page you're looking for doesn't exist or has moved. Head back home to continue.",
  },
  "errors.retry": {
    "zh-CN": "重试",
    en: "Try again",
  },
  "errors.backHome": {
    "zh-CN": "返回首页",
    en: "Back to home",
  },
  "sync.failed": {
    "zh-CN": "同步失败，正在尝试恢复云端状态。请检查连接后重试。",
    en: "Sync failed — trying to restore cloud state. Check your connection and try again.",
  },
  "sync.realtime.connected": {
    "zh-CN": "实时同步",
    en: "Live sync",
  },
  "sync.realtime.connecting": {
    "zh-CN": "同步连接中",
    en: "Connecting sync",
  },
  "sync.realtime.reconnecting": {
    "zh-CN": "同步重连中",
    en: "Reconnecting sync",
  },
  "sync.conflict": {
    "zh-CN": "检测到其他设备的修改，已保留云端最新内容。请基于最新任务重试修改。",
    en: "Changes detected on another device. The latest cloud version was kept; retry your edit.",
  },
  "邮箱或密码不正确。": {
    "zh-CN": "邮箱或密码不正确。",
    en: "Incorrect email or password.",
  },
  "邮箱尚未验证，请先查收确认邮件。": {
    "zh-CN": "邮箱尚未验证，请先查收确认邮件。",
    en: "Please confirm your email first — check your inbox.",
  },
  "该邮箱已注册，可以直接登录。": {
    "zh-CN": "该邮箱已注册，可以直接登录。",
    en: "That email is already registered — try signing in.",
  },
  "密码强度不足，请更换更复杂的密码。": {
    "zh-CN": "密码强度不足，请更换更复杂的密码。",
    en: "Password is too weak — please choose a stronger one.",
  },
  "确认邮件已发送，请查收后再登录。": {
    "zh-CN": "确认邮件已发送，请查收后再登录。",
    en: "Confirmation email sent — please check your inbox, then sign in.",
  },
  "请先填写邮箱，再找回密码。": {
    "zh-CN": "请先填写邮箱，再找回密码。",
    en: "Enter your email first, then reset your password.",
  },
  "重置密码邮件已发送，请查收。": {
    "zh-CN": "重置密码邮件已发送，请查收。",
    en: "Password reset email sent — please check your inbox.",
  },
  修改密码: {
    "zh-CN": "修改密码",
    en: "Change Password",
  },
  "设置新密码后，其他设备需使用新密码重新登录。": {
    "zh-CN": "设置新密码后，其他设备需使用新密码重新登录。",
    en: "Other devices will need the new password to sign in again.",
  },
  新密码: {
    "zh-CN": "新密码",
    en: "New password",
  },
  确认新密码: {
    "zh-CN": "确认新密码",
    en: "Confirm new password",
  },
  更新密码: {
    "zh-CN": "更新密码",
    en: "Update Password",
  },
  "两次输入的密码不一致。": {
    "zh-CN": "两次输入的密码不一致。",
    en: "The two passwords don't match.",
  },
  "密码已更新。": {
    "zh-CN": "密码已更新。",
    en: "Password updated.",
  },
  "你已通过密码重置链接登录，请设置新密码并保存。": {
    "zh-CN": "你已通过密码重置链接登录，请设置新密码并保存。",
    en: "You signed in via a password reset link — please set a new password.",
  },
  验证码: {
    "zh-CN": "验证码",
    en: "Verification Code",
  },
  发送验证码: {
    "zh-CN": "发送验证码",
    en: "Send Code",
  },
  "重发 ({seconds}s)": {
    "zh-CN": "重发 ({seconds}s)",
    en: "Resend ({seconds}s)",
  },
  "验证码已发送，请查收邮件。": {
    "zh-CN": "验证码已发送，请查收邮件。",
    en: "Code sent — please check your inbox.",
  },
  "验证码错误或已过期。": {
    "zh-CN": "验证码错误或已过期。",
    en: "That code is wrong or has expired.",
  },
  "该邮箱尚未注册，请先注册。": {
    "zh-CN": "该邮箱尚未注册，请先注册。",
    en: "That email isn't registered — sign up first.",
  },
  "请输入邮件中的 6 位验证码。": {
    "zh-CN": "请输入邮件中的 6 位验证码。",
    en: "Enter the 6-digit code from your email",
  },
  使用验证码登录: {
    "zh-CN": "使用验证码登录",
    en: "Sign in with email code",
  },
  使用密码登录: {
    "zh-CN": "使用密码登录",
    en: "Sign in with password",
  },
  "验证码第 {index} 位": {
    "zh-CN": "验证码第 {index} 位",
    en: "Verification code digit {index}",
  },
  "请输入完整的 6 位验证码。": {
    "zh-CN": "请输入完整的 6 位验证码。",
    en: "Enter the full 6-digit code.",
  },
  "邮箱格式不正确，请检查后重试。": {
    "zh-CN": "邮箱格式不正确，请检查后重试。",
    en: "That doesn't look like a valid email address.",
  },
  密码要求: {
    "zh-CN": "密码要求",
    en: "Password requirements",
  },
  "长度至少 8 个字符": {
    "zh-CN": "长度至少 8 个字符",
    en: "At least 8 characters",
  },
  包含大写字母: {
    "zh-CN": "包含大写字母",
    en: "An uppercase letter",
  },
  包含小写字母: {
    "zh-CN": "包含小写字母",
    en: "A lowercase letter",
  },
  包含数字: {
    "zh-CN": "包含数字",
    en: "A number",
  },
  "包含特殊字符（如 !@#$%）": {
    "zh-CN": "包含特殊字符（如 !@#$%）",
    en: "A special character (!@#$%)",
  },
  "密码不满足要求，请对照下方规则修改。": {
    "zh-CN": "密码不满足要求，请对照下方规则修改。",
    en: "Password doesn't meet the requirements — check the list below.",
  },
  显示密码: {
    "zh-CN": "显示密码",
    en: "Show password",
  },
  隐藏密码: {
    "zh-CN": "隐藏密码",
    en: "Hide password",
  },
  换一个头像: {
    "zh-CN": "换一个头像",
    en: "Shuffle avatar",
  },
  头像: {
    "zh-CN": "头像",
    en: "Avatar",
  },
  "根据你的邮箱生成专属形象，可随时更换。": {
    "zh-CN": "根据你的邮箱生成专属形象，可随时更换。",
    en: "A unique look generated from your email — shuffle anytime.",
  },
  "正在生成…": {
    "zh-CN": "正在生成…",
    en: "Generating…",
  },
  进入工作台: {
    "zh-CN": "进入工作台",
    en: "Open Workspace",
  },
  "收集想法，随录随整理。": {
    "zh-CN": "收集想法，随录随整理。",
    en: "Capture ideas, organize as you go.",
  },
  退出登录: {
    "zh-CN": "退出登录",
    en: "Sign Out",
  },
  "退出登录失败，请重试": {
    "zh-CN": "退出登录失败，请重试",
    en: "Sign out failed. Please try again.",
  },
  发送重置邮件: {
    "zh-CN": "发送重置邮件",
    en: "Send reset email",
  },
  "正在发送…": {
    "zh-CN": "正在发送…",
    en: "Sending…",
  },
  "重新发送（{seconds} 秒）": {
    "zh-CN": "重新发送（{seconds} 秒）",
    en: "Resend in {seconds}s",
  },
  "重置邮件已发送，请查收邮箱。": {
    "zh-CN": "重置邮件已发送，请查收邮箱。",
    en: "Reset email sent. Please check your inbox.",
  },
  "重置邮件发送失败，请稍后重试。": {
    "zh-CN": "重置邮件发送失败，请稍后重试。",
    en: "Failed to send the reset email. Please try again later.",
  },
  "为确保是你本人操作，我们将向你的邮箱发送一条包含重置链接的邮件。": {
    "zh-CN": "为确保是你本人操作，我们将向你的邮箱发送一条包含重置链接的邮件。",
    en: "To protect your account, we'll email you a password reset link.",
  },
  重置密码: {
    "zh-CN": "重置密码",
    en: "Reset password",
  },
  "输入注册邮箱接收验证码，验证后即可设置新密码。": {
    "zh-CN": "输入注册邮箱接收验证码，验证后即可设置新密码。",
    en: "Enter your email to receive a code, then set a new password.",
  },
  "重置验证码已发送，请查收邮箱。": {
    "zh-CN": "重置验证码已发送，请查收邮箱。",
    en: "Reset code sent. Please check your inbox.",
  },
  "重置验证码已发送至 {email}": {
    "zh-CN": "重置验证码已发送至 {email}",
    en: "Reset code sent to {email}",
  },
  "正在验证…": {
    "zh-CN": "正在验证…",
    en: "Verifying…",
  },
  验证并继续: {
    "zh-CN": "验证并继续",
    en: "Verify and continue",
  },
  重新发送验证码: {
    "zh-CN": "重新发送验证码",
    en: "Resend code",
  },
  更换邮箱: {
    "zh-CN": "更换邮箱",
    en: "Change email",
  },
  设置新密码: {
    "zh-CN": "设置新密码",
    en: "Set new password",
  },
  返回登录: {
    "zh-CN": "返回登录",
    en: "Back to sign in",
  },
  "操作失败，请稍后重试。": {
    "zh-CN": "操作失败，请稍后重试。",
    en: "Something went wrong. Please try again later.",
  },
  昵称: {
    "zh-CN": "昵称",
    en: "Display name",
  },
  在个人主页与工作台中展示: {
    "zh-CN": "在个人主页与工作台中展示",
    en: "Shown on your profile and workspace",
  },
  保存昵称: {
    "zh-CN": "保存昵称",
    en: "Save display name",
  },
  编辑昵称: {
    "zh-CN": "编辑昵称",
    en: "Edit display name",
  },
  邮箱: {
    "zh-CN": "邮箱",
    en: "Email",
  },
  换绑邮箱: {
    "zh-CN": "换绑邮箱",
    en: "Change email",
  },
  用于登录与接收通知: {
    "zh-CN": "用于登录与接收通知",
    en: "Used for sign-in and notifications",
  },
  新的邮箱地址: {
    "zh-CN": "新的邮箱地址",
    en: "New email address",
  },
  "当前邮箱：{email}": {
    "zh-CN": "当前邮箱：{email}",
    en: "Current email: {email}",
  },
  "换绑需验证新邮箱：确认邮件将发送至新邮箱，点击邮件中的链接后生效。": {
    "zh-CN": "换绑需验证新邮箱：确认邮件将发送至新邮箱，点击邮件中的链接后生效。",
    en: "Changing email verifies the new address: a confirmation email will be sent, and the change takes effect after clicking the link.",
  },
  发送确认邮件: {
    "zh-CN": "发送确认邮件",
    en: "Send confirmation email",
  },
  "确认邮件已发送至新邮箱，请查收并点击确认完成换绑。": {
    "zh-CN": "确认邮件已发送至新邮箱，请查收并点击确认完成换绑。",
    en: "Confirmation email sent to the new address. Open it and click the link to finish.",
  },
  "新邮箱不能与当前邮箱相同。": {
    "zh-CN": "新邮箱不能与当前邮箱相同。",
    en: "The new email must be different from the current one.",
  },
  "为确保是你本人操作，需通过邮箱验证码验证后才能设置新密码。": {
    "zh-CN": "为确保是你本人操作，需通过邮箱验证码验证后才能设置新密码。",
    en: "To protect your account, verify a code from your email before setting a new password.",
  },
  "任务、偏好与语音记录已同步到你的账户。": {
    "zh-CN": "任务、偏好与语音记录已同步到你的账户。",
    en: "Tasks, preferences, and voice notes are synced to your account.",
  },
  已保存到你的账户: {
    "zh-CN": "已保存到你的账户",
    en: "Saved to your account",
  },
} as const;

export type MessageKey = keyof typeof messages;
