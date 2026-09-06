import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TalentFlow AI — Your AI Workforce for HR',
  description:
    'TalentFlow AI deploys specialised AI agents across recruitment, onboarding, employee experience, workforce development and HR operations — helping HR teams work faster while keeping humans in control.',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = { themeColor: '#10091b', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
