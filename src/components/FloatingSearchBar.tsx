import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MapPin, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SA_CITIES } from '../lib/constants';

const CATEGORIES = [
  { value: 'design', label: 'Design' },
  { value: 'writing', label: 'Writing' },
  { value: 'development', label: 'Development' },
  { value: 'tech', label: 'Tech & IT' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'consulting', label: 'Consulting' },
];

type Suggestion = { type: 'city' | 'category' | 'title'; label: string; value: string };

type FloatingSearchBarProps = {
  onSearch: (query: string) => void;
  placeholder?: string;
};

export function FloatingSearchBar({
  onSearch,
  placeholder = 'Search by keyword, city, or category...'
}: FloatingSearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        if (isExpanded && query === '') {
          setIsExpanded(false);
        }
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isExpanded) {
        setShowSuggestions(false);
        setQuery('');
        onSearch('');
        setIsExpanded(false);
      }
    };

    const handleSlashKey = (event: KeyboardEvent) => {
      if (event.key === '/' && !isExpanded && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault();
        setIsExpanded(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleSlashKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleSlashKey);
    };
  }, [isExpanded, query, onSearch]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    const lower = q.toLowerCase();

    const citySuggs = SA_CITIES
      .filter((c) => c.toLowerCase().includes(lower))
      .slice(0, 3)
      .map((c) => ({ type: 'city' as const, label: c, value: c }));

    const catSuggs = CATEGORIES
      .filter((c) => c.label.toLowerCase().includes(lower))
      .slice(0, 2)
      .map((c) => ({ type: 'category' as const, label: c.label, value: c.label }));

    const { data } = await supabase
      .from('public_notes_feed')
      .select('title')
      .not('title', 'is', null)
      .ilike('title', `%${q.replace(/[%_]/g, '')}%`)
      .limit(5);

    const titleSuggs = (data || [])
      .filter((n: { title: string | null }) => n.title)
      .map((n: { title: string }) => ({ type: 'title' as const, label: n.title, value: n.title }));

    setSuggestions([...citySuggs, ...catSuggs, ...titleSuggs]);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(query), 300);
    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (s: Suggestion) => {
    setQuery(s.value);
    onSearch(s.value);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    setSuggestions([]);
    setShowSuggestions(false);
    setIsExpanded(false);
  };

  return (
    <motion.div
      ref={containerRef}
      initial={false}
      animate={{ width: isExpanded ? '90%' : '40px' }}
      transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
      className="fixed z-20 md:max-w-[60%]"
      style={{
        top: isExpanded ? '80px' : '90px',
        left: isExpanded ? '50%' : 'auto',
        right: isExpanded ? 'auto' : '40px',
        transform: isExpanded ? 'translateX(-50%)' : 'none',
      }}
    >
      <motion.div
        className="flex items-center bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-md border border-gray-200 dark:border-gray-700 rounded-full transition-all duration-300"
        style={{ padding: isExpanded ? '0.5rem 1rem' : '0.5rem' }}
      >
        <button
          onClick={() => !isExpanded && setIsExpanded(true)}
          className="flex-shrink-0 focus:outline-none"
          aria-label="Search"
        >
          <Search
            className={`transition-colors duration-300 ${
              isExpanded
                ? 'text-gray-600 dark:text-gray-400 w-5 h-5'
                : 'text-gray-400 dark:text-gray-500 w-5 h-5 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          />
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center flex-1 ml-2"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={handleInputChange}
                onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setShowSuggestions(false); } }}
                autoComplete="off"
                className="w-full outline-none text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />

              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleClear}
                  className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors focus:outline-none"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Autocomplete dropdown — shown below the pill when expanded */}
      <AnimatePresence>
        {isExpanded && showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden"
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSuggestionClick(s)}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                {s.type === 'city' && <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                {s.type === 'category' && <Tag className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                {s.type === 'title' && <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                <span className="text-sm text-gray-800 dark:text-gray-200 flex-1 truncate">{s.label}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 capitalize flex-shrink-0">{s.type}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!isExpanded && (
        <div className="absolute top-full right-0 mt-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
          Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">/</kbd> to search
        </div>
      )}
    </motion.div>
  );
}
