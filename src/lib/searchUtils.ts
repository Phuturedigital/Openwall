import { Note } from './supabase';

export function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

export function searchNotes(notes: Note[], query: string): Note[] {
  if (!query.trim()) return notes;

  const lowerQuery = query.toLowerCase();

  return notes.filter(note => {
    const searchableText = [
      note.title,
      note.body,
      note.city,
      note.area,
      note.category,
      note.work_mode,
    ].filter(Boolean).join(' ').toLowerCase();

    return searchableText.includes(lowerQuery);
  });
}

export function getSearchSuggestions(notes: Note[]): string[] {
  const suggestions = new Set<string>();

  notes.forEach(note => {
    if (note.city) suggestions.add(note.city);
    if (note.category) suggestions.add(note.category);
  });

  return Array.from(suggestions).slice(0, 10);
}

export function rankSearchResults(notes: Note[], query: string): Note[] {
  if (!query.trim()) return notes;

  const lowerQuery = query.toLowerCase();

  return [...notes].sort((a, b) => {
    const aTitle = a.title?.toLowerCase() || '';
    const aBody = a.body?.toLowerCase() || '';
    const bTitle = b.title?.toLowerCase() || '';
    const bBody = b.body?.toLowerCase() || '';

    const aScore =
      (aTitle.includes(lowerQuery) ? 10 : 0) +
      (aTitle.startsWith(lowerQuery) ? 5 : 0) +
      (aBody.includes(lowerQuery) ? 3 : 0) +
      (a.prio ? 2 : 0);

    const bScore =
      (bTitle.includes(lowerQuery) ? 10 : 0) +
      (bTitle.startsWith(lowerQuery) ? 5 : 0) +
      (bBody.includes(lowerQuery) ? 3 : 0) +
      (b.prio ? 2 : 0);

    return bScore - aScore;
  });
}
