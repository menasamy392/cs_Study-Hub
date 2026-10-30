import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  BarChart3,
  ShoppingCart,
  ShieldCheck,
  BookOpen,
  Code2,
  Cpu,
  Server,
  Network,
  FolderGit2,
  Terminal,
  ArrowRight,
  FileText,
  Layers,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';

const ICON_MAP = {
  Database,
  BarChart3,
  ShoppingCart,
  ShieldCheck,
  BookOpen,
  Code2,
  Cpu,
  Server,
  Network,
  FolderGit2,
  Terminal,
};

const ACCENT_COLORS = {
  blue: {
    badge: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    bar: 'bg-blue-500',
    hoverBorder: 'hover:border-blue-500/60 hover:shadow-blue-500/10',
    iconBg: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    button: 'text-blue-400 group-hover:text-blue-300',
  },
  emerald: {
    badge: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
    bar: 'bg-emerald-500',
    hoverBorder: 'hover:border-emerald-500/60 hover:shadow-emerald-500/10',
    iconBg: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
    button: 'text-emerald-400 group-hover:text-emerald-300',
  },
  amber: {
    badge: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
    bar: 'bg-amber-500',
    hoverBorder: 'hover:border-amber-500/60 hover:shadow-amber-500/10',
    iconBg: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
    button: 'text-amber-400 group-hover:text-amber-300',
  },
  rose: {
    badge: 'bg-rose-600/20 text-rose-400 border-rose-500/30',
    bar: 'bg-rose-500',
    hoverBorder: 'hover:border-rose-500/60 hover:shadow-rose-500/10',
    iconBg: 'bg-rose-600/20 text-rose-400 border-rose-500/30',
    button: 'text-rose-400 group-hover:text-rose-300',
  },
  indigo: {
    badge: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30',
    bar: 'bg-indigo-500',
    hoverBorder: 'hover:border-indigo-500/60 hover:shadow-indigo-500/10',
    iconBg: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30',
    button: 'text-indigo-400 group-hover:text-indigo-300',
  },
};

export default function SubjectCard({ subject }) {
  const navigate = useNavigate();
  const { materials, getSubjectProgress } = useData();
  const { t } = useLanguage();

  const IconComponent = ICON_MAP[subject.icon] || BookOpen;
  const colorKey = subject.color || 'blue';
  const theme = ACCENT_COLORS[colorKey] || ACCENT_COLORS.blue;

  // Counts
  const subjectMaterials = materials.filter((m) => m.subject_id === subject.id);
  const lecturesCount = subjectMaterials.filter((m) => m.type === 'lecture').length;
  const sectionsCount = subjectMaterials.filter((m) => m.type === 'section').length;
  const quizzesCount = subjectMaterials.filter((m) => m.type === 'quiz').length;

  // Progress
  const progress = getSubjectProgress(subject.id);

  const handleOpen = () => {
    navigate(`/subject/${subject.id}`);
  };

  return (
    <div
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleOpen();
        }
      }}
      className={`group relative flex flex-col justify-between p-4 sm:p-6 bg-[#0B1120] border border-slate-800/90 rounded-2xl sm:rounded-3xl shadow-xl transition-all duration-200 active:scale-[0.98] sm:hover:-translate-y-1.5 cursor-pointer min-h-[44px] ${theme.hoverBorder}`}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
          <div
            className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border ${theme.iconBg} shadow-sm transition-transform duration-300 group-hover:scale-105 shrink-0`}
          >
            <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          {subject.code && (
            <span
              className={`text-[11px] sm:text-xs font-bold px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full uppercase tracking-wider border ${theme.badge} shrink-0`}
            >
              {subject.code}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-xl font-bold text-white group-hover:text-blue-400 transition-colors leading-snug">
          {subject.name}
        </h3>

        {/* Instructor info */}
        {subject.instructor && (
          <p className="text-[11px] sm:text-xs font-medium text-slate-400 mt-1 line-clamp-1">
            {subject.instructor}
          </p>
        )}

        {/* Description */}
        <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed line-clamp-2">
          {subject.description || 'Lectures, sections, quizzes, and study roadmap.'}
        </p>

        {/* Metrics Grid */}
        <div className="mt-3.5 sm:mt-5 grid grid-cols-3 gap-1.5 sm:gap-2 py-2 px-2.5 sm:py-3 sm:px-3.5 rounded-xl sm:rounded-2xl bg-[#0F172A]/80 border border-slate-800/80 text-center">
          <div>
            <span className="block text-xs sm:text-sm font-bold text-white">{lecturesCount}</span>
            <span className="text-[10px] sm:text-[11px] text-slate-400">{t('lectures')}</span>
          </div>
          <div>
            <span className="block text-xs sm:text-sm font-bold text-white">{sectionsCount}</span>
            <span className="text-[10px] sm:text-[11px] text-slate-400">{t('sections')}</span>
          </div>
          <div>
            <span className="block text-xs sm:text-sm font-bold text-white">{quizzesCount}</span>
            <span className="text-[10px] sm:text-[11px] text-slate-400">{t('quizzes')}</span>
          </div>
        </div>

        {/* Student Progress Percentage */}
        <div className="mt-3 sm:mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 text-[11px] sm:text-xs font-medium">{t('progress')}</span>
            <span className="font-bold text-white text-[11px] sm:text-xs">{progress.percentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${theme.bar} rounded-full transition-all duration-500`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card Footer: Open Subject Action */}
      <div className="mt-4 pt-3 sm:mt-6 sm:pt-4 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
          {progress.completedCount} of {progress.totalCount} {t('completed')}
        </span>

        <span
          className={`inline-flex items-center gap-1 text-xs sm:text-sm font-bold transition-transform group-hover:translate-x-1 ${theme.button}`}
        >
          {t('openSubject')}
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </span>
      </div>
    </div>
  );
}
