/**
 * WAV 录音器：AudioContext 采集 PCM，前端编码 16kHz/单声道 WAV。
 * 统一上传格式（qwen-audio-3.0-asr-flash 明确支持 wav；MediaRecorder 的 webm/mp4 容器
 * 依浏览器而异，不做格式协商）。录音即传即弃：内存攒 Float32 分块，编码后即释放。
 */

const TARGET_SAMPLE_RATE = 16_000;
/** 低于该时长视为误触，不产出文件 */
const MIN_SECONDS = 0.3;
/** 与服务端 transcribe 路由的时长上限一致 */
export const MAX_RECORD_SECONDS = 60;

export class WavRecorder {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private mute: GainNode | null = null;
  private chunks: Float32Array[] = [];
  private seconds = 0;
  private recording = false;
  private starting = false;
  private operation = 0;

  /**
   * iOS Safari 要求 AudioContext 在用户手势内创建并 resume：点击麦克风的
   * 同步代码路径里先调这个（后续 await 不再受手势约束）。幂等。
   */
  prewarm() {
    if (this.context || typeof window === "undefined") return;
    try {
      this.context = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
    } catch {
      // 旧 Safari 不支持指定采样率：按原生率采集，编码时降采样
      this.context = new AudioContext();
    }
    void this.context.resume().catch(() => {});
  }

  get isActive() {
    return this.recording;
  }

  async start(): Promise<boolean> {
    if (this.recording || this.starting) return false;
    const operation = ++this.operation;
    this.starting = true;
    this.prewarm();
    const context = this.context;
    if (!context) {
      this.starting = false;
      throw new Error("no-audio-context");
    }

    let stream: MediaStream | null = null;
    try {
      if (context.state === "suspended") await context.resume();
      stream = await requestMicStream();
      // abort() cannot cancel a pending permission prompt. If it ran while we
      // were awaiting the stream, immediately release the late result.
      if (operation !== this.operation) {
        stopStream(stream);
        return false;
      }

      this.stream = stream;
      this.source = context.createMediaStreamSource(stream);
      this.processor = context.createScriptProcessor(4096, 1, 1);
      this.processor.onaudioprocess = (event) => {
        if (!this.recording) return;
        const input = event.inputBuffer.getChannelData(0);
        this.seconds += input.length / context.sampleRate;
        if (this.seconds > MAX_RECORD_SECONDS) return;
        this.chunks.push(new Float32Array(input));
      };
      // ScriptProcessor 需要连到 destination 才会回调，经零增益节点避免外放
      this.mute = context.createGain();
      this.mute.gain.value = 0;
      this.source.connect(this.processor);
      this.processor.connect(this.mute);
      this.mute.connect(context.destination);

      this.chunks = [];
      this.seconds = 0;
      this.recording = true;
      return true;
    } catch (error) {
      stopStream(stream);
      if (operation === this.operation) this.releaseGraph();
      throw error;
    } finally {
      if (operation === this.operation) this.starting = false;
    }
  }

  /** 停止并编码 WAV；过短（<0.3s）或无数据返回 null。之后实例可复用。 */
  async stop(): Promise<Blob | null> {
    // A user can confirm while the permission prompt is still pending. Invalidate
    // that start so its eventual stream is released instead of reviving capture.
    this.operation += 1;
    this.starting = false;
    const rate = this.context?.sampleRate;
    const chunks = this.chunks;
    const seconds = this.seconds;
    this.releaseGraph();
    if (!rate || !chunks.length || seconds < MIN_SECONDS) return null;
    return encodeWav(chunks, rate);
  }

  /** 丢弃录音并释放设备，不产出文件。 */
  abort() {
    this.operation += 1;
    this.starting = false;
    this.releaseGraph();
  }

  private releaseGraph() {
    this.recording = false;
    this.chunks = [];
    this.seconds = 0;
    if (this.processor) this.processor.onaudioprocess = null;
    this.processor?.disconnect();
    this.mute?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    const context = this.context;
    this.context = null;
    this.processor = null;
    this.mute = null;
    this.source = null;
    this.stream = null;
    void context?.close().catch(() => {});
  }
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

async function requestMicStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
  } catch {
    // 个别浏览器对约束挑剔（OverconstrainedError），退回裸申请
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

/** 拼接 PCM 分块 → 16bit WAV Blob（输入率 ≠ 16k 时线性插值降采样）。 */
function encodeWav(chunks: Float32Array[], inputRate: number): Blob {
  const merged = new Float32Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  const pcm = resample(merged, inputRate, TARGET_SAMPLE_RATE);
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + pcm.length * bytesPerSample);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + pcm.length * bytesPerSample, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt 块长度
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 单声道
  view.setUint32(24, TARGET_SAMPLE_RATE, true);
  view.setUint32(28, TARGET_SAMPLE_RATE * bytesPerSample, true); // 字节率
  view.setUint16(32, bytesPerSample, true); // 块对齐
  view.setUint16(34, 16, true); // 位深
  writeAscii(view, 36, "data");
  view.setUint32(40, pcm.length * bytesPerSample, true);
  let cursor = 44;
  for (const sample of pcm) {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(cursor, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    cursor += bytesPerSample;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function resample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const output = new Float32Array(Math.round(input.length / ratio));
  for (let index = 0; index < output.length; index++) {
    const position = index * ratio;
    const left = Math.floor(position);
    const fraction = position - left;
    const a = input[left] ?? 0;
    const b = input[left + 1] ?? a;
    output[index] = a + (b - a) * fraction;
  }
  return output;
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let index = 0; index < text.length; index++) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}
