"use client";

interface StatusBadgeProps {
  status: "not_started" | "in_review" | "completed";
}

const statusConfig = {
  not_started: { label: "Not Started", bg: "bg-gray-100", text: "text-gray-700" },
  in_review: { label: "In Review", bg: "bg-yellow-100", text: "text-yellow-800" },
  completed: { label: "Completed", bg: "bg-green-100", text: "text-green-800" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
