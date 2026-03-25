"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import CountdownTimer from "@/components/CountdownTimer";
import CameraRecorder, { type CameraRecorderHandle } from "@/components/CameraRecorder";
import TabNav from "@/components/TabNav";
import ResumeTab from "@/components/ResumeTab";
import ChecklistTab from "@/components/ChecklistTab";
import OnlinePresenceTab from "@/components/OnlinePresenceTab";
import StatusTab from "@/components/StatusTab";

interface PerformerData {
  _id: string;
  name: string;
  stuntlistingUserId: number;
  stuntlistingProfileUrl: string;
}

interface ReviewData {
  _id: string;
  status: string;
  performerId: PerformerData;
  feedbackToken: string;
  listingDecision?: string;
}

interface AllReview {
  _id: string;
  status: string;
  performerId: { _id: string };
}

const REVIEW_DURATION_SECONDS = 120; // 2 minutes

const TABS = [
  { id: "checklist", label: "Checklist" },
  { id: "stuntlisting", label: "StuntListing" },
  { id: "resume", label: "Resume" },
  { id: "online", label: "Online" },
  { id: "status", label: "Status" },
];

export default function PerformerReviewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const performerId = params.performerId as string;
  const autoRecord = searchParams.get("autoRecord") === "true";

  const [review, setReview] = useState<ReviewData | null>(null);
  const [allReviews, setAllReviews] = useState<AllReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [timerDone, setTimerDone] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState("checklist");
  const cameraRecorderRef = useRef<CameraRecorderHandle>(null);

  useEffect(() => {
    setCanProceed(timerDone || hasRecording);
  }, [timerDone, hasRecording]);

  useEffect(() => {
    async function loadData() {
      try {
        // Validate token
        const authRes = await fetch(`/api/auth/validate?token=${token}`);
        if (!authRes.ok) {
          router.replace(`/review/${token}`);
          return;
        }
        const authData = await authRes.json();

        // Fetch all reviews for this session
        const reviewsRes = await fetch(`/api/reviews?sessionId=${authData.session.id}`);
        const reviewsData = await reviewsRes.json();
        const reviews: AllReview[] = reviewsData.reviews || [];
        setAllReviews(reviews);

        // Find the review for this performer
        const currentReview = reviews.find(
          (r: AllReview) => r.performerId._id === performerId
        );

        if (!currentReview) {
          router.replace(`/review/${token}/queue`);
          return;
        }

        // If already completed, allow proceeding immediately
        if (currentReview.status === "completed") {
          setTimerDone(true);
        }

        // Fetch full review with populated performer
        const reviewRes = await fetch(`/api/reviews/${currentReview._id}`);
        const reviewData = await reviewRes.json();
        setReview(reviewData.review);
      } catch {
        console.error("Failed to load performer data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token, performerId, router]);

  const handleTimerComplete = useCallback(() => {
    setTimerDone(true);
  }, []);

  const [uploading, setUploading] = useState(false);

  const handleRecordingComplete = async (_blobUrl: string, blob: Blob) => {
    setHasRecording(true);
    if (!review) return;

    // Upload the video file
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("video", blob, `review-${review._id}.webm`);
      formData.append("reviewId", review._id);
      formData.append("type", "review");

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();

      if (uploadRes.ok) {
        // Save the video URL to the review
        await fetch(`/api/reviews/${review._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordingUrl: uploadData.videoUrl }),
        });
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    // Find next unreviewed performer
    const currentIndex = allReviews.findIndex(
      (r) => r.performerId._id === performerId
    );

    const nextReview = allReviews.find(
      (r, i) => i > currentIndex && r.status !== "completed"
    );

    if (nextReview) {
      router.push(`/review/${token}/performer/${nextReview.performerId._id}?autoRecord=true`);
    } else {
      // All done — go back to queue dashboard
      router.push(`/review/${token}/queue`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!review) return null;

  const performer = review.performerId;
  const currentIndex = allReviews.findIndex((r) => r.performerId._id === performerId);

  return (
    <div key={performerId} className="min-h-screen bg-gray-50 py-8 px-4">
      {/* Fixed top bar: recording indicator + timer */}
      <div className="fixed top-0 left-0 right-0 z-50">
        {isRecording && (
          <div className="bg-red-600 text-white py-2 px-4 flex items-center justify-center gap-3 shadow-lg">
            <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
            <span className="font-bold text-sm uppercase tracking-wider">Recording</span>
          </div>
        )}
        {review.status !== "completed" && (
          <div className="bg-gray-50 border-b border-gray-200 shadow-sm px-4 py-3">
            <div className="max-w-3xl mx-auto">
              <CountdownTimer
                durationSeconds={REVIEW_DURATION_SECONDS}
                reviewId={review._id}
                onComplete={handleTimerComplete}
              />
            </div>
          </div>
        )}
      </div>

      {/* Spacer for fixed top bar */}
      <div className={`${review.status !== "completed" ? (isRecording ? "pt-28" : "pt-20") : isRecording ? "pt-12" : ""}`} />

      <div className="max-w-3xl mx-auto">
        {/* Header with progress */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push(`/review/${token}/queue`)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Back to Queue
          </button>
          <span className="text-sm text-gray-500">
            {currentIndex + 1} of {allReviews.length}
          </span>
        </div>

        {/* Performer name */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-gray-900">{performer.name}</h1>
            <a
              href={performer.stuntlistingProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm mt-1 inline-block"
            >
              View on StuntListing &rarr;
            </a>
          </div>

          {/* Tabbed content area */}
          <TabNav activeTab={activeTab} onTabChange={setActiveTab} tabs={TABS} />
          <div className="min-h-[300px]">
            {activeTab === "stuntlisting" && (
              <iframe
                src={`https://www.stuntlisting.com/profile/${performer.stuntlistingUserId}`}
                className="w-full h-[600px] border-0"
                title="StuntListing Profile"
              />
            )}
            {activeTab === "status" && (
              <StatusTab
                reviewId={review._id}
                stuntlistingUserId={performer.stuntlistingUserId}
                currentStatus={review.status}
                currentListingDecision={review.listingDecision}
                onStatusChange={(status, listingDecision) => {
                  setReview((prev) => prev ? { ...prev, status, listingDecision } : prev);
                  setTimerDone(true);
                }}
              />
            )}
            {activeTab === "online" && (
              <OnlinePresenceTab stuntlistingUserId={performer.stuntlistingUserId} performerName={performer.name} />
            )}
            {activeTab === "resume" && (
              <ResumeTab stuntlistingUserId={performer.stuntlistingUserId} />
            )}
            {activeTab === "checklist" && (
              <ChecklistTab stuntlistingUserId={performer.stuntlistingUserId} />
            )}
          </div>

          {/* Completed badge */}
          {review.status === "completed" && (
            <div className="p-6 border-t">
              <div className="flex items-center gap-2 text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Review already completed</span>
              </div>
            </div>
          )}

          {/* Camera Recording */}
          <div className="p-6 border-t">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Camera Recording</h3>
            <CameraRecorder
              ref={cameraRecorderRef}
              onRecordingComplete={handleRecordingComplete}
              onRecordingStateChange={setIsRecording}
              autoStart={autoRecord && review.status !== "completed"}
            />
            {uploading && (
              <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Uploading recording...
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="p-6 border-t flex justify-end">
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                canProceed
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {currentIndex < allReviews.length - 1 ? "Next Performer \u2192" : "Finish Reviews"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
