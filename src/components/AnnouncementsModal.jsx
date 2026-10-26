import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  Calendar,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useData } from '../context/DataContext';

export default function AnnouncementsModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { announcements, subjects } = useData();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');

  const categories = ['All', 'Exam', 'Assignment', 'Quiz', 'New Lecture', 'New Section', 'General Announcement'];

  const filtered = useMemo(() => {
    return announcements.filter((ann) => {
      const matchCat = selectedCategory === 'All' || ann.category === selectedCategory;
      const matchSub = selectedSubject === 'All' || ann.subject_id === selectedSubject;
      return matchCat && matchSub;
    });
  }, [announcements, selectedCategory, selectedSubject]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-3xl bg-[#0B1120] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0F172A]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">All University Announcements</h2>
              <p className="text-xs text-slate-400">Department updates, exam schedules, and new content releases</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs focus:outline-none"
          >
            <option value="All">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Bell className="w-10 h-10 mx-auto mb-2 text-slate-700" />
              <p>No announcements found matching selected criteria.</p>
            </div>
          ) : (
            filtered.map((ann) => {
              const sub = subjects.find((s) => s.id === ann.subject_id);
              const isExamOrAssignment = ann.category === 'Exam' || ann.category === 'Assignment' || ann.is_important;

              return (
                <div
                  key={ann.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isExamOrAssignment
                      ? 'bg-blue-950/20 border-blue-500/40'
                      : 'bg-[#0F172A]/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-900/50 text-blue-300 border border-blue-700/50">
                        {sub?.name || 'Department'}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        {ann.category}
                      </span>
                      {ann.is_important && (
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-rose-900/60 text-rose-300 border border-rose-700/50">
                          IMPORTANT
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">
                      {new Date(ann.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1.5">{ann.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                    {ann.description}
                  </p>

                  {sub && (
                    <button
                      onClick={() => {
                        navigate(`/subject/${sub.id}?tab=announcements`);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Open {sub.name} Announcements <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
