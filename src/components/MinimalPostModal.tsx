import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Upload } from 'lucide-react';
import { supabase, FileAttachment } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SA_CITIES } from '../lib/constants';

type MinimalPostModalProps = {
  onClose: () => void;
  onSuccess: (city: string) => void;
};

function detectCategory(text: string): string {
  const lowerText = text.toLowerCase();
  if (lowerText.match(/logo|brand|design|graphic|ui|ux|figma|photoshop|illustrator/)) return 'design';
  if (lowerText.match(/write|content|copy|blog|article|editor|proof/)) return 'writing';
  if (lowerText.match(/code|develop|program|software|app|website|backend|frontend|full.?stack/)) return 'development';
  if (lowerText.match(/tech|it|support|computer|network|system|server/)) return 'tech';
  if (lowerText.match(/market|social.?media|seo|ads|campaign|brand|promotion/)) return 'marketing';
  if (lowerText.match(/consult|advise|strategy|planning|business|coach/)) return 'consulting';
  return 'other';
}

export function MinimalPostModal({ onClose, onSuccess }: MinimalPostModalProps) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [budget, setBudget] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [workMode, setWorkMode] = useState('both');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile?.city) setCity(profile.city);
  }, [profile]);

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
      const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
      uploaded.push({ name: file.name, url: publicUrl, type: file.type, size: file.size });
    }
    return uploaded;
  };

  const handleSubmit = async (e: React.FormEvent, postType: 'free' | 'priority') => {
    e.preventDefault();
    setError('');

    if (!profile) {
      setError('You must be logged in to post');
      return;
    }
    if (!body.trim()) {
      setError('Please describe your note');
      return;
    }
    if (!city.trim()) {
      setError('Please select a city');
      return;
    }

    const emailToUse = email.trim() || profile.email;
    if (!emailToUse) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    try {
      const attachments = await uploadFiles();

      let budgetInCents = null;
      if (budget && budget.trim()) {
        budgetInCents = parseInt(budget.replace(/\D/g, '')) * 100;
        if (isNaN(budgetInCents) || budgetInCents <= 0) {
          setError('Please enter a valid budget amount');
          setLoading(false);
          return;
        }
      }

      const contactInfo = {
        email: emailToUse,
        phone: phone.trim() || profile.phone || undefined,
      };

      const category = detectCategory(`${title} ${serviceType} ${body}`);

      const noteData: any = {
        user_id: profile.id,
        title: title.trim() || null,
        body: body.trim(),
        city: city.trim() || null,
        area: area.trim() || null,
        work_mode: workMode,
        contact: contactInfo,
        files: attachments,
        prio: postType === 'priority',
        color: '#FEF3C7',
        category,
      };

      if (budgetInCents) noteData.budget = budgetInCents;

      const { error: insertError } = await supabase.from('notes').insert(noteData);
      if (insertError) throw insertError;

      if (postType === 'priority') {
        await supabase.from('transactions').insert({
          user_id: profile.id,
          amount: 1000,
          kind: 'prio',
          status: 'paid',
        });
      }

      onSuccess(city.trim());
    } catch (err: any) {
      setError(err.message || err.hint || 'Failed to create note. Please try again.');
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
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors cursor-pointer"
            aria-label="Close modal"
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
                What's this note about? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="e.g., Looking for a logo designer for my new business, or Available for web development projects..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 cursor-pointer"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title / Headline <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Need a photographer for Saturday event"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Service type <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  placeholder="e.g., Photography, Web Design"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget (Rands) <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g., 2000"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Work mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['on-site', 'remote', 'both'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setWorkMode(mode)}
                    className={`py-3 px-4 rounded-xl font-medium transition-all cursor-pointer capitalize ${
                      workMode === mode
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {mode === 'on-site' ? 'On-site' : mode === 'remote' ? 'Remote' : 'Both'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  City / Town <span className="text-red-500">*</span>
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                >
                  <option value="">Select city</option>
                  {SA_CITIES.map((cityName) => (
                    <option key={cityName} value={cityName}>{cityName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Area / Suburb
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g., Sandton"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={profile?.email || 'your@email.com'}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
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
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Attachments (PDF, DOCX)
              </label>
              <div className="space-y-3">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                    <button type="button" onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-600 text-sm">
                      Remove
                    </button>
                  </div>
                ))}
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 transition-colors cursor-pointer">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Add files</span>
                  <input type="file" multiple accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
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
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Post note for free"
              >
                {loading ? 'Posting...' : 'Post Note'}
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => handleSubmit(e, 'priority')}
                disabled={loading}
                className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Post priority note"
              >
                {loading ? 'Posting...' : 'Priority Post'}
              </motion.button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Priority posts get a gradient border and appear at the top. During beta, all features are free.
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
