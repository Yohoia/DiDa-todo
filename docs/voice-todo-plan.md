# 语音待办（Voice-to-Todo）实施方案

> 状态：**M1 + M2 已实施并真实联调通过**（2026-09-14，真实 Key 端到端：语音 → 转写 → 解析 → 结构化，中/英双语）
> 前置：语音听写胶囊 UI（导航栏黑洞变形）已完成，本方案替换其"引擎"并补全确认环节
> 实施结果：`?voice-demo` 可无 Key 预览全流程（录音→思考→确认卡→添加/编辑/丢弃）

## 0. 一句话概括

点击麦克风录音 → 服务端调 **Qwen3-ASR-Flash** 转文字 → **deepseek-flash**（JSON mode）解析为结构化待办 → 黑色胶囊展开为**确认卡**，用户核对后一键添加（或进 QuickAdd 编辑）。

## 1. 功能流程与状态机

```
┌─ 浏览器 ──────────────────────────┐   ┌─ Next.js 服务端 ─────────┐   ┌─ 阿里云百炼 ─┐
│ 点击麦克风 → 录音（WAV 采集）        │   │ /api/voice/transcribe    │──▶│ qwen-audio- │
│                                    │──▶│  音频 base64 转发        │   │ 3.0-asr-    │
│ 声纹胶囊（录音态）                  │   │ /api/voice/parse         │──▶│ flash       │
│ 确认卡（原文 + 解析结果 + ✓/✗/编辑）│◀──│  transcript + 结构化结果  │   │ deepseek-   │
│                                    │   │                          │   │ flash(解析) │
└────────────────────────────────────┘   └──────────────────────────┘   └─────────────┘
```

前端状态机（`voiceCapture` 扩展为带 phase 的对象）：

```
idle ──点击麦克风──▶ recording ──点✓──▶ transcribing ──▶ parsing ──▶ confirming
                      │                    │               │            │     │
                      │点✗                 │失败            │失败         │✓添加 │✗丢弃/非待办
                      ▼                    ▼               ▼            ▼     ▼
                    idle ◀──────────────── idle + toast 错误原因      addTask  idle
```

- `transcribing` 与 `parsing` 在 UI 上合并为一个"思考中"态（三点脉动），用户不关心内部两步。
- 解析结果 `isTodo: false`（如"今天天气怎么样"）→ 确认卡显示"这句话不太像待办"+ 原文，只有关闭操作。

## 2. 技术选型（已定）

| 环节     | 选型                                               | 说明                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 语音识别 | **qwen-audio-3.0-asr-flash**（已实测）             | **DashScope 原生协议** `POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`（input.messages[].input_audio.data 收 data URL；`parameters.format=wav` + `sample_rate` + `vocabulary` 热词 + `language_hints`）。短音频同步返回；base64 后 ≤10MB；ITN 默认开启（"三点"→"3点"）。**实测坑**：新模型在 OpenAI 兼容模式报 `format is empty`，且 workspace Key（`sk-ws-` 前缀）的模型列表里只有 `qwen-audio-3.0-asr-flash`，旧名 `qwen3-asr-flash` 已不存在 |
| 待办解析 | **DeepSeek 官方 API**（已实测）                    | `https://api.deepseek.com/v1/chat/completions`（OpenAI 兼容）+ `response_format: json_object` + temperature 0；模型用 `deepseek-flash`（当前为 V4.1-Flash；旧名 `deepseek-chat` 已于 2026-07-24 停用）；关思考用顶层 `thinking: {"type":"disabled"}`（已核实并实测）                                                                                                                                                                                                                        |
| 解析架构 | 单次 LLM 调用 + zod 校验 + 失败重试一次 + 优雅降级 | 不搭 agent 框架。升级触发信号见 §5.9                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 停录方式 | v1 手动（点 ✓），VAD 静音自动停列为 v2             | 60s 到点自动确认（与服务端时长上限对齐）                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 确认交互 | 胶囊向上展开为确认卡；"编辑"复用 QuickAdd 预填     | QuickAdd 已支持 initialList/initialDate/initialTime/initialTitle                                                                                                                                                                                                                                                                                                                                                                                                                            |

**LLM 供应商抽象（一份代码，两平台可切）**：DeepSeek 官方与百炼的对话接口均为 OpenAI 兼容，`/api/voice/parse` 只写一份调用逻辑（`resolveProvider()`）。显式环境变量优先；未配置时**按哪把 Key 在自动选平台**——`DEEPSEEK_API_KEY` 在 → DeepSeek 官方 + `deepseek-flash`，只有 `DASHSCOPE_API_KEY` → 百炼 compatible-mode + `qwen-flash`：

```
VOICE_LLM_BASE_URL = （可选）显式覆盖，如 https://dashscope.aliyuncs.com/compatible-mode/v1
VOICE_LLM_API_KEY  = （可选）显式覆盖；缺省 DEEPSEEK_API_KEY ?? DASHSCOPE_API_KEY
VOICE_LLM_MODEL    = （可选）显式覆盖；缺省按平台 deepseek-flash / qwen-flash
VOICE_ASR_BASE_URL = （可选）ASR 根域名，默认 https://dashscope.aliyuncs.com（原生 multimodal-generation 协议）
VOICE_ASR_MODEL    = （可选）默认 qwen-audio-3.0-asr-flash
```

非标准参数随平台自适应：DeepSeek V4 关思考用顶层 `thinking: {"type":"disabled"}`（已核实官方 API 参考）；百炼 qwen 用 `enable_thinking:false`。默认走 DeepSeek 官方（用现有额度，`deepseek-flash` 为 Flash 低价档，槽位抽取绰绰有余）；DeepSeek 额度耗尽或想对比解析质量时，清掉 `DEEPSEEK_API_KEY` 或改 env 即切百炼 `qwen-flash`（0.05/0.4 元每百万，便宜到可忽略）。注意两家的 JSON mode 都要求 prompt 中出现 "json" 字样（本方案 system prompt 已满足）。平台外选择（GPT-4o-mini / Gemini Flash / Claude Haiku）对这个中文短句抽取任务无优势，还需多管一个 key 与出海链路，不考虑。

**ASR 备选结论**（2026-09-14 实测修订）：用户 workspace（`sk-ws-` Key）的模型列表中旧名 `qwen3-asr-flash` 已不存在，现行可用的是其品牌升级版 **`qwen-audio-3.0-asr-flash`**（另有 `fun-asr-flash-2026-06-15`、realtime 与旧日期后缀版本）；新模型**仅支持 DashScope 原生协议**（OpenAI 兼容模式报 `format is empty`），热词经 `parameters.vocabulary`。若未来要求流式实时转写换 `qwen-audio-3.0-realtime-flash`；长录音（>5 分钟）换异步转写任务。

## 3. 详细设计

### 3.1 录音采集（前端）

**统一采集为 WAV / 16kHz / 单声道**，一次性规避容器格式问题：

- `MediaRecorder` 的产出依浏览器而异（Chrome: webm/opus，Safari: mp4/aac），而现行 qwen-audio-3.0-asr-flash 的 parameters.format 明确支持 wav/mp3/opus。与其做格式协商，不如用 `AudioContext`（sampleRate 16000）+ `AudioWorkletNode` 采 PCM，前端编码 WAV；仅为不支持 AudioWorklet 的旧浏览器保留 ScriptProcessor 兼容分支。
- 体量：32KB/s → 10 秒 ≈ 320KB（base64 后 ≈ 430KB），60 秒上限 ≈ 1.9MB（base64 ≈ 2.6MB），远低于 10MB 限制。
- 保留现有 `enumerateDevices` 麦克风预检与 `?voice-demo` 样式预览通道；Web Speech API 引擎代码退役删除。
- 实施：`WavRecorder` 类（`src/lib/audio/wav-recorder.ts`，`prewarm/start/stop/abort`）+ `useVoiceCapture` 流程钩子（`voice-capture.tsx`）。prewarm 在麦克风点击的同步段创建并 resume AudioContext（iOS 手势限制）；原生率 ≠ 16k 时编码前线性插值降采样；RMS 响度经噪声门与平滑后实时驱动声纹，静音时声纹不动；60s 到点钩子自动走确认。StrictMode 双挂载下 start/stop/abort 幂等。

### 3.2 服务端路由

**`POST /api/voice/transcribe`**（`src/app/api/voice/transcribe/route.ts`）

- 防护：仅接受同源请求（额外预览域名可通过 `VOICE_ALLOWED_ORIGINS` 配置），按客户端地址每分钟限 8 次，并在解析 multipart 前检查请求体长度。当前限流适合单实例原型；多实例生产部署应切换共享限流并叠加账号配额。
- 入参：`multipart/form-data { audio: File }`；校验 content-type 为 audio/wav、大小 ≤ 12MB、时长 ≤ 60s（WAV 头可算）。
- 转发 qwen-audio-3.0-asr-flash（**DashScope 原生 multimodal-generation 协议**）：

```json
{
  "model": "qwen-audio-3.0-asr-flash",
  "input": {
    "messages": [
      {
        "role": "user",
        "content": [{ "type": "input_audio", "input_audio": { "data": "data:audio/wav;base64,…" } }]
      }
    ]
  },
  "parameters": {
    "format": "wav",
    "sample_rate": "16000",
    "vocabulary": { "Inbox": 1, "Work": 1, "Study": 1, "Life": 1 },
    "language_hints": ["zh"]
  }
}
```

- 要点：`parameters.format` 必填（新模型在 OpenAI 兼容模式实测报 `format is empty`，勿走兼容模式）；`vocabulary` 即时热词替代旧 system 词表用法，提升清单专名识别；`language_hints` 跟随 locale（zh/en 单语种），混合语种省略让模型自动判断；ITN（"三点"→"3点"）默认开启。响应取 `output.text`。
- 出参：`{ transcript: string }`；错误时 `{ error: "asr_failed" | "asr_timeout" | "audio_invalid" | "not_configured" }`。Vercel 函数时限设为 60s，上游 ASR 超时设为 45s，给函数留出返回结构化错误的收尾时间。

**`POST /api/voice/parse`**（`src/app/api/voice/parse/route.ts`）

- 防护：与转写接口使用相同的同源策略，按客户端地址每分钟限 16 次，请求体上限 4KB。
- 入参：`{ transcript: string, locale: "zh-CN" | "en" }`（today 由服务端 `getTodayKey()` 生成——固定 Asia/Shanghai 口径，与演示数据/日历一致，不收客户端值）。
- 供应商经 `resolveProvider()` 解析（见 §2），`response_format: json_object`，temperature 0，超时 12s，DeepSeek 平台附 `thinking: {"type":"disabled"}` 关思考。System prompt 模板（**清单枚举与 `TaskList` 类型一致，只有 4 个**）：

```
你是待办事项解析器。把用户语音转写文本解析为待办，只输出 JSON。
今天是 {today}（{weekday}）。可用清单: Inbox(默认), Work, Study, Life。

规则：
1. title：去掉口语填充词（"帮我""提醒我""那个"），保留核心事项，≤30 字
2. date：解析相对日期（今天/明天/后天/下周X/周X/X号）；解析不出则 null
3. time：HH:MM；只有"下午三点"这类则 date 为 null、time 有值；解析不出则 null
4. list：按语义匹配清单，拿不准用 Inbox
5. isTodo：寒暄、提问、闲聊、指令模糊到无法形成事项时为 false
6. 只输出：{"isTodo":bool,"title":str,"list":str,"date":"YYYY-MM-DD"|null,"time":"HH:MM"|null,"reason":"≤20字判定依据"}

示例：
"明天下午三点提醒我交房租" → {"isTodo":true,"title":"交房租","list":"Life","date":"<明天>","time":"15:00","reason":"明确事项与时间"}
"今天天气怎么样" → {"isTodo":false,"title":null,"list":null,"date":null,"time":null,"reason":"提问非待办"}
```

- 校验-重试-降级（服务端内实现）：
  1. `JSON.parse` + zod 校验（date 合法日期且在今天~+180 天、time 格式、list ∈ 清单枚举、isTodo=true 时 title 非空）；
  2. 校验失败 → 把错误信息附回重试一次（"你返回的 date 无效…"）；
  3. 仍失败 → 降级 `{ isTodo: true, title: transcript 原文, list: "Inbox", date: null, time: null }`——宁可朴素不可报错。
- date 结果再用现有 `src/lib/date-utils.ts` 的 `parseDateKey`/格式工具二次校验。

### 3.3 确认卡（前端）

- 识别完成后，黑色胶囊向上展开为确认卡（延续变形语言：黑洞"吐出"解析结果）：

```
┌────────────────────────────────────┐
│ "明天下午三点提醒我交房租"            │  ← 原文 transcript（可核对 ASR）
│ 交房租 · 生活 · 明天 15:00          │  ← 解析结果
│      [✗ 丢弃]  [编辑]  [✓ 添加]     │
└────────────────────────────────────┘
```

- ✓ → `addTask(title, list, date, time)`（现有 API）+ toast "已添加"；
- 编辑 → 打开现有 QuickAdd 并预填 initialList/initialDate/initialTime/title（QuickAdd 需补一个 initialTitle 预填）；
- ✗ → 关闭回到导航栏；`isTodo:false` 时中栏显示"这句话不太像待办"。
- 日期展示用现有 i18n 格式化；新增 i18n 键：识别中、解析中（可合并）、已添加、不像待办、语音服务未配置 等。

### 3.4 延迟与体量预算

| 阶段                           | 预期                                | 实测（2026-09-14）               |
| ------------------------------ | ----------------------------------- | -------------------------------- |
| 上传（3s 音频 ≈ 130KB base64） | < 0.5s（本地开发）                  | 含在下方                         |
| qwen-audio-3.0-asr-flash 识别  | ≈ 0.5–1.5s                          | 3s 语音全链路（上传+识别）≈ 2.1s |
| deepseek-flash 解析（关思考）  | ≈ 0.8–1.5s                          | ≈ 1–2s                           |
| 合计（点 ✓ 到确认卡出现）      | **约 2–3s**，期间胶囊呈"思考中"脉动 | **≈ 3–4s** ✓                     |

## 4. 错误处理矩阵

| 阶段     | 失败                                        | UX                                                                   |
| -------- | ------------------------------------------- | -------------------------------------------------------------------- |
| 预检     | 无麦克风                                    | 现状不变：toast"未检测到麦克风"，不变身                              |
| 录音     | getUserMedia 拒绝                           | toast"无法访问麦克风"，收回导航栏                                    |
| 上传/ASR | 网络/5xx/超时(45s)                          | 网络错误提示"识别失败"；超时明确提示"识别超时"，随后收回             |
| ASR      | 空音频/空文本                               | 同上                                                                 |
| 解析     | LLM 两次均失败                              | 走降级：原文进确认卡（Inbox/无日期），用户仍可编辑                   |
| 服务端   | 未配置 DASHSCOPE_API_KEY / DEEPSEEK_API_KEY | 路由返回 not_configured → toast"语音服务未配置"（本地无 key 时友好） |
| 添加     | —                                           | 现有 addTask 逻辑                                                    |

安全与限制：两把 key（`DASHSCOPE_API_KEY`、`DEEPSEEK_API_KEY`）仅服务端读取，存 `.env.local` 勿提交；路由做大小/类型白名单；v1 不做鉴权与限流（应用本身无账号体系），上线前补每会话简单限流。

## 5. 注意点清单（按踩坑概率排序）

1. **音频格式是第一坑**：坚决统一 WAV/16k/mono，不做 MediaRecorder 格式协商；上传前用 ArrayBuffer 校验 RIFF 头。
2. **相对日期解析**：today 必须由服务端注入 prompt；"下周X"的星期计算口径（周一为一周开始）与 `buildMonthCalendar` 的 weekStartsOn 保持一致，写进 prompt 规则并在测试语料覆盖。
3. **iOS Safari**：AudioContext 需在用户手势内 resume；页面切换后台可能暂停采集——录音态监听 visibilitychange 自动停止并保留已录片段。
4. **StrictMode 双挂载**：recorder 的 start/stop、AudioContext 关闭要幂等（现有 recognition 引擎同款问题已趟过）。
5. **ITN**：新模型默认开启（实测"三点"→"3点"），无需显式开关；旧接口的 `enable_itn` 参数已随协议迁移废弃。
6. **降级路径要真降级**：任何解析异常都以"原文 + Inbox"落地确认卡，绝不让用户对着报错无处可去。
7. **成本**：ASR 按 25 token/s 音频计费、LLM 单次 <500 token，个人使用可忽略；但路由要防误用（大小/时长限制即是防护）。
8. **隐私**：录音即传即弃，不落盘、不写日志（含 transcript），在 README 或设置页注明。
9. **何时升级为真 agent**（触发信号，满足其一再迁）：~~一次语音建多条任务~~（**已实现**，2026-09-14：parse 输出 `{"tasks":[…]}` 数组 ≤8 条 + 逐项语义校验，确认卡逐项勾选、✓ 只落选中项、多条时隐藏编辑入口）；需要查询平台状态（当天容量/时间冲突）；需要多轮澄清（"加到哪个清单？"）。届时只改 `/api/voice/parse` 内部实现，前端契约不变。

## 6. 落地里程碑

**M1 录音直通（先验证管道）—— ✅ 已实施并真实联调 2026-09-14**

- `src/lib/audio/wav-recorder.ts`：WAV 采集编码 ✅
- `src/app/api/voice/transcribe/route.ts` ✅（RIFF/WAVE 头解析 + 时长校验 + not_configured 分支已验证）
- `voice-capture.tsx` 引擎替换 ✅（与 M2 合并落地：录音 → 上传 → 解析 → 确认卡一步到位）
- `.env.local` / `.env.example` / README 说明 ✅
- 验收：真实 Key 端到端通过——TTS 生成语音 WAV（中/英）→ 转写（3s 语音 ≈2.1s，含 ITN 归一）→ 解析（§7 语料 8/8 语义正确）；错误分支（not_configured/bad_request/降级）curl 验证通过；**真机浏览器录音（getUserMedia + WavRecorder）待用户在 Chrome/Safari 实测**

**M2 解析 + 确认卡（功能完整）—— ✅ 已实施 2026-09-14**

- `src/app/api/voice/parse/route.ts`（prompt + zod + 重试 + 降级）✅（zod 4.6.4 已入依赖）
- `voice-confirm-card.tsx` + module.css：胶囊展开确认卡 ✅（含 isTodo:false 分支）
- `workspace-provider.tsx`：voiceCapture 状态扩展（phase、transcript、parsed）✅（类型在 `src/types/voice.ts`）
- `quick-add.tsx`：补 initialTitle 预填 ✅
- `messages.ts`：新增 i18n 键（zh/en）✅
- `voice-api.ts`：客户端 fetch 封装（错误码 → toast 映射）✅（计划外新增）
- 验收：✓ 落库 toast + 清单/日期预填已验证（voice-demo + curl 降级）；**§7 语料全过需真实 Key 联调（M3 回归脚本承接）**

**M3 打磨（待开始；另含真实 Key 联调清单）**

- 真实链路联调：填 `DASHSCOPE_API_KEY` + `DEEPSEEK_API_KEY` 后真机（Chrome + Safari）过 §7 语料；iOS Safari 重点验手势内 prewarm
- VAD 静音自动停（AnalyserNode，1.5s 阈值，手动 ✓ 仍保留）
- 语料回归脚本（`scripts/`，node 直跑 parse 路由函数）
- 错误矩阵逐项演练、录音态后台切换处理（visibilitychange 自动停并保留已录片段）

## 7. 验收语料（回归基线，持续补充）

| 输入（转写后）                   | 期望                                                        |
| -------------------------------- | ----------------------------------------------------------- |
| 明天下午三点提醒我交房租         | isTodo、交房租、明天、15:00                                 |
| 下周一上午和小王开评审会         | isTodo、评审会、下周一、上午→time null 或 09:00（口径写死） |
| 帮我记一下那个…买牛奶            | isTodo、买牛奶（去填充词）、无日期                          |
| 今天天气怎么样                   | isTodo: false                                               |
| 谢谢你                           | isTodo: false                                               |
| 嗯……没什么                       | isTodo: false（或空文本在上游拦）                           |
| Remind me to email John tomorrow | isTodo、email John、明天                                    |
| 十月一号买火车票                 | isTodo、买火车票、2026-10-01                                |
| 每天喝水                         | isTodo、喝水、无日期（重复规则 v1 不做，title 保留原意）    |
| 开个会                           | isTodo、开会、Inbox（模糊但有事项）                         |

## 8. 已定决策一览

| 决策点         | 结论                                                                                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ASR            | qwen-audio-3.0-asr-flash（DashScope 原生 multimodal-generation 协议，data URL + `parameters.format`/`vocabulary`/`language_hints`；旧名 qwen3-asr-flash 已下线、兼容模式不支持新模型；端点/模型可经 `VOICE_ASR_BASE_URL`/`VOICE_ASR_MODEL` 覆盖） |
| LLM            | DeepSeek 官方 `deepseek-flash`（V4.1-Flash，走已有额度，`thinking:{"type":"disabled"}` 关思考，已核实官方 API 参考）+ JSON mode + temperature 0；Key 在谁家用谁家的平台，`VOICE_LLM_*` 三元组可显式覆盖                                           |
| 解析架构       | 单次调用 + 校验重试 + 降级，不用 agent 框架；zod 4.6.4 校验                                                                                                                                                                                       |
| 停录           | v1 手动 ✓（60s 到点自动确认）                                                                                                                                                                                                                     |
| 确认交互       | 胶囊展开确认卡，编辑复用 QuickAdd（含 initialTitle）                                                                                                                                                                                              |
| 音频格式       | WAV/16kHz/mono 前端统一编码（ScriptProcessor 采集 + 线性插值降采样）                                                                                                                                                                              |
| Web Speech API | 退役删除，`?voice-demo` 预览通道保留（扩展为全流程演示：固定语料 → 确认卡）                                                                                                                                                                       |
| 清单枚举       | 解析词表与 `TaskList` 一致：Inbox/Work/Study/Life（原稿的 9 清单为超前设想，产品尚未支持）                                                                                                                                                        |
