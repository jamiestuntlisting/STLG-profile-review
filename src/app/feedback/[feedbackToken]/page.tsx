"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import FeedbackResponse from "@/components/FeedbackResponse";

interface FeedbackData {
  performerName: string;
  recordingUrl: string;
  hasResponded: boolean;
  responseType: string | null;
}

export default function PerformerFeedbackPage() {
  const params = useParams();
  const feedbackToken = params.feedbackToken as string;

  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFeedback() {
      try {
        const res = await fetch(`/api/feedback/${feedbackToken}`);
        if (!res.ok) {
          const errData = await res.json();
          setError(errData.error || "Could not load feedback");
          return;
        }
        const feedbackData = await res.json();
        setData(feedbackData);
      } catch {
        setError("Something went wrong loading your feedback");
      } finally {
        setLoading(false);
      }
    }

    loadFeedback();
  }, [feedbackToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your feedback...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Feedback Unavailable</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Hi {data.performerName}!
          </h1>
          <p className="text-gray-600">
            Here&apos;s your StuntListing profile review
          </p>
        </div>

        {/* Video player */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
          <div className="bg-black">
            <video
              src={data.recordingUrl}
              controls
              className="w-full max-h-[400px]"
              autoPlay={false}
            />
          </div>
          <div className="p-4 bg-gray-50 border-t">
            <p className="text-sm text-gray-500">
              This is a personalized video review of your StuntListing profile. Watch it to see what&apos;s working and what you can improve.
            </p>
          </div>
        </div>

        {/* Response buttons */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            How was this feedback?
          </h2>
          <FeedbackResponse
            feedbackToken={feedbackToken}
            hasResponded={data.hasResponded}
            existingResponseType={data.responseType}
          />
        </div>
      </div>
    </div>
  );
}
