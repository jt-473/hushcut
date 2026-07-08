"use client";

import { useEffect, useRef, useState } from "react";
import {
  decodeAudioFile,
  removeSilenceBuffer,
  audioBufferToWav,
} from "@/lib/removeSilence";

/* ─── Constants ─── */
const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260329_050842_be71947f-f16e-4a14-810c-06e83d23ddb5.mp4";

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
      className="flex items-center justify-between w-full"
      style={{ padding: "16px 120px" }}
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
  before: number;
  after: number;
}

function SearchBox() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [thresholdDb, setThresholdDb] = useState(-45);
  const [keepMs, setKeepMs] = useState(50);
  const [auto, setAuto] = useState(false);
  const [showThreshold, setShowThreshold] = useState(false);
  const [recording, setRecording] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<Blob | null>(null);
  const lastUrlRef = useRef<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
    };
  }, []);

  const process = async (input: Blob) => {
    setStatus("processing");
    setErrorMsg("");
    try {
      const { ctx, buffer } = await decodeAudioFile(input);
      const before = buffer.duration;
      const out = removeSilenceBuffer(ctx, buffer, {
        auto,
        thresholdDb,
        keepSilenceMs: keepMs,
      });
      const after = out.length / out.sampleRate;
      const wav = audioBufferToWav(out);
      const url = URL.createObjectURL(wav);
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
      lastUrlRef.current = url;
      setResult({ url, before, after });
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

  return (
    <div className="w-full flex flex-col items-center gap-3" style={{ maxWidth: 728 }}>
      <input ref={fileInputRef} type="file" accept="audio/*" onChange={onInputChange} className="hidden" />

      {/* Main frosted box */}
      <div
        className="w-full flex flex-col justify-between"
        style={{
          height: 200,
          background: "rgba(0,0,0,0.24)",
          borderRadius: 18,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          padding: 16,
        }}
      >
        {/* Top row */}
        <div
          className="flex items-center justify-between"
          style={{ fontFamily: FONT.schibsted, fontWeight: 500, fontSize: 12, color: "#fff" }}
        >
          <div className="flex items-center gap-2">
            <span>Silence threshold {auto ? "Auto" : `${thresholdDb} dB`}</span>
            <button
              onClick={() => setAuto((v) => !v)}
              className="rounded-md transition-opacity hover:opacity-90"
              style={{
                background: auto ? "rgba(90,225,76,0.89)" : "rgba(255,255,255,0.18)",
                color: auto ? "#000" : "#fff",
                padding: "3px 10px",
                fontWeight: 600,
              }}
            >
              Auto
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
            {fileName ?? "Drop an audio file to remove silence..."}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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
          Removing silence...
        </div>
      )}

      {status === "error" && (
        <div className="w-full bg-white" style={{ borderRadius: 14, padding: "14px 18px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", fontFamily: FONT.schibsted, fontSize: 14, color: "#c0392b" }}>
          {errorMsg || "Something went wrong."}
        </div>
      )}

      {status === "done" && result && (
        <div className="w-full flex flex-col gap-3 bg-white" style={{ borderRadius: 14, padding: 18, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
          <div className="flex items-center justify-between" style={{ fontFamily: FONT.schibsted, fontSize: 13, color: "#505050" }}>
            <span className="truncate" style={{ color: "#000", fontWeight: 600 }}>{fileName}</span>
            <span>
              {fmt(result.before)} → <span style={{ color: "#000", fontWeight: 600 }}>{fmt(result.after)}</span>
              <span style={{ color: "rgba(90,180,60,1)", marginLeft: 8 }}>-{pct.toFixed(0)}% ({fmt(removed)} cut)</span>
            </span>
          </div>
          <audio controls src={result.url} className="w-full" />
          <a
            href={result.url}
            download={`trimmed_${(fileName ?? "audio").replace(/\.[^.]+$/, "")}.wav`}
            className="flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            style={{ background: "#000", color: "#fff", borderRadius: 10, padding: "10px 16px", fontFamily: FONT.schibsted, fontWeight: 600, fontSize: 14 }}
          >
            <Upload size={14} />
            Download trimmed audio
          </a>
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */
export default function Home() {
  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-white">
      <VideoBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Nav />

        {/* Hero content */}
        <main className="flex-1 flex flex-col items-center justify-center" style={{ paddingTop: 60 }}>
          <div className="flex flex-col items-center -mt-[50px]" style={{ gap: 44, padding: "0 120px" }}>
            {/* Header block */}
            <div className="flex flex-col items-center" style={{ gap: 34 }}>
              <Badge />
              <h1
                className="text-center"
                style={{ fontFamily: FONT.fustat, fontWeight: 700, fontSize: 80, letterSpacing: "-4.8px", lineHeight: 1, color: "#000" }}
              >
                Remove Silence Instantly
              </h1>
              <p
                className="text-center"
                style={{ fontFamily: FONT.fustat, fontWeight: 500, fontSize: 20, letterSpacing: "-0.4px", color: "#505050", maxWidth: 736, width: 542 }}
              >
                Upload your audio and get a tightened track in seconds. The silent gaps are cut out, so only what matters is left.
              </p>
            </div>

            <SearchBox />
          </div>
        </main>
      </div>
    </div>
  );
}
