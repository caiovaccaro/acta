'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Database, FileText, Settings, Scale } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: Home },
    { href: '/admin/topics', label: 'Topics', icon: Database },
    { href: '/admin/questions', label: 'Questions', icon: FileText },
    { href: '/admin/verdicts', label: 'Verdicts', icon: Scale },
    { href: '/admin/articles', label: 'Articles', icon: FileText },
    { href: '/admin/outlets', label: 'Outlets', icon: Database },
    { href: '/admin/crawl-requests', label: 'Crawl Requests', icon: Database },
    // { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background-lighter">
      {/* Admin Navigation Bar */}
      <nav className="bg-white border-b border-border-light shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <Link href="/admin" className="flex items-center space-x-2">
                <span className="text-xl font-bold text-primary-blue">Acta Admin</span>
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-blue/10 text-primary-blue'
                        : 'text-text-muted hover:text-primary-blue hover:bg-background-lighter'
                    }`}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Back to Site Link */}
            <div className="flex items-center">
              <Link
                href="/"
                className="text-sm text-text-muted hover:text-primary-blue transition-colors"
              >
                ← Back to Site
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

