'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Plus,
  FileText,
  Wrench,
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { useNavigation } from '@/lib/context/navigation-context';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';
import { Button } from '@/components/ui/button';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Main',
    items: [
      { title: 'Home', href: '/', icon: Home },
    ],
  },
  {
    title: 'Non-Conformance',
    items: [
      { title: 'New NCA', href: '/nca/new', icon: Plus },
      { title: 'NCA Register', href: '/nca/register', icon: FileText },
    ],
  },
  {
    title: 'Maintenance',
    items: [
      { title: 'New MJC', href: '/mjc/new', icon: Plus },
      { title: 'MJC Register', href: '/mjc/register', icon: Wrench },
    ],
  },
  {
    title: 'Dashboards',
    items: [
      { title: 'Management', href: '/dashboard/management', icon: LayoutDashboard },
      { title: 'Production', href: '/dashboard/production', icon: LayoutDashboard },
      { title: 'Supplier Performance', href: '/dashboard/suppliers', icon: Users },
    ],
  },
  {
    title: 'Operations',
    items: [
      { title: 'End of Day', href: '/end-of-day', icon: Calendar },
    ],
  },
  {
    title: 'Quality & Compliance',
    items: [
      { title: 'Complaints', href: '/complaints', icon: MessageSquare },
      { title: 'Recalls', href: '/recalls', icon: AlertTriangle },
      { title: 'Waste Manifests', href: '/waste', icon: Trash2 },
    ],
  },
];

export function MobileDrawer() {
  const pathname = usePathname();
  const { mobileDrawerOpen, setMobileDrawerOpen } = useNavigation();

  // Close drawer when clicking outside or on a link
  const handleLinkClick = () => {
    setMobileDrawerOpen(false);
  };

  // Close on escape key
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileDrawerOpen) {
        setMobileDrawerOpen(false);
      }
    });
  }

  if (!mobileDrawerOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        onClick={() => setMobileDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-80 bg-sidebar border-r shadow-xl',
          'transform transition-transform duration-300 ease-in-out',
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:hidden'
        )}
      >
        {/* Drawer Header */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          <span className="font-semibold text-sm">Menu</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Close menu"
          >
            <Icon name={ICONS.CLOSE} size="md" />
          </Button>
        </div>

        {/* Navigation Content */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href  }/`);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={handleLinkClick}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground'
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {item.badge ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                            {item.badge}
                          </span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Quick Actions */}
        <div className="border-t p-4 space-y-2">
          <Button
            asChild
            className="w-full"
            size="sm"
            onClick={handleLinkClick}
          >
            <Link href="/nca/new">
              <Icon name={ICONS.PLUS} size="sm" className="mr-2" />
              New NCA
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full"
            size="sm"
            onClick={handleLinkClick}
          >
            <Link href="/mjc/new">
              <Icon name={ICONS.PLUS} size="sm" className="mr-2" />
              New MJC
            </Link>
          </Button>
        </div>
      </aside>
    </>
  );
}

