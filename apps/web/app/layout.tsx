import type { Metadata } from 'next';
import { Providers } from './providers';
import Header from './components/Header';
import Footer from './components/Footer';
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
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
