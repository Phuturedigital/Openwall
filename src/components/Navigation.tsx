import { motion } from 'framer-motion';
import { LayoutGrid, Plus, FileText, CreditCard, User, Menu, X, Moon, Sun, Archive } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type NavigationProps = {
  currentView: string;
  onViewChange: (view: string) => void;
  onPostClick: () => void;
  onSignIn: () => void;
};

export function Navigation({ currentView, onViewChange, onPostClick, onSignIn }: NavigationProps) {
  const { user, profile, signOut } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasPastNotes, setHasPastNotes] = useState(false);

  useEffect(() => {
    if (profile && (profile.user_type === 'client' || profile.user_type === 'hybrid')) {
      checkForPastNotes();
    }
  }, [profile]);

  async function checkForPastNotes() {
    if (!profile) return;

    const { data, error } = await supabase
      .from('notes')
      .select('id')
      .eq('user_id', profile.id)
      .eq('status', 'fulfilled')
      .limit(1);

    if (!error && data && data.length > 0) {
      setHasPastNotes(true);
    }
  }

  const navItems = [
    { id: 'wall', label: 'Wall', icon: LayoutGrid, ariaLabel: 'Go to Wall' },
  ];

  if (profile && (profile.user_type === 'client' || profile.user_type === 'hybrid')) {
    navItems.push({
      id: 'my-notes',
      label: 'My Notes',
      icon: FileText,
      ariaLabel: 'View My Notes'
    });

    if (hasPastNotes) {
      navItems.push({
        id: 'past-notes',
        label: 'Past Notes',
        icon: Archive,
        ariaLabel: 'View Past Notes (fulfilled)'
      });
    }
  }

  navItems.push(
    { id: 'payments', label: 'Payments', icon: CreditCard, ariaLabel: 'View Payments' },
    { id: 'profile', label: 'Profile', icon: User, ariaLabel: 'Open Profile Menu' }
  );

  return (
    <nav role="navigation" className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Openwall</h1>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    aria-label={item.ariaLabel}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      <span className="text-sm font-medium uppercase">{item.label}</span>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleDarkMode}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title="Switch theme — your preference will be saved"
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
            </motion.button>

            {user ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onPostClick}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span>Post a Note</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={signOut}
                  className="hidden md:block px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
                >
                  Sign Out
                </motion.button>
              </>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSignIn}
                className="hidden md:block px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                Sign In
              </motion.button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden py-4 border-t border-gray-100 dark:border-gray-800"
          >
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    aria-label={item.ariaLabel}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}

              {user ? (
                <>
                  <button
                    onClick={() => {
                      onPostClick();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Post a Note</span>
                  </button>

                  <button
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium"
                  >
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onSignIn();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium"
                >
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}
