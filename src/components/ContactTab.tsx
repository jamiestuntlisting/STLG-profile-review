"use client";

interface ContactTabProps {
  performerName: string;
  email: string | null;
  phone: string | null;
}

export default function ContactTab({ performerName, email, phone }: ContactTabProps) {
  return (
    <div className="p-6 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
        Contact Info
      </h3>

      {phone && (
        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Phone</p>
            <p className="text-lg font-medium text-gray-900 mt-1">{phone}</p>
          </div>
          <div className="flex gap-2">
            <a
              href={`sms:${phone}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Text
            </a>
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Call
            </a>
          </div>
        </div>
      )}

      {email && (
        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Email</p>
            <a
              href={`mailto:${email}`}
              className="text-lg font-medium text-blue-600 hover:text-blue-800 mt-1 block"
            >
              {email}
            </a>
          </div>
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email
          </a>
        </div>
      )}

      {!phone && !email && (
        <div className="p-8 text-center text-gray-500">
          No contact info available for {performerName}.
        </div>
      )}
    </div>
  );
}
