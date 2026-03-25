"use client";

import { useEffect, useState } from "react";

interface StatusTabProps {
  reviewId: string;
  stuntlistingUserId: number;
  adminStuntlistingUserId?: number;
  currentStatus: string;
  currentListingDecision?: string;
  onStatusChange: (status: string, listingDecision: string) => void;
}

export default function StatusTab({
  reviewId,
  stuntlistingUserId,
  adminStuntlistingUserId,
  currentStatus,
  currentListingDecision,
  onStatusChange,
}: StatusTabProps) {
  const [listingDecision, setListingDecision] = useState<string>(currentListingDecision || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<boolean | null>(null);
  const [loadingDb, setLoadingDb] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`/api/stuntlisting/profile/${stuntlistingUserId}`);
        if (res.ok) {
          const data = await res.json();
          setDbStatus(data.profile.isListed);
        }
      } catch {
        // ignore
      } finally {
        setLoadingDb(false);
      }
    }
    fetchStatus();
  }, [stuntlistingUserId]);

  const handleDecision = async (decision: "listed" | "unlisted") => {
    setListingDecision(decision);
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      // 1. Update visibility on StuntListing via GraphQL
      if (adminStuntlistingUserId) {
        const visRes = await fetch("/api/stuntlisting/visibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminUserId: adminStuntlistingUserId,
            targetUserId: stuntlistingUserId,
            isVisible: decision === "listed",
          }),
        });

        if (!visRes.ok) {
          const visData = await visRes.json();
          throw new Error(visData.error || "Failed to update on StuntListing");
        }

        // Update local status display
        setDbStatus(decision === "listed");
      }

      // 2. Save decision to our review record
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingDecision: decision,
          status: "completed",
        }),
      });

      if (res.ok) {
        setSaved(true);
        onStatusChange("completed", decision);
      }
    } catch (err) {
      console.error("Failed to save status:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const isCompleted = currentStatus === "completed";

  return (
    <div className="p-6">
      {/* Current DB status */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Current Status on StuntListing
        </h4>
        {loadingDb ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        ) : dbStatus !== null ? (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${
              dbStatus
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}>
              <span className="text-base">{dbStatus ? "✅" : "❌"}</span>
              {dbStatus ? "LISTED" : "UNLISTED"}
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Could not load status</span>
        )}
      </div>

      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
        Your Decision
      </h3>

      <p className="text-sm text-gray-600 mb-6">
        {adminStuntlistingUserId
          ? "This will update their listing status on StuntListing and mark the review as completed."
          : "Set this performer\u2019s listing status. This will also mark the review as completed."}
      </p>

      <div className="flex gap-4">
        <button
          onClick={() => handleDecision("listed")}
          disabled={saving}
          className={`flex-1 py-6 px-4 rounded-xl text-lg font-bold transition-all border-2 ${
            listingDecision === "listed"
              ? "bg-green-50 border-green-500 text-green-700 ring-2 ring-green-500"
              : "bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">✅</span>
            <span>LISTED</span>
          </div>
        </button>

        <button
          onClick={() => handleDecision("unlisted")}
          disabled={saving}
          className={`flex-1 py-6 px-4 rounded-xl text-lg font-bold transition-all border-2 ${
            listingDecision === "unlisted"
              ? "bg-red-50 border-red-500 text-red-700 ring-2 ring-red-500"
              : "bg-white border-gray-200 text-gray-700 hover:border-red-300 hover:bg-red-50"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">❌</span>
            <span>UNLISTED</span>
          </div>
        </button>
      </div>

      {saving && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Updating StuntListing...
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-center text-sm text-red-700">
          {error}
        </div>
      )}

      {saved && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center text-sm text-green-700">
          ✅ Updated on StuntListing and review marked as completed.
        </div>
      )}

      {isCompleted && listingDecision && !saved && !error && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-center text-sm text-gray-600">
          Decision: <span className="font-semibold">{listingDecision.toUpperCase()}</span> — Review completed
        </div>
      )}
    </div>
  );
}
