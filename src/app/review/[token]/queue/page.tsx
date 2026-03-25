"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PerformerCard from "@/components/PerformerCard";

interface ReviewWithPerformer {
  _id: string;
  status: "not_started" | "in_review" | "completed";
  performerId: {
    _id: string;
    name: string;
  };
}

interface SessionData {
  id: string;
  admin: {
    name: string;
  };
}

export default function QueueDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [reviews, setReviews] = useState<ReviewWithPerformer[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const authRes = await fetch(`/api/auth/validate?token=${token}`);
        if (!authRes.ok) {
          setError("Invalid or expired link");
          setLoading(false);
          return;
        }
        const authData = await authRes.json();
        setSession(authData.session);

        const reviewsRes = await fetch(`/api/reviews?sessionId=${authData.session.id}`);
        const reviewsData = await reviewsRes.json();
        setReviews(reviewsData.reviews || []);
      } catch {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  const completedCount = reviews.filter((r) => r.status === "completed").length;
  const totalCount = reviews.length;

  const firstUnreviewed = reviews.find((r) => r.status !== "completed");

  const handleStartReviewing = () => {
    if (firstUnreviewed) {
      router.push(`/review/${token}/performer/${firstUnreviewed.performerId._id}`);
    }
  };

  const handlePerformerClick = (performerId: string) => {
    router.push(`/review/${token}/performer/${performerId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Review Queue</h1>
            {session?.admin && (
              <p className="mt-1 text-gray-600">Welcome back, {session.admin.name}</p>
            )}
          </div>
          <button
            onClick={() => router.push(`/review/${token}`)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Queue Builder
          </button>
        </div>

        {/* Stats bar */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Performers in Queue</p>
              <p className="text-3xl font-bold text-gray-900">{totalCount}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Reviewed</p>
              <p className="text-3xl font-bold text-green-600">
                {completedCount}/{totalCount}
              </p>
            </div>
          </div>

          {totalCount > 0 && completedCount < totalCount && (
            <button
              onClick={handleStartReviewing}
              className="w-full mt-4 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              {completedCount === 0 ? "Start Reviewing" : "Continue Reviewing"}
            </button>
          )}

          {totalCount === 0 && (
            <p className="mt-4 text-center text-gray-500">
              No performers in the queue. Go back to the Queue Builder to load performers.
            </p>
          )}

          {totalCount > 0 && completedCount === totalCount && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-sm font-medium text-green-800">All reviews complete! Great work.</p>
            </div>
          )}
        </div>

        {/* Performer list */}
        {reviews.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Performers</h2>
            {reviews.map((review) => (
              <PerformerCard
                key={review._id}
                name={review.performerId.name}
                status={review.status}
                onClick={() => handlePerformerClick(review.performerId._id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
