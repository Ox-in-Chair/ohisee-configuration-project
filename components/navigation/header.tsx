'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useNavigation } from '@/lib/context/navigation-context';
import { Button } from '@/components/ui/button';
import { Menu, X, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlobalSearch } from './global-search';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { setMobileDrawerOpen, mobileDrawerOpen } = useNavigation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-surface',
        className
      )}
    >
      <div className="flex h-14 items-center px-4 lg:px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          aria-label="Toggle menu"
        >
          {mobileDrawerOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-lg ml-2 lg:ml-0"
        >
          <span className="text-primary-600">OHiSee</span>
        </Link>

        {/* Global Search */}
        <GlobalSearch />

        {/* Spacer */}
        <div className="flex-1" />

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-label="User menu"
            aria-expanded={userMenuOpen}
            className="rounded-full"
          >
            <User className="h-5 w-5" />
          </Button>

          {/* User dropdown (simplified for now) */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-md border bg-surface shadow-lg z-50">
              <div className="p-2">
                <div className="px-2 py-1.5 text-sm font-medium">Current User</div>
                <div className="px-2 py-1 text-xs text-muted-foreground">Operator</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

