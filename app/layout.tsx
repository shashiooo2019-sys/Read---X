import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Read & Sign Compliance Management System | M365 Entra ID',
  description: 'Enterprise M365-integrated compliance platform for acknowledging and tracking Read & Sign topics across ALL, ALS, and Lead personnel.',
  openGraph: {
    title: 'Read & Sign Compliance Management System',
    description: 'Enterprise M365-integrated compliance platform for acknowledging and tracking Read & Sign topics across ALL, ALS, and Lead personnel.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Read & Sign Compliance Management System',
    description: 'Enterprise M365-integrated compliance platform for acknowledging and tracking Read & Sign topics across ALL, ALS, and Lead personnel.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
