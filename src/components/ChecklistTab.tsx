"use client";

import { useEffect, useState } from "react";

interface ChecklistData {
  hasStuntReel: boolean;
  hasSizes: boolean;
  hasStuntSkills: boolean;
  hasImdbLink: boolean;
  hasContactInfo: boolean;
  areSkillsRated: boolean;
  haveSkillDescriptions: boolean;
  meetsRequirements: boolean;
  pathA: boolean;
  pathB: boolean;
}

interface ChecklistTabProps {
  stuntlistingUserId: number;
}

function CheckItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${checked ? "bg-green-50" : "bg-red-50"}`}>
      {checked ? (
        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className={`text-sm font-medium ${checked ? "text-green-800" : "text-red-800"}`}>
        {label}
      </span>
    </div>
  );
}

export default function ChecklistTab({ stuntlistingUserId }: ChecklistTabProps) {
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadChecklist() {
      try {
        const res = await fetch(`/api/stuntlisting/checklist/${stuntlistingUserId}`);
        if (!res.ok) throw new Error("Failed to load checklist");
        const data = await res.json();
        setChecklist(data.checklist);
      } catch {
        setError("Could not load checklist data");
      } finally {
        setLoading(false);
      }
    }
    loadChecklist();
  }, [stuntlistingUserId]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !checklist) {
    return <div className="p-6 text-red-600">{error || "Checklist not available"}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Listing Requirements
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Path A: Stunt reel + Sizes + Stunt skills + Contact info
          <br />
          Path B: IMDb link with extensive credits + Contact info
        </p>
      </div>

      <div className="space-y-2">
        <CheckItem checked={checklist.hasStuntReel} label="Stunt reel uploaded" />
        <CheckItem checked={checklist.hasSizes} label="Sizes filled in (height, weight)" />
        <CheckItem checked={checklist.hasStuntSkills} label="Stunt skills listed" />
        <CheckItem checked={checklist.areSkillsRated} label="Skills are rated" />
        <CheckItem checked={checklist.haveSkillDescriptions} label="Skill descriptions are detailed" />
        <CheckItem checked={checklist.hasImdbLink} label="IMDb link provided" />
        <CheckItem checked={checklist.hasContactInfo} label="Contact info provided" />
      </div>

      {/* Verdict */}
      <div className={`p-4 rounded-xl border-2 ${
        checklist.meetsRequirements
          ? "border-green-300 bg-green-50"
          : "border-red-300 bg-red-50"
      }`}>
        <div className="flex items-center gap-2">
          {checklist.meetsRequirements ? (
            <>
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold text-green-800">Meets Listing Requirements</span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold text-red-800">Does Not Meet Requirements</span>
            </>
          )}
        </div>
        {checklist.meetsRequirements && (
          <p className="text-xs text-green-600 mt-1">
            {checklist.pathA && checklist.pathB
              ? "Meets both Path A and Path B"
              : checklist.pathA
              ? "Meets Path A (reel + sizes + skills + contact)"
              : "Meets Path B (IMDb + contact)"}
          </p>
        )}
      </div>
    </div>
  );
}
