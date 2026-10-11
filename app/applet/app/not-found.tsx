import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Page Not Found</h2>
      <p className="text-sm text-slate-500 mb-6">
        The requested compliance resource could not be found.
      </p>
      <Link
        href="/"
        className="px-4 py-2 text-xs font-semibold text-white bg-[#0078D4] hover:bg-[#106EBE] rounded transition shadow-xs"
      >
        Return to Station Compliance
      </Link>
    </div>
  );
}
