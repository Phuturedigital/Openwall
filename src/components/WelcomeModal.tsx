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
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 h-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-t-2xl" />

            <div className="overflow-y-auto flex-1">
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-6">
                  <Logo className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  <h2
                    id="welcome-title"
                    className="text-3xl font-bold text-gray-900 dark:text-white"
                  >
                    Welcome to Openwall
                  </h2>
                  <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
                    BETA
                  </span>
                </div>

                <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                  <p className="text-lg">
                    <strong className="text-gray-900 dark:text-white">Openwall</strong> connects clients with service providers, instantly and transparently.
                  </p>

                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 my-6">
                    <h3 className="text-blue-900 dark:text-blue-200 font-semibold mb-3">
                      How it works:
                    </h3>
                    <ul className="space-y-2 text-blue-800 dark:text-blue-300 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">1.</span>
                        <span><strong>Clients post needs</strong> on the wall with their budget</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">2.</span>
                        <span><strong>Providers request to connect</strong> to show interest</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">3.</span>
                        <span><strong>Clients approve</strong> the best matches</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">4.</span>
                        <span><strong>Unlock contact details</strong> to connect directly</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5">
                    <p className="text-green-800 dark:text-green-200 font-medium mb-2">
                      Everything is free during beta
                    </p>
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      No payments required yet. Browse, connect, and explore freely while we build something great together.
                    </p>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Built by{' '}
                    <a
                      href="https://phuturedigital.co.za"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1 transition-colors"
                    >
                      Phuture Digital
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    , bringing opportunities closer to freelancers and small businesses.
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
                  className="w-full mt-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold text-lg shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all"
                >
                  Get Started
                </motion.button>
              </div>

                <div className="px-8 pb-6 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Powered by{' '}
                    <a
                      href="https://phuturedigital.co.za"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
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
