"use client";

import { useEffect, useRef, useState } from "react";
import {
  decodeAudioFile,
  removeSilenceBuffer,
  audioBufferToWav,
} from "@/lib/removeSilence";
import { enhanceBuffer } from "@/lib/enhanceAudio";
import { SITE_URL } from "@/lib/site";

/* ─── Constants ─── */
const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260329_050842_be71947f-f16e-4a14-810c-06e83d23ddb5.mp4";

const STEPS = [
  {
    title: "Add your audio",
    body: "Upload a file or record straight from your mic. WAV, MP3, M4A and more all work.",
  },
  {
    title: "We trim the silence",
    body: "Hushcut finds the quiet gaps below your threshold and cuts them, keeping a little natural padding.",
  },
  {
    title: "Download the result",
    body: "Play it back and download a clean WAV. Nothing is ever uploaded to a server.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Is Hushcut really free?",
    a: "Yes. Hushcut is 100% free with no sign-up and no limits on how many files you process.",
  },
  {
    q: "Does my audio get uploaded anywhere?",
    a: "No. All processing happens locally in your browser using the Web Audio API, so your files never leave your device.",
  },
  {
    q: "What audio formats are supported?",
    a: "Most common formats your browser can decode, including WAV, MP3, M4A, OGG and FLAC. The trimmed result downloads as a WAV file.",
  },
  {
    q: "How does it decide what counts as silence?",
    a: "It measures loudness and removes sections below a decibel threshold you can adjust, keeping a small amount of padding so cuts sound natural. Auto mode sets the threshold from your clip's own loudness.",
  },
  {
    q: "What does Enhance voice do?",
    a: "It runs your audio through a voice-cleanup chain: a high-pass filter to remove low rumble and hum, a bass and treble lift for warmth and clarity, and a compressor to even out the loud and quiet parts. The result sounds fuller and more professional. You can use it on its own or together with silence trimming.",
  },
  {
    q: "Can I use it to clean up a podcast or voice recording?",
    a: "Yes. Hushcut is great for tightening podcasts, voiceovers, interviews and any recording with dead air.",
  },
];

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Hushcut",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "Remove silence from audio online for free. No sign-up, no limits, runs entirely in your browser.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

const FONT = {
  schibsted: "var(--font-schibsted), sans-serif",
  inter: "var(--font-inter), sans-serif",
  noto: "var(--font-noto), sans-serif",
  fustat: "var(--font-fustat), sans-serif",
};

/* ─── Icons ─── */
const Coffee = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2v2" /><path d="M14 2v2" /><path d="M6 2v2" />
    <path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" />
  </svg>
);
const ArrowUp = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </svg>
);
const Star = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l2.4 6.9L21.6 9l-5.4 4.6 1.8 7.4L12 17.3 6 21l1.8-7.4L2.4 9l7.2-.1z" />
  </svg>
);
const Mic = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);
const Upload = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
  </svg>
);
const Sliders = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" />
    <line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" />
    <line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" />
    <line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" />
  </svg>
);
const Waveform = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 10v3" /><path d="M6 6v11" /><path d="M10 3v18" /><path d="M14 8v7" /><path d="M18 5v13" /><path d="M22 10v3" />
  </svg>
);
const Check = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/* ─── Video background with custom JS fade system (no CSS transitions) ─── */
function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const fadingOutRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const cancelFade = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    // Fade to a target opacity over `duration` ms, resuming from current opacity.
    const fade = (target: number, duration = 250) => {
      cancelFade();
      const from = parseFloat(video.style.opacity || "0");
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        video.style.opacity = String(from + (target - from) * t);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(step);
    };

    const fadeIn = () => {
      fadingOutRef.current = false;
      fade(1);
    };

    const onLoaded = () => {
      video.style.opacity = "0";
      video.play().catch(() => {});
      fadeIn();
    };

    const onTimeUpdate = () => {
      if (!video.duration) return;
      const remaining = video.duration - video.currentTime;
      if (remaining <= 0.55 && !fadingOutRef.current) {
        fadingOutRef.current = true;
        fade(0);
      }
    };

    const onEnded = () => {
      cancelFade();
      video.style.opacity = "0";
      setTimeout(() => {
        video.currentTime = 0;
        video.play().catch(() => {});
        fadeIn();
      }, 100);
    };

    video.style.opacity = "0";
    video.addEventListener("loadeddata", onLoaded);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    if (video.readyState >= 2) onLoaded();

    return () => {
      cancelFade();
      video.removeEventListener("loadeddata", onLoaded);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      src={VIDEO_URL}
      autoPlay
      muted
      playsInline
      preload="auto"
      className="absolute top-0 left-1/2 -translate-x-1/2 object-cover"
      style={{ width: "115%", height: "115%", objectPosition: "top", opacity: 0 }}
    />
  );
}

/* ─── Navigation ─── */
function Nav() {
  return (
    <nav
      className="flex items-center justify-between w-full gap-3"
      style={{ padding: "16px clamp(16px, 6vw, 120px)" }}
    >
      <span
        style={{ fontFamily: FONT.schibsted, fontWeight: 600, fontSize: 24, letterSpacing: "-1.44px", color: "#000" }}
      >
        Hushcut
      </span>

      <a
        href="https://buymeacoffee.com/hushcut2"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-lg hover:opacity-90 transition-opacity"
        style={{ height: 40, padding: "0 16px", background: "#000", color: "#fff", fontFamily: FONT.schibsted, fontWeight: 500, fontSize: 16, letterSpacing: "-0.2px" }}
      >
        <Coffee size={16} />
        Buy me a coffee
      </a>
    </nav>
  );
}

/* ─── Badge ─── */
function Badge() {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full bg-white"
      style={{ padding: "5px 14px 5px 6px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
    >
      <span
        className="inline-flex items-center gap-1 rounded-full"
        style={{ background: "#0e1311", color: "#fff", padding: "3px 9px", fontFamily: FONT.inter, fontSize: 12 }}
      >
        <Star size={11} />
        New
      </span>
      <span style={{ fontFamily: FONT.inter, fontWeight: 400, fontSize: 14, color: "#000" }}>
        Trim silence in seconds
      </span>
    </div>
  );
}

/* ─── Search input box ─── */
const MAX_BYTES = 200 * 1024 * 1024;

interface Result {
  url: string;
  beforeUrl: string;
  before: number;
  after: number;
  trimmed: boolean;
  enhanced: boolean;
}

function SearchBox() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [thresholdDb, setThresholdDb] = useState(-45);
  const [keepMs, setKeepMs] = useState(50);
  const [auto, setAuto] = useState(false);
  const [trim, setTrim] = useState(true);
  const [enhance, setEnhance] = useState(false);
  const [showThreshold, setShowThreshold] = useState(false);
  const [recording, setRecording] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<Blob | null>(null);
  const lastUrlRef = useRef<string | null>(null);
  const origUrlRef = useRef<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
      if (origUrlRef.current) URL.revokeObjectURL(origUrlRef.current);
    };
  }, []);

  const process = async (input: Blob) => {
    if (!trim && !enhance) {
      setErrorMsg("Turn on Trim silence, Enhance voice, or both.");
      setStatus("error");
      return;
    }
    setStatus("processing");
    setErrorMsg("");
    try {
      const { ctx, buffer } = await decodeAudioFile(input);
      const before = buffer.duration;

      let out = buffer;
      if (trim) out = removeSilenceBuffer(ctx, out, { auto, thresholdDb, keepSilenceMs: keepMs });
      if (enhance) out = await enhanceBuffer(out);

      const after = out.length / out.sampleRate;
      const wav = audioBufferToWav(out);
      const url = URL.createObjectURL(wav);
      const beforeUrl = URL.createObjectURL(input);
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
      if (origUrlRef.current) URL.revokeObjectURL(origUrlRef.current);
      lastUrlRef.current = url;
      origUrlRef.current = beforeUrl;
      setResult({ url, beforeUrl, before, after, trimmed: trim, enhanced: enhance });
      setStatus("done");
      if (ctx.state !== "closed") ctx.close();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Could not process this file.");
      setStatus("error");
    }
  };

  const handleFile = (file: File | Blob, name: string) => {
    if (file.size > MAX_BYTES) {
      setFileName(name);
      setErrorMsg("File is larger than 200MB.");
      setStatus("error");
      return;
    }
    selectedRef.current = file;
    setFileName(name);
    process(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file, file.name);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file, file.name);
  };

  const onSubmit = () => {
    if (selectedRef.current) process(selectedRef.current);
    else fileInputRef.current?.click();
  };

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        handleFile(blob, "recording.webm");
      };
      recorder.start();
      setRecording(true);
    } catch {
      setErrorMsg("Microphone access was denied.");
      setStatus("error");
    }
  };

  const fmt = (s: number) => `${s.toFixed(2)}s`;
  const removed = result ? result.before - result.after : 0;
  const pct = result && result.before ? (removed / result.before) * 100 : 0;

  const actionBtn = {
    background: "#f8f8f8",
    color: "#000",
    padding: "6px 12px",
    fontFamily: FONT.schibsted,
    fontWeight: 500,
    fontSize: 13,
  } as const;

  const modePill = (active: boolean) =>
    ({
      background: active ? "rgba(90,225,76,0.89)" : "rgba(255,255,255,0.18)",
      color: active ? "#000" : "#fff",
      padding: "4px 12px",
      borderRadius: 8,
      fontFamily: FONT.schibsted,
      fontWeight: 600,
      fontSize: 12,
    }) as const;

  return (
    <div className="w-full flex flex-col items-center gap-3" style={{ maxWidth: 728 }}>
      <input ref={fileInputRef} type="file" accept="audio/*" onChange={onInputChange} className="hidden" />

      {/* Main frosted box */}
      <div
        className="w-full flex flex-col justify-between gap-3"
        style={{
          minHeight: 200,
          background: "rgba(0,0,0,0.24)",
          borderRadius: 18,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          padding: 16,
        }}
      >
        {/* Top row */}
        <div
          className="flex items-center justify-between flex-wrap gap-x-3 gap-y-1.5"
          style={{ fontFamily: FONT.schibsted, fontWeight: 500, fontSize: 12, color: "#fff" }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTrim((v) => !v)}
              className="transition-opacity hover:opacity-90"
              style={modePill(trim)}
              title="Cut out the silent gaps in your audio"
            >
              Trim silence
            </button>
            <button
              onClick={() => setEnhance((v) => !v)}
              className="transition-opacity hover:opacity-90"
              style={modePill(enhance)}
              title="Boost clarity and warmth, cut low rumble, and even out the volume"
            >
              Enhance voice
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <Waveform size={13} />
            <span>Powered by ffmpeg</span>
          </div>
        </div>

        {/* Drop / upload row */}
        <div
          onClick={onSubmit}
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          className="flex items-center bg-white cursor-pointer"
          style={{
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            padding: "8px 8px 8px 16px",
            gap: 8,
            outline: dragOver ? "2px dashed rgba(90,225,76,0.89)" : "none",
            outlineOffset: -2,
          }}
        >
          <span
            className="flex-1 min-w-0 truncate"
            style={{ fontFamily: FONT.inter, fontSize: 16, color: fileName ? "#000" : "rgba(0,0,0,0.6)" }}
          >
            {fileName ?? "Drop an audio file to clean it up..."}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSubmit();
            }}
            disabled={status === "processing"}
            className="flex items-center justify-center rounded-full shrink-0 hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{ width: 36, height: 36, background: "#000", color: "#fff" }}
            aria-label="Remove silence"
          >
            {status === "processing" ? (
              <span
                className="animate-spin rounded-full"
                style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff" }}
              />
            ) : (
              <ArrowUp size={18} />
            )}
          </button>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 rounded-md hover:opacity-90 transition-opacity" style={actionBtn}>
              <Upload size={14} />
              Upload
            </button>
            <button
              onClick={toggleRecording}
              className="flex items-center gap-1.5 rounded-md hover:opacity-90 transition-opacity"
              style={{ ...actionBtn, background: recording ? "rgba(239,68,68,0.9)" : "#f8f8f8", color: recording ? "#fff" : "#000" }}
            >
              <Mic size={14} />
              {recording ? "Stop" : "Record"}
            </button>
            <div className="relative">
              <button onClick={() => setShowThreshold((v) => !v)} className="flex items-center gap-1.5 rounded-md hover:opacity-90 transition-opacity" style={actionBtn}>
                <Sliders size={14} />
                Threshold
              </button>
              {showThreshold && (
                <div
                  className="absolute left-0 bottom-full mb-2 flex flex-col gap-3 bg-white"
                  style={{ width: 240, borderRadius: 12, padding: 14, boxShadow: "0 8px 28px rgba(0,0,0,0.22)", zIndex: 20 }}
                >
                  <div className="flex items-center justify-between" style={{ fontFamily: FONT.schibsted, fontSize: 12, color: "#000" }}>
                    <span>Auto threshold</span>
                    <button
                      onClick={() => setAuto((v) => !v)}
                      style={{ background: auto ? "rgba(90,225,76,0.89)" : "#eee", color: "#000", padding: "3px 12px", borderRadius: 6, fontWeight: 600 }}
                    >
                      {auto ? "On" : "Off"}
                    </button>
                  </div>
                  <label className="flex flex-col gap-1" style={{ fontFamily: FONT.schibsted, fontSize: 12, color: auto ? "#aaa" : "#000" }}>
                    <span className="flex justify-between">
                      <span>Threshold</span>
                      <span>{thresholdDb} dB</span>
                    </span>
                    <input type="range" min={-60} max={-20} step={1} value={thresholdDb} disabled={auto} onChange={(e) => setThresholdDb(Number(e.target.value))} />
                  </label>
                  <label className="flex flex-col gap-1" style={{ fontFamily: FONT.schibsted, fontSize: 12, color: "#000" }}>
                    <span className="flex justify-between">
                      <span>Keep silence</span>
                      <span>{keepMs} ms</span>
                    </span>
                    <input type="range" min={0} max={300} step={10} value={keepMs} onChange={(e) => setKeepMs(Number(e.target.value))} />
                  </label>
                </div>
              )}
            </div>
          </div>
          <span style={{ fontFamily: FONT.schibsted, fontWeight: 500, fontSize: 12, color: "#909090" }}>Max 200MB</span>
        </div>
      </div>

      {/* Status / result panel */}
      {status === "processing" && (
        <div className="w-full flex items-center gap-3 bg-white" style={{ borderRadius: 14, padding: "14px 18px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", fontFamily: FONT.schibsted, fontSize: 14, color: "#000" }}>
          <span className="animate-spin rounded-full" style={{ width: 16, height: 16, border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#000" }} />
          {enhance && !trim ? "Enhancing audio..." : enhance ? "Trimming and enhancing..." : "Removing silence..."}
        </div>
      )}

      {status === "error" && (
        <div className="w-full bg-white" style={{ borderRadius: 14, padding: "14px 18px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", fontFamily: FONT.schibsted, fontSize: 14, color: "#c0392b" }}>
          {errorMsg || "Something went wrong."}
        </div>
      )}

      {status === "done" && result && (
        <div className="w-full flex flex-col gap-3 bg-white" style={{ borderRadius: 14, padding: 18, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
          <div className="flex items-center justify-between gap-2 flex-wrap" style={{ fontFamily: FONT.schibsted, fontSize: 13, color: "#505050" }}>
            <span className="truncate" style={{ color: "#000", fontWeight: 600, maxWidth: "50%" }}>{fileName}</span>
            <span className="flex items-center gap-2 flex-wrap justify-end">
              {result.trimmed && (
                <span>
                  {fmt(result.before)} → <span style={{ color: "#000", fontWeight: 600 }}>{fmt(result.after)}</span>
                  <span style={{ color: "rgba(90,180,60,1)", marginLeft: 6 }}>-{pct.toFixed(0)}% ({fmt(removed)} cut)</span>
                </span>
              )}
              {result.enhanced && (
                <span style={{ background: "rgba(90,200,60,0.16)", color: "#2f7d20", padding: "2px 9px", borderRadius: 6, fontWeight: 600 }}>
                  Voice enhanced
                </span>
              )}
            </span>
          </div>

          {/* Before / after so you can hear the difference */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <span style={{ fontFamily: FONT.schibsted, fontSize: 12, color: "#909090" }}>Before</span>
              <audio controls src={result.beforeUrl} className="w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <span style={{ fontFamily: FONT.schibsted, fontSize: 12, fontWeight: 600, color: "#000" }}>After</span>
              <audio controls src={result.url} className="w-full" />
            </div>
          </div>

          <a
            href={result.url}
            download={`hushcut_${(fileName ?? "audio").replace(/\.[^.]+$/, "")}.wav`}
            className="flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            style={{ background: "#000", color: "#fff", borderRadius: 10, padding: "10px 16px", fontFamily: FONT.schibsted, fontWeight: 600, fontSize: 14 }}
          >
            <Upload size={14} />
            Download {result.enhanced && result.trimmed ? "cleaned" : result.enhanced ? "enhanced" : "trimmed"} audio
          </a>
        </div>
      )}
    </div>
  );
}

/* ─── What "Enhance voice" does + live before/after demo ─── */
function EnhanceDemo() {
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [hasSample, setHasSample] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/sample.wav");
        if (!res.ok) return;
        const blob = await res.blob();
        if (blob.size < 1000) return; // guard against a 404 HTML page
        const { ctx, buffer } = await decodeAudioFile(blob);
        const enhanced = await enhanceBuffer(buffer);
        const wav = audioBufferToWav(enhanced);
        if (cancelled) {
          if (ctx.state !== "closed") ctx.close();
          return;
        }
        url = URL.createObjectURL(wav);
        setAfterUrl(url);
        setHasSample(true);
        if (ctx.state !== "closed") ctx.close();
      } catch {
        /* no sample available; explanation still shows */
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  const points = [
    "Cuts low rumble and hum with a high-pass filter",
    "Adds warmth in the low end (bass boost)",
    "Adds clarity and crispness up top (treble boost)",
    "Evens out the loud and quiet parts with a compressor, then lifts the level",
  ];

  return (
    <section id="enhance" className="w-full" style={{ padding: "clamp(56px, 9vw, 104px) clamp(20px, 6vw, 120px)", background: "#f8f8f8" }}>
      <div className="mx-auto w-full" style={{ maxWidth: 760 }}>
        <h2 style={{ fontFamily: FONT.fustat, fontWeight: 700, fontSize: "clamp(28px, 5vw, 46px)", letterSpacing: "-0.03em", color: "#000" }}>
          What &ldquo;Enhance voice&rdquo; does
        </h2>
        <p style={{ fontFamily: FONT.inter, fontSize: 16, lineHeight: 1.6, color: "#505050", marginTop: 16 }}>
          Recording sound thin, muddy or uneven? Turn on <strong style={{ color: "#000" }}>Enhance voice</strong> and Hushcut runs it
          through the kind of cleanup a sound engineer would do, all in your browser:
        </p>
        <ul className="flex flex-col gap-2" style={{ marginTop: 18 }}>
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2" style={{ fontFamily: FONT.inter, fontSize: 15, color: "#505050" }}>
              <span style={{ color: "rgba(60,170,45,1)", display: "inline-flex", marginTop: 2 }}>
                <Check size={15} />
              </span>
              {p}
            </li>
          ))}
        </ul>
        <p style={{ fontFamily: FONT.inter, fontSize: 15, color: "#505050", marginTop: 16 }}>
          Use it on its own, or together with silence trimming in a single pass.
        </p>

        {hasSample && afterUrl && (
          <div style={{ marginTop: 36 }}>
            <h3 style={{ fontFamily: FONT.schibsted, fontWeight: 600, fontSize: 18, letterSpacing: "-0.02em", color: "#000" }}>
              Hear the difference
            </h3>
            <div className="grid gap-5 sm:grid-cols-2" style={{ marginTop: 16 }}>
              <div className="flex flex-col gap-2 bg-white" style={{ borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                <span style={{ fontFamily: FONT.schibsted, fontSize: 13, color: "#909090" }}>Before</span>
                <audio controls src="/sample.wav" className="w-full" />
              </div>
              <div className="flex flex-col gap-2 bg-white" style={{ borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                <span style={{ fontFamily: FONT.schibsted, fontSize: 13, fontWeight: 600, color: "#000" }}>After (enhanced)</span>
                <audio controls src={afterUrl} className="w-full" />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── How it works + FAQ (content for readers and for SEO) ─── */
function InfoSections() {
  const sectionPad = "clamp(56px, 9vw, 104px) clamp(20px, 6vw, 120px)";
  return (
    <>
      <section id="how-it-works" className="w-full bg-white" style={{ padding: sectionPad }}>
        <div className="mx-auto w-full" style={{ maxWidth: 960 }}>
          <h2 style={{ fontFamily: FONT.fustat, fontWeight: 700, fontSize: "clamp(28px, 5vw, 46px)", letterSpacing: "-0.03em", color: "#000" }}>
            How it works
          </h2>
          <div className="grid gap-8 sm:grid-cols-3" style={{ marginTop: 40 }}>
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex flex-col gap-3">
                <span
                  className="inline-flex items-center justify-center rounded-full"
                  style={{ width: 36, height: 36, background: "#0e1311", color: "#fff", fontFamily: FONT.schibsted, fontWeight: 600, fontSize: 15 }}
                >
                  {i + 1}
                </span>
                <h3 style={{ fontFamily: FONT.schibsted, fontWeight: 600, fontSize: 18, letterSpacing: "-0.02em", color: "#000" }}>
                  {s.title}
                </h3>
                <p style={{ fontFamily: FONT.inter, fontSize: 15, lineHeight: 1.6, color: "#505050" }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="w-full" style={{ padding: sectionPad, background: "#f8f8f8" }}>
        <div className="mx-auto w-full" style={{ maxWidth: 760 }}>
          <h2 style={{ fontFamily: FONT.fustat, fontWeight: 700, fontSize: "clamp(28px, 5vw, 46px)", letterSpacing: "-0.03em", color: "#000" }}>
            Frequently asked questions
          </h2>
          <div className="flex flex-col" style={{ marginTop: 28 }}>
            {FAQ_ITEMS.map((f) => (
              <div key={f.q} style={{ borderTop: "1px solid #e6e6e6", padding: "22px 0" }}>
                <h3 style={{ fontFamily: FONT.schibsted, fontWeight: 600, fontSize: 17, letterSpacing: "-0.01em", color: "#000" }}>
                  {f.q}
                </h3>
                <p style={{ fontFamily: FONT.inter, fontSize: 15, lineHeight: 1.6, color: "#505050", marginTop: 8 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="w-full bg-white" style={{ padding: "32px clamp(20px, 6vw, 120px)", borderTop: "1px solid #eee" }}>
        <div className="mx-auto w-full flex flex-wrap items-center justify-between gap-3" style={{ maxWidth: 960, fontFamily: FONT.schibsted, fontSize: 14, color: "#505050" }}>
          <span>© {new Date().getFullYear()} Hushcut</span>
          <div className="flex items-center gap-5">
            <a href="https://github.com/jt-473/hushcut" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">
              GitHub
            </a>
            <a href="https://buymeacoffee.com/hushcut2" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">
              Buy me a coffee
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

/* ─── Page ─── */
export default function Home() {
  return (
    <div className="w-full bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Hero */}
      <div className="relative w-full min-h-screen">
        <div className="absolute inset-0 overflow-hidden z-0">
          <VideoBackground />
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          <Nav />

          {/* Hero content */}
          <main className="flex-1 flex flex-col items-center justify-center w-full" style={{ paddingTop: 60, paddingBottom: 24 }}>
          <div className="flex flex-col items-center w-full lg:-mt-[50px]" style={{ gap: "clamp(28px, 5vw, 44px)", padding: "0 clamp(20px, 6vw, 120px)" }}>
            {/* Header block */}
            <div className="flex flex-col items-center w-full" style={{ gap: "clamp(20px, 4vw, 34px)" }}>
              <Badge />
              <h1
                className="text-center"
                style={{ fontFamily: FONT.fustat, fontWeight: 700, fontSize: "clamp(34px, 9vw, 80px)", letterSpacing: "-0.06em", lineHeight: 1, color: "#000" }}
              >
                Remove Silence Instantly
              </h1>
              <p
                className="text-center"
                style={{ fontFamily: FONT.fustat, fontWeight: 500, fontSize: "clamp(16px, 4.2vw, 20px)", letterSpacing: "-0.02em", color: "#505050", maxWidth: 542, width: "100%" }}
              >
                Upload your audio and get a tightened track in seconds. The silent gaps are cut out, so only what matters is left.
              </p>

              {/* Value props */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {["100% free", "No sign-up required", "Unlimited"].map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white"
                    style={{ padding: "5px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", fontFamily: FONT.inter, fontSize: 13, color: "#000" }}
                  >
                    <span style={{ color: "rgba(60,170,45,1)", display: "inline-flex" }}>
                      <Check size={13} />
                    </span>
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <SearchBox />
          </div>
        </main>
        </div>
      </div>

      <EnhanceDemo />
      <InfoSections />
    </div>
  );
}
