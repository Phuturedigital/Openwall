import { motion } from 'framer-motion';
import { LayoutGrid, Plus, CreditCard, Menu, X, Moon, Sun, Clock, Inbox } from 'lucide-react';
import { useState } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';
import { UserProfileDropdown } from './UserProfileDropdown';
import { NotificationBell } from './NotificationBell';

type NavigationProps = {
  currentView: string;
  onViewChange: (view: string) => void;
  onPostClick: () => void;
  onSignIn: () => void;
  onLogout?: () => void;
};

export function Navigation({ currentView, onViewChange, onPostClick, onSignIn, onLogout }: NavigationProps) {
  const { user, profile, signOut } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  const navItems = [
    { id: 'wall', label: 'Wall', icon: LayoutGrid, ariaLabel: 'Go to Wall' },
    { id: 'recent-notes', label: 'Recent Notes', icon: Clock, ariaLabel: 'View Recent Notes' },
  ];

  if (profile) {
    navItems.push(
      { id: 'requests', label: 'Requests', icon: Inbox, ariaLabel: 'View Requests' }
    );
  }

  return (
    <nav role="navigation" className="sticky top-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8 flex-1">
            <div className="flex items-center gap-3">
              <Logo className="w-8 h-8 text-black dark:text-white" />
              <h1 className="text-xl font-bold text-black dark:text-white">Openwall</h1>
            </div>

            <div className="hidden md:flex items-center gap-1 ml-auto">
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
                        ? 'text-black dark:text-white font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      <span className="text-sm font-medium uppercase">{item.label}</span>
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white"
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
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
            </motion.button>

            {user ? (
              <>
                <div className="hidden md:block">
                  <NotificationBell onViewChange={onViewChange} />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onPostClick}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium shadow-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span>Post a Note</span>
                </motion.button>

                <div className="hidden md:block">
                  <UserProfileDropdown
                    onViewChange={onViewChange}
                    onSignOut={() => {
                      if (onLogout) onLogout();
                    }}
                  />
                </div>
              </>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSignIn}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                <span>Sign In / Create account</span>
              </motion.button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg"
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
            className="md:hidden py-4 border-t border-gray-200 dark:border-gray-900"
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
                        ? 'bg-gray-100 dark:bg-gray-900 text-black dark:text-white font-semibold'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}

              <button
                onClick={() => {
                  onPostClick();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>Post a Note</span>
              </button>

              {user && profile && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-900 my-2 pt-2">
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Account
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      await signOut();
                      setMobileMenuOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium cursor-pointer"
                    aria-label="Sign out"
                  >
                    <span>Log out</span>
                  </button>
                </>
              )}

              {!user && (
                <button
                  onClick={() => {
                    onSignIn();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium"
                >
                  <span>Sign In / Create account</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}
