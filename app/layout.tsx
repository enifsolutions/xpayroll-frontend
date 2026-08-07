import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'XpayRoll',
  description: 'Payroll management system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="inter_5901b7c6-module__ec5Qua__variable font-sans antialiased"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}