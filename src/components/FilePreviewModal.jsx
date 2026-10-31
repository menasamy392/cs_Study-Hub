import React, { useEffect, useState } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  Play,
  RotateCw,
  AlertCircle,
} from 'lucide-react';

function getMediaType(url = '', fileName = '') {
  const cleanUrl = url.toLowerCase();
  const cleanName = fileName.toLowerCase();

  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (cleanName.endsWith('.mp4') || cleanUrl.endsWith('.mp4') || cleanName.endsWith('.webm')) {
    return 'video';
  }
  if (
    cleanName.endsWith('.png') ||
    cleanName.endsWith('.jpg') ||
    cleanName.endsWith('.jpeg') ||
    cleanName.endsWith('.webp') ||
    cleanName.endsWith('.svg') ||
    cleanName.endsWith('.gif')
  ) {
    return 'image';
  }
  if (cleanName.endsWith('.pdf') || cleanUrl.endsWith('.pdf') || cleanUrl.includes('pdf')) {
    return 'pdf';
  }
  return 'pdf'; // Default preview
}

function getYouTubeEmbedUrl(url) {
  if (!url) return '';
  if (url.includes('youtube.com/embed/')) return url;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube-nocookie.com/embed/${match[2]}?autoplay=1&rel=0`;
  }
  return url;
}

export default function FilePreviewModal({
  isOpen,
  fileUrl,
  title = 'Document Preview',
  fileName = 'file.pdf',
  onClose,
}) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [viewMode, setViewMode] = useState('direct'); // 'direct' | 'google'
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    setViewMode('direct');
  }, [fileUrl]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !fileUrl) return null;

  const mediaType = getMediaType(fileUrl, fileName);

  // Ensure remote URLs have a cache-busting timestamp parameter
  const cacheBustedUrl =
    fileUrl && !fileUrl.startsWith('data:') && !fileUrl.startsWith('blob:')
      ? (!fileUrl.includes('?v=') && !fileUrl.includes('&v=')
          ? (fileUrl.includes('?') ? `${fileUrl}&v=${Date.now()}` : `${fileUrl}?v=${Date.now()}`)
          : fileUrl)
      : fileUrl;

  // Dedicated separate download function
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      // If it's a blob or data url
      if (fileUrl.startsWith('data:') || fileUrl.startsWith('blob:')) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // Try fetching as blob to force browser download without opening
      try {
        const res = await fetch(cacheBustedUrl, { mode: 'cors', cache: 'no-cache' });
        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName || 'study_document.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
          return;
        }
      } catch (err) {
        console.warn('CORS blob download fallback to direct anchor', err);
      }

      // Fallback direct anchor download
      const link = document.createElement('a');
      link.href = cacheBustedUrl;
      link.download = fileName || 'study_document.pdf';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  };

  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(cacheBustedUrl)}&embedded=true`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        className={`bg-[#0B1120] border-0 sm:border border-slate-800 rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-full sm:h-[88vh]'
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-slate-800 bg-[#0F172A]/90 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
              {mediaType === 'image' ? (
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : mediaType === 'youtube' || mediaType === 'video' ? (
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              ) : (
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-white truncate">
                {title}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">{fileName}</p>
            </div>
          </div>

          {/* Modal Header Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* View Mode Toggle for Remote PDFs */}
            {mediaType === 'pdf' && !fileUrl.startsWith('data:') && !fileUrl.startsWith('blob:') && (
              <button
                onClick={() => setViewMode((prev) => (prev === 'direct' ? 'google' : 'direct'))}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-all"
                title="Switch between Native preview & Google Docs Reader"
              >
                <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                <span>{viewMode === 'direct' ? 'Google Reader' : 'Native View'}</span>
              </button>
            )}

            {/* Separate Download Button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl shadow-sm transition-all disabled:opacity-50 min-h-[40px] sm:min-h-[36px]"
              title="Download file to device"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isDownloading ? 'Downloading...' : 'Download'}
              </span>
            </button>

            {/* Open in New Window */}
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 sm:p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Open direct file link in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Fullscreen Toggle - Visible on mobile & desktop! */}
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 sm:p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              title={isFullScreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullScreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Preview Area */}
        <div className="flex-1 w-full h-full bg-[#070B14] relative overflow-hidden flex flex-col items-center justify-center">
          {/* YouTube Player */}
          {mediaType === 'youtube' && (
            <div className="relative w-full h-full aspect-video bg-black flex items-center justify-center">
              <iframe
                src={getYouTubeEmbedUrl(fileUrl)}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          )}

          {/* HTML5 Video Player */}
          {mediaType === 'video' && (
            <div className="w-full h-full flex items-center justify-center p-4 bg-black">
              <video
                src={fileUrl}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-xl shadow-2xl"
              />
            </div>
          )}

          {/* Image Preview */}
          {mediaType === 'image' && (
            <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
              <img
                src={fileUrl}
                alt={title}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              />
            </div>
          )}

          {/* PDF Viewer */}
          {mediaType === 'pdf' && (
            <div className="w-full h-full relative">
              <iframe
                key={`${viewMode}_${cacheBustedUrl}`}
                src={
                  viewMode === 'google' && !fileUrl.startsWith('data:')
                    ? googleViewerUrl
                    : `${cacheBustedUrl}#toolbar=1&navpanes=0`
                }
                title={title}
                className="w-full h-full border-0 bg-slate-900"
              />

              {/* Mobile helper ribbon with Safe Area padding */}
              <div className="sm:hidden absolute bottom-0 inset-x-0 px-3.5 py-2.5 bg-[#0F172A]/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-between text-xs text-slate-300 pb-[max(env(safe-area-inset-bottom,0px),0.625rem)]">
                {!fileUrl.startsWith('data:') && !fileUrl.startsWith('blob:') ? (
                  <button
                    onClick={() => setViewMode((prev) => (prev === 'direct' ? 'google' : 'direct'))}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 font-medium active:scale-95 text-[11px]"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                    <span>{viewMode === 'direct' ? 'Google View' : 'Native'}</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 font-mono">PDF Loaded</span>
                )}
                <div className="flex items-center gap-2">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 font-medium active:scale-95 text-[11px]"
                  >
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                    <span>Open</span>
                  </a>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold active:scale-95 text-[11px] shadow-sm"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
