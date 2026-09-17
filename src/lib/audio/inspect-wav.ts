type WavInfo = { byteRate: number; dataBytes: number };

/** Bounds-check every chunk and accept only the PCM format sent by our recorder. */
export function inspectWav(bytes: Uint8Array): WavInfo | null {
  if (bytes.byteLength < 44) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (ascii(0) !== "RIFF" || ascii(8) !== "WAVE") return null;
  const end = view.getUint32(4, true) + 8;
  if (end < 44 || end > bytes.byteLength) return null;
  let offset = 12;
  let byteRate = 0;
  while (offset + 8 <= end) {
    const id = ascii(offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (size > end - body) return null;
    if (id === "fmt ") {
      if (size < 16) return null;
      if (
        view.getUint16(body, true) !== 1 ||
        view.getUint16(body + 2, true) !== 1 ||
        view.getUint32(body + 4, true) !== 16_000 ||
        view.getUint16(body + 12, true) !== 2 ||
        view.getUint16(body + 14, true) !== 16
      )
        return null;
      byteRate = view.getUint32(body + 8, true);
      if (byteRate !== 32_000) return null;
    } else if (id === "data") {
      if (!byteRate || !size || size % 2 !== 0) return null;
      return { byteRate, dataBytes: size };
    }
    offset = body + size + (size % 2);
  }
  return null;
}
