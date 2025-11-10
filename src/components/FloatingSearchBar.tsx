import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';

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
        if (isExpanded && query === '') {
          setIsExpanded(false);
        }
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isExpanded) {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    setIsExpanded(false);
  };

  return (
    <motion.div
      ref={containerRef}
      initial={false}
      animate={{
        width: isExpanded ? '90%' : '40px',
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1],
      }}
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
        style={{
          padding: isExpanded ? '0.5rem 1rem' : '0.5rem',
        }}
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

      {!isExpanded && (
        <div className="absolute top-full right-0 mt-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
          Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">/</kbd> to search
        </div>
      )}
    </motion.div>
  );
}
