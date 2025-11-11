'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Home, FileText, Wrench, LayoutDashboard } from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const navItems: NavItem[] = [
  { title: 'Home', href: '/', icon: Home },
  { title: 'NCAs', href: '/nca/register', icon: FileText },
  { title: 'MJCs', href: '/mjc/register', icon: Wrench },
  { title: 'Dashboard', href: '/dashboard/management', icon: LayoutDashboard },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-surface lg:hidden">
      <div className="flex h-16 items-center justify-around safe-area-inset-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[44px]',
                'transition-smooth touch-manipulation active:scale-95',
                isActive
                  ? 'text-primary-600'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={item.title}
            >
              <div className="relative">
                <Icon className="h-6 w-6" />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.title}</span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

