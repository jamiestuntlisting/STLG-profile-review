"use client";

import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";

export interface CameraRecorderHandle {
  startRecording: () => Promise<void>;
}

interface CameraRecorderProps {
  onRecordingComplete: (blobUrl: string, blob: Blob) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onStateChange?: (state: "idle" | "recording" | "done") => void;
  autoStart?: boolean;
  performerName?: string;
  performerPhone?: string;
}

const CameraRecorder = forwardRef<CameraRecorderHandle, CameraRecorderProps>(
  function CameraRecorder(
    { onRecordingComplete, onRecordingStateChange, onStateChange, autoStart, performerName, performerPhone },
    ref
  ) {
    const [state, setState] = useState<"idle" | "recording" | "done">("idle");
    const [duration, setDuration] = useState(0);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const screenStreamRef = useRef<MediaStream | null>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const screenVideoRef = useRef<HTMLVideoElement | null>(null);
    const camVideoRef = useRef<HTMLVideoElement | null>(null);

    const stateRef = useRef(state);
    stateRef.current = state;

    const onStateChangeRef = useRef(onStateChange);
    onStateChangeRef.current = onStateChange;

    useEffect(() => {
      onStateChangeRef.current?.(state);
    }, [state]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
        onRecordingStateChange?.(false);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stopRecording = useCallback(() => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      onRecordingStateChange?.(false);
    }, [onRecordingStateChange]);

    const sanitizeFilename = (str: string) =>
      str.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_");

    const startRecording = async () => {
      setError(null);
      try {
        // 1. Get screen capture (preferCurrentTab auto-selects this tab)
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080, frameRate: 30 },
          audio: false,
          // @ts-expect-error -- preferCurrentTab is supported in Chrome 94+
          preferCurrentTab: true,
        });
        screenStreamRef.current = screenStream;

        // If user cancels screen share, handle gracefully
        screenStream.getVideoTracks()[0].onended = () => {
          if (stateRef.current === "recording") {
            stopRecording();
          }
        };

        // 2. Get webcam + mic
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 30 },
          audio: true,
        });
        cameraStreamRef.current = cameraStream;

        // 3. Set up hidden video elements for drawing
        const screenVideo = document.createElement("video");
        screenVideo.srcObject = screenStream;
        screenVideo.muted = true;
        screenVideo.playsInline = true;
        await screenVideo.play();
        screenVideoRef.current = screenVideo;

        const camVideo = document.createElement("video");
        camVideo.srcObject = cameraStream;
        camVideo.muted = true;
        camVideo.playsInline = true;
        await camVideo.play();
        camVideoRef.current = camVideo;

        // 4. Set up canvas for compositing
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Canvas not available");

        const screenTrack = screenStream.getVideoTracks()[0];
        const settings = screenTrack.getSettings();
        canvas.width = settings.width || 1920;
        canvas.height = settings.height || 1080;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context not available");

        // 5. Compositing loop
        const pipWidth = 240;
        const pipHeight = 180;
        const pipMargin = 16;
        const pipRadius = 12;

        const drawFrame = () => {
          // Draw screen capture full-size
          ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

          // Draw webcam PiP in bottom-right corner with rounded rect
          const x = canvas.width - pipWidth - pipMargin;
          const y = canvas.height - pipHeight - pipMargin;

          ctx.save();
          // Rounded rectangle clip
          ctx.beginPath();
          ctx.moveTo(x + pipRadius, y);
          ctx.lineTo(x + pipWidth - pipRadius, y);
          ctx.quadraticCurveTo(x + pipWidth, y, x + pipWidth, y + pipRadius);
          ctx.lineTo(x + pipWidth, y + pipHeight - pipRadius);
          ctx.quadraticCurveTo(x + pipWidth, y + pipHeight, x + pipWidth - pipRadius, y + pipHeight);
          ctx.lineTo(x + pipRadius, y + pipHeight);
          ctx.quadraticCurveTo(x, y + pipHeight, x, y + pipHeight - pipRadius);
          ctx.lineTo(x, y + pipRadius);
          ctx.quadraticCurveTo(x, y, x + pipRadius, y);
          ctx.closePath();
          ctx.clip();

          // Mirror the webcam horizontally
          ctx.translate(x + pipWidth, y);
          ctx.scale(-1, 1);
          ctx.drawImage(camVideo, 0, 0, pipWidth, pipHeight);
          ctx.restore();

          // Border around PiP
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + pipRadius, y);
          ctx.lineTo(x + pipWidth - pipRadius, y);
          ctx.quadraticCurveTo(x + pipWidth, y, x + pipWidth, y + pipRadius);
          ctx.lineTo(x + pipWidth, y + pipHeight - pipRadius);
          ctx.quadraticCurveTo(x + pipWidth, y + pipHeight, x + pipWidth - pipRadius, y + pipHeight);
          ctx.lineTo(x + pipRadius, y + pipHeight);
          ctx.quadraticCurveTo(x, y + pipHeight, x, y + pipHeight - pipRadius);
          ctx.lineTo(x, y + pipRadius);
          ctx.quadraticCurveTo(x, y, x + pipRadius, y);
          ctx.closePath();
          ctx.stroke();

          animFrameRef.current = requestAnimationFrame(drawFrame);
        };
        drawFrame();

        // 6. Record from canvas + audio
        const canvasStream = canvas.captureStream(30);
        const audioTrack = cameraStream.getAudioTracks()[0];
        if (audioTrack) {
          canvasStream.addTrack(audioTrack);
        }

        chunksRef.current = [];
        // Prefer MP4 (H.264) if supported, fallback to WebM
        const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
          ? "video/mp4;codecs=avc1"
          : MediaRecorder.isTypeSupported("video/mp4")
            ? "video/mp4"
            : "video/webm;codecs=vp9";
        const recorder = new MediaRecorder(canvasStream, { mimeType });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;

          const isMP4 = mimeType.startsWith("video/mp4");
          const ext = isMP4 ? "mp4" : "webm";
          const blob = new Blob(chunksRef.current, { type: isMP4 ? "video/mp4" : "video/webm" });
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
          onRecordingComplete(url, blob);
          setState("done");

          // Auto-download the file
          const phonePart = performerPhone ? sanitizeFilename(performerPhone) : "no-phone";
          const namePart = performerName ? sanitizeFilename(performerName) : "unknown";
          const filename = `${phonePart}-${namePart}.${ext}`;
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          // Stop all tracks
          screenStreamRef.current?.getTracks().forEach((t) => t.stop());
          cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
          screenStreamRef.current = null;
          cameraStreamRef.current = null;
        };

        recorder.start(1000);
        recorderRef.current = recorder;

        // Start duration timer
        setDuration(0);
        timerRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);

        setState("recording");
        onRecordingStateChange?.(true);
      } catch (err) {
        console.error("Failed to start recording:", err);
        // Clean up any streams that were acquired
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
        cameraStreamRef.current = null;

        setError(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Screen share or camera permission was denied. Please allow access and try again."
            : "Failed to start recording. Make sure your browser supports screen capture."
        );
      }
    };

    useImperativeHandle(ref, () => ({
      startRecording,
    }));

    // Auto-start removed — admin clicks Record manually

    const reRecord = () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      setDuration(0);
      setError(null);
      setState("idle");
      onRecordingStateChange?.(false);
    };

    const formatDuration = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${s.toString().padStart(2, "0")}`;
    };

    // Done state — no preview, just status + redo
    if (state === "done") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-800">
                Recording saved ({formatDuration(duration)})
              </span>
            </div>
            <button
              onClick={reRecord}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Oops, redo
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Hidden canvas for compositing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Record button in idle state */}
        {state === "idle" && !error && (
          <button
            onClick={startRecording}
            className="flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors uppercase tracking-wider"
          >
            <div className="w-3 h-3 rounded-full bg-white" />
            Record Screen
          </button>
        )}

        {/* Recording indicator */}
        {state === "recording" && (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-red-700">Recording screen...</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
            <button
              onClick={() => { setError(null); setState("idle"); }}
              className="ml-3 text-red-600 underline hover:text-red-800"
            >
              Try again
            </button>
          </div>
        )}

        {/* Controls */}
        {state === "recording" && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-3 px-6 py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-lg transition-colors uppercase tracking-wider"
          >
            <div className="w-3 h-3 rounded-sm bg-white" />
            CUT ({formatDuration(duration)})
          </button>
        )}
      </div>
    );
  }
);

export default CameraRecorder;
