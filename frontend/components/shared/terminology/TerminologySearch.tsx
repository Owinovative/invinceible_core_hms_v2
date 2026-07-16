'use client';

import React, { useState, useEffect, useRef } from 'react';
import { terminologyService, TerminologyConcept } from '@/services/terminology.service';
import { Search, Loader2, X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

export interface TerminologySearchProps {
  value?: TerminologyConcept | null;
  onChange: (concept: TerminologyConcept | null) => void;
  system?: string;
  conceptClass?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function TerminologySearch({
  value,
  onChange,
  system,
  conceptClass,
  placeholder = 'Search clinical concepts...',
  className = '',
  disabled = false,
}: TerminologySearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TerminologyConcept[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const data = await terminologyService.searchLocalConcepts({
          q: debouncedQuery,
          system,
          conceptClass,
          limit: 20,
        });
        setResults(data || []);
      } catch (error) {
        console.error('Failed to search terminology concepts', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery, system, conceptClass]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (concept: TerminologyConcept) => {
    onChange(concept);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {value ? (
        <div 
          className="flex cursor-pointer items-center justify-between rounded-md border bg-surface-2 p-2"
          onClick={() => !disabled && setIsOpen(true)}
        >
          <div className="flex flex-col flex-1 truncate mr-2">
            <span className="text-sm font-medium truncate">{value.display}</span>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{value.code}</span>
              <span className="truncate">{value.system}</span>
            </div>
          </div>
          {!disabled && (
            <button 
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full pl-9 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed text-sm"
          />
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
            </div>
          )}
        </div>
      )}

      {isOpen && !value && (query.length >= 2 || results.length > 0) && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-lg">
          {results.length > 0 ? (
            <ul className="py-1">
              {results.map((concept) => (
                <li
                  key={concept.id}
                  onClick={() => handleSelect(concept)}
                  className="px-3 py-2 cursor-pointer hover:bg-slate-100 flex flex-col group"
                >
                  <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                    {concept.display}
                  </span>
                  <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono bg-slate-100 group-hover:bg-slate-200 px-1.5 py-0.5 rounded">
                      {concept.code}
                    </span>
                    <span className="truncate ml-2">{concept.system}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            !isLoading && query.length >= 2 && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No concepts found for &quot;{query}&quot;
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
