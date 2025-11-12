'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Plus,
  FileText,
  TrendingUp,
  Wrench,
  LayoutDashboard,
  Users,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { useNavigation } from '@/lib/context/navigation-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';

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
      { title: 'NCA Trend Analysis', href: '/nca/trend-analysis', icon: TrendingUp },
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

export function DesktopSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, setSidebarCollapsed } = useNavigation();

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r bg-sidebar transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Sidebar Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!sidebarCollapsed && (
          <span className="font-semibold text-sm">Navigation</span>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="ml-auto"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <Icon name={ICONS.CHEVRON_RIGHT} size="sm" />
          ) : (
            <Icon name={ICONS.CHEVRON_LEFT} size="sm" />
          )}
        </Button>
      </div>

      {/* Navigation Content */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            {!sidebarCollapsed && (
              <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-smooth',
                        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-sm',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                          : 'text-sidebar-foreground',
                        sidebarCollapsed && 'justify-center px-2'
                      )}
                      title={sidebarCollapsed ? item.title : undefined}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Quick Actions (if not collapsed) */}
      {!sidebarCollapsed && (
        <div className="border-t p-4">
          <div className="space-y-2">
            <Button
              asChild
              className="w-full"
              size="sm"
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
            >
              <Link href="/mjc/new">
                <Icon name={ICONS.PLUS} size="sm" className="mr-2" />
                New MJC
              </Link>
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}

