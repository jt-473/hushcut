/**
 * Gentle, natural voice polish, rendered offline via OfflineAudioContext:
 *   high-pass (remove rumble) -> subtle warmth -> a touch of presence and air
 *   -> light compression, then peak-normalize.
 * Deliberately restrained so it cleans up a voice without sounding processed.
 * Everything runs in the browser; nothing is uploaded.
 */

/** Peak-normalize to a ceiling, with a gentle soft-limit for the occasional overshoot. */
function finalize(buffer: AudioBuffer, ceiling = 0.97) {
  const chs = buffer.numberOfChannels;

  const knee = 0.85;
  const soft = (x: number) => {
    const a = Math.abs(x);
    if (a <= knee) return x;
    return Math.sign(x) * (knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)));
  };

  let peak = 0;
  for (let ch = 0; ch < chs; ch++) {
    const d = buffer.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      const x = soft(d[i]);
      d[i] = x;
      const a = Math.abs(x);
      if (a > peak) peak = a;
    }
  }
  if (peak > 0) {
    const g = ceiling / peak;
    for (let ch = 0; ch < chs; ch++) {
      const d = buffer.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] *= g;
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

  // Subtle tone shaping
  const highPass = biquad("highpass", 80, 0, 0.7);
  const warmth = biquad("lowshelf", 150, 1.5);
  const presence = biquad("peaking", 3000, 2, 0.7);
  const air = biquad("highshelf", 9000, 2);

  // Light compression to even out the dynamics (nothing aggressive)
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 10;
  comp.ratio.value = 2;
  comp.attack.value = 0.03;
  comp.release.value = 0.25;

  src.connect(highPass);
  highPass.connect(warmth);
  warmth.connect(presence);
  presence.connect(air);
  air.connect(comp);
  comp.connect(ctx.destination);

  src.start();
  const rendered = await ctx.startRendering();
  finalize(rendered);
  return rendered;
}
