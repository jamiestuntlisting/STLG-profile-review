"use client";

import StatusBadge from "./StatusBadge";

interface PerformerCardProps {
  name: string;
  status: "not_started" | "in_review" | "completed";
  onClick: () => void;
}

export default function PerformerCard({ name, status, onClick }: PerformerCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
          {name.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium text-gray-900">{name}</span>
      </div>
      <StatusBadge status={status} />
    </button>
  );
}
