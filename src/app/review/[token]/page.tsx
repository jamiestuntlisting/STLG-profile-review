"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface SessionData {
  id: string;
  admin: {
    name: string;
  };
}

const FILTER_GROUPS = [
  {
    label: "Activity",
    filters: [
      { key: "recent", label: "Recent & Unreviewed", description: "Newest performers not yet reviewed", icon: "🕐" },
      { key: "recently_signed_up", label: "Recently Signed Up", description: "Signed up in the last 30 days", icon: "🆕" },
    ],
  },
  {
    label: "Membership",
    filters: [
      { key: "current_standard", label: "Current Standard", description: "Active paying standard members", icon: "💎" },
      { key: "free_previously_paid", label: "Previously Paid", description: "Free accounts that once paid", icon: "💳" },
      { key: "never_paid", label: "Never Paid", description: "Never had a paid subscription", icon: "🆓" },
    ],
  },
  {
    label: "Profile Status",
    filters: [
      { key: "unlisted_almost_complete", label: "Unlisted, Almost Complete", description: "Hidden profiles nearly complete", icon: "🔒" },
      { key: "listed_mostly_incomplete", label: "Listed, Mostly Incomplete", description: "Visible but missing key info", icon: "🚧" },
      { key: "has_skill_reels", label: "Has Skill Reels", description: "Performers with skill reels uploaded", icon: "🎥" },
    ],
  },
  {
    label: "Role",
    filters: [
      { key: "performers", label: "Performers", description: "Users with performer role", icon: "🎬" },
      { key: "coordinators", label: "Coordinators", description: "Users with coordinator role", icon: "📋" },
    ],
  },
  {
    label: "Location",
    filters: [
      { key: "nyc", label: "NYC", description: "New York area", icon: "🗽" },
      { key: "la", label: "LA", description: "Los Angeles area", icon: "🌴" },
      { key: "atl", label: "ATL", description: "Atlanta area", icon: "🍑" },
    ],
  },
  {
    label: "Union Status",
    filters: [
      { key: "non_union", label: "Non Union", description: "No union affiliation", icon: "🚫" },
      { key: "sag_eligible", label: "SAG Eligible", description: "SAG-eligible performers", icon: "🎫" },
      { key: "sag", label: "SAG", description: "SAG-AFTRA members", icon: "⭐" },
    ],
  },
];

export default function QueueBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function validate() {
      try {
        const authRes = await fetch(`/api/auth/validate?token=${token}`);
        if (!authRes.ok) {
          setError("Invalid or expired link");
          return;
        }
        const authData = await authRes.json();
        setSession(authData.session);
      } catch {
        setError("Failed to validate session");
      } finally {
        setLoading(false);
      }
    }
    validate();
  }, [token]);

  const toggleFilter = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleBuildQueue = async () => {
    if (!session || selected.size === 0) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/queue/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: Array.from(selected), sessionId: session.id }),
      });
      if (!res.ok) throw new Error("Sync failed");
      router.push(`/review/${token}/queue`);
    } catch {
      setError("Failed to build queue. Please try again.");
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Queue Builder</h1>
          <p className="mt-2 text-gray-600">
            Select one or more filters, then build your queue
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-center text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {FILTER_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                {group.label}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {group.filters.map((filter) => {
                  const isSelected = selected.has(filter.key);
                  return (
                    <button
                      key={filter.key}
                      onClick={() => toggleFilter(filter.key)}
                      disabled={syncing}
                      className={`relative flex flex-col items-center justify-center p-5 rounded-xl shadow-sm border transition-all text-center ${
                        isSelected
                          ? "bg-blue-50 ring-2 ring-blue-500 border-blue-500"
                          : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-md"
                      } ${syncing ? "opacity-50" : ""}`}
                    >
                      <span className="text-2xl mb-2">{filter.icon}</span>
                      <span className={`font-semibold text-sm ${isSelected ? "text-blue-700" : "text-gray-900"}`}>
                        {filter.label}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">{filter.description}</span>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Build Queue button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleBuildQueue}
            disabled={selected.size === 0 || syncing}
            className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all ${
              selected.size > 0 && !syncing
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {syncing ? (
              <span className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Building Queue...
              </span>
            ) : (
              `Build Queue${selected.size > 0 ? ` (${selected.size} filter${selected.size > 1 ? "s" : ""})` : ""}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
