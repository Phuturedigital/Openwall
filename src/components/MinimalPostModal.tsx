import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload } from 'lucide-react';
import { supabase, FileAttachment } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type MinimalPostModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

export function MinimalPostModal({ onClose, onSuccess }: MinimalPostModalProps) {
  const { profile } = useAuth();
  const [body, setBody] = useState('');
  const [budget, setBudget] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(
        (file) =>
          (file.type === 'application/pdf' ||
            file.type === 'application/msword' ||
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') &&
          file.size <= 10 * 1024 * 1024
      );

      if (newFiles.length !== e.target.files.length) {
        setError('Some files were skipped. Only PDF and DOCX files under 10MB are allowed.');
      }

      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<FileAttachment[]> => {
    if (files.length === 0) return [];

    const uploaded: FileAttachment[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${profile!.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      uploaded.push({
        name: file.name,
        url: publicUrl,
        type: file.type,
        size: file.size,
      });
    }

    return uploaded;
  };

  const handleSubmit = async (e: React.FormEvent, postType: 'free' | 'priority') => {
    e.preventDefault();

    if (!profile || !body.trim()) {
      setError('Please describe what you need');
      return;
    }

    if (!budget || !budget.trim()) {
      setError('Budget is required');
      return;
    }

    const emailToUse = email.trim() || profile.email;
    if (!emailToUse) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const attachments = await uploadFiles();

      const budgetInCents = parseInt(budget.replace(/\D/g, '')) * 100;

      if (isNaN(budgetInCents) || budgetInCents <= 0) {
        setError('Please enter a valid budget amount');
        setLoading(false);
        return;
      }

      const contactInfo = {
        email: emailToUse,
        phone: phone.trim() || profile.phone || undefined,
      };

      const { error: insertError } = await supabase.from('notes').insert({
        user_id: profile.id,
        body: body.trim(),
        budget: budgetInCents,
        city: city.trim() || null,
        contact: contactInfo,
        files: attachments,
        prio: postType === 'priority',
        color: '#FEF3C7',
      });

      if (insertError) {
        console.error('Insert error details:', insertError);
        throw insertError;
      }

      if (postType === 'priority') {
        const { error: transactionError } = await supabase.from('transactions').insert({
          user_id: profile.id,
          amount: 1000,
          kind: 'prio',
          status: 'paid',
        });

        if (transactionError) {
          console.error('Transaction error:', transactionError);
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || err.hint || 'Failed to create note. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-8 py-6 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Post a Note</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What do you need? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe your need in detail..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF] transition-all resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget (Rands) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g., 2000"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF] transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Cape Town"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF] transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={profile?.email || 'your@email.com'}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF] transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+27 82 123 4567"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF] transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Attachments (PDF, DOCX)
              </label>
              <div className="space-y-3">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-red-500 hover:text-red-600 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-[#635BFF] transition-colors cursor-pointer">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Add files</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => handleSubmit(e, 'free')}
                disabled={loading}
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Posting...' : 'Post Free'}
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => handleSubmit(e, 'priority')}
                disabled={loading}
                className="flex-1 py-4 bg-gradient-to-r from-[#635BFF] to-[#7C3AED] text-white rounded-xl font-semibold shadow-lg shadow-[#635BFF]/20 hover:shadow-[#635BFF]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Posting...' : 'Priority Post – R10'}
              </motion.button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Priority posts get a subtle gradient border and appear at the top for 48 hours
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
