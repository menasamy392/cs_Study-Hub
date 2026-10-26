import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-[#070B14] transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/20">
              S
            </div>
            <div>
              <p className="font-bold text-white text-sm">
                Study <span className="text-blue-500">Hub</span>
              </p>
              <p className="text-xs text-slate-500">
                University Academic Study & Roadmap Platform
              </p>
            </div>
          </div>

          {/* Clean Student Navigation Links */}
          <div className="flex items-center gap-6 text-xs sm:text-sm text-slate-400">
            <Link to="/" className="hover:text-blue-400 transition-colors">
              Home
            </Link>
            <a href="/#subjects" className="hover:text-blue-400 transition-colors">
              Subjects
            </a>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors text-xs font-semibold"
            >
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              Admin Portal
            </Link>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-8 pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Study Hub. Built for University Students.</p>
          <p className="text-slate-400">
            All your lectures, sections, quizzes, and roadmap in one place.
          </p>
        </div>
      </div>
    </footer>
  );
}
