import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { TermsModal } from './TermsModal';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

export function Footer() {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    const handleOpenTerms = () => setShowTerms(true);
    const handleOpenPrivacy = () => setShowPrivacy(true);
    window.addEventListener('openTerms', handleOpenTerms);
    window.addEventListener('openPrivacy', handleOpenPrivacy);
    return () => {
      window.removeEventListener('openTerms', handleOpenTerms);
      window.removeEventListener('openPrivacy', handleOpenPrivacy);
    };
  }, []);

  return (
    <>
      <footer className="text-center text-[11px] text-gray-500 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <p className="mb-2 text-blue-600 dark:text-blue-400 font-medium">
          Openwall is currently in beta — All features are free to use
        </p>
        <p>
          © 2025 <span className="font-medium text-gray-700 dark:text-gray-300">Openwall</span> — by{' '}
          <a
            href="https://www.phuturedigital.co.za"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
          >
            Phuture Digital
          </a>
          .
        </p>
        <p className="mt-2 text-gray-400 dark:text-gray-500">
          <button
            onClick={() => setShowTerms(true)}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer underline"
          >
            Terms & Conditions
          </button>
          {' · '}
          <button
            onClick={() => setShowPrivacy(true)}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer underline"
          >
            Privacy Policy
          </button>
        </p>
        <p className="mt-1 text-gray-400 dark:text-gray-500">
          Powered by{' '}
          <span className="font-medium text-gray-600 dark:text-gray-400">Phuture Digital</span>
        </p>
      </footer>

      <AnimatePresence>
        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
        {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
      </AnimatePresence>
    </>
  );
}
