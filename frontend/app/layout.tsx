import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ContentAgents — The Negotiating Web',
  description: 'Publishers get paid. Agents get content. Autonomous negotiation with x402 micropayments.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
