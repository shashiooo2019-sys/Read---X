import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-extrabold mb-2">404 - Not Found</h1>
      <p className="text-slate-400 mb-6">The requested page could not be located.</p>
      <Link
        href="/"
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition"
      >
        Return to Portal
      </Link>
    </div>
  );
}
