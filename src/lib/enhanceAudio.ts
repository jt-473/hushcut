/**
 * Broadcast-style voice mastering chain, rendered offline via OfflineAudioContext:
 *
 *   high-pass (kill rumble)
 *   -> de-mud dip (~300 Hz)  -> warmth low-shelf (~120 Hz)
 *   -> presence bell (~3.2 kHz) -> air high-shelf (~9.5 kHz)
 *   -> de-esser (split high band, compress it) so the top end stays smooth
 *   -> main compressor (even out dynamics)
 *   -> gentle saturation (harmonics = perceived crispness + loudness)
 *   -> makeup gain
 *   then a loudness-normalize + soft-limit pass so it comes out clean and loud.
 *
 * Everything runs in the browser; nothing is uploaded.
 */

function makeSaturationCurve(k: number): Float32Array<ArrayBuffer> {
  const n = 2048;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  const denom = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / denom;
  }
  return curve;
}

/** Loudness-normalize toward a target RMS, then soft-limit peaks and normalize the ceiling. */
function finalize(buffer: AudioBuffer, targetRms = 0.12, ceiling = 0.97) {
  const chs = buffer.numberOfChannels;

  let sumSq = 0;
  let count = 0;
  for (let ch = 0; ch < chs; ch++) {
    const d = buffer.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      sumSq += d[i] * d[i];
      count++;
    }
  }
  const rms = Math.sqrt(sumSq / Math.max(1, count));
  const gain = Math.min(8, rms > 1e-6 ? targetRms / rms : 1); // cap the boost at +18 dB

  // soft knee limiter: leave low levels alone, gently round off peaks
  const knee = 0.7;
  const soft = (x: number) => {
    const a = Math.abs(x);
    if (a <= knee) return x;
    return Math.sign(x) * (knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)));
  };

  let peak = 0;
  for (let ch = 0; ch < chs; ch++) {
    const d = buffer.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      const x = soft(d[i] * gain);
      d[i] = x;
      const a = Math.abs(x);
      if (a > peak) peak = a;
    }
  }
  if (peak > 0) {
    const g2 = ceiling / peak;
    for (let ch = 0; ch < chs; ch++) {
      const d = buffer.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] *= g2;
    }
  }
}

export async function enhanceBuffer(buffer: AudioBuffer): Promise<AudioBuffer> {
  const OAC =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const ctx = new OAC(buffer.numberOfChannels, buffer.length, buffer.sampleRate);

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const biquad = (type: BiquadFilterType, freq: number, gain = 0, q = 0.7) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.gain.value = gain;
    f.Q.value = q;
    return f;
  };

  // Tone shaping
  const highPass = biquad("highpass", 85, 0, 0.7);
  const deMud = biquad("peaking", 300, -3.5, 1.0);
  const warmth = biquad("lowshelf", 120, 2);
  const presence = biquad("peaking", 3200, 4.5, 0.9);
  const air = biquad("highshelf", 9500, 4);

  src.connect(highPass);
  highPass.connect(deMud);
  deMud.connect(warmth);
  warmth.connect(presence);
  presence.connect(air);

  // De-esser: split around 5.5 kHz, compress the high band hard, recombine.
  const lowBand = biquad("lowpass", 5500, 0, 0.7);
  const highBand = biquad("highpass", 5500, 0, 0.7);
  const deEss = ctx.createDynamicsCompressor();
  deEss.threshold.value = -30;
  deEss.knee.value = 6;
  deEss.ratio.value = 5;
  deEss.attack.value = 0.002;
  deEss.release.value = 0.05;

  const merge = ctx.createGain();
  air.connect(lowBand);
  air.connect(highBand);
  highBand.connect(deEss);
  lowBand.connect(merge);
  deEss.connect(merge);

  // Main compressor to even out dynamics
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -22;
  comp.knee.value = 8;
  comp.ratio.value = 3;
  comp.attack.value = 0.02;
  comp.release.value = 0.2;

  // Gentle harmonic saturation for perceived crispness
  const shaper = ctx.createWaveShaper();
  shaper.curve = makeSaturationCurve(1.6);
  shaper.oversample = "4x";

  const makeup = ctx.createGain();
  makeup.gain.value = 1.25;

  merge.connect(comp);
  comp.connect(shaper);
  shaper.connect(makeup);
  makeup.connect(ctx.destination);

  src.start();
  const rendered = await ctx.startRendering();
  finalize(rendered);
  return rendered;
}
