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
      { key: "recent", label: "Recent & Unreviewed", description: "Newest performers not yet reviewed" },
      { key: "most_recent", label: "50 Most Recent", description: "50 highest ID profiles" },
      { key: "most_recent_unreviewed", label: "50 Most Recent Unreviewed", description: "50 highest ID profiles not yet reviewed" },
      { key: "recently_signed_up", label: "Recently Signed Up", description: "Signed up in the last 30 days" },
    ],
  },
  {
    label: "Membership",
    filters: [
      { key: "current_standard", label: "Current Standard", description: "Active paying standard members" },
      { key: "free_previously_paid", label: "Previously Paid", description: "Free accounts that once paid" },
      { key: "never_paid", label: "Never Paid", description: "Never had a paid subscription" },
    ],
  },
  {
    label: "Profile Status",
    filters: [
      { key: "listed", label: "Listed", description: "Currently visible on StuntListing" },
      { key: "unlisted", label: "Unlisted", description: "Currently hidden on StuntListing" },
      { key: "unlisted_almost_complete", label: "Unlisted, Almost Complete", description: "Hidden profiles nearly complete" },
      { key: "listed_mostly_incomplete", label: "Listed, Mostly Incomplete", description: "Visible but missing key info" },
    ],
  },
  {
    label: "Profile Has",
    filters: [
      { key: "has_first_last_name", label: "First & Last Name", description: "Both first and last name filled in" },
      { key: "has_resume", label: "Resume", description: "Resume/CV uploaded" },
      { key: "has_stunt_reel", label: "Stunt Reel", description: "Stunt reel uploaded" },
      { key: "has_stunt_skills", label: "Stunt Skills", description: "Stunt skills listed" },
      { key: "has_skill_reels", label: "Skill Reels", description: "Skill reels uploaded" },
    ],
  },
  {
    label: "Role",
    filters: [
      { key: "performers", label: "Performers", description: "Users with performer role" },
      { key: "coordinators", label: "Coordinators", description: "Users with coordinator role" },
      { key: "performer_coordinator", label: "Performer / Coordinator", description: "Users with both roles" },
      { key: "stuntlisting_admins", label: "StuntListing Admins", description: "Admin accounts for testing" },
    ],
  },
  {
    label: "Location",
    filters: [
      { key: "la", label: "LA", description: "Los Angeles (1,749)" },
      { key: "nyc", label: "NYC", description: "New York (1,454)" },
      { key: "atl", label: "ATL", description: "Atlanta (1,194)" },
      { key: "chi", label: "Chicago", description: "Chicago (126)" },
      { key: "us_other", label: "US Other", description: "All other US locations" },
      { key: "international", label: "International", description: "Outside the US" },
    ],
  },
  {
    label: "Union Status",
    filters: [
      { key: "non_union", label: "Non Union", description: "No union affiliation" },
      { key: "sag_eligible", label: "SAG Eligible", description: "SAG-eligible performers" },
      { key: "sag", label: "SAG", description: "SAG-AFTRA members" },
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
  const [profileId, setProfileId] = useState("");

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
      const data = await res.json();
      if (data.added === 0) {
        setError(data.message || "No performers found matching these filters.");
        setSyncing(false);
        return;
      }
      router.push(`/review/${token}/queue`);
    } catch {
      setError("Failed to build queue. Please try again.");
      setSyncing(false);
    }
  };

  const handleProfileIdLookup = async () => {
    if (!session || !profileId.trim()) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/queue/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profileId.trim(), sessionId: session.id }),
      });
      if (!res.ok) throw new Error("Lookup failed");
      const data = await res.json();
      if (data.added === 0) {
        setError(data.message || "No performer found with that ID.");
        setSyncing(false);
        return;
      }
      router.push(`/review/${token}/queue`);
    } catch {
      setError("Failed to look up profile. Please try again.");
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
          <div className={`mb-6 p-4 rounded-lg text-center text-base ${
            error.includes("No performer")
              ? "bg-yellow-50 border border-yellow-200 text-yellow-800"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            {error}
          </div>
        )}

        {/* Profile ID Lookup */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Review by Profile ID
          </h3>
          <div className="flex gap-3">
            <input
              type="number"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              placeholder="Enter profile ID (e.g. 33)"
              disabled={syncing}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              onKeyDown={(e) => { if (e.key === "Enter") handleProfileIdLookup(); }}
            />
            <button
              onClick={handleProfileIdLookup}
              disabled={!profileId.trim() || syncing}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                profileId.trim() && !syncing
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {syncing ? "Loading..." : "Look Up"}
            </button>
          </div>
        </div>

        <div className="space-y-10">
          {FILTER_GROUPS.map((group, i) => (
            <div key={group.label}>
              {i > 0 && <hr className="border-gray-200 mb-8" />}
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 px-1">
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
                      <span className={`font-semibold text-base ${isSelected ? "text-blue-700" : "text-gray-900"}`}>
                        {filter.label}
                      </span>
                      <span className="text-sm text-gray-500 mt-1">{filter.description}</span>
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
          {error && (
            <div className={`mb-4 p-4 rounded-lg text-center text-base ${
              error.includes("No performers")
                ? "bg-yellow-50 border border-yellow-200 text-yellow-800"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              {error}
            </div>
          )}
        </div>
        <div className="text-center">
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
