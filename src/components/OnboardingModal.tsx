import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, MessageCircle, CheckCircle2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Logo } from './Logo';

type OnboardingModalProps = {
  onComplete?: () => void;
};

const steps = [
  {
    number: 1,
    icon: StickyNote,
    title: 'Find work or get help locally',
    description: 'Openwall helps real people connect with real help nearby. No algorithms. No bidding. Just local requests and available skills.',
  },
  {
    number: 2,
    icon: MessageCircle,
    title: 'Post or explore in one minute',
    description: 'If you need help, post what you\'re looking for. If you offer a service, post what you can help with. You\'re always in control of who you connect with.',
  },
  {
    number: 3,
    icon: CheckCircle2,
    title: 'Connect directly when it\'s a good match',
    description: 'When both sides agree, you can unlock contact details and collaborate directly. During beta, everything is free to use.',
  },
];

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step]);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = () => {
    setIsOpen(false);

    if (onComplete) {
      onComplete();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const currentStep = steps[step - 1];
  const Icon = currentStep.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-gray-800 rounded-[20px] shadow-2xl w-full max-w-[600px] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative p-8">
            <button
              onClick={handleClose}
              aria-label="Close onboarding"
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Logo className="w-10 h-10 text-black dark:text-white" />
              </div>
              <h2 id="welcome-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to Openwall
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Connect clients with service providers, instantly and transparently.
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center py-8"
              >
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-black dark:bg-white flex items-center justify-center shadow-lg">
                    <Icon className="w-10 h-10 text-white dark:text-black" strokeWidth={2} />
                  </div>
                </div>

                <div className="mb-2">
                  <span
                    className="text-sm font-medium text-black dark:text-white"
                    aria-label={`Step ${step} of 3`}
                  >
                    Step {step} of 3
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {currentStep.title}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
                  {currentStep.description}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between mt-8">
              <div className="flex gap-2">
                {steps.map((s, idx) => (
                  <div
                    key={s.number}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      idx + 1 === step
                        ? 'bg-black dark:bg-white w-8'
                        : idx + 1 < step
                        ? 'bg-gray-500 dark:bg-gray-400'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    aria-label={`Step ${s.number}${idx + 1 === step ? ' (current)' : idx + 1 < step ? ' (completed)' : ''}`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                {step > 1 && (
                  <button
                    onClick={handleBack}
                    aria-label="Previous step"
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1 font-medium"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                )}

                <button
                  onClick={handleNext}
                  aria-label={step === 3 ? 'Post your first note' : 'Next step'}
                  className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-md hover:shadow-lg font-medium flex items-center gap-1"
                >
                  {step === 3 ? 'Post your first note' : 'Next'}
                  {step < 3 && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-500">
                During beta, all features are free to use.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                Powered by{' '}
                <a
                  href="https://www.phuturedigital.co.za"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                >
                  Phuture Digital
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
