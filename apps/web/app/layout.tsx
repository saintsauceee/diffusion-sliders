import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Diffusion Sliders — UniToken Results',
  description: 'Browse steering-vector results from the UniToken pipeline.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-900 text-ink-100 antialiased">{children}</body>
    </html>
  );
}
