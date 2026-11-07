import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { BotPanel } from '@/components/bot/BotPanel';
import { RoomsNav } from '@/components/RoomsNav';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: { default: 'Smart Team', template: '%s · Smart Team' },
  description: 'Live view of your PCs, teams and agents',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col lg:flex-row">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50">
          Skip to content
        </a>
        <RoomsNav />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        <BotPanel />
      </body>
    </html>
  );
}
