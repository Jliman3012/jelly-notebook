import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Providers } from '../components/providers';

export const metadata: Metadata = {
  title: 'MemeCrash',
  description: 'Provably fair Solana meme crash game',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <main className="min-h-screen bg-gradient-to-b from-[#050315] via-[#0a0623] to-[#050315]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
