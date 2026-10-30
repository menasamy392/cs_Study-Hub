import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BookOpen, PlayCircle, Bell } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function MobileBottomNav({ onOpenNews }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { lastStudied, announcements = [] } = useData();

  const isHome = location.pathname === '/' && !location.hash;
  const isSubjects =
    location.pathname.startsWith('/subject') ||
    (location.pathname === '/' && location.hash === '#subjects');
  const isContinueActive = Boolean(
    location.pathname.startsWith('/subject') && location.search.includes('lectureId')
  );

  const unreadNewsCount = announcements.filter((a) => a.is_important).length;

  const handleNavHome = () => {
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  const handleNavSubjects = () => {
    if (location.pathname === '/') {
      const el = document.getElementById('subjects');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.hash = '#subjects';
      }
    } else {
      navigate('/#subjects');
      setTimeout(() => {
        document.getElementById('subjects')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleNavContinue = () => {
    if (lastStudied?.subjectId) {
      navigate(`/subject/${lastStudied.subjectId}?lectureId=${lastStudied.lectureId || ''}`);
    } else {
      handleNavSubjects();
    }
  };

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0B1120]/95 backdrop-blur-xl border-t border-slate-800/90 shadow-[0_-4px_24px_rgba(0,0,0,0.6)] px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),0.5rem)] transition-all duration-200"
    >
      <div className="grid grid-cols-4 items-center justify-around max-w-md mx-auto">
        {/* Tab 1: Home */}
        <button
          onClick={handleNavHome}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl min-h-[48px] transition-all active:scale-95 cursor-pointer ${
            isHome
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <Home className={`w-5 h-5 ${isHome ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {isHome && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-sm shadow-blue-500/80" />
            )}
          </div>
          <span className="text-[11px] mt-1 tracking-tight">Home</span>
        </button>

        {/* Tab 2: Subjects */}
        <button
          onClick={handleNavSubjects}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl min-h-[48px] transition-all active:scale-95 cursor-pointer ${
            isSubjects && !isContinueActive
              ? 'text-blue-400 font-bold'
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <BookOpen className={`w-5 h-5 ${isSubjects && !isContinueActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {isSubjects && !isContinueActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-sm shadow-blue-500/80" />
            )}
          </div>
          <span className="text-[11px] mt-1 tracking-tight">Subjects</span>
        </button>

        {/* Tab 3: Continue Studying */}
        <button
          onClick={handleNavContinue}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl min-h-[48px] transition-all active:scale-95 cursor-pointer ${
            isContinueActive
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <PlayCircle className={`w-5 h-5 ${isContinueActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {lastStudied?.subjectId && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-[#0B1120]" />
            )}
            {isContinueActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-sm shadow-emerald-400/80" />
            )}
          </div>
          <span className="text-[11px] mt-1 tracking-tight">Resume</span>
        </button>

        {/* Tab 4: News */}
        <button
          onClick={onOpenNews}
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl min-h-[48px] transition-all active:scale-95 text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
        >
          <div className="relative">
            <Bell className="w-5 h-5 stroke-2" />
            {unreadNewsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-3.5 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[#0B1120]">
                {unreadNewsCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1 tracking-tight">News</span>
        </button>
      </div>
    </nav>
  );
}
