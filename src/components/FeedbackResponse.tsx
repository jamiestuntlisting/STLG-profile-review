"use client";

import { useState } from "react";

interface FeedbackResponseProps {
  feedbackToken: string;
  hasResponded: boolean;
  existingResponseType: string | null;
}

const responses = [
  {
    type: "helpful" as const,
    label: "This video was really helpful",
    description: "Thank you for the feedback!",
    color: "bg-green-600 hover:bg-green-700",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
      </svg>
    ),
  },
  {
    type: "update_later" as const,
    label: "I'm hoping to update my profile in about a month, can we connect then",
    description: "We'll follow up with you!",
    color: "bg-blue-600 hover:bg-blue-700",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    type: "not_serious" as const,
    label: "I was just looking at the site I'm not serious about being a stunt performer",
    description: "No worries, thanks for letting us know!",
    color: "bg-gray-500 hover:bg-gray-600",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function FeedbackResponse({ feedbackToken, hasResponded, existingResponseType }: FeedbackResponseProps) {
  const [responded, setResponded] = useState(hasResponded);
  const [responseType, setResponseType] = useState(existingResponseType);
  const [submitting, setSubmitting] = useState(false);

  const handleResponse = async (type: "helpful" | "update_later" | "not_serious") => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/feedback/${feedbackToken}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseType: type }),
      });

      if (res.ok) {
        setResponded(true);
        setResponseType(type);
      }
    } catch (err) {
      console.error("Failed to submit response:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (responded) {
    const response = responses.find((r) => r.type === responseType);
    return (
      <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Thanks for your response!</h3>
        {response && (
          <p className="text-gray-600">{response.description}</p>
        )}
        {responseType === "update_later" && (
          <p className="text-sm text-blue-600 mt-3">
            We&apos;ll reach out to you in about a month to check on your progress.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {responses.map((response) => (
        <button
          key={response.type}
          onClick={() => handleResponse(response.type)}
          disabled={submitting}
          className={`w-full flex items-center gap-4 px-6 py-4 text-white font-medium rounded-xl transition-colors disabled:opacity-50 ${response.color}`}
        >
          {response.icon}
          <span className="text-left text-sm">{response.label}</span>
        </button>
      ))}
    </div>
  );
}
