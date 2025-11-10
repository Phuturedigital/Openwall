import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Archive, Paperclip, RotateCcw, Eye } from 'lucide-react';
import { supabase, Note } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingLogo } from './LoadingLogo';

const PASTEL_COLORS = [
  '#FEF3C7', '#DBEAFE', '#FCE7F3', '#E0E7FF', '#D1FAE5',
  '#FED7AA', '#E9D5FF', '#BFDBFE', '#F3E8FF', '#BAE6FD',
];

function getColorFromId(id: string): string {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PASTEL_COLORS[hash % PASTEL_COLORS.length];
}

function timeAgo(date: string): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function truncateText(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

export function PastNotesView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [repostingNote, setRepostingNote] = useState<Note | null>(null);
  const [reposting, setReposting] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    loadPastNotes();
  }, [profile]);

  async function loadPastNotes() {
    if (!profile) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*, profiles!notes_user_id_fkey(*)')
      .eq('user_id', profile.id)
      .in('status', ['fulfilled', 'deleted', 'closed'])
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setNotes(data);
    }
    setLoading(false);
  }

  async function handleRepost(note: Note) {
    if (!profile || reposting) return;

    setReposting(true);
    try {
      const { error } = await supabase.from('notes').insert({
        user_id: profile.id,
        body: note.body,
        title: note.title,
        budget: note.budget,
        city: note.city,
        contact: note.contact,
        files: note.files,
        prio: false,
        status: 'open',
        color: note.color || '#FEF3C7',
      });

      if (error) throw error;

      setRepostingNote(null);

      if (window.location) {
        setTimeout(() => {
          const event = new CustomEvent('note-reposted');
          window.dispatchEvent(event);
        }, 500);
      }
    } catch (err) {
      console.error('Repost error:', err);
    } finally {
      setReposting(false);
    }
  }

  const formatBudget = (cents: number | null) => {
    if (!cents) return null;
    return `R${(cents / 100).toFixed(0)}`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'fulfilled') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
          <CheckCircle className="w-3 h-3" />
          Fulfilled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-400 text-xs font-medium rounded-full">
        <Archive className="w-3 h-3" />
        Closed
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <LoadingLogo className="w-12 h-12" />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <Archive className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              No Past Notes
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Notes you mark as fulfilled will appear here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="tabpanel" aria-label="Past Notes view" className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Past Notes</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your fulfilled and archived notes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => {
            const cardColor = getColorFromId(note.id);
            const hasAttachments = note.files && note.files.length > 0;
            const isFulfilled = note.status === 'fulfilled';

            return (
              <motion.article
                key={note.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative p-5 rounded-2xl border border-gray-200/50 dark:border-gray-700 transition-all hover:shadow-lg"
                style={{
                  backgroundColor: cardColor,
                  opacity: 0.85,
                  filter: 'saturate(0.7)'
                }}
                aria-labelledby={`past-note-${note.id}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    {getStatusBadge(note.status)}
                  </div>

                  <p id={`past-note-${note.id}`} className="text-gray-900 dark:text-white text-sm leading-relaxed">
                    {truncateText(note.body, 100)}
                  </p>

                  <div className="space-y-1">
                    {note.budget && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Budget:</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {formatBudget(note.budget)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {isFulfilled ? 'Fulfilled:' : 'Closed:'}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {timeAgo(note.updated_at)}
                      </span>
                    </div>

                    {hasAttachments && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Paperclip className="w-3 h-3" />
                        <span>{note.files.length} attachment{note.files.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedNote(note)}
                      aria-label="View details"
                      className="flex-1 py-2 px-3 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      View
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRepostingNote(note);
                      }}
                      aria-label="Repost note"
                      className="flex-1 py-2 px-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      Repost
                    </motion.button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedNote(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
              style={{ width: '60%' }}
            >
              <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-8 py-6 flex items-center justify-between rounded-t-3xl">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedNote.status === 'fulfilled' ? 'Fulfilled Note' : 'Archived Note'}
                </h3>
                <button
                  onClick={() => setSelectedNote(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                {selectedNote.status === 'fulfilled' && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <CheckCircle className="w-5 h-5" />
                      <p className="font-medium">This note was fulfilled</p>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      You successfully found a provider for this job
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-gray-900 dark:text-white text-base leading-relaxed whitespace-pre-wrap">
                    {selectedNote.body}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  {selectedNote.budget && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400">Budget:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatBudget(selectedNote.budget)}
                      </span>
                    </div>
                  )}

                  {selectedNote.city && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-gray-400">City:</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {selectedNote.city}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      {selectedNote.status === 'fulfilled' ? 'Fulfilled:' : 'Archived:'}
                    </span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {timeAgo(selectedNote.updated_at)}
                    </span>
                  </div>
                </div>

                {selectedNote.files && selectedNote.files.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400 block">Attachments:</span>
                    <div className="space-y-2">
                      {selectedNote.files.map((file, idx) => (
                        <a
                          key={idx}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <Paperclip className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selectedNote.contact && (
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Contact Information
                    </h4>
                    {selectedNote.contact.email && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Email:</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {selectedNote.contact.email}
                        </span>
                      </div>
                    )}
                    {selectedNote.contact.phone && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Phone:</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {selectedNote.contact.phone}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {repostingNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRepostingNote(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Repost Note?
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This will create a new note with the same details. The original note will remain in Past Notes.
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRepost(repostingNote)}
                  disabled={reposting}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  {reposting ? 'Reposting...' : 'Repost Note'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRepostingNote(null)}
                  disabled={reposting}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
