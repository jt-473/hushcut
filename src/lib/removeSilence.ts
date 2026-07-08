/**
 * Client-side silence removal, mirroring pydub's split_on_silence:
 *   - detect windows whose RMS is below a dBFS threshold (relative to full scale)
 *   - the non-silent ranges are kept, padded by `keepSilence` on each side
 *   - overlapping padded ranges are split at their midpoint
 * All math on normalized float samples in [-1, 1], so 0 dBFS == amplitude 1.0.
 */

export interface Range {
  start: number; // sample index (inclusive)
  end: number; // sample index (exclusive)
}

/** Mix all channels down to a single mono Float32Array for detection. */
export function mixToMono(buffer: AudioBuffer): Float32Array {
  const channels = buffer.numberOfChannels;
  const len = buffer.length;
  if (channels === 1) return buffer.getChannelData(0);

  const mono = new Float32Array(len);
  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < len; i++) mono[i] += data[i];
  }
  for (let i = 0; i < len; i++) mono[i] /= channels;
  return mono;
}

/** Overall loudness of a mono signal in dBFS. */
export function rmsDbfs(mono: Float32Array): number {
  let sumSq = 0;
  for (let i = 0; i < mono.length; i++) sumSq += mono[i] * mono[i];
  const rms = Math.sqrt(sumSq / Math.max(1, mono.length));
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

/**
 * Find the non-silent ranges of a mono signal.
 * @param thresholdDb  dBFS below which a window counts as silent (e.g. -45)
 * @param minSilenceMs minimum silent window length
 * @param seekStepMs   how far to move the window each check (perf vs precision)
 */
export function detectNonSilentRanges(
  mono: Float32Array,
  sampleRate: number,
  thresholdDb: number,
  minSilenceMs = 100,
  seekStepMs = 10
): Range[] {
  const len = mono.length;
  const win = Math.max(1, Math.floor((minSilenceMs / 1000) * sampleRate));
  const step = Math.max(1, Math.floor((seekStepMs / 1000) * sampleRate));
  const threshAmp = Math.pow(10, thresholdDb / 20);

  if (len < win) return [{ start: 0, end: len }];

  // Prefix sum of squares for O(1) window RMS.
  const prefix = new Float64Array(len + 1);
  for (let i = 0; i < len; i++) prefix[i + 1] = prefix[i] + mono[i] * mono[i];
  const windowRms = (s: number, e: number) => Math.sqrt((prefix[e] - prefix[s]) / (e - s));

  // Collect silent window starts.
  const silentStarts: number[] = [];
  for (let start = 0; start + win <= len; start += step) {
    if (windowRms(start, start + win) <= threshAmp) silentStarts.push(start);
  }

  // Merge contiguous silent windows into silent ranges.
  const silentRanges: Range[] = [];
  if (silentStarts.length) {
    let rangeStart = silentStarts[0];
    let prev = silentStarts[0];
    for (let k = 1; k < silentStarts.length; k++) {
      const s = silentStarts[k];
      if (s <= prev + step) {
        prev = s;
      } else {
        silentRanges.push({ start: rangeStart, end: prev + win });
        rangeStart = s;
        prev = s;
      }
    }
    silentRanges.push({ start: rangeStart, end: prev + win });
  }

  // Non-silent ranges = complement of silent ranges within [0, len].
  const nonSilent: Range[] = [];
  let cursor = 0;
  for (const r of silentRanges) {
    const rStart = Math.min(r.start, len);
    if (rStart > cursor) nonSilent.push({ start: cursor, end: rStart });
    cursor = Math.max(cursor, Math.min(r.end, len));
  }
  if (cursor < len) nonSilent.push({ start: cursor, end: len });

  return nonSilent;
}

/** Pad each range by `keepSamples`, resolve overlaps at midpoints, clamp to [0, len]. */
export function planOutputRanges(nonSilent: Range[], keepSamples: number, len: number): Range[] {
  const ranges = nonSilent.map((r) => ({ start: r.start - keepSamples, end: r.end + keepSamples }));
  for (let i = 1; i < ranges.length; i++) {
    if (ranges[i].start < ranges[i - 1].end) {
      const mid = Math.floor((ranges[i - 1].end + ranges[i].start) / 2);
      ranges[i].start = mid;
      ranges[i - 1].end = mid;
    }
  }
  return ranges
    .map((r) => ({ start: Math.max(0, r.start), end: Math.min(len, r.end) }))
    .filter((r) => r.end > r.start);
}

export interface RemoveSilenceOptions {
  auto: boolean; // use a dynamic threshold (overall dBFS - 16)
  thresholdDb: number; // used when auto is false
  keepSilenceMs: number;
  minSilenceMs?: number;
}

/** Produce a new AudioBuffer with silent gaps removed. */
export function removeSilenceBuffer(
  ctx: BaseAudioContext,
  buffer: AudioBuffer,
  opts: RemoveSilenceOptions
): AudioBuffer {
  const mono = mixToMono(buffer);
  const minSilenceMs = opts.minSilenceMs ?? 100;

  let threshold = opts.auto ? rmsDbfs(mono) - 16 : opts.thresholdDb;
  let nonSilent = detectNonSilentRanges(mono, buffer.sampleRate, threshold, minSilenceMs);

  // Fallback: whole clip quieter than the threshold -> retry relative to its own loudness.
  if (nonSilent.length === 0) {
    threshold = rmsDbfs(mono) - 16;
    nonSilent = detectNonSilentRanges(mono, buffer.sampleRate, threshold, minSilenceMs);
  }
  if (nonSilent.length === 0) return buffer; // nothing to trim; hand back the original

  const keepSamples = Math.floor((opts.keepSilenceMs / 1000) * buffer.sampleRate);
  const plan = planOutputRanges(nonSilent, keepSamples, buffer.length);
  const totalFrames = plan.reduce((sum, r) => sum + (r.end - r.start), 0);
  if (totalFrames === 0) return buffer;

  const out = ctx.createBuffer(buffer.numberOfChannels, totalFrames, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    let offset = 0;
    for (const r of plan) {
      dst.set(src.subarray(r.start, r.end), offset);
      offset += r.end - r.start;
    }
  }
  return out;
}

/** Encode an AudioBuffer as a 16-bit PCM WAV Blob. */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const blockAlign = numCh * 2;
  const dataSize = numFrames * blockAlign;
  const arr = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arr);

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numCh; ch++) channels.push(buffer.getChannelData(ch));

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      let s = Math.max(-1, Math.min(1, channels[ch][i]));
      s = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(offset, s, true);
      offset += 2;
    }
  }
  return new Blob([view], { type: "audio/wav" });
}

/** Decode an uploaded/recorded file into an AudioBuffer. */
export async function decodeAudioFile(
  file: Blob
): Promise<{ ctx: AudioContext; buffer: AudioBuffer }> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = await ctx.decodeAudioData(arrayBuffer);
  return { ctx, buffer };
}
