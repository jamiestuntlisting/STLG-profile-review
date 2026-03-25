"use client";

import { useEffect, useState } from "react";

interface Feature {
  key: string;
  label: string;
  hasAccess: boolean;
}

interface MembershipData {
  tier: string;
  subscriptionType: string;
  stripeCustomerId: string | null;
  planName: string | null;
  stripeStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  features: Feature[];
}

interface MembershipTabProps {
  stuntlistingUserId: number;
}

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  free: { label: "Free", color: "text-gray-700", bg: "bg-gray-100", border: "border-gray-300", icon: "○" },
  pro: { label: "Pro", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-300", icon: "◆" },
  premium: { label: "Premium", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-300", icon: "★" },
};

export default function MembershipTab({ stuntlistingUserId }: MembershipTabProps) {
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/stuntlisting/membership/${stuntlistingUserId}`);
        if (!res.ok) throw new Error("Failed to load membership");
        const data = await res.json();
        setMembership(data.membership);
      } catch {
        setError("Could not load membership data");
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

  if (error || !membership) {
    return <div className="p-6 text-red-600">{error || "Membership data not available"}</div>;
  }

  const tierConfig = TIER_CONFIG[membership.tier] || TIER_CONFIG.free;
  const missingFeatures = membership.features.filter((f) => !f.hasAccess);
  const hasFeatures = membership.features.filter((f) => f.hasAccess);

  return (
    <div className="p-6 space-y-6">
      {/* Current Plan Banner */}
      <div className={`p-5 rounded-xl border-2 ${tierConfig.border} ${tierConfig.bg}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{tierConfig.icon}</span>
          <div>
            <h3 className={`text-xl font-bold ${tierConfig.color}`}>
              {membership.planName || `${tierConfig.label} Plan`}
            </h3>
            <p className="text-sm text-gray-600">
              {membership.subscriptionType !== "free" ? membership.subscriptionType : "Free tier"}
            </p>
          </div>
        </div>

        {/* Stripe status */}
        {membership.stripeStatus && (
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              membership.stripeStatus === "active"
                ? "bg-green-100 text-green-800"
                : membership.stripeStatus === "trialing"
                ? "bg-blue-100 text-blue-800"
                : membership.stripeStatus === "past_due"
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                membership.stripeStatus === "active" ? "bg-green-500"
                : membership.stripeStatus === "trialing" ? "bg-blue-500"
                : membership.stripeStatus === "past_due" ? "bg-red-500"
                : "bg-gray-500"
              }`} />
              {membership.stripeStatus.charAt(0).toUpperCase() + membership.stripeStatus.slice(1).replace("_", " ")}
            </span>
            {membership.currentPeriodEnd && (
              <span className="text-gray-500">
                {membership.cancelAtPeriodEnd ? "Cancels" : "Renews"}{" "}
                {new Date(membership.currentPeriodEnd).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {!membership.stripeCustomerId && membership.tier === "free" && (
          <p className="text-sm text-gray-500 mt-2">No Stripe subscription on file</p>
        )}
      </div>

      {/* Features Grid */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
          Features
        </h4>

        <div className="space-y-2">
          {hasFeatures.map((feature) => (
            <div key={feature.key} className="flex items-center gap-3 p-3 rounded-lg bg-green-50">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-green-800">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Missing Features */}
      {missingFeatures.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Missing Features
          </h4>
          <div className="space-y-2">
            {missingFeatures.map((feature) => (
              <div key={feature.key} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm font-medium text-amber-800">{feature.label}</span>
                <span className="ml-auto text-xs text-amber-600 font-medium">Upgrade required</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
