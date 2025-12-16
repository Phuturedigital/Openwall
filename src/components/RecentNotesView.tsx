import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, DollarSign, X, Download, Paperclip, Star, CheckCircle } from 'lucide-react';
import { supabase, Note } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingLogo } from './LoadingLogo';

const CATEGORY_COLORS: Record<string, string> = {
  design: '#E0E7FF',
  writing: '#FEF3C7',
  tech: '#DBEAFE',
  marketing: '#FCE7F3',
  development: '#D1FAE5',
  consulting: '#FED7AA',
  other: '#F3F4F6',
};

const CATEGORY_LABELS: Record<string, string> = {
  design: 'Design',
  writing: 'Writing',
  tech: 'Tech',
  marketing: 'Marketing',
  development: 'Development',
  consulting: 'Consulting',
  other: 'General',
};

function getColorForCategory(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
}

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || CATEGORY_LABELS.other;
}

type RecentNotesViewProps = {
  searchQuery?: string;
};

export function RecentNotesView({ searchQuery = '' }: RecentNotesViewProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved' | 'declined' | 'closed'>('none');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    loadRecentNotes();
  }, [searchQuery]);

  useEffect(() => {
    if (selectedNote && profile) {
      checkConnectionStatus();
    }
  }, [selectedNote, profile]);

  async function loadRecentNotes() {
    setLoading(true);
    try {
      let query = supabase
        .from('notes')
        .select('*, profiles(id, full_name, avatar_url, city)')
        .eq('status', 'open');

      if (searchQuery.trim()) {
        query = query.or(`body.ilike.%${searchQuery}%,title.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error('Error loading recent notes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function checkConnectionStatus() {
    if (!selectedNote || !profile) return;

    const { data: request } = await supabase
      .from('connection_requests')
      .select('status')
      .eq('note_id', selectedNote.id)
      .eq('freelancer_id', profile.id)
      .maybeSingle();

    if (request) {
      setRequestStatus(request.status as any);

      if (request.status === 'approved') {
        const { data: unlock } = await supabase
          .from('unlocks')
          .select('payment_status')
          .eq('note_id', selectedNote.id)
          .eq('freelancer_id', profile.id)
          .maybeSingle();

        if (unlock && unlock.payment_status === 'paid') {
          setIsUnlocked(true);
        }
      }
    } else {
      setRequestStatus('none');
    }
  }

  async function handleRequestConnect() {
    if (!profile || !selectedNote || requesting) return;

    setRequesting(true);
    try {
      const { error } = await supabase.from('connection_requests').insert({
        note_id: selectedNote.id,
        freelancer_id: profile.id,
        status: 'pending',
      });

      if (error) throw error;

      setRequestStatus('pending');
    } catch (err) {
      console.error('Error sending connection request:', err);
      alert('Failed to send connection request. Please try again.');
    } finally {
      setRequesting(false);
    }
  }

  async function handleUnlock() {
    if (!profile || !selectedNote || unlocking) return;

    setUnlocking(true);
    try {
      const { error: unlockError } = await supabase.from('unlocks').insert({
        note_id: selectedNote.id,
        freelancer_id: profile.id,
        payment_status: 'paid',
      });

      if (unlockError) throw unlockError;

      const { error: txError } = await supabase.from('transactions').insert({
        user_id: profile.id,
        note_id: selectedNote.id,
        amount: 1500,
        kind: 'unlock',
        status: 'paid',
      });

      if (txError) throw txError;

      setIsUnlocked(true);
    } catch (err) {
      console.error('Error unlocking contact:', err);
      alert('Failed to unlock contact. Please try again.');
    } finally {
      setUnlocking(false);
    }
  }

  function formatTimeAgo(timestamp: string) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  function formatBudget(cents: number) {
    return `R${(cents / 100).toFixed(0)}`;
  }

  function getInitials(name: string | null) {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingLogo className="w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Recent Notes</h2>
        <p className="text-gray-600 dark:text-gray-400">The 20 most recently posted notes</p>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No notes yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedNote(note)}
              style={{
                backgroundColor: getColorForCategory(note.category || 'other'),
                borderWidth: note.prio ? '3px' : '1px',
                borderColor: note.prio ? '#7C3AED' : '#E5E7EB',
              }}
              className="rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer relative"
            >
              {note.prio && (
                <div className="absolute top-3 right-3">
                  <Star className="w-5 h-5 text-purple-600 fill-purple-600" />
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  {note.title && (
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
                      {note.title}
                    </h3>
                  )}
                  <p className="text-gray-700 text-sm line-clamp-3">
                    {note.body}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-4">
                {note.category && (
                  <span className="px-2 py-1 bg-white/70 rounded text-xs font-medium">
                    {getCategoryLabel(note.category)}
                  </span>
                )}
                {note.budget && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-medium">{formatBudget(note.budget)}</span>
                  </div>
                )}
                {note.profiles?.city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{note.profiles.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  <Clock className="w-4 h-4" />
                  <span>{formatTimeAgo(note.created_at)}</span>
                </div>
              </div>

              {note.files && note.files.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-900/10">
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Paperclip className="w-3 h-3" />
                    <span>{note.files.length} attachment{note.files.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedNote(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedNote.title || 'Note Details'}
                </h2>
                <button
                  onClick={() => setSelectedNote(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {getInitials(selectedNote.profiles?.full_name || null)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {selectedNote.profiles?.full_name || 'Anonymous'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedNote.profiles?.city || 'Unknown location'} · {formatTimeAgo(selectedNote.created_at)}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">
                    {selectedNote.body}
                  </p>

                  <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                    {selectedNote.category && (
                      <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg font-medium">
                        {getCategoryLabel(selectedNote.category)}
                      </span>
                    )}
                    {selectedNote.budget && (
                      <div className="flex items-center gap-1 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg font-medium">
                        <DollarSign className="w-4 h-4" />
                        {formatBudget(selectedNote.budget)}
                      </div>
                    )}
                  </div>
                </div>

                {selectedNote.files && selectedNote.files.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Attachments</h3>
                    <div className="space-y-2">
                      {selectedNote.files.map((file, idx) => (
                        <a
                          key={idx}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                          <Download className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {profile && selectedNote.user_id !== profile.id && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    {isUnlocked ? (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 text-center">
                        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Contact Unlocked!</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          You can now reach out to this person
                        </p>
                        {selectedNote.contact?.email && (
                          <p className="text-sm text-gray-900 dark:text-white">
                            Email: <span className="font-medium">{selectedNote.contact.email}</span>
                          </p>
                        )}
                        {selectedNote.contact?.phone && (
                          <p className="text-sm text-gray-900 dark:text-white mt-1">
                            Phone: <span className="font-medium">{selectedNote.contact.phone}</span>
                          </p>
                        )}
                      </div>
                    ) : requestStatus === 'pending' ? (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 text-center">
                        <Clock className="w-12 h-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-3" />
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Request Pending</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Waiting for the poster to approve your connection request
                        </p>
                      </div>
                    ) : requestStatus === 'approved' ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleUnlock}
                        disabled={unlocking}
                        className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {unlocking ? 'Processing...' : 'Unlock Contact'}
                      </motion.button>
                    ) : requestStatus === 'declined' ? (
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Your connection request was declined
                        </p>
                      </div>
                    ) : requestStatus === 'closed' ? (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          This opportunity is no longer available
                        </p>
                      </div>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleRequestConnect}
                        disabled={requesting}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {requesting ? 'Sending...' : 'Request to Connect'}
                      </motion.button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
