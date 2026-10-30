import React from 'react';
import { Check, Star, Sparkles, ChevronRight, CheckCircle2, Play } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function StudyRoadmap({
  subject,
  lectures = [],
  currentLectureId,
  onSelectLecture,
  isCompleted,
  onToggleCompleted,
}) {
  const { t } = useLanguage();

  const totalLectures = lectures.length;
  const completedCount = lectures.filter((l) => isCompleted(subject.id, l.id)).length;
  const progressPercent = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

  // Find next recommended lecture to study
  const nextLecture = lectures.find((l) => !isCompleted(subject.id, l.id)) || lectures[0];
  const minPathWidth = Math.max(540, (lectures.length + 1) * 95);

  return (
    <div className="w-full bg-[#0B1120] border border-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-1/4 w-96 h-40 bg-blue-600/10 blur-[90px] rounded-full pointer-events-none" />

      {/* Top Header: Progress Bar & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-800/80 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {subject.name} {t('roadmap')}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Follow the connected learning path. Tap any node to study or review.
          </p>
        </div>

        {/* Completion Stat Badge & Progress bar */}
        <div className="flex flex-col sm:items-end gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-white">
              {completedCount} of {totalLectures} {t('lectures')} completed
            </span>
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-400 border border-blue-700/50">
              {progressPercent}%
            </span>
          </div>

          <div className="w-full sm:w-64 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mobile Swipe Hint */}
      {lectures.length > 3 && (
        <div className="flex items-center justify-between pt-2.5 sm:hidden text-[11px]">
          <span className="text-blue-400 font-semibold flex items-center gap-1">
            ← Swipe to view full path →
          </span>
          <span className="text-slate-500">Tap node to open</span>
        </div>
      )}

      {/* Zigzag Learning Path Container */}
      <div className="mt-4 sm:mt-8 overflow-x-auto pb-6 pt-4 touch-pan-x scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <div
          style={{ minWidth: `${minPathWidth}px` }}
          className="flex items-center justify-between px-4 sm:px-6 relative"
        >
          {/* Connected SVG zigzag wave line */}
          <svg
            className="absolute top-1/2 left-8 right-8 -translate-y-1/2 w-[calc(100%-4rem)] h-20 sm:h-24 pointer-events-none -z-0"
            preserveAspectRatio="none"
          >
            <path
              d={generateWavePath(lectures.length + 1)}
              fill="none"
              stroke="#1E293B"
              strokeWidth="4"
              strokeDasharray="6 6"
            />
          </svg>

          {/* Lecture Nodes */}
          {lectures.map((lec, idx) => {
            const isDone = isCompleted(subject.id, lec.id);
            const isCurrent = lec.id === currentLectureId;
            // Alternate vertical offset for authentic zigzag wave effect
            const isEven = idx % 2 === 0;

            return (
              <div
                key={lec.id}
                className={`relative z-10 flex flex-col items-center group cursor-pointer transition-transform duration-200 active:scale-95 ${
                  isEven ? '-translate-y-3 sm:-translate-y-4' : 'translate-y-4 sm:translate-y-5'
                }`}
                onClick={() => onSelectLecture(lec)}
              >
                {/* Step Circle Node */}
                <div
                  className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 ${
                    isCurrent
                      ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-400/40 shadow-lg shadow-amber-500/50 scale-110 animate-pulse'
                      : isDone
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-500/20 shadow-md shadow-emerald-600/30'
                      : 'bg-[#0F172A] text-slate-300 border-2 border-slate-700 hover:border-blue-500 hover:text-white'
                  }`}
                >
                  {isDone ? (
                    <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
                  ) : (
                    <span>{lec.number || idx + 1}</span>
                  )}

                  {/* Active Indicator Pulse Ring */}
                  {isCurrent && (
                    <span className="absolute -inset-1 rounded-full border-2 border-amber-400 animate-ping opacity-60" />
                  )}
                </div>

                {/* Node Label Underneath */}
                <div className="mt-2 sm:mt-2.5 max-w-[85px] sm:max-w-[100px] text-center">
                  <p
                    className={`text-[11px] sm:text-xs font-semibold leading-tight line-clamp-2 transition-colors ${
                      isCurrent
                        ? 'text-amber-300 font-bold'
                        : isDone
                        ? 'text-emerald-400'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {lec.title.replace(/^Lecture\s*\d+:\s*/i, '')}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Final Star Node: Revision */}
          <div
            className={`relative z-10 flex flex-col items-center ${
              lectures.length % 2 === 0 ? '-translate-y-3 sm:-translate-y-4' : 'translate-y-4 sm:translate-y-5'
            }`}
          >
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${
                progressPercent === 100
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/50'
                  : 'bg-[#0F172A] text-blue-400 border-2 border-blue-500/40'
              }`}
            >
              <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            </div>
            <div className="mt-2 sm:mt-2.5 text-center">
              <span className="text-[11px] sm:text-xs font-bold text-slate-400">Revision</span>
            </div>
          </div>
        </div>
      </div>

      {/* Next Up / Current helper footer */}
      {nextLecture && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 font-bold">
              UP NEXT
            </span>
            <span className="text-white font-medium">
              Lecture {nextLecture.number}: {nextLecture.title}
            </span>
          </div>

          <button
            onClick={() => onSelectLecture(nextLecture)}
            className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-semibold transition-colors"
          >
            Go to Lecture <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// Generate an SVG path oscillating up and down to match zigzag node coordinates
function generateWavePath(nodeCount) {
  if (nodeCount <= 1) return 'M 0 40 L 1000 40';
  let path = 'M 20 20';
  for (let i = 1; i < nodeCount; i++) {
    const x = (i / (nodeCount - 1)) * 950 + 20;
    const y = i % 2 === 0 ? 20 : 65;
    path += ` L ${x} ${y}`;
  }
  return path;
}
