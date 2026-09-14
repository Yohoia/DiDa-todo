/* global AudioWorkletProcessor, registerProcessor */

const FRAME_SIZE = 2048;

/**
 * 在音频渲染线程中收集单声道 PCM，再按小块发送到主线程。
 * 录音和音量分析共用同一份采样，避免 ScriptProcessorNode 的弃用警告。
 */
class DidaPcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frame = new Float32Array(FRAME_SIZE);
    this.offset = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input?.length) return true;

    let inputOffset = 0;
    while (inputOffset < input.length) {
      const available = FRAME_SIZE - this.offset;
      const length = Math.min(available, input.length - inputOffset);
      this.frame.set(input.subarray(inputOffset, inputOffset + length), this.offset);
      this.offset += length;
      inputOffset += length;

      if (this.offset === FRAME_SIZE) {
        const completed = this.frame;
        this.port.postMessage(completed, [completed.buffer]);
        this.frame = new Float32Array(FRAME_SIZE);
        this.offset = 0;
      }
    }

    return true;
  }
}

registerProcessor("dida-pcm-capture", DidaPcmCaptureProcessor);
