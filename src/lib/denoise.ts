/**
 * Spectral-gate noise reduction, similar in spirit to Audacity's Noise Reduction.
 * For each short window we take an FFT, estimate the per-frequency noise floor
 * (the persistent quiet level across the clip), then attenuate frequency bins
 * that sit near that floor via over-subtraction. Rebuilt with overlap-add.
 * Runs on the main thread, so very long files can take a few seconds.
 */

/** In-place iterative radix-2 FFT (length must be a power of two). */
function fft(re: Float32Array, im: Float32Array, inverse: boolean) {
  const n = re.length;

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cwr = 1;
      let cwi = 0;
      for (let k = 0; k < len >> 1; k++) {
        const a = i + k;
        const b = a + (len >> 1);
        const vr = re[b] * cwr - im[b] * cwi;
        const vi = re[b] * cwi + im[b] * cwr;
        re[b] = re[a] - vr;
        im[b] = im[a] - vi;
        re[a] += vr;
        im[a] += vi;
        const ncwr = cwr * wr - cwi * wi;
        cwi = cwr * wi + cwi * wr;
        cwr = ncwr;
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

function denoiseChannel(input: Float32Array, amount: number): Float32Array {
  const N = 2048;
  const hop = 512;
  const half = N >> 1;

  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));

  const len = input.length;
  const sig = new Float32Array(Math.max(len, N) + N);
  sig.set(input);
  const totalFrames = Math.floor((sig.length - N) / hop) + 1;

  const re = new Float32Array(N);
  const im = new Float32Array(N);

  // Pass 1: total magnitude (energy) of each frame.
  const energies = new Float32Array(totalFrames);
  for (let f = 0; f < totalFrames; f++) {
    const off = f * hop;
    for (let i = 0; i < N; i++) {
      re[i] = sig[off + i] * win[i];
      im[i] = 0;
    }
    fft(re, im, false);
    let e = 0;
    for (let b = 0; b <= half; b++) e += Math.hypot(re[b], im[b]);
    energies[f] = e;
  }

  // Noise = average per-bin magnitude over the quietest ~25% of frames.
  const sorted = Float32Array.from(energies).sort();
  const thr = sorted[Math.floor(sorted.length * 0.25)] || sorted[sorted.length - 1] || 0;
  const noise = new Float32Array(half + 1);
  let quiet = 0;
  for (let f = 0; f < totalFrames; f++) {
    if (energies[f] > thr) continue;
    const off = f * hop;
    for (let i = 0; i < N; i++) {
      re[i] = sig[off + i] * win[i];
      im[i] = 0;
    }
    fft(re, im, false);
    for (let b = 0; b <= half; b++) noise[b] += Math.hypot(re[b], im[b]);
    quiet++;
  }
  if (quiet > 0) for (let b = 0; b <= half; b++) noise[b] /= quiet;

  // Pass 2: attenuate near the noise profile and overlap-add.
  const out = new Float32Array(sig.length);
  const wsum = new Float32Array(sig.length);
  const beta = 1.5 + amount * 1.5; // over-subtraction strength
  const floorGain = Math.max(0.03, 0.2 * (1 - amount));

  for (let f = 0; f < totalFrames; f++) {
    const off = f * hop;
    for (let i = 0; i < N; i++) {
      re[i] = sig[off + i] * win[i];
      im[i] = 0;
    }
    fft(re, im, false);
    for (let b = 0; b <= half; b++) {
      const m = Math.hypot(re[b], im[b]);
      const g = m > 1e-9 ? Math.max(floorGain, (m - beta * noise[b]) / m) : floorGain;
      re[b] *= g;
      im[b] *= g;
      if (b > 0 && b < half) {
        const mb = N - b;
        re[mb] *= g;
        im[mb] *= g;
      }
    }
    fft(re, im, true);
    for (let i = 0; i < N; i++) {
      out[off + i] += re[i] * win[i];
      wsum[off + i] += win[i] * win[i];
    }
  }

  const result = new Float32Array(len);
  for (let i = 0; i < len; i++) result[i] = wsum[i] > 1e-6 ? out[i] / wsum[i] : out[i];
  return result;
}

/** Return a new AudioBuffer with background noise attenuated. amount is 0..1. */
export function denoiseBuffer(ctx: BaseAudioContext, buffer: AudioBuffer, amount = 0.6): AudioBuffer {
  const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    out.getChannelData(ch).set(denoiseChannel(buffer.getChannelData(ch), amount));
  }
  return out;
}
