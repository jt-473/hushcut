import { Mp3Encoder } from "@breezystack/lamejs";

function floatTo16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** Encode an AudioBuffer to an MP3 Blob (mono or stereo). */
export function audioBufferToMp3(buffer: AudioBuffer, kbps = 128): Blob {
  const channels = Math.min(2, buffer.numberOfChannels);
  const encoder = new Mp3Encoder(channels, buffer.sampleRate, kbps);

  const left = floatTo16(buffer.getChannelData(0));
  const right = channels > 1 ? floatTo16(buffer.getChannelData(1)) : null;

  const blockSize = 1152;
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < left.length; i += blockSize) {
    const l = left.subarray(i, i + blockSize);
    const mp3 = right
      ? encoder.encodeBuffer(l, right.subarray(i, i + blockSize))
      : encoder.encodeBuffer(l);
    if (mp3.length) chunks.push(new Uint8Array(mp3));
  }
  const end = encoder.flush();
  if (end.length) chunks.push(new Uint8Array(end));

  return new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
}
