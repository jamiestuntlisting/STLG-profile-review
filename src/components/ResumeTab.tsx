"use client";

import { useEffect, useState } from "react";

interface ResumeTabProps {
  stuntlistingUserId: number;
}

export default function ResumeTab({ stuntlistingUserId }: ResumeTabProps) {
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResume() {
      try {
        const res = await fetch(`/api/stuntlisting/resume/${stuntlistingUserId}`);
        if (!res.ok) throw new Error("Failed to load resume");
        const data = await res.json();
        setResumeUrl(data.resumeUrl);
      } catch {
        setError("Could not load resume");
      } finally {
        setLoading(false);
      }
    }
    loadResume();
  }, [stuntlistingUserId]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!resumeUrl) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Resume Not Found</h3>
        <p className="text-sm text-gray-500">No resume is available for this performer.</p>
      </div>
    );
  }

  // Use Google Docs viewer to display PDFs inline (S3 forces download otherwise)
  const isPdf = resumeUrl.toLowerCase().endsWith(".pdf");
  const viewerUrl = isPdf
    ? `https://docs.google.com/gview?url=${encodeURIComponent(resumeUrl)}&embedded=true`
    : resumeUrl;

  return (
    <div className="p-6">
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <iframe
          src={viewerUrl}
          className="w-full h-[600px]"
          title="Performer Resume"
        />
      </div>
    </div>
  );
}
