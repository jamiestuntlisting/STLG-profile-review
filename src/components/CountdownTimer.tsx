"use client";

import { useState, useEffect, useCallback } from "react";

interface CountdownTimerProps {
  durationSeconds: number;
  reviewId: string;
  onComplete: () => void;
}

export default function CountdownTimer({ durationSeconds, reviewId, onComplete }: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  const startTimer = useCallback(async () => {
    setIsRunning(true);
    try {
      await fetch(`/api/reviews/${reviewId}/timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
    } catch (err) {
      console.error("Failed to start timer on server:", err);
    }
  }, [reviewId]);

  // Auto-start timer on mount
  useEffect(() => {
    startTimer();
  }, [startTimer]);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRunning(false);
          setHasCompleted(true);
          // Complete timer on server
          fetch(`/api/reviews/${reviewId}/timer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "complete" }),
          }).catch(console.error);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, secondsLeft, reviewId, onComplete]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = ((durationSeconds - secondsLeft) / durationSeconds) * 100;

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className={`w-5 h-5 ${hasCompleted ? "text-green-500" : "text-blue-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {hasCompleted ? "Review Time Complete" : "Review Time"}
          </span>
        </div>
        <span className={`text-3xl font-mono font-bold tabular-nums ${hasCompleted ? "text-green-600" : secondsLeft <= 30 ? "text-red-600" : "text-gray-900"}`}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-1000 ${hasCompleted ? "bg-green-500" : secondsLeft <= 30 ? "bg-red-500" : "bg-blue-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
