import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  BookOpen,
  FileText,
  Layers,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Command,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';

export default function SearchModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { subjects, materials } = useData();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');

  // Handle keyboard shortcut '/' to open search, and 'Escape' to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Search Results
  const results = useMemo(() => {
    if (!query.trim()) return { subjects: [], lectures: [], sections: [], studyNotes: [] };

    const q = query.toLowerCase().trim();

    const matchedSubjects = subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
    );

    const matchedLectures = materials
      .filter((m) => m.type === 'lecture' && (m.title.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q))))
      .slice(0, 5);

    const matchedSections = materials
      .filter((m) => m.type === 'section' && (m.title.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q))))
      .slice(0, 5);

    const matchedStudyNotes = materials
      .filter((m) => m.type === 'study_material' && (m.title.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q))))
      .slice(0, 5);

    return {
      subjects: matchedSubjects,
      lectures: matchedLectures,
      sections: matchedSections,
      studyNotes: matchedStudyNotes,
    };
  }, [query, subjects, materials]);

  const totalResults =
    results.subjects.length +
    results.lectures.length +
    results.sections.length +
    results.studyNotes.length;

  const handleSelectSubject = (subjectId) => {
    navigate(`/subject/${subjectId}`);
    onClose();
  };

  const handleSelectMaterial = (subjectId, tab = 'lectures') => {
    navigate(`/subject/${subjectId}?tab=${tab}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl bg-[#0B1120] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Search Input Bar */}
        <div className="relative p-4 sm:p-5 border-b border-slate-800 flex items-center gap-3 bg-[#0F172A]/70">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            autoFocus
            className="w-full bg-transparent text-white placeholder-slate-500 text-base sm:text-lg focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs font-semibold px-2.5 py-1 bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-700 shrink-0"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {!query.trim() ? (
            <div className="text-center py-10">
              <Command className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">
                Quick Search Study Hub
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Type course names, lecture titles, lab sections, or topics (e.g. "Compiler", "B+ Trees", "Stripe").
              </p>
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-12">
              <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">
                {t('noResults')} for "{query}"
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try searching with a different keyword or acronym.
              </p>
            </div>
          ) : (
            <>
              {/* Matched Subjects */}
              {results.subjects.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-2">
                    Subjects ({results.subjects.length})
                  </h4>
                  <div className="space-y-1.5">
                    {results.subjects.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => handleSelectSubject(sub.id)}
                        className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/80 text-left transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20 shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                              {sub.name}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {sub.code} • {sub.instructor || 'CS Department'}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Lectures */}
              {results.lectures.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-2">
                    Lectures ({results.lectures.length})
                  </h4>
                  <div className="space-y-1.5">
                    {results.lectures.map((lec) => {
                      const sub = subjects.find((s) => s.id === lec.subject_id);
                      return (
                        <button
                          key={lec.id}
                          onClick={() => handleSelectMaterial(lec.subject_id, 'lectures')}
                          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/80 text-left transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                                {lec.title}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {sub?.name} • Lecture {lec.number}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matched Sections */}
              {results.sections.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-2">
                    Practical Sections ({results.sections.length})
                  </h4>
                  <div className="space-y-1.5">
                    {results.sections.map((sec) => {
                      const sub = subjects.find((s) => s.id === sec.subject_id);
                      return (
                        <button
                          key={sec.id}
                          onClick={() => handleSelectMaterial(sec.subject_id, 'sections')}
                          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/80 text-left transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 shrink-0">
                              <Layers className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors truncate">
                                {sec.title}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {sub?.name} • Section {sec.number}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matched Study Notes */}
              {results.studyNotes.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-2">
                    Study Notes & Resources ({results.studyNotes.length})
                  </h4>
                  <div className="space-y-1.5">
                    {results.studyNotes.map((note) => {
                      const sub = subjects.find((s) => s.id === note.subject_id);
                      return (
                        <button
                          key={note.id}
                          onClick={() => handleSelectMaterial(note.subject_id, 'study_notes')}
                          className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-800/80 text-left transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 shrink-0">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors truncate">
                                {note.title}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {sub?.name} • {note.category}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
