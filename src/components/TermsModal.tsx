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
              Openwall is a digital platform owned and operated by Phuture Digital.
            </p>
            <p className="mb-2">
              Openwall allows individuals and businesses to post availability, post requests, and
              connect with others for potential work or collaboration.
            </p>
            <p>
              Openwall is a connection platform only. Neither Openwall nor Phuture Digital provides
              services, acts as an employer, agent, broker, or representative for any user.
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
            <p className="mb-2">Openwall is currently operating in beta.</p>
            <p className="mb-2">This means:</p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>Features may change, break, or be removed without notice</li>
              <li>Platform availability and performance are not guaranteed</li>
              <li>The platform is provided "as is"</li>
            </ul>
            <p>
              Phuture Digital reserves the right to modify, suspend, or discontinue Openwall at any
              time during beta.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              4. User Responsibility
            </h4>
            <p className="mb-2">You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>The accuracy of all information you post</li>
              <li>Your interactions, agreements, and communications with other users</li>
              <li>Conducting your own due diligence before engaging in any work or collaboration</li>
            </ul>
            <p className="mb-2">Neither Openwall nor Phuture Digital:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Verifies the quality, legality, or suitability of services offered</li>
              <li>Guarantees work, responses, payments, or outcomes</li>
              <li>Endorses any user, service, or request</li>
            </ul>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              5. No Employment, Agency, or Partnership
            </h4>
            <p className="mb-2">Use of Openwall does not create:</p>
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
            <p className="mb-2">Neither Openwall nor Phuture Digital:</p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>Processes or manages payments between users</li>
              <li>Guarantees payment for work performed</li>
              <li>Takes responsibility for payment disputes</li>
            </ul>
            <p>
              Paid features may be introduced in the future, but this will be clearly communicated.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              7. Content and Conduct
            </h4>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>Post false, misleading, harmful, or unlawful content</li>
              <li>Impersonate any person or entity</li>
              <li>Harass, abuse, spam, or exploit other users</li>
              <li>Use Openwall for illegal purposes</li>
            </ul>
            <p>
              Phuture Digital reserves the right to remove content, restrict access, or suspend
              accounts at its discretion.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              8. Limitation of Liability
            </h4>
            <p className="mb-2">To the fullest extent permitted by law:</p>
            <p className="mb-2">Neither Openwall nor Phuture Digital will be liable for:</p>
            <ul className="list-disc pl-6 space-y-1 mb-3">
              <li>Any loss, damage, or dispute arising from user interactions</li>
              <li>Any reliance placed on information posted by users</li>
            </ul>
            <p>Use of Openwall is entirely at your own risk.</p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              9. Privacy
            </h4>
            <p>
              Your use of Openwall is also governed by the Privacy Policy, which explains how
              personal information is collected and processed in accordance with the Protection of
              Personal Information Act (POPIA) of South Africa.
            </p>
          </section>

          <section>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              10. Changes to These Terms
            </h4>
            <p className="mb-2">Phuture Digital may update these Terms from time to time.</p>
            <p>Continued use of Openwall after changes means you accept the updated Terms.</p>
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
            <p className="mb-2">For questions about Openwall or these Terms, contact:</p>
            <p>
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
