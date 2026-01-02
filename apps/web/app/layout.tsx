import type { Metadata } from 'next';
import { Providers } from './providers';
import ConditionalHeader from './components/ConditionalHeader';
import ConditionalFooter from './components/ConditionalFooter';
import './globals.css';

export const metadata: Metadata = {
  title: 'Acta - Clear, Balanced Insights',
  description: 'A platform for understanding complex debates with clear, balanced insights based on journalist perspectives.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className="relative flex min-h-screen w-full flex-col font-display bg-background-light antialiased selection:bg-primary/20">
        <Providers>
          <ConditionalHeader />
          <main className="flex-1">{children}</main>
          <ConditionalFooter />
        </Providers>
      </body>
    </html>
  );
}
