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
import MembershipTab from "@/components/MembershipTab";
import ContactTab from "@/components/ContactTab";

interface PerformerData {
  _id: string;
  name: string;
  email: string;
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

// Tabs are built dynamically based on whether performer has reels

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
  const [performerPhone, setPerformerPhone] = useState<string>("");
  const [adminStuntlistingUserId, setAdminStuntlistingUserId] = useState<number | undefined>();
  const [adminAccessToken, setAdminAccessToken] = useState<string | undefined>();
  const [skillReels, setSkillReels] = useState<{ skillName: string; level: string; category: string; url: string }[]>([]);
  const [isListed, setIsListed] = useState<boolean | null>(null);
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
        if (authData.session?.admin?.stuntlistingUserId) {
          setAdminStuntlistingUserId(authData.session.admin.stuntlistingUserId);
        }
        if (authData.session?.admin?.stuntlistingAccessToken) {
          setAdminAccessToken(authData.session.admin.stuntlistingAccessToken);
        }

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

        // Fetch phone number and reels for recording filename and reels tab
        try {
          const profileRes = await fetch(`/api/stuntlisting/profile/${reviewData.review.performerId.stuntlistingUserId}`);
          const profileData = await profileRes.json();
          if (profileData.profile?.phoneNumber) {
            setPerformerPhone(profileData.profile.phoneNumber);
          }
          if (profileData.profile?.skillReels?.length > 0) {
            setSkillReels(profileData.profile.skillReels);
          }
          if (profileData.profile?.isListed !== undefined) {
            setIsListed(profileData.profile.isListed);
          }
        } catch {
          // Non-critical
        }
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

  const handleRecordingComplete = async (_blobUrl: string, _blob: Blob) => {
    setHasRecording(true);
    // File auto-downloads via CameraRecorder on cut
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
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{performer.name}</h1>
              <span className="text-sm text-gray-400">#{performer.stuntlistingUserId}</span>
              {isListed !== null && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  isListed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}>
                  {isListed ? "Listed" : "Unlisted"}
                </span>
              )}
            </div>
            {performer.email && (
              <a
                href={`mailto:${performer.email}`}
                className="text-gray-500 hover:text-gray-700 text-sm block"
              >
                {performer.email}
              </a>
            )}
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
          <TabNav activeTab={activeTab} onTabChange={setActiveTab} tabs={[
            { id: "checklist", label: "Checklist" },
            { id: "stuntlisting", label: "StuntListing" },
            ...(skillReels.length > 0 ? [{ id: "reels", label: "Skill Reels" }] : []),
            { id: "resume", label: "Resume" },
            { id: "online", label: "Online" },
            { id: "membership", label: "Membership" },
            { id: "status", label: "Status" },
            { id: "contact", label: "Contact" },
          ]} />
          <div className="min-h-[300px]">
            {/* StuntListing iframe is always rendered but hidden when not active, so it preloads */}
            <div className={activeTab === "stuntlisting" ? "" : "hidden"}>
              <iframe
                src={`https://www.stuntlisting.com/profile/${performer.stuntlistingUserId}`}
                className="w-full h-[600px] border-0"
                title="StuntListing Profile"
              />
            </div>
            {activeTab === "reels" && skillReels.length > 0 && (
              <div className="p-6">
                <p className="text-xs text-gray-500 mb-4">
                  Skill reels are only visible to Standard and Plus members. These are video links attached to individual skills.
                </p>
                <div className="space-y-3">
                  {skillReels.map((reel, i) => {
                    // Extract YouTube video ID for thumbnail
                    const ytMatch = reel.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
                    const ytId = ytMatch?.[1];
                    return (
                      <a
                        key={i}
                        href={reel.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {ytId ? (
                          <img
                            src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                            alt=""
                            className="w-32 h-20 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-32 h-20 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{reel.skillName}</p>
                          <p className="text-xs text-gray-500">{reel.category} · {reel.level}</p>
                          <p className="text-xs text-blue-600 truncate mt-1">{reel.url}</p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
            {activeTab === "status" && (
              <StatusTab
                reviewId={review._id}
                stuntlistingUserId={performer.stuntlistingUserId}
                adminStuntlistingUserId={adminStuntlistingUserId}
                adminAccessToken={adminAccessToken}
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
            {activeTab === "membership" && (
              <MembershipTab stuntlistingUserId={performer.stuntlistingUserId} />
            )}
            {activeTab === "contact" && (
              <ContactTab
                performerName={performer.name}
                email={performer.email}
                phone={performerPhone}
              />
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
              performerName={performer.name}
              performerPhone={performerPhone}
            />
          </div>

          {/* Navigation */}
          <div className="p-6 border-t flex justify-end">
            <button
              onClick={handleNext}
              className="px-6 py-3 rounded-lg font-medium transition-all bg-blue-600 hover:bg-blue-700 text-white"
            >
              {currentIndex < allReviews.length - 1 ? "Next Performer \u2192" : "Finish Reviews"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
