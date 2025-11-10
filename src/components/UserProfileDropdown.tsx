import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, FileText, Clock, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type UserProfileDropdownProps = {
  onViewChange: (view: string) => void;
  onSignOut: () => void;
};

export function UserProfileDropdown({ onViewChange, onSignOut }: UserProfileDropdownProps) {
  const { user, profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (!user || !profile) return null;

  const getUserRole = () => {
    if (!profile.user_type) return 'Freelancer';
    if (profile.user_type === 'client') return 'Poster';
    if (profile.user_type === 'vendor') return 'Provider';
    return 'Dual Role';
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    await signOut();
    setIsOpen(false);
    onSignOut();
  };

  const handleNavigation = (view: string) => {
    setIsOpen(false);
    onViewChange(view);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        aria-label="Open user menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
          {getInitials(profile.full_name || user.email || '')}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50"
            role="menu"
            aria-orientation="vertical"
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {getInitials(profile.full_name || user.email || '')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {profile.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {profile.skills && profile.skills.length > 0
                      ? profile.skills.slice(0, 2).join(', ')
                      : getUserRole()}
                  </p>
                </div>
              </div>
              {profile.bio && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {profile.bio}
                </p>
              )}
            </div>

            <div className="py-2">
              <button
                onClick={() => handleNavigation('profile')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                role="menuitem"
              >
                <User className="w-4 h-4" aria-hidden="true" />
                <span className="font-medium">Profile</span>
              </button>

              {(profile.user_type === 'client' || profile.user_type === 'hybrid') && (
                <button
                  onClick={() => handleNavigation('my-notes')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                  role="menuitem"
                >
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  <span className="font-medium">My Notes</span>
                </button>
              )}

              <button
                onClick={() => handleNavigation('past-notes')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                role="menuitem"
              >
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span className="font-medium">Past Notes</span>
              </button>

              <button
                onClick={() => handleNavigation('settings')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                role="menuitem"
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
                <span className="font-medium">Settings</span>
              </button>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 p-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                role="menuitem"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span className="font-medium">Log out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
