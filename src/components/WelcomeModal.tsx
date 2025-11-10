import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { Logo } from './Logo';

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('openwall_welcome_seen');
    if (!hasSeenWelcome) {
      setTimeout(() => setIsOpen(true), 500);
    }
  }, []);

  const handleContinue = () => {
    localStorage.setItem('openwall_welcome_seen', 'true');
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <div className="h-2 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-t-2xl" />

              <div className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-6">
                  <Logo className="w-10 h-10 text-gray-900 dark:text-white" />
                  <h2
                    id="welcome-title"
                    className="text-3xl font-bold text-gray-900 dark:text-white"
                  >
                    Welcome to Openwall
                  </h2>
                  <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-full">
                    BETA
                  </span>
                </div>

                <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                  <p>
                    <strong className="text-gray-900 dark:text-white">Openwall</strong> is an early-stage platform designed to connect real people with real opportunities.
                  </p>

                  <p>
                    Built by{' '}
                    <a
                      href="https://phuturedigital.co.za"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium inline-flex items-center gap-1 transition-colors"
                    >
                      Phuture Digital
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    , a liquid creative agency focused on bringing opportunity closer to freelancers and small businesses.
                  </p>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5 my-6">
                    <p className="text-green-800 dark:text-green-200 font-medium mb-2">
                      🎉 Everything is free during beta
                    </p>
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      During this beta phase, everything on the wall is completely free to access — no paywalls yet.
                    </p>
                  </div>

                  <p>
                    In the future, leads will include a small <strong className="text-gray-900 dark:text-white">R15 unlock fee</strong> to keep the platform fair, spam-free, and sustainable.
                  </p>

                  <p className="text-gray-600 dark:text-gray-400 italic">
                    Thanks for being part of our early journey — your feedback helps us shape something built for you.
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
                  className="w-full mt-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold text-lg shadow-lg shadow-purple-600/20 hover:shadow-purple-600/30 transition-all"
                >
                  Continue to Openwall
                </motion.button>
              </div>

              <div className="px-8 pb-6 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Powered by{' '}
                  <a
                    href="https://phuturedigital.co.za"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
                  >
                    Phuture Digital
                  </a>{' '}
                  · © 2025 All Rights Reserved
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
