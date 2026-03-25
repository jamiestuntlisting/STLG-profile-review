"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function autoRedirect() {
      try {
        const res = await fetch("/api/sessions");
        if (!res.ok) throw new Error("Failed to get session");
        const data = await res.json();
        router.replace(`/review/${data.token}`);
      } catch {
        setError("Failed to load. Please refresh.");
      }
    }
    autoRedirect();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  );
}
