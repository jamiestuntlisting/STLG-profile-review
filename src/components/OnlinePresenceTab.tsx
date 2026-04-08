"use client";

import { useEffect, useState } from "react";

interface OnlinePresenceTabProps {
  stuntlistingUserId: number;
  performerName: string;
}

interface SocialLinks {
  imdb: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  twitter: string | null;
  personalWebsite: string | null;
}

export default function OnlinePresenceTab({ stuntlistingUserId, performerName }: OnlinePresenceTabProps) {
  const [links, setLinks] = useState<SocialLinks | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFrame, setActiveFrame] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/stuntlisting/profile/${stuntlistingUserId}`);
        const data = await res.json();
        const p = data.profile;
        setLinks({
          imdb: p.imdb || null,
          instagram: p.instagram || null,
          facebook: p.facebook || null,
          youtube: p.youtube || null,
          twitter: p.twitter || null,
          personalWebsite: p.personalWebsite || null,
        });

        // Auto-select the first available link to show
        if (p.imdb) setActiveFrame("imdb");
        else if (p.instagram) setActiveFrame("instagram");
        else if (p.youtube) setActiveFrame("youtube");
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [stuntlistingUserId]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!links) {
    return <div className="p-6 text-red-600">Could not load online presence</div>;
  }

  const googleSearchUrl = `https://www.google.com/search?igu=1&q=${encodeURIComponent(performerName + " stunt performer")}`;

  // Sites that must open in a new tab (they block iframes entirely)
  const newTabOnly = new Set(["imdb", "facebook", "youtube", "instagram", "twitter"]);

  const allLinks = [
    { key: "google", label: "Google", url: googleSearchUrl, icon: "G", color: "bg-blue-500" },
    links.imdb && { key: "imdb", label: "IMDb", url: links.imdb.startsWith("http") ? links.imdb : `https://${links.imdb}`, icon: "IMDb", color: "bg-yellow-500" },
    links.instagram && { key: "instagram", label: "Instagram", url: links.instagram.startsWith("http") ? links.instagram : `https://${links.instagram}`, icon: "IG", color: "bg-pink-500" },
    links.facebook && { key: "facebook", label: "Facebook", url: links.facebook.startsWith("http") ? links.facebook : `https://${links.facebook}`, icon: "FB", color: "bg-blue-600" },
    links.youtube && { key: "youtube", label: "YouTube", url: links.youtube.startsWith("http") ? links.youtube : `https://${links.youtube}`, icon: "YT", color: "bg-red-600" },
    links.twitter && { key: "twitter", label: "X/Twitter", url: links.twitter.startsWith("http") ? links.twitter : `https://${links.twitter}`, icon: "X", color: "bg-gray-900" },
    links.personalWebsite && { key: "website", label: "Website", url: links.personalWebsite.startsWith("http") ? links.personalWebsite : `https://${links.personalWebsite}`, icon: "W", color: "bg-green-600" },
  ].filter(Boolean) as { key: string; label: string; url: string; icon: string; color: string }[];

  const currentLink = activeFrame ? allLinks.find((l) => l.key === activeFrame) : null;
  const currentFrameUrl = currentLink?.url || null;
  const isNewTabOnly = activeFrame ? newTabOnly.has(activeFrame) : false;
  const canIframe = activeFrame ? !isNewTabOnly && activeFrame !== "website" : false;

  const handleLinkClick = (link: { key: string; url: string }) => {
    if (newTabOnly.has(link.key)) {
      // Open directly in new tab — these sites block iframes
      window.open(link.url, "_blank", "noopener,noreferrer");
      setActiveFrame(link.key);
    } else {
      setActiveFrame(link.key);
    }
  };

  return (
    <div className="p-4">
      {/* Link buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {allLinks.map((link) => {
          const isExternal = newTabOnly.has(link.key);
          return (
            <button
              key={link.key}
              onClick={() => handleLinkClick(link)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                activeFrame === link.key
                  ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
              }`}
            >
              <span className={`w-6 h-6 rounded text-white text-xs font-bold flex items-center justify-center ${link.color}`}>
                {link.icon.length <= 2 ? link.icon : link.icon.substring(0, 2)}
              </span>
              {link.label}
              {isExternal && (
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Open in new tab link */}
      {currentFrameUrl && (
        <div className="mb-2 text-right">
          <a
            href={currentFrameUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Open in new tab &rarr;
          </a>
        </div>
      )}

      {/* Content area */}
      {currentLink ? (
        isNewTabOnly ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white p-8 text-center">
            <p className="text-gray-600 mb-3">
              {currentLink.label} has been opened in a new tab.
            </p>
            <a
              href={currentLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Open {currentLink.label} again &rarr;
            </a>
          </div>
        ) : canIframe ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <iframe
              key={activeFrame}
              src={currentFrameUrl!}
              className="w-full h-[500px] border-0"
              title={`${activeFrame} profile`}
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white p-8 text-center">
            <a
              href={currentLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Open {currentLink.label} in new tab &rarr;
            </a>
          </div>
        )
      ) : (
        <div className="p-8 text-center text-gray-500">
          Select a link above to view
        </div>
      )}
    </div>
  );
}
