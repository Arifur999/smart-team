import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NavLinks } from '@/components/NavLinks';
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
  title: 'Smart Team',
  description: 'Live view of your PCs, teams and agents',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4">
          Skip to content
        </a>
        <nav className="border-b border-line bg-surface">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
            <span className="font-semibold tracking-tight">Smart Team</span>
            <NavLinks />
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
