import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Eye,
  Download,
  ExternalLink,
  HelpCircle,
  FolderOpen,
  Sparkles,
  Play,
  Layers,
  Bell,
  CheckCircle2,
  Circle,
  Share2,
  Calendar,
  Award,
  BookOpen,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/Toast';
import StudyRoadmap from '../components/StudyRoadmap';
import FilePreviewModal from '../components/FilePreviewModal';

export default function SubjectDetailsPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const {
    subjects,
    materials,
    announcements,
    warnings = [],
    loading,
    toggleLectureCompleted,
    isLectureCompleted,
    getSubjectProgress,
    recordStudyActivity,
  } = useData();
  const { t } = useLanguage();
  const { addToast } = useToast();

  // Active Tab: 'overview' | 'lectures' | 'sections' | 'quizzes' | 'study_notes' | 'announcements' | 'roadmap'
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab if query parameter changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Find subject safely (checking both string ID and fallback)
  const subject = useMemo(() => {
    return subjects.find((s) => String(s.id) === String(id));
  }, [subjects, id]);

  // Materials of this subject
  const subjectMaterials = useMemo(() => {
    return materials.filter((m) => String(m.subject_id) === String(id));
  }, [materials, id]);

  // Lectures sorted by number
  const lectures = useMemo(() => {
    return subjectMaterials
      .filter((m) => m.type === 'lecture')
      .sort((a, b) => (a.number || 0) - (b.number || 0));
  }, [subjectMaterials]);

  // Sections
  const sections = useMemo(() => {
    return subjectMaterials
      .filter((m) => m.type === 'section')
      .sort((a, b) => (a.number || 0) - (b.number || 0));
  }, [subjectMaterials]);

  // Quizzes
  const quizzes = useMemo(() => {
    return subjectMaterials
      .filter((m) => m.type === 'quiz')
      .sort((a, b) => (a.number || 0) - (b.number || 0));
  }, [subjectMaterials]);

  // Study Notes
  const studyNotes = useMemo(() => {
    return subjectMaterials.filter((m) => m.type === 'study_material');
  }, [subjectMaterials]);

  // Subject Announcements
  const subjectAnnouncements = useMemo(() => {
    return announcements
      .filter((a) => String(a.subject_id) === String(id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [announcements, id]);

  // Subject Warnings (PDF documents for this subject)
  const subjectWarnings = useMemo(() => {
    return warnings.filter((w) => String(w.subject_id) === String(id));
  }, [warnings, id]);

  // Selected current lecture on roadmap / overview
  const initialLectureId = searchParams.get('lectureId') || lectures[0]?.id;
  const [currentLectureId, setCurrentLectureId] = useState(initialLectureId);

  useEffect(() => {
    if (!currentLectureId && lectures.length > 0) {
      setCurrentLectureId(lectures[0].id);
    }
  }, [lectures, currentLectureId]);

  const currentLecture = useMemo(() => {
    return lectures.find((l) => l.id === currentLectureId) || lectures[0] || null;
  }, [lectures, currentLectureId]);

  // File Preview Modal State
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    fileUrl: '',
    title: '',
    fileName: '',
  });

  // Open Preview Modal (View button: previews without downloading, cache-busted)
  const handleView = (item) => {
    let url = item.file_url || item.external_url;
    if (!url) {
      addToast('No preview available for this item.', 'error');
      return;
    }

    if (!url.includes('?v=') && !url.includes('&v=')) {
      url = url.includes('?') ? `${url}&v=${Date.now()}` : `${url}?v=${Date.now()}`;
    }

    // Record study activity
    if (subject && item.type === 'lecture') {
      recordStudyActivity({
        subjectId: subject.id,
        lectureId: item.id,
        lectureNumber: item.number,
        lectureTitle: item.title,
      });
    }

    setPreviewModal({
      isOpen: true,
      fileUrl: url,
      title: item.title,
      fileName: item.file_name || `${item.title}.pdf`,
    });
  };

  // Dedicated separate Download handler (bypasses stale browser cache)
  const handleDownload = async (item) => {
    let url = item.file_url || item.external_url;
    if (!url) {
      addToast('No download link available.', 'error');
      return;
    }

    if (!url.includes('?v=') && !url.includes('&v=')) {
      url = url.includes('?') ? `${url}&v=${Date.now()}` : `${url}?v=${Date.now()}`;
    }

    addToast(`Downloading ${item.file_name || item.title}...`, 'info');

    try {
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = item.file_name || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const res = await fetch(url, { mode: 'cors', cache: 'no-cache' });
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = item.file_name || `${item.title}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        return;
      }
    } catch {
      // Fallback direct anchor click
      const link = document.createElement('a');
      link.href = url;
      link.download = item.file_name || `${item.title}.pdf`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Toggle Lecture Completed
  const handleToggleCompleted = (lectureId) => {
    if (!subject) return;
    toggleLectureCompleted(subject.id, lectureId);
    const wasCompleted = isLectureCompleted(subject.id, lectureId);
    addToast(wasCompleted ? 'Lecture marked as incomplete' : 'Lecture completed! Great job 🎉', 'success');
  };

  // Progress of this subject
  const progress = subject ? getSubjectProgress(subject.id) : { completedCount: 0, totalCount: 0, percentage: 0 };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Loading course materials...</p>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white">Subject Not Found</h2>
        <p className="mt-2 text-slate-400">
          The requested subject does not exist or may have been updated.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Study Hub
        </Link>
      </div>
    );
  }

  // Navigation Tabs (Hide optional tabs when content unavailable, but keep announcements accessible!)
  const tabList = [
    { id: 'overview', label: 'Path / Overview', count: null },
    { id: 'lectures', label: 'Lectures', count: lectures.length, show: lectures.length > 0 },
    { id: 'sections', label: 'Sections', count: sections.length, show: sections.length > 0 },
    { id: 'quizzes', label: 'Quizzes', count: quizzes.length, show: quizzes.length > 0 },
    { id: 'study_notes', label: 'Study Notes', count: studyNotes.length, show: studyNotes.length > 0 },
    {
      id: 'warnings',
      label: 'Warnings',
      count: subjectWarnings.length,
      show: true,
    },
    { id: 'announcements', label: 'News & Announcements', count: subjectAnnouncements.length, show: true }, // Always accessible
    { id: 'roadmap', label: 'Study Roadmap', count: null, show: lectures.length > 0 },
  ].filter((t) => t.show !== false);

  return (
    <div className="min-h-screen bg-[#070B14] text-white pb-24">
      {/* ============================================================== */}
      {/* SUBJECT HERO HEADER (Inspired by the Reference Screenshot!)     */}
      {/* ============================================================== */}
      <section className="bg-gradient-to-b from-blue-950/40 via-[#0B1120] to-[#070B14] border-b border-slate-800/80 pt-6 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button & share */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              {t('backToSubjects')}
            </button>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                addToast('Subject link copied to clipboard!', 'success');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>

          {/* Subject Banner Content */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              {/* Meta breadcrumbs */}
              <p className="text-xs font-semibold text-blue-400 tracking-wide uppercase mb-2">
                {subject.semester || 'Level 3 • Semester 1 • Core course'} • {subject.code || 'CS'}
              </p>

              {/* Big bold Subject Title */}
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {subject.name}
              </h1>

              {/* Instructor Name */}
              <p className="mt-2 text-sm text-slate-300 font-medium">
                {subject.instructor || 'Department Faculty'}
              </p>
            </div>

            {/* Top Right Stats Counters (Matching Reference Screenshot!) */}
            <div className="w-full lg:w-auto grid grid-cols-3 items-center divide-x divide-slate-800 bg-[#0F172A]/80 p-3.5 sm:p-5 rounded-2xl border border-slate-800/80 shrink-0">
              <div className="text-center px-2">
                <span className="block text-xl sm:text-2xl font-black text-white">
                  {progress.completedCount}/{progress.totalCount}
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  lectures read
                </span>
              </div>

              <div className="text-center px-2">
                <span className="block text-xl sm:text-2xl font-black text-white">
                  {subjectMaterials.length}
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  materials
                </span>
              </div>

              <div className="text-center px-2">
                <span className="block text-xl sm:text-2xl font-black text-blue-400">
                  {progress.percentage}%
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  progress
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Pill Tabs - Swipe-friendly on mobile */}
          <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2.5 no-scrollbar border-b border-slate-800/80 touch-pan-x -mx-4 px-4 sm:mx-0 sm:px-0">
            {tabList.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 min-h-[44px] active:scale-95 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-blue-800/60 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* TAB CONTENT AREAS                                              */}
      {/* ============================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* ============================================================== */}
        {/* OVERVIEW TAB (Includes Roadmap + 3 Current Lecture Cards!)      */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-10">
            {/* 1. Interactive Study Roadmap */}
            {lectures.length > 0 && (
              <StudyRoadmap
                subject={subject}
                lectures={lectures}
                currentLectureId={currentLectureId}
                onSelectLecture={(lec) => {
                  setCurrentLectureId(lec.id);
                  recordStudyActivity({
                    subjectId: subject.id,
                    lectureId: lec.id,
                    lectureNumber: lec.number,
                    lectureTitle: lec.title,
                  });
                }}
                isCompleted={isLectureCompleted}
                onToggleCompleted={handleToggleCompleted}
              />
            )}

            {/* 2. Current Lecture Spotlight & 3 Action Cards (Matching Screenshot!) */}
            {currentLecture && (
              <div className="space-y-4">
                {/* Current Lecture Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                      LECTURE {currentLecture.number} OF {lectures.length}
                    </span>
                    <h2 className="text-2xl font-extrabold text-white mt-0.5">
                      {currentLecture.title}
                    </h2>
                    {currentLecture.description && (
                      <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
                        {currentLecture.description}
                      </p>
                    )}
                  </div>

                  {/* Mark as Completed Button */}
                  <button
                    onClick={() => handleToggleCompleted(currentLecture.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                      isLectureCompleted(subject.id, currentLecture.id)
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30'
                        : 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200'
                    }`}
                  >
                    {isLectureCompleted(subject.id, currentLecture.id) ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        {t('completedStatus')}
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4 text-slate-400" />
                        {t('markAsCompleted')}
                      </>
                    )}
                  </button>
                </div>

                {/* 3 Main Action Cards (Read Notes, Study Materials, Take Quiz) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                  {/* Card 1: Read the Lecture / Notes */}
                  <div className="bg-[#0B1120] border border-blue-500/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-blue-400 transition-all group">
                    <div>
                      <div className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs mb-4">
                        1
                      </div>
                      <h3 className="text-lg font-bold text-white">
                        {t('readLecture')}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {currentLecture.description || 'Open lecture slides and primary curriculum reading.'}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {currentLecture.file_size || 'PDF Guide'}
                      </span>
                      <button
                        onClick={() => handleView(currentLecture)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md min-h-[44px]"
                      >
                        <Eye className="w-4 h-4" />
                        Start →
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Study Materials */}
                  <div className="bg-[#0B1120] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all group">
                    <div>
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs mb-4">
                        2
                      </div>
                      <h3 className="text-lg font-bold text-white">
                        {t('studyMaterials')}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Download lecture PDF or explore supplementary cheat sheets.
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleDownload(currentLecture)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 rounded-xl text-xs sm:text-sm font-bold border border-slate-700 transition-all min-h-[44px]"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>

                      <button
                        onClick={() => handleView(currentLecture)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px]"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Take the Quiz (Only show if available quiz exists) */}
                  <div className="bg-[#0B1120] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all group">
                    <div>
                      <div className="w-7 h-7 rounded-full bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold text-xs mb-4">
                        3
                      </div>
                      <h3 className="text-lg font-bold text-white">
                        {t('takeQuiz')}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {quizzes.length > 0
                          ? quizzes[0].title
                          : 'No quiz linked to this lecture yet.'}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {quizzes.length > 0 ? '70% to pass' : 'Optional'}
                      </span>
                      {quizzes.length > 0 ? (
                        <a
                          href={quizzes[0].external_url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-slate-950 font-extrabold rounded-xl text-xs sm:text-sm transition-all shadow-md min-h-[44px]"
                        >
                          Start Quiz →
                        </a>
                      ) : (
                        <span className="text-xs text-slate-600 italic">None</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* LECTURES TAB                                                   */}
        {/* ============================================================== */}
        {activeTab === 'lectures' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-2">Lecture Curriculum</h2>
            <div className="grid grid-cols-1 gap-4">
              {lectures.map((lec) => {
                const isDone = isLectureCompleted(subject.id, lec.id);
                return (
                  <div
                    key={lec.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isDone
                        ? 'bg-slate-900/40 border-emerald-500/30'
                        : 'bg-[#0B1120] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
                      <div
                        className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${
                          isDone
                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <FileText className="w-5 h-5 sm:w-6 sm:h-6" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                            Lecture {lec.number}
                          </span>
                          {lec.file_size && (
                            <span className="text-xs text-slate-500">• {lec.file_size}</span>
                          )}
                          {isDone && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300">
                              Completed
                            </span>
                          )}
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-white mt-0.5 truncate">
                          {lec.title}
                        </h3>

                        {lec.description && (
                          <p className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-2">
                            {lec.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions: View, Download, Mark Completed */}
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-slate-800">
                      <button
                        onClick={() => handleView(lec)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px]"
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>

                      <button
                        onClick={() => handleDownload(lec)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 rounded-xl text-xs sm:text-sm font-bold border border-slate-700 transition-all min-h-[44px]"
                      >
                        <Download className="w-4 h-4" /> Download
                      </button>

                      <button
                        onClick={() => handleToggleCompleted(lec.id)}
                        className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-xl border text-xs active:scale-95 transition-all ${
                          isDone
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                        }`}
                        title={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTIONS TAB                                                   */}
        {/* ============================================================== */}
        {activeTab === 'sections' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-2">Practical Lab Sections</h2>
            {sections.length === 0 ? (
              <div className="bg-[#0B1120] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                {t('noSections')}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {sections.map((sec) => {
                  const sheetUrl = sec.sheet_pdf_url || sec.file_url;
                  const sheetName = sec.sheet_file_name || sec.file_name || `${sec.title} - Sheet.pdf`;
                  const sheetSize = sec.sheet_file_size || sec.file_size || '';

                  const solutionUrl = sec.solution_pdf_url;
                  const solutionName = sec.solution_file_name || `${sec.title} - Solution.pdf`;
                  const solutionSize = sec.solution_file_size || '';

                  return (
                    <div
                      key={sec.id}
                      className="p-5 sm:p-6 rounded-3xl bg-[#0B1120] border border-slate-800 hover:border-slate-700/80 transition-all space-y-4 shadow-xl"
                    >
                      {/* Section Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
                          <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shrink-0 shadow-lg shadow-emerald-950/40">
                            <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60">
                                Section {sec.number}
                              </span>
                              {sec.created_at && (
                                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(sec.created_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-white mt-1.5 leading-snug">
                              {sec.title}
                            </h3>
                            {sec.description && (
                              <p className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-2">
                                {sec.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* TWO SEPARATE CARDS: 1. Sheet PDF & 2. Solution PDF */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-slate-800/80">
                        {/* CARD 1: 📄 SHEET PDF */}
                        <div
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                            sheetUrl
                              ? 'bg-slate-900/90 border-blue-500/30 hover:border-blue-500/60 shadow-md'
                              : 'bg-slate-900/40 border-slate-800/80 border-dashed'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  sheetUrl
                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                    : 'bg-slate-800/60 text-slate-500 border border-slate-700/40'
                                }`}
                              >
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-sm font-bold text-white">📄 Sheet PDF</h4>
                                  {sheetSize && (
                                    <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.2 rounded bg-slate-800">
                                      {sheetSize}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {sheetUrl ? (sheetName || 'Lab exercises & problems') : 'Exercises & problems'}
                                </p>
                              </div>
                            </div>

                            {sheetUrl && (
                              <span className="text-[10px] font-bold text-blue-300 bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded-full shrink-0">
                                Available
                              </span>
                            )}
                          </div>

                          {sheetUrl ? (
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                              <button
                                onClick={() =>
                                  handleView({
                                    file_url: sheetUrl,
                                    title: `${sec.title} — Sheet`,
                                    file_name: sheetName,
                                    type: 'section',
                                  })
                                }
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] shadow-md shadow-blue-950/40 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" /> View Sheet
                              </button>
                              <button
                                onClick={() =>
                                  handleDownload({
                                    file_url: sheetUrl,
                                    title: `${sec.title} — Sheet`,
                                    file_name: sheetName,
                                    type: 'section',
                                  })
                                }
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-xs sm:text-sm font-bold border border-slate-700 transition-all min-h-[44px] cursor-pointer"
                              >
                                <Download className="w-4 h-4" /> Download
                              </button>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center justify-center gap-2 text-slate-400 text-xs">
                              <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="font-medium text-slate-400">Not Available Yet</span>
                            </div>
                          )}
                        </div>

                        {/* CARD 2: ✅ SOLUTION PDF */}
                        <div
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                            solutionUrl
                              ? 'bg-slate-900/90 border-emerald-500/30 hover:border-emerald-500/60 shadow-md'
                              : 'bg-slate-900/40 border-slate-800/80 border-dashed'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  solutionUrl
                                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-slate-800/60 text-slate-500 border border-slate-700/40'
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-sm font-bold text-white">✅ Solution PDF</h4>
                                  {solutionSize && (
                                    <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.2 rounded bg-slate-800">
                                      {solutionSize}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {solutionUrl ? (solutionName || 'Model answers & solutions') : 'Model answers & explanations'}
                                </p>
                              </div>
                            </div>

                            {solutionUrl && (
                              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full shrink-0">
                                Available
                              </span>
                            )}
                          </div>

                          {solutionUrl ? (
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                              <button
                                onClick={() =>
                                  handleView({
                                    file_url: solutionUrl,
                                    title: `${sec.title} — Solution`,
                                    file_name: solutionName,
                                    type: 'section',
                                  })
                                }
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] shadow-md shadow-emerald-950/40 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" /> View Solution
                              </button>
                              <button
                                onClick={() =>
                                  handleDownload({
                                    file_url: solutionUrl,
                                    title: `${sec.title} — Solution`,
                                    file_name: solutionName,
                                    type: 'section',
                                  })
                                }
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-xs sm:text-sm font-bold border border-slate-700 transition-all min-h-[44px] cursor-pointer"
                              >
                                <Download className="w-4 h-4" /> Download
                              </button>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center justify-center gap-2 text-slate-400 text-xs">
                              <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span className="font-medium text-slate-400">Not Available Yet</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* QUIZZES TAB                                                    */}
        {/* ============================================================== */}
        {activeTab === 'quizzes' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-2">Available Quizzes</h2>
            {quizzes.length === 0 ? (
              <div className="bg-[#0B1120] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                {t('noQuizzes')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quizzes.map((q) => (
                  <div
                    key={q.id}
                    className="p-6 bg-[#0B1120] border border-slate-800 rounded-2xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-900/50 text-amber-300 border border-amber-700/50">
                          Quiz {q.number || 1}
                        </span>
                        <HelpCircle className="w-5 h-5 text-amber-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white">{q.title}</h3>
                      <p className="text-xs text-slate-400 mt-2">{q.description}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                      <a
                        href={q.external_url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px]"
                      >
                        Open Quiz Form <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* STUDY NOTES & EXTRA MATERIALS TAB                              */}
        {/* ============================================================== */}
        {activeTab === 'study_notes' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-2">Study Notes & Revision</h2>
            {studyNotes.length === 0 ? (
              <div className="bg-[#0B1120] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                {t('noNotes')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {studyNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-6 bg-[#0B1120] border border-slate-800 rounded-3xl flex flex-col justify-between hover:border-slate-700 transition-all"
                  >
                    <div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 uppercase">
                        {note.category}
                      </span>
                      <h3 className="text-base font-bold text-white mt-3">{note.title}</h3>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                        {note.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {note.file_size || 'Resource'}
                      </span>
                      <button
                        onClick={() => handleView(note)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold min-h-[44px]"
                      >
                        <Eye className="w-3.5 h-3.5" /> Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* WARNINGS TAB (Official Academic Warning PDF Documents)          */}
        {/* ============================================================== */}
        {activeTab === 'warnings' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#0B1120] border border-slate-800 shadow-xl">
              <div className="flex items-center gap-3.5">
                <span className="p-3 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
                  <AlertTriangle className="w-6 h-6" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      {subject.name} Academic Warnings
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-700/60">
                      {subjectWarnings.length} {subjectWarnings.length === 1 ? 'Document' : 'Documents'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Official academic and attendance warning PDF documents issued for this course.
                  </p>
                </div>
              </div>

              {isAdmin && (
                <Link
                  to="/admin"
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/40 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> + Manage Warnings in Admin
                </Link>
              )}
            </div>

            {/* Warning PDFs List (Directly accessible to all students) */}
            {subjectWarnings.length === 0 ? (
              <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-b from-emerald-950/20 via-[#0B1120] to-[#0B1120] border border-emerald-500/30 text-center shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700/60 inline-block mb-3">
                  Clean Standing
                </span>
                <h3 className="text-2xl font-black text-white">
                  No Warnings Issued
                </h3>
                <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
                  There are currently no academic or attendance warning PDF documents issued for <strong className="text-white">{subject.name}</strong>.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {subjectWarnings.map((warn) => (
                  <div
                    key={warn.id}
                    className="p-6 bg-[#0B1120] border border-slate-800 hover:border-slate-700 rounded-3xl shadow-xl transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-950/70 text-rose-300 border border-rose-700/60">
                          <FileText className="w-3.5 h-3.5" />
                          Warning PDF Document
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {warn.created_at ? new Date(warn.created_at).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white leading-snug">
                        {warn.title}
                      </h3>

                      {warn.description && (
                        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {warn.description}
                          </p>
                        </div>
                      )}

                      <div className="text-xs text-slate-500 flex items-center gap-2 font-mono">
                        <span className="truncate">{warn.file_name || 'academic_warning_list.pdf'}</span>
                        {warn.file_size && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] text-slate-400">
                            {warn.file_size}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons: View PDF, Download PDF & Direct Browser Open */}
                    <div className="pt-4 border-t border-slate-800 flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => handleView(warn)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-rose-950/40 cursor-pointer min-h-[44px]"
                      >
                        <Eye className="w-4 h-4" /> View PDF
                      </button>

                      <button
                        onClick={() => handleDownload(warn)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-white rounded-xl text-xs sm:text-sm font-bold border border-slate-700 transition-all cursor-pointer min-h-[44px]"
                      >
                        <Download className="w-4 h-4" /> Download PDF
                      </button>

                      {(warn.file_url || warn.external_url) && (
                        <a
                          href={warn.file_url || warn.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-white border border-slate-700 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Open PDF directly in new browser tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* NEWS & ANNOUNCEMENTS TAB (Inside Every Subject!)                */}
        {/* ============================================================== */}
        {activeTab === 'announcements' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                <Bell className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {subject.name} News & Announcements
                </h2>
                <p className="text-xs text-slate-400">
                  Official announcements linked specifically to this subject.
                </p>
              </div>
            </div>

            {subjectAnnouncements.length === 0 ? (
              <div className="bg-[#0B1120] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                <Bell className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p>{t('noAnnouncements')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {subjectAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    className={`p-6 rounded-2xl border transition-all ${
                      ann.is_important
                        ? 'bg-blue-950/20 border-blue-500/40 shadow-lg shadow-blue-500/5'
                        : 'bg-[#0B1120] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {ann.category}
                        </span>
                        {ann.is_important && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-900/60 text-rose-300 border border-rose-700/50">
                            IMPORTANT
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(ann.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">{ann.title}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{ann.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ROADMAP TAB                                                    */}
        {/* ============================================================== */}
        {activeTab === 'roadmap' && (
          <div>
            <StudyRoadmap
              subject={subject}
              lectures={lectures}
              currentLectureId={currentLectureId}
              onSelectLecture={(lec) => {
                setCurrentLectureId(lec.id);
                recordStudyActivity({
                  subjectId: subject.id,
                  lectureId: lec.id,
                  lectureNumber: lec.number,
                  lectureTitle: lec.title,
                });
              }}
              isCompleted={isLectureCompleted}
              onToggleCompleted={handleToggleCompleted}
            />
          </div>
        )}
      </main>

      {/* Universal File Preview Modal */}
      <FilePreviewModal
        isOpen={previewModal.isOpen}
        fileUrl={previewModal.fileUrl}
        title={previewModal.title}
        fileName={previewModal.fileName}
        onClose={() =>
          setPreviewModal({ isOpen: false, fileUrl: '', title: '', fileName: '' })
        }
      />
    </div>
  );
}
