import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  BookOpen,
  ArrowRight,
  Flame,
  Clock,
  Bell,
  CheckCircle2,
  Play,
  Calendar,
  Layers,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import SubjectCard from '../components/SubjectCard';
import AnnouncementsModal from '../components/AnnouncementsModal';

export default function HomePage() {
  const navigate = useNavigate();
  const { subjects, materials, announcements, lastStudied, getSubjectProgress } = useData();
  const { t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [announcementsModalOpen, setAnnouncementsModalOpen] = useState(false);

  // Filter subjects by search
  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    const query = searchQuery.toLowerCase().trim();
    return subjects.filter(
      (sub) =>
        sub.name.toLowerCase().includes(query) ||
        (sub.code && sub.code.toLowerCase().includes(query)) ||
        (sub.description && sub.description.toLowerCase().includes(query))
    );
  }, [subjects, searchQuery]);

  // Up to 5 most recent announcements
  const recentAnnouncements = useMemo(() => {
    return [...announcements]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [announcements]);

  const handleContinueStudying = () => {
    if (lastStudied?.subjectId) {
      navigate(`/subject/${lastStudied.subjectId}?lectureId=${lastStudied.lectureId || ''}`);
    } else {
      document.getElementById('subjects')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-800/80 bg-gradient-to-b from-blue-950/20 via-[#070B14] to-[#070B14]">
        {/* Ambient background blur glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[280px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-900/40 text-blue-300 text-xs sm:text-sm font-semibold mb-6 border border-blue-700/50 shadow-md">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Computer Science Academic Study Platform</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
            {t('welcomeTitle')}
          </h1>

          {/* Subtitle */}
          <p className="mt-4 sm:mt-5 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            {t('welcomeSubtitle')}
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#subjects"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5"
            >
              <BookOpen className="w-4 h-4" />
              {t('exploreSubjects')}
            </a>

            <button
              onClick={() => setAnnouncementsModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-2xl text-sm font-bold transition-colors"
            >
              <Bell className="w-4 h-4 text-blue-400" />
              {t('latestNews')}
            </button>
          </div>
        </div>
      </section>

      {/* Main Body Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
        {/* ========================================================= */}
        {/* FEATURE 5: CONTINUE STUDYING CARD                         */}
        {/* ========================================================= */}
        <section aria-label="Continue Studying">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
                <Clock className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {t('continueStudying')}
              </h2>
            </div>
          </div>

          {lastStudied ? (
            <div className="bg-gradient-to-r from-[#0F172A] via-[#0B1120] to-blue-950/30 border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-64 h-full bg-blue-600/5 blur-3xl pointer-events-none" />

              <div className="min-w-0 z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                    {lastStudied.subjectCode || 'COURSE'}
                  </span>
                  <span className="text-xs text-slate-400">Recently Active</span>
                </div>

                <h3 className="text-2xl font-extrabold text-white truncate">
                  {lastStudied.subjectName}
                </h3>

                <p className="text-sm font-medium text-blue-400 mt-1">
                  Lecture {lastStudied.lectureNumber}: {lastStudied.lectureTitle}
                </p>

                {/* Progress Bar */}
                <div className="mt-4 flex items-center gap-3 max-w-md">
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full"
                      style={{ width: `${lastStudied.progressPercent || 25}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-300 shrink-0">
                    {lastStudied.progressPercent || 0}% Progress
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleContinueStudying}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-600/25 transition-all group-hover:scale-105 shrink-0 z-10"
              >
                <Play className="w-4 h-4 fill-current" />
                {t('continueLearning')} →
              </button>
            </div>
          ) : (
            <div className="bg-[#0B1120] border border-slate-800 rounded-3xl p-6 sm:p-8 text-center flex flex-col items-center justify-center">
              <BookOpen className="w-10 h-10 text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-200">
                {t('noRecentActivity')}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                {t('startJourney')}
              </p>
              <a
                href="#subjects"
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-xs font-bold border border-blue-500/30 transition-colors"
              >
                {t('exploreSubjects')} <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* FEATURE 6: LATEST NEWS ON HOMEPAGE                         */}
        {/* ========================================================= */}
        <section aria-label="Latest News">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
                  <Bell className="w-4 h-4" />
                </span>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {t('latestNews')}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {t('latestNewsSub')}
              </p>
            </div>

            <button
              onClick={() => setAnnouncementsModalOpen(true)}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              {t('viewAllNews')} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentAnnouncements.length === 0 ? (
            <div className="bg-[#0B1120] border border-slate-800 rounded-3xl p-8 text-center text-slate-400 text-sm">
              {t('noAnnouncements')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentAnnouncements.map((ann) => {
                const sub = subjects.find((s) => s.id === ann.subject_id);
                return (
                  <div
                    key={ann.id}
                    onClick={() => navigate(`/subject/${ann.subject_id}?tab=announcements`)}
                    className={`group p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      ann.is_important
                        ? 'bg-blue-950/20 border-blue-500/40 hover:border-blue-400 shadow-md shadow-blue-500/5'
                        : 'bg-[#0B1120] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50 truncate max-w-[150px]">
                          {sub?.name || 'Department'}
                        </span>
                        {ann.is_important && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-900/60 text-rose-300 border border-rose-700/50 flex items-center gap-1">
                            <Flame className="w-3 h-3 text-rose-400" /> IMPORTANT
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                        {ann.title}
                      </h3>

                      <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {ann.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{ann.category}</span>
                      <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ========================================================= */}
        {/* SUBJECTS GRID                                              */}
        {/* ========================================================= */}
        <section id="subjects" className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                {t('universitySubjects')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {t('universitySubjectsSub')}
              </p>
            </div>

            {/* Quick in-page search input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter subjects..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0B1120] border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {filteredSubjects.length === 0 ? (
            <div className="bg-[#0B1120] border border-slate-800 rounded-3xl p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No subjects found</h3>
              <p className="text-xs text-slate-400 mt-1">Try another search keyword.</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
              >
                Clear Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSubjects.map((subject) => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* All Announcements Modal */}
      <AnnouncementsModal
        isOpen={announcementsModalOpen}
        onClose={() => setAnnouncementsModalOpen(false)}
      />
    </div>
  );
}
