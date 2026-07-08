# Hushcut

Remove silence from audio, right in your browser. Upload a file (or record one), and Hushcut trims the silent gaps and hands back a clean WAV to play and download. Nothing is uploaded to a server — all processing runs client-side via the Web Audio API.

## How it works

The silence detection mirrors pydub's `split_on_silence`: windows whose RMS falls below a dBFS threshold are treated as silence, the non-silent ranges are kept with a little padding on each edge, and overlapping ranges are split at their midpoint. See [`src/lib/removeSilence.ts`](src/lib/removeSilence.ts).

- **Threshold** — default −45 dB, adjustable, or **Auto** for a dynamic threshold relative to the clip's own loudness.
- **Keep silence** — how much padding to leave around each kept segment (default 50 ms).
- **Record** — capture straight from the microphone, then trim.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Deploy

Deploys as-is on Vercel — import the repo and it builds with zero config.
