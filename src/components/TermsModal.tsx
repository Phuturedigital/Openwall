import { motion } from 'framer-motion';
import { X } from 'lucide-react';

type TermsModalProps = {
  onClose: () => void;
};

export function TermsModal({ onClose }: TermsModalProps) {
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
            Terms & Conditions
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
              Openwall – Terms & Conditions (Beta)
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: December 16, 2024
            </p>
          </div>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              1. About Openwall
            </h4>
            <p className="mb-2">
              Openwall is an online platform that allows individuals and businesses to post
              availability, requests, and connect with others for potential work or collaboration.
            </p>
            <p>
              Openwall is a connection platform only. We do not provide services, act as an
              employer, agent, broker, or representative for any user.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              2. Acceptance of These Terms
            </h4>
            <p className="mb-2">
              By accessing or using Openwall, you agree to these Terms & Conditions.
            </p>
            <p>If you do not agree, please do not use the platform.</p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              3. Beta Use
            </h4>
            <p className="mb-2">Openwall is currently operating in beta. This means:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Features may change, break, or be removed</li>
              <li>Availability and performance are not guaranteed</li>
              <li>The platform is provided "as is"</li>
              <li>We may update or suspend the platform at any time during beta.</li>
            </ul>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              4. User Responsibility
            </h4>
            <p className="mb-2">You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>The accuracy of information you post</li>
              <li>Any interactions, agreements, or work you enter into with other users</li>
              <li>Conducting your own due diligence before working with anyone</li>
            </ul>
            <p className="mb-2">Openwall does not:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Verify the quality of services</li>
              <li>Guarantee work, responses, or outcomes</li>
              <li>Endorse any user or post</li>
            </ul>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              5. No Employment or Agency Relationship
            </h4>
            <p className="mb-2">Using Openwall does not create:</p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>An employment relationship</li>
              <li>An agency relationship</li>
              <li>A partnership or joint venture</li>
            </ul>
            <p>All arrangements made through Openwall are strictly between users.</p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              6. Payments and Fees
            </h4>
            <p className="mb-2">During beta, Openwall is free to use.</p>
            <p className="mb-2">Openwall does not:</p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>Handle payments between users</li>
              <li>Guarantee payment for work</li>
              <li>Take responsibility for payment disputes</li>
            </ul>
            <p>
              Future paid features may be introduced, but this will be clearly communicated.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              7. Content and Conduct
            </h4>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>Post false, misleading, or harmful content</li>
              <li>Impersonate others</li>
              <li>Use Openwall for unlawful purposes</li>
              <li>Harass, spam, or abuse other users</li>
            </ul>
            <p>
              We reserve the right to remove content or suspend accounts at our discretion.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              8. Limitation of Liability
            </h4>
            <p className="mb-2">To the fullest extent permitted by law:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                Openwall is not liable for losses, damages, or disputes arising from user
                interactions
              </li>
              <li>Use of the platform is at your own risk</li>
            </ul>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              9. Privacy
            </h4>
            <p>
              Your use of Openwall is also governed by our Privacy Policy, which explains how we
              collect and use personal information in line with South African POPIA requirements.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              10. Changes to These Terms
            </h4>
            <p className="mb-2">We may update these Terms from time to time.</p>
            <p>Continued use of Openwall means you accept the updated Terms.</p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              11. Governing Law
            </h4>
            <p>These Terms are governed by the laws of the Republic of South Africa.</p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              12. Contact
            </h4>
            <p>
              For questions about these Terms, contact:{' '}
              <a
                href="mailto:hello@openwall.co.za"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                hello@openwall.co.za
              </a>
            </p>
          </section>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm italic text-gray-600 dark:text-gray-400 text-center">
              Openwall connects people — it does not manage relationships.
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
