import { motion } from 'framer-motion';
import { X } from 'lucide-react';

type PrivacyPolicyModalProps = {
  onClose: () => void;
};

export function PrivacyPolicyModal({ onClose }: PrivacyPolicyModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col relative shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Privacy Policy
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6 text-gray-700 dark:text-gray-300">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Openwall – Privacy Policy (Beta)
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: December 16, 2024
            </p>
          </div>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              1. Who We Are
            </h4>
            <p className="mb-2">
              Openwall is a digital platform owned and operated by Phuture Digital.
            </p>
            <p className="mb-2">
              This Privacy Policy explains how personal information is collected, used, stored, and
              protected when you use Openwall.
            </p>
            <p>
              Phuture Digital is committed to protecting your privacy in accordance with the
              Protection of Personal Information Act (POPIA) of South Africa.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              2. Information We Collect
            </h4>
            <p className="mb-2">
              When you use Openwall, we may collect the following personal information:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Name and surname</li>
              <li>Email address</li>
              <li>City, area, or location information</li>
              <li>Profile details you choose to provide</li>
              <li>Posts, requests, and messages created on the platform</li>
              <li>Basic usage data (such as page interactions)</li>
            </ul>
            <p className="mt-2">
              We only collect information that is necessary for Openwall to function.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              3. How We Use Your Information
            </h4>
            <p className="mb-2">We use your information to:</p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>Create and manage your account</li>
              <li>Display your profile and posts on Openwall</li>
              <li>Enable connections between users</li>
              <li>Improve platform functionality and usability</li>
              <li>Communicate important updates related to Openwall</li>
            </ul>
            <p>We do not sell your personal information.</p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              4. Sharing of Information
            </h4>
            <p className="mb-2">Your information may be visible to other users when you:</p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>Create a public profile</li>
              <li>Post availability or requests</li>
              <li>Choose to connect with another user</li>
            </ul>
            <p className="mb-2">
              Phuture Digital does not share your personal information with third parties for
              marketing purposes.
            </p>
            <p>We may disclose information if required by law.</p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              5. Data Storage and Security
            </h4>
            <p className="mb-2">
              Phuture Digital takes reasonable steps to protect your personal information against
              loss, misuse, unauthorised access, or disclosure.
            </p>
            <p>
              While we use appropriate security measures, no digital platform can guarantee absolute
              security.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              6. User Responsibility
            </h4>
            <p className="mb-2">You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>The information you choose to share publicly</li>
              <li>Keeping your login details secure</li>
              <li>Ensuring that your interactions with other users are safe and lawful</li>
            </ul>
            <p>Openwall cannot control what other users do with information you choose to share.</p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              7. Cookies and Tracking
            </h4>
            <p className="mb-2">
              Openwall may use basic cookies or similar technologies to:
            </p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>Maintain session functionality</li>
              <li>Improve user experience</li>
            </ul>
            <p>We do not use cookies for advertising or behavioural tracking during beta.</p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              8. Your Rights Under POPIA
            </h4>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>Access the personal information we hold about you</li>
              <li>Request correction or deletion of your information</li>
              <li>Withdraw consent where applicable</li>
            </ul>
            <p>You may exercise these rights by contacting us.</p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              9. Beta Disclaimer
            </h4>
            <p className="mb-2">Openwall is currently in beta.</p>
            <p className="mb-2">During beta:</p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>Features and data handling processes may change</li>
              <li>Some functionality may be temporary or experimental</li>
            </ul>
            <p>We will continue to take reasonable steps to protect your information.</p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              10. Changes to This Privacy Policy
            </h4>
            <p className="mb-2">
              Phuture Digital may update this Privacy Policy from time to time.
            </p>
            <p>Continued use of Openwall after changes means you accept the updated policy.</p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              11. Contact Us
            </h4>
            <p>
              If you have questions about this Privacy Policy or how your data is handled, contact:
            </p>
            <p className="mt-2">
              <a
                href="mailto:hello@phuturedigital.co.za"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                hello@phuturedigital.co.za
              </a>
            </p>
          </section>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm italic text-gray-600 dark:text-gray-400 text-center">
              Your privacy matters — we protect your information and respect your rights under POPIA.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
