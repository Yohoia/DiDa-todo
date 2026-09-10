import type { Task } from "@/types/task";
import { DEMO_ANCHOR, getDemoDate } from "@/lib/date-utils";

export const DEMO_TODAY = DEMO_ANCHOR;
const defaults = {
  description: "",
  list: "Work",
  date: "",
  priority: 3,
  estimate: 1,
  reminder: "None",
  completed: false,
  subtasks: [],
} satisfies Partial<Task>;

const examples: (Partial<Task> & Pick<Task, "id" | "title">)[] = [
  {
    id: "focus",
    schedule: { date: getDemoDate(-1), hour: 10, duration: 120, label: "DiDa 登录模块开发" },
    title: "完成 DiDa 登录系统核心业务逻辑与鉴权",
    description: "实现登录界面与会话管理交互，完善验证流程和页面衔接。",
    date: DEMO_TODAY,
    time: "18:00",
    priority: 1,
    estimate: 2,
    reminder: "10 min before",
    tag: "development",
    featured: true,
    inWorkList: true,
    subtasks: [
      { id: "sub-1", title: "Login UI Layout", completed: true },
      { id: "sub-2", title: "OTP Verification API", completed: false },
      { id: "sub-3", title: "Session Middleware", completed: false },
    ],
  },
  {
    id: "paper",
    title: "提交 HCI 交互设计论文终稿",
    list: "Study",
    date: DEMO_TODAY,
    frozen: true,
  },
  {
    schedule: { date: DEMO_TODAY, hour: 9, duration: 60, label: "UI 资产整理" },
    id: "design",
    title: "设计系统 UI 资产整理",
    date: DEMO_TODAY,
    time: "09:00",
    tag: "Design",
  },
  {
    schedule: { date: DEMO_TODAY, hour: 11, duration: 45, label: "投资人沟通" },
    id: "comms",
    title: "回复投资者与合作伙伴邮件",
    date: DEMO_TODAY,
    time: "10:30",
    tag: "Comms",
  },
  {
    id: "groceries",
    title: "采购生活物资 (牛奶、咖啡豆)",
    date: DEMO_TODAY,
    list: "Life",
    tag: "Life",
  },
  { id: "inbox-1", title: "看一下新出的前端 UI 框架与设计系统", list: "Inbox" },
  { id: "inbox-2", title: "云服务器带宽与套餐续费确认", list: "Inbox" },
  { id: "inbox-3", title: "和导师预约时间聊一下毕业论文大纲", list: "Inbox" },
  {
    id: "register",
    title: "完成用户注册与邮箱验证前端页面组件",
    date: getDemoDate(1),
    tag: "Development",
  },
  { id: "backup", title: "服务器自动化备份脚本测试", date: getDemoDate(1), tag: "DevOps" },
  {
    id: "revision",
    title: "向学术委员会发送中期论文修改稿",
    date: getDemoDate(2),
    list: "Study",
    tag: "Study",
  },
  { id: "budget", title: "季度项目资产规划与预算评审会议", date: getDemoDate(5), tag: "Work" },
  {
    id: "css",
    title: "设计系统组件库 CSS 语义化变量重构",
    date: getDemoDate(1),
    priority: 2,
    tag: "DesignSystem",
    inWorkList: true,
  },
  { id: "slides", title: "撰写季度产品规划演示 PPT", date: getDemoDate(6), inWorkList: true },
  {
    id: "archive-1",
    title: "修改登录页面逻辑交互 bug",
    date: getDemoDate(-1),
    completed: true,
    completedAt: `${getDemoDate(-1)}T21:40:00+08:00`,
    inWorkList: true,
  },
  {
    id: "archive-2",
    title: "预订周末高铁票与酒店",
    list: "Life",
    completed: true,
    completedAt: `${getDemoDate(-1)}T14:15:00+08:00`,
  },
];
export const initialTasks: Task[] = examples.map((task, index) => ({
  ...defaults,
  created: index,
  ...task,
}));
