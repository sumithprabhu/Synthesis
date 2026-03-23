export const dynamic = 'force-dynamic';

import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Press_Start_2P } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Web3Provider } from '@/components/web3-provider';

import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start-2p',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Parley Protocol — The Negotiating Web',
  description:
    'Publishers get paid. Agents get content. x402 micropayments, OpenServ agents, ERC-8004 on Base.',
  keywords: ['Parley Protocol', 'x402', 'Base', 'publishers', 'AI agents', 'micropayments'],
};

export const viewport: Viewport = {
  themeColor: '#F2F1EA',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${pressStart2P.variable}`}
      suppressHydrationWarning
    >
      <body className="font-mono antialiased dot-grid-bg">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <Web3Provider>
            {children}
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
