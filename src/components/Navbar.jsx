import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  Globe,
  CheckCircle2,
  Menu,
  X,
  BookOpen,
  Home,
  Sparkles,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar({ onOpenSearch }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { subjects, getOverallProgress } = useData();
  const { lang, toggleLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const overallProg = getOverallProgress();

  // Helper to check if a subject pill is active
  const isSubjectActive = (subId) => {
    return location.pathname === `/subject/${subId}`;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#070B14]/90 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-white font-bold text-lg sm:text-xl tracking-tight shrink-0 hover:opacity-90 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-600/30">
            S
          </div>
          <span className="font-extrabold tracking-tight">
            Study <span className="text-blue-500">Hub</span>
          </span>
        </Link>

        {/* Center: Subject Pill Badges (Inspired by the Reference Screenshot!) */}
        <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto py-1 max-w-2xl no-scrollbar">
          {subjects.map((sub) => {
            const active = isSubjectActive(sub.id);
            return (
              <button
                key={sub.id}
                onClick={() => navigate(`/subject/${sub.id}`)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    sub.color === 'emerald'
                      ? 'bg-emerald-400'
                      : sub.color === 'amber'
                      ? 'bg-amber-400'
                      : sub.color === 'rose'
                      ? 'bg-rose-400'
                      : sub.color === 'indigo'
                      ? 'bg-indigo-400'
                      : 'bg-blue-400'
                  }`}
                />
                <span>{sub.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Actions: Search / Shortcut, Language Switcher, Student Progress */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Search Trigger Button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all group min-h-[44px]"
            title="Search subjects, lectures and notes"
          >
            <Search className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700 font-mono">
              /
            </kbd>
          </button>

          {/* Arabic / English Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all min-h-[44px]"
            title={lang === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
          >
            <Globe className="w-4 h-4 text-blue-400" />
            <span>{lang === 'en' ? 'عربي' : 'EN'}</span>
          </button>

          {/* Overall Student Progress Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-300 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {overallProg.percentage}% {t('completed')}
            </span>
          </div>

          {/* Mobile hamburger menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-800 bg-[#0B1120] px-4 pt-3 pb-5 space-y-3 animate-fade-in">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 px-2">
            {t('subjects')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {subjects.map((sub) => (
              <button
                key={sub.id}
                onClick={() => {
                  navigate(`/subject/${sub.id}`);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-xs font-semibold text-left transition-all active:scale-[0.98] min-h-[44px] ${
                  isSubjectActive(sub.id)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <span className="truncate">{sub.name}</span>
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 px-2">
            <span>Overall Progress</span>
            <span className="font-bold text-emerald-400">{overallProg.percentage}% Completed</span>
          </div>
        </div>
      )}
    </header>
  );
}
