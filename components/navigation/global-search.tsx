'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, FileText, Wrench, BookOpen, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchKnowledgeBase } from '@/app/actions/knowledge-base-actions';
import { createBrowserClient } from '@/lib/database/client';

interface SearchResult {
  id: string;
  type: 'procedure' | 'nca' | 'mjc';
  title: string;
  description: string;
  href: string;
  relevance?: number;
}

export function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close search when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus input when search opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const allResults: SearchResult[] = [];

      // 1. Search knowledge base (procedures)
      const kbResult = await searchKnowledgeBase(searchQuery, 3);
      if (kbResult.success && kbResult.data) {
        kbResult.data.forEach((proc) => {
          allResults.push({
            id: proc.procedure_number,
            type: 'procedure',
            title: proc.procedure_title,
            description: proc.content.substring(0, 100) + '...',
            href: `/procedures/${proc.procedure_number}`,
            relevance: proc.relevance_score,
          });
        });
      }

      // 2. Search NCAs
      const supabase = createBrowserClient();
      const { data: ncas } = await supabase
        .from('ncas')
        .select('id, nca_number, nc_description')
        .or(`nca_number.ilike.%${searchQuery}%,nc_description.ilike.%${searchQuery}%`)
        .limit(3);

      if (ncas) {
        ncas.forEach((nca: { id: string; nca_number: string; nc_description?: string }) => {
          allResults.push({
            id: nca.id,
            type: 'nca',
            title: nca.nca_number,
            description: nca.nc_description?.substring(0, 100) || '',
            href: `/nca/${nca.id}`,
          });
        });
      }

      // 3. Search MJCs
      const { data: mjcs } = await supabase
        .from('mjcs')
        .select('id, job_card_number, maintenance_description')
        .or(`job_card_number.ilike.%${searchQuery}%,maintenance_description.ilike.%${searchQuery}%`)
        .limit(3);

      if (mjcs) {
        mjcs.forEach((mjc: { id: string; job_card_number: string; maintenance_description?: string }) => {
          allResults.push({
            id: mjc.id,
            type: 'mjc',
            title: mjc.job_card_number,
            description: mjc.maintenance_description?.substring(0, 100) || '',
            href: `/mjc/${mjc.id}`,
          });
        });
      }

      // Sort by relevance if available
      allResults.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

      setResults(allResults.slice(0, 8)); // Limit to 8 results
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query) {
        performSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      setResults([]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      router.push(results[selectedIndex].href);
      setIsOpen(false);
      setQuery('');
      setResults([]);
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    router.push(result.href);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  // Get icon for result type
  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'procedure':
        return <BookOpen className="h-4 w-4" />;
      case 'nca':
        return <FileText className="h-4 w-4" />;
      case 'mjc':
        return <Wrench className="h-4 w-4" />;
    }
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-md mx-4 hidden md:block">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search procedures, NCAs, MJCs..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full mt-2 w-full bg-surface border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          {isSearching && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          )}

          {!isSearching && results.length === 0 && query.length >= 2 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No results found
            </div>
          )}

          {!isSearching && results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className={cn(
                    'w-full px-4 py-3 text-left hover:bg-accent transition-colors',
                    'flex items-start gap-3',
                    selectedIndex === index && 'bg-accent'
                  )}
                >
                  <div className="mt-0.5 text-muted-foreground">
                    {getResultIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{result.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {result.description}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 capitalize">
                      {result.type}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isSearching && query.length < 2 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Type at least 2 characters to search
            </div>
          )}
        </div>
      )}
    </div>
  );
}

