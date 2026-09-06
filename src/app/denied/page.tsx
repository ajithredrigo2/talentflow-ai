import Link from 'next/link';

export default function Denied() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-6">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 3l7 3v6c0 4.5-3 7.9-7 9-4-1.1-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M12 9v4M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-[18px] font-semibold text-ink-950">Access restricted</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[#616b85]">
          Your role does not have permission for this area. Role-based access control is enforced on every route and API
          handler, and the attempt has been written to the audit log.
        </p>
        <Link href="/dashboard" className="btn-primary mt-5">Back to your dashboard</Link>
      </div>
    </main>
  );
}
