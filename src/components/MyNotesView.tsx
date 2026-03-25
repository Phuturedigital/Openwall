import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard as Edit2, Trash2, CheckCircle, Eye, Users } from 'lucide-react';
import { supabase, Note } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EditNoteModal } from './EditNoteModal';
import { NotesGridSkeleton } from './LoadingSkeleton';

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

function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

export function MyNotesView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [fulfillingNote, setFulfillingNote] = useState<Note | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [requestCounts, setRequestCounts] = useState<Record<string, number>>({});
  const { profile } = useAuth();

  useEffect(() => {
    loadMyNotes();
  }, [profile]);

  async function loadMyNotes() {
    if (!profile) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', profile.id)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotes(data);
      await loadRequestCounts(data.map(n => n.id));
    }
    setLoading(false);
  }

  async function loadRequestCounts(noteIds: string[]) {
    if (noteIds.length === 0) return;

    const { data } = await supabase
      .from('connection_requests')
      .select('note_id')
      .in('note_id', noteIds)
      .eq('status', 'pending');

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(req => {
        counts[req.note_id] = (counts[req.note_id] || 0) + 1;
      });
      setRequestCounts(counts);
    }
  }

  async function handleDeleteNote() {
    if (!deletingNote) return;

    setNotes(notes.filter(n => n.id !== deletingNote.id));

    await supabase
      .from('notes')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', deletingNote.id);

    setDeletingNote(null);
  }

  async function handleMarkFulfilled(noteId: string) {
    setNotes(notes.filter(n => n.id !== noteId));
    setFulfillingNote(null);

    await supabase
      .from('notes')
      .update({
        status: 'fulfilled',
        fulfilled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId);

    if (window.location) {
      setTimeout(() => {
        const event = new CustomEvent('note-fulfilled');
        window.dispatchEvent(event);
      }, 500);
    }
  }

  const formatBudget = (cents: number | null) => {
    if (!cents) return null;
    return `R${(cents / 100).toFixed(0)}`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'open') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Open
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-full">
        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
        In Progress
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-8 animate-pulse"></div>
          <NotesGridSkeleton count={6} />
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Edit2 className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              No Active Notes
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You haven't posted any notes yet. Click 'Post a Note' to start.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="tabpanel" aria-label="My Notes view" className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">My Notes</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your active and in-progress posts
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => {
            const cardColor = getColorFromId(note.id);
            const requestCount = requestCounts[note.id] || 0;

            return (
              <motion.article
                key={note.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative p-5 rounded-2xl border border-gray-200/50 dark:border-gray-700 transition-all hover:shadow-lg"
                style={{ backgroundColor: cardColor }}
                aria-labelledby={`note-title-${note.id}`}
              >
                <div className="absolute top-3 right-3 flex gap-1">
                  <button
                    onClick={() => setEditingNote(note)}
                    aria-label={`Edit note ${note.title || 'untitled'}`}
                    className="p-1.5 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setDeletingNote(note)}
                    aria-label="Delete note"
                    className="p-1.5 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />
                  </button>
                </div>

                <div className="space-y-3 pr-20">
                  <div className="flex items-start justify-between gap-2">
                    {getStatusBadge(note.status)}
                  </div>

                  <p id={`note-title-${note.id}`} className="text-gray-900 dark:text-white text-sm leading-relaxed font-medium">
                    {truncateText(note.body, 100)}
                  </p>

                  <div className="space-y-2">
                    {note.budget && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Budget:</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {formatBudget(note.budget)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Posted:</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {timeAgo(note.created_at)}
                      </span>
                    </div>

                    {requestCount > 0 && (
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <Users className="w-3.5 h-3.5" aria-hidden="true" />
                        <span className="text-xs font-medium">
                          {requestCount} {requestCount === 1 ? 'request' : 'requests'} waiting
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedNote(note)}
                      aria-label="View requests"
                      className="flex-1 py-2 px-3 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      View
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFulfillingNote(note)}
                      aria-label="Mark as fulfilled"
                      className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      Fulfilled
                    </motion.button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {editingNote && (
          <EditNoteModal
            note={editingNote}
            onClose={() => setEditingNote(null)}
            onSuccess={() => {
              setEditingNote(null);
              loadMyNotes();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeletingNote(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Delete Note?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This will move the note to Past Notes as closed. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeleteNote}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                >
                  Delete
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDeletingNote(null)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fulfillingNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFulfillingNote(null)}
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
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Mark as Fulfilled?
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This will move the note to Past Notes and mark it as successfully completed.
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleMarkFulfilled(fulfillingNote.id)}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Mark Fulfilled
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFulfillingNote(null)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-8 py-6 flex items-center justify-between rounded-t-3xl">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Note Details</h3>
                <button
                  onClick={() => setSelectedNote(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                <div className="flex items-center justify-between">
                  {getStatusBadge(selectedNote.status)}
                  {requestCounts[selectedNote.id] > 0 && (
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {requestCounts[selectedNote.id]} pending
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-gray-900 dark:text-white text-base leading-relaxed whitespace-pre-wrap">
                    {selectedNote.body}
                  </p>
                </div>

                {selectedNote.budget && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Budget:</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatBudget(selectedNote.budget)}
                    </span>
                  </div>
                )}

                {selectedNote.city && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">City:</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {selectedNote.city}
                    </span>
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
    </div>
  );
}
