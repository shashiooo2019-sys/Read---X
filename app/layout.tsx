import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Read X Compliance',
  description: 'Read X Compliance - DELSM Lufthansa Group Delhi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
