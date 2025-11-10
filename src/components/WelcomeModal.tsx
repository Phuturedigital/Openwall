import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, MessageSquare, CheckCircle, ExternalLink } from 'lucide-react';

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

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleContinue();
      }
    };

    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTab);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
    };
  }, [isOpen]);

  const steps = [
    {
      id: 1,
      icon: FileText,
      title: 'Post a Note',
      description: 'Write what you need in a few lines. Add your budget and optional files for context.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 2,
      icon: MessageSquare,
      title: 'Receive Requests',
      description: 'Freelancers can request to connect. Review them and choose who can unlock your contact.',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      id: 3,
      icon: CheckCircle,
      title: 'Fulfil or Close',
      description: 'Once your need is met, mark it as fulfilled. It moves automatically to Past Notes for tracking.',
      color: 'from-green-500 to-green-600'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
          onClick={handleContinue}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-[640px] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div className="relative">
              <div
                className="h-1 rounded-t-3xl"
                style={{
                  background: 'linear-gradient(90deg, #4B6FFF 0%, #6A00FF 100%)'
                }}
              />

              <div className="px-6 py-8 md:px-10 md:py-10">
                <div className="text-center mb-8">
                  <h2
                    id="welcome-title"
                    className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2"
                  >
                    Welcome to Openwall <span className="text-gray-400 dark:text-gray-500 text-xl">(Beta)</span>
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base font-medium max-w-md mx-auto">
                    A simple space where people post what they need and freelancers find real opportunities.
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className="text-center text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-6">
                    How It Works
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4">
                    {steps.map((step, index) => {
                      const Icon = step.icon;
                      return (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 + 0.3 }}
                          className="flex flex-col items-center text-center"
                          aria-labelledby={`step-title-${step.id}`}
                        >
                          <div className="relative mb-4">
                            <div
                              className="absolute inset-0 blur-xl opacity-30"
                              style={{
                                background: `linear-gradient(135deg, ${step.color.split(' ')[0].replace('from-', '')} 0%, ${step.color.split(' ')[1].replace('to-', '')} 100%)`
                              }}
                            />
                            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg"
                              style={{
                                background: `linear-gradient(135deg, ${step.id === 1 ? '#4B6FFF' : step.id === 2 ? '#5B4FFF' : '#10B981'} 0%, ${step.id === 1 ? '#6A00FF' : step.id === 2 ? '#6A00FF' : '#059669'} 100%)`
                              }}
                            >
                              <Icon className="w-10 h-10 text-white" strokeWidth={2} aria-hidden="true" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-md flex items-center justify-center border-2 border-gray-100 dark:border-gray-700">
                              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                {step.id}
                              </span>
                            </div>
                          </div>

                          <h4
                            id={`step-title-${step.id}`}
                            className="text-lg font-bold text-gray-900 dark:text-white mb-2"
                          >
                            {step.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {step.description}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 mb-6">
                    <p className="text-sm text-gray-700 dark:text-gray-300 text-center leading-relaxed">
                      During beta, everything on the wall is free to use. Future versions will include a small unlock fee to keep the system fair and sustainable.
                    </p>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleContinue}
                    className="w-full md:w-auto md:mx-auto md:block md:px-16 py-4 text-white rounded-2xl font-bold text-base shadow-lg transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #4B6FFF 0%, #6A00FF 100%)',
                      boxShadow: '0 10px 25px -5px rgba(75, 111, 255, 0.4)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(75, 111, 255, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(75, 111, 255, 0.4)';
                    }}
                    aria-label="Continue to Openwall main application"
                  >
                    Continue to Openwall
                  </motion.button>

                  <div className="text-center mt-4">
                    <a
                      href="https://phuturedigital.co.za"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 inline-flex items-center gap-1 transition-colors font-medium"
                    >
                      Learn more
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
