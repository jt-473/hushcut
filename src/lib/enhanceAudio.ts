/**
 * Voice enhancement chain, mirroring the common Audacity cleanup flow:
 *   high-pass (low roll-off for speech) -> bass shelf -> treble shelf
 *   -> compressor -> makeup gain -> peak normalize.
 * Rendered offline via OfflineAudioContext, so it is fast and stays in the browser.
 */

export interface EnhanceOptions {
  highPassHz: number; // low roll-off for speech (removes rumble/hum)
  bassHz: number;
  bassGainDb: number;
  trebleHz: number;
  trebleGainDb: number;
  compThresholdDb: number;
  compRatio: number;
  compAttack: number; // seconds
  compRelease: number; // seconds
  targetPeak: number; // 0..1, normalize output peak to this (0.89 ~ -1 dBFS)
}

export const DEFAULT_ENHANCE: EnhanceOptions = {
  highPassHz: 90,
  bassHz: 200,
  bassGainDb: 4,
  trebleHz: 3500,
  trebleGainDb: 4,
  compThresholdDb: -20,
  compRatio: 2,
  compAttack: 0.05,
  compRelease: 0.25,
  targetPeak: 0.89,
};

function normalizePeak(buffer: AudioBuffer, target: number) {
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
    }
  }
  if (peak > 0) {
    const gain = target / peak;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) data[i] *= gain;
    }
  }
}

export async function enhanceBuffer(
  buffer: AudioBuffer,
  opts: EnhanceOptions = DEFAULT_ENHANCE
): Promise<AudioBuffer> {
  const OAC =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const ctx = new OAC(buffer.numberOfChannels, buffer.length, buffer.sampleRate);

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const highPass = ctx.createBiquadFilter();
  highPass.type = "highpass";
  highPass.frequency.value = opts.highPassHz;
  highPass.Q.value = 0.7;

  const bass = ctx.createBiquadFilter();
  bass.type = "lowshelf";
  bass.frequency.value = opts.bassHz;
  bass.gain.value = opts.bassGainDb;

  const treble = ctx.createBiquadFilter();
  treble.type = "highshelf";
  treble.frequency.value = opts.trebleHz;
  treble.gain.value = opts.trebleGainDb;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = opts.compThresholdDb;
  comp.knee.value = 6;
  comp.ratio.value = opts.compRatio;
  comp.attack.value = opts.compAttack;
  comp.release.value = opts.compRelease;

  const makeup = ctx.createGain();
  makeup.gain.value = 1.4;

  src.connect(highPass).connect(bass).connect(treble).connect(comp).connect(makeup).connect(ctx.destination);
  src.start();

  const rendered = await ctx.startRendering();
  normalizePeak(rendered, opts.targetPeak);
  return rendered;
}
