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
}

const CameraRecorder = forwardRef<CameraRecorderHandle, CameraRecorderProps>(
  function CameraRecorder(
    { onRecordingComplete, onRecordingStateChange, onStateChange, autoStart },
    ref
  ) {
    const [state, setState] = useState<"idle" | "recording" | "done">("idle");
    const [duration, setDuration] = useState(0);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const cameraStreamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const liveVideoRef = useRef<HTMLVideoElement | null>(null);

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
        cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
        onRecordingStateChange?.(false);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Wire camera to live preview
    useEffect(() => {
      if (state === "recording" && liveVideoRef.current && cameraStreamRef.current) {
        liveVideoRef.current.srcObject = cameraStreamRef.current;
      }
    }, [state]);

    const stopRecording = useCallback(() => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      onRecordingStateChange?.(false);
    }, [onRecordingStateChange]);

    const startRecording = async () => {
      setError(null);
      try {
        // Get camera + mic
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, frameRate: 30 },
          audio: true,
        });
        cameraStreamRef.current = stream;

        // Wire to live preview
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
        }

        // Start MediaRecorder directly from camera stream
        chunksRef.current = [];
        const recorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp9",
        });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
          onRecordingComplete(url, blob);
          setState("done");
          // Stop camera tracks
          cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
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
        setError(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera permission was denied. Please allow camera access and try again."
            : "Failed to start camera. Make sure your browser supports camera access."
        );
      }
    };

    useImperativeHandle(ref, () => ({
      startRecording,
    }));

    // Auto-start recording if prop is set
    const autoStartedRef = useRef(false);
    useEffect(() => {
      if (autoStart && !autoStartedRef.current && state === "idle") {
        autoStartedRef.current = true;
        const timeout = setTimeout(() => startRecording(), 500);
        return () => clearTimeout(timeout);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoStart]);

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

    // Done state — show playback + re-record
    if (state === "done" && blobUrl) {
      return (
        <div className="space-y-3">
          <div className="rounded-lg overflow-hidden border border-green-200 bg-black">
            <video
              src={blobUrl}
              controls
              className="w-full max-h-64"
            />
          </div>
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
        {/* Record button in idle state */}
        {state === "idle" && !error && (
          <button
            onClick={startRecording}
            className="flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors uppercase tracking-wider"
          >
            <div className="w-3 h-3 rounded-full bg-white" />
            Record
          </button>
        )}

        {/* Live camera preview during recording */}
        {state === "recording" && (
          <div className="relative rounded-lg overflow-hidden border-2 border-red-400 bg-black">
            <video
              ref={liveVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-48 object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-white">REC</span>
            </div>
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-xs font-mono font-medium text-white">{formatDuration(duration)}</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
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
