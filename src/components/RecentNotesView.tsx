import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Note = {
  id: string;
  title: string;
  content: string;
  budget: number;
  city: string;
  category: string;
  created_at: string;
  user_id: string;
  status: 'open' | 'in_progress' | 'fulfilled';
};

type RecentNotesViewProps = {
  onNoteSelect?: (note: Note) => void;
};

export function RecentNotesView({ onNoteSelect }: RecentNotesViewProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    loadRecentNotes();
  }, []);

  async function loadRecentNotes() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Recent Notes</h2>
        <p className="text-gray-600 dark:text-gray-400">The 20 most recently posted notes across all users</p>
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
              onClick={() => onNoteSelect?.(note)}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  {note.title && (
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
                      {note.title}
                    </h3>
                  )}
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3">
                    {note.content}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-4">
                {note.category && (
                  <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs font-medium">
                    {note.category}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-medium">R{note.budget.toLocaleString()}</span>
                </div>
                {note.city && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{note.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 ml-auto">
                  <Clock className="w-4 h-4" />
                  <span>{formatTimeAgo(note.created_at)}</span>
                </div>
              </div>

              {note.status !== 'open' && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    note.status === 'fulfilled'
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {note.status === 'fulfilled' ? 'Fulfilled' : 'In Progress'}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
