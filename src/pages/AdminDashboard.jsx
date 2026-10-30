import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Upload,
  ExternalLink,
  Shield,
  LogOut,
  Sparkles,
  Database,
  Search,
  Filter,
  CheckCircle,
  HelpCircle,
  Layers,
  Play,
  RotateCcw,
  Copy,
  ChevronDown,
  Bell,
  Calendar,
  Flame,
  AlertTriangle,
  ShieldAlert,
  Eye,
  Download,
  Terminal,
  Key,
  Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../components/Toast';
import ConfirmationModal from '../components/ConfirmationModal';
import FilePreviewModal from '../components/FilePreviewModal';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { SCHEMA_SQL, MIGRATION_DELETE_SQL, MIGRATION_ANALYTICS_SQL } from '../lib/schemaSql';

const AVAILABLE_ICONS = [
  'BookOpen',
  'Database',
  'BarChart3',
  'ShoppingCart',
  'ShieldCheck',
  'Code2',
  'Cpu',
  'Server',
  'Network',
  'FolderGit2',
  'Terminal',
];

const AVAILABLE_COLORS = ['blue', 'emerald', 'indigo', 'rose', 'amber'];

const ANNOUNCEMENT_CATEGORIES = [
  'New Lecture',
  'New Section',
  'Quiz',
  'Assignment',
  'Exam',
  'General Announcement',
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, signOut, isConfigured } = useAuth();
  const {
    subjects,
    materials,
    allAnnouncements,
    warnings = [],
    addSubject,
    updateSubject,
    deleteSubject,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    addWarning,
    updateWarning,
    deleteWarning,
    uploadFile,
    resetToDemoData,
    seedCloudDatabase,
  } = useData();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('materials'); // 'materials' | 'subjects' | 'announcements' | 'warnings' | 'supabase_setup'

  // Live Supabase Database Health Check State
  const [dbStatus, setDbStatus] = useState({
    checking: true,
    connected: false,
    tablesReady: false,
    deleteProcedureReady: false,
    analyticsReady: false,
    hasServiceRoleKey: false,
    projectRef: 'qksklthfpbcwseiqpajq',
    message: '',
    error: '',
    counts: null,
    storageBucket: null,
  });
  const [isSeeding, setIsSeeding] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [copiedMigrationSql, setCopiedMigrationSql] = useState(false);

  const checkDbConnectivity = useCallback(async () => {
    setDbStatus((prev) => ({ ...prev, checking: true }));
    try {
      const res = await fetch('/api/admin/db-status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDbStatus({
          checking: false,
          connected: Boolean(data.connected),
          tablesReady: Boolean(data.tablesReady),
          deleteProcedureReady: Boolean(data.deleteProcedureReady),
          analyticsReady: Boolean(data.analyticsReady),
          hasServiceRoleKey: Boolean(data.hasServiceRoleKey),
          projectRef: data.projectRef || 'qksklthfpbcwseiqpajq',
          message: data.message || '',
          error: data.error || '',
          counts: data.counts || null,
          storageBucket: data.storageBucket || null,
        });
      } else {
        setDbStatus({
          checking: false,
          connected: false,
          tablesReady: false,
          deleteProcedureReady: false,
          analyticsReady: false,
          hasServiceRoleKey: false,
          projectRef: 'qksklthfpbcwseiqpajq',
          message: '',
          error: `HTTP ${res.status}: Failed to reach database status endpoint.`,
          counts: null,
          storageBucket: null,
        });
      }
    } catch (err) {
      setDbStatus({
        checking: false,
        connected: false,
        tablesReady: false,
        deleteProcedureReady: false,
        analyticsReady: false,
        hasServiceRoleKey: false,
        projectRef: 'qksklthfpbcwseiqpajq',
        message: '',
        error: err.message || 'Network error reaching backend.',
        counts: null,
        storageBucket: null,
      });
    }
  }, []);

  useEffect(() => {
    checkDbConnectivity();
  }, [checkDbConnectivity]);

  const handleSeedDatabase = async () => {
    if (!seedCloudDatabase) return;
    try {
      setIsSeeding(true);
      const res = await seedCloudDatabase();
      addToast(res.message || 'Seeded cloud database with curriculum!', 'success');
      await checkDbConnectivity();
    } catch (err) {
      addToast(err.message || 'Failed to seed cloud database', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  // Material Filters
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [searchMaterial, setSearchMaterial] = useState('');

  // Warning Filters
  const [warningSearch, setWarningSearch] = useState('');
  const [warningSubjectFilter, setWarningSubjectFilter] = useState('all');

  // Modals state
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    instructor: '',
    semester: '',
    description: '',
    icon: 'BookOpen',
    color: 'blue',
  });

  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [materialForm, setMaterialForm] = useState({
    subject_id: '',
    title: '',
    type: 'lecture',
    number: 1,
    description: '',
    category: 'summary',
    external_url: '',
    file_url: '',
    file_name: '',
    file_size: '',
  });

  // Announcement Modal state
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({
    subject_id: '',
    title: '',
    description: '',
    category: 'General Announcement',
    is_important: false,
    expires_at: '',
  });

  // Warning Modal state (PDF Document Warnings)
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [editingWarning, setEditingWarning] = useState(null);
  const [warningForm, setWarningForm] = useState({
    subject_id: '',
    title: '',
    description: '',
    file_url: '',
    file_name: '',
    file_size: '',
    external_url: '',
  });
  const [selectedWarningFile, setSelectedWarningFile] = useState(null);
  const [isUploadingWarning, setIsUploadingWarning] = useState(false);

  // File Preview Modal for Dashboard
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    fileUrl: '',
    title: '',
    fileName: '',
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Confirmation Delete Modal
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    type: '', // 'subject' | 'material' | 'announcement' | 'warning'
    id: null,
    title: '',
    details: null,
  });

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchSubject = selectedSubjectFilter === 'all' || m.subject_id === selectedSubjectFilter;
      const matchType = selectedTypeFilter === 'all' || m.type === selectedTypeFilter;
      const matchSearch =
        !searchMaterial ||
        m.title.toLowerCase().includes(searchMaterial.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchMaterial.toLowerCase()));
      return matchSubject && matchType && matchSearch;
    });
  }, [materials, selectedSubjectFilter, selectedTypeFilter, searchMaterial]);

  // Filtered warnings (Warning PDF Documents)
  const filteredWarnings = useMemo(() => {
    return warnings.filter((w) => {
      const matchSubject = warningSubjectFilter === 'all' || w.subject_id === warningSubjectFilter;
      const matchSearch =
        !warningSearch ||
        w.title?.toLowerCase().includes(warningSearch.toLowerCase()) ||
        (w.description && w.description.toLowerCase().includes(warningSearch.toLowerCase())) ||
        (w.file_name && w.file_name.toLowerCase().includes(warningSearch.toLowerCase()));
      return matchSubject && matchSearch;
    });
  }, [warnings, warningSubjectFilter, warningSearch]);

  // Handle Subject Modal Open
  const handleOpenSubjectModal = (subject = null) => {
    if (subject) {
      setEditingSubject(subject);
      setSubjectForm({
        name: subject.name,
        code: subject.code || '',
        instructor: subject.instructor || '',
        semester: subject.semester || '',
        description: subject.description || '',
        icon: subject.icon || 'BookOpen',
        color: subject.color || 'blue',
      });
    } else {
      setEditingSubject(null);
      setSubjectForm({
        name: '',
        code: '',
        instructor: '',
        semester: 'Level 3 • Semester 1 • Core course',
        description: '',
        icon: 'BookOpen',
        color: 'blue',
      });
    }
    setSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    if (!subjectForm.name.trim()) {
      addToast('Subject name is required', 'error');
      return;
    }

    try {
      setIsSaving(true);
      if (editingSubject) {
        await updateSubject(editingSubject.id, subjectForm);
        addToast('Subject updated successfully!', 'success');
      } else {
        await addSubject(subjectForm);
        addToast('New subject created successfully!', 'success');
      }
      setSubjectModalOpen(false);
    } catch (err) {
      addToast(err.message || 'Failed to save subject', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Material Modal Open
  const handleOpenMaterialModal = (material = null, defaultType = 'lecture') => {
    setSelectedFile(null);
    if (material) {
      setEditingMaterial(material);
      setMaterialForm({
        subject_id: material.subject_id,
        title: material.title,
        type: material.type,
        number: material.number || 1,
        description: material.description || '',
        category: material.category || 'summary',
        external_url: material.external_url || '',
        file_url: material.file_url || '',
        file_name: material.file_name || '',
        file_size: material.file_size || '',
      });
    } else {
      setEditingMaterial(null);
      setMaterialForm({
        subject_id: subjects[0]?.id || '',
        title: '',
        type: defaultType,
        number: 1,
        description: '',
        category: 'summary',
        external_url: '',
        file_url: '',
        file_name: '',
        file_size: '',
      });
    }
    setMaterialModalOpen(true);
  };

  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    if (!materialForm.title.trim()) {
      addToast('Material title is required', 'error');
      return;
    }
    if (!materialForm.subject_id) {
      addToast('Please select a subject', 'error');
      return;
    }

    try {
      setIsSaving(true);
      let updatedData = { ...materialForm };

      if (selectedFile) {
        setIsUploading(true);
        const folder = materialForm.type === 'lecture' ? 'lectures' : 'sections';
        const uploadRes = await uploadFile(selectedFile, folder);
        updatedData.file_url = uploadRes.file_url;
        updatedData.file_name = uploadRes.file_name;
        updatedData.file_size = uploadRes.file_size;
        setIsUploading(false);
      }

      if (editingMaterial) {
        await updateMaterial(editingMaterial.id, updatedData);
        addToast('Material updated successfully!', 'success');
      } else {
        await addMaterial(updatedData);
        addToast('Material added successfully!', 'success');
      }
      setMaterialModalOpen(false);
    } catch (err) {
      addToast(err.message || 'Failed to save material', 'error');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  // Announcement Modal Handlers
  const handleOpenAnnouncementModal = (ann = null) => {
    if (ann) {
      setEditingAnnouncement(ann);
      setAnnouncementForm({
        subject_id: ann.subject_id,
        title: ann.title,
        description: ann.description || '',
        category: ann.category || 'General Announcement',
        is_important: Boolean(ann.is_important),
        expires_at: ann.expires_at ? ann.expires_at.split('T')[0] : '',
      });
    } else {
      setEditingAnnouncement(null);
      setAnnouncementForm({
        subject_id: subjects[0]?.id || '',
        title: '',
        description: '',
        category: 'New Lecture',
        is_important: false,
        expires_at: '',
      });
    }
    setAnnouncementModalOpen(true);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementForm.title.trim()) {
      addToast('Announcement title is required', 'error');
      return;
    }
    if (!announcementForm.subject_id) {
      addToast('Please select a subject', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        ...announcementForm,
        expires_at: announcementForm.expires_at ? new Date(announcementForm.expires_at).toISOString() : null,
      };

      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, payload);
        addToast('Announcement updated successfully!', 'success');
      } else {
        await addAnnouncement(payload);
        addToast('Announcement published successfully! Appears on subject and homepage.', 'success');
      }
      setAnnouncementModalOpen(false);
    } catch (err) {
      addToast(err.message || 'Failed to save announcement', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Warning Modal Handlers (PDF Documents)
  const handleOpenWarningModal = (warning = null) => {
    setSelectedWarningFile(null);
    if (warning) {
      setEditingWarning(warning);
      setWarningForm({
        subject_id: warning.subject_id,
        title: warning.title,
        description: warning.description || '',
        file_url: warning.file_url || '',
        file_name: warning.file_name || '',
        file_size: warning.file_size || '',
        external_url: warning.external_url || '',
      });
    } else {
      setEditingWarning(null);
      setWarningForm({
        subject_id: subjects[0]?.id || '',
        title: '',
        description: '',
        file_url: '',
        file_name: '',
        file_size: '',
        external_url: '',
      });
    }
    setWarningModalOpen(true);
  };

  const handleSaveWarning = async (e) => {
    e.preventDefault();
    if (!warningForm.title.trim()) {
      addToast('Warning PDF title is required', 'error');
      return;
    }
    if (!warningForm.subject_id) {
      addToast('Please select a subject', 'error');
      return;
    }
    if (!selectedWarningFile && !warningForm.file_url && !warningForm.external_url) {
      addToast('Please upload a PDF file or provide a document link', 'error');
      return;
    }

    try {
      setIsSaving(true);
      let updatedData = { ...warningForm };

      // Upload or replace PDF file
      if (selectedWarningFile) {
        setIsUploadingWarning(true);
        const uploadRes = await uploadFile(selectedWarningFile, 'warnings');
        updatedData.file_url = uploadRes.file_url;
        updatedData.file_name = uploadRes.file_name;
        updatedData.file_size = uploadRes.file_size;
        setIsUploadingWarning(false);
      }

      if (editingWarning) {
        await updateWarning(editingWarning.id, updatedData);
        addToast(`Warning PDF "${updatedData.title}" updated successfully!`, 'success');
      } else {
        await addWarning(updatedData);
        addToast(`Warning PDF "${updatedData.title}" uploaded successfully!`, 'success');
      }
      setWarningModalOpen(false);
      setSelectedWarningFile(null);
    } catch (err) {
      console.error('Save warning error:', err);
      addToast(err.message || 'Failed to save warning PDF', 'error');
    } finally {
      setIsSaving(false);
      setIsUploadingWarning(false);
    }
  };

  const handleViewWarning = (warn) => {
    const url = warn.file_url || warn.external_url;
    if (!url) {
      addToast('No preview available for this document', 'error');
      return;
    }
    setPreviewModal({
      isOpen: true,
      fileUrl: url,
      title: warn.title,
      fileName: warn.file_name || `${warn.title}.pdf`,
    });
  };

  const handleDownloadWarning = async (warn) => {
    const url = warn.file_url || warn.external_url;
    if (!url) {
      addToast('No download link available', 'error');
      return;
    }
    try {
      addToast('Preparing PDF download...', 'info');
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = warn.file_name || `${warn.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      addToast('Download completed!', 'success');
    } catch {
      window.open(url, '_blank');
    }
  };

  const confirmDelete = async () => {
    try {
      setIsSaving(true);
      if (deleteModal.type === 'subject') {
        await deleteSubject(deleteModal.id);
        addToast(`Subject "${deleteModal.title}" permanently deleted from database.`, 'success');
      } else if (deleteModal.type === 'material') {
        await deleteMaterial(deleteModal.id);
        addToast(`Material "${deleteModal.title}" deleted successfully.`, 'success');
      } else if (deleteModal.type === 'announcement') {
        await deleteAnnouncement(deleteModal.id);
        addToast(`Announcement "${deleteModal.title}" deleted.`, 'success');
      } else if (deleteModal.type === 'warning') {
        await deleteWarning(deleteModal.id);
        addToast(`Warning for "${deleteModal.title}" permanently deleted.`, 'success');
      }
      setDeleteModal({ isOpen: false, type: '', id: null, title: '', details: null });
    } catch (err) {
      console.error('Delete error:', err);
      addToast(err.message || 'Failed to delete item', 'error');
      if (err.requiresMigration || err.message?.includes('Migration Required') || err.message?.includes('delete procedure')) {
        setShowMigrationModal(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    addToast('Signed out of admin portal.', 'info');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white pb-24">
      {/* Top Admin Workspace Header */}
      <header className="bg-[#0B1120] border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-blue-500/20">
              S
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">
                Study Hub — Admin Portal
              </h1>
              <p className="text-xs text-slate-400">
                Department Management Workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                if (dbStatus.connected && dbStatus.tablesReady && !dbStatus.deleteProcedureReady) {
                  setShowMigrationModal(true);
                } else {
                  setActiveTab('supabase_setup');
                }
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
              title="Click to check Supabase cloud connection status"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  dbStatus.checking
                    ? 'bg-amber-400 animate-ping'
                    : dbStatus.connected && dbStatus.tablesReady && dbStatus.deleteProcedureReady
                    ? 'bg-emerald-500 animate-pulse'
                    : dbStatus.connected
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
              />
              <span
                className={
                  dbStatus.connected && dbStatus.tablesReady && dbStatus.deleteProcedureReady
                    ? 'text-emerald-300'
                    : dbStatus.connected
                    ? 'text-amber-300'
                    : 'text-rose-300'
                }
              >
                {dbStatus.checking
                  ? 'Verifying Cloud DB...'
                  : dbStatus.connected && dbStatus.tablesReady && dbStatus.deleteProcedureReady
                  ? 'Connected to Supabase'
                  : dbStatus.connected && dbStatus.tablesReady && !dbStatus.deleteProcedureReady
                  ? 'Supabase: Delete SQL Needed'
                  : dbStatus.connected
                  ? 'Supabase: Tables Needed'
                  : 'Supabase Disconnected'}
              </span>
            </button>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-950/60 border border-blue-800/60 text-blue-300">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>{user?.username || 'minasami'}</span>
            </div>

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">View Live Site</span>
            </Link>

            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner when Supabase is connected but tables need to be created */}
        {dbStatus.connected && !dbStatus.tablesReady && !dbStatus.checking && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-600/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-200 text-xs">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white text-sm">Supabase Project Connected — Database Tables Needed</p>
                <p className="text-amber-300/80 mt-0.5">
                  Your website is connected to project <code className="text-amber-200 bg-amber-950/60 px-1.5 py-0.5 rounded font-mono">qksklthfpbcwseiqpajq</code>! To enable permanent cloud synchronization across all users, run the SQL schema in Supabase SQL Editor.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://supabase.com/dashboard/project/qksklthfpbcwseiqpajq/sql/new"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0 transition-colors shadow-md flex items-center gap-1.5"
              >
                Open SQL Editor <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setActiveTab('supabase_setup')}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors"
              >
                View SQL Script
              </button>
            </div>
          </div>
        )}

        {/* Banner when Supabase is connected and tables exist, but delete procedure is not active */}
        {dbStatus.connected && dbStatus.tablesReady && !dbStatus.deleteProcedureReady && !dbStatus.checking && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-500/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-200 text-xs shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white text-sm">Supabase Delete Procedure Needed</p>
                <p className="text-amber-300/90 mt-0.5">
                  Cloud database is connected, but the permanent delete procedure is not active in Supabase yet. Run the 10-second SQL script to allow deleting subjects, lectures, quizzes, and PDFs.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowMigrationModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Terminal className="w-4 h-4" /> Activate Delete Procedure
              </button>
              <a
                href="https://supabase.com/dashboard/project/qksklthfpbcwseiqpajq/sql/new"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors flex items-center gap-1.5"
              >
                Open SQL Editor <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Warning banner when Supabase cloud database is not connected */}
        {!dbStatus.connected && !dbStatus.checking && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/30 border border-rose-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-rose-200 text-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white text-sm">Supabase Cloud Database Not Connected</p>
                <p className="text-rose-300/80 mt-0.5">
                  {dbStatus.error || 'Changes cannot be saved to the cloud until valid Supabase credentials are configured in Vercel.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('supabase_setup')}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shrink-0 transition-colors shadow-md"
            >
              Fix Cloud Connection →
            </button>
          </div>
        )}

        {/* Navigation Tabs - Swipe-friendly on mobile */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4 overflow-x-auto no-scrollbar touch-pan-x -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 min-h-[44px] active:scale-95 ${
              activeTab === 'materials'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Materials ({materials.length})
          </button>

          <button
            onClick={() => setActiveTab('subjects')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 min-h-[44px] active:scale-95 ${
              activeTab === 'subjects'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Subjects ({subjects.length})
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 min-h-[44px] active:scale-95 ${
              activeTab === 'announcements'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            Announcements ({allAnnouncements.length})
          </button>

          <button
            onClick={() => setActiveTab('warnings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 min-h-[44px] active:scale-95 ${
              activeTab === 'warnings'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Student Warnings ({warnings.length})
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 min-h-[44px] active:scale-95 ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            Website Analytics
          </button>

          <button
            onClick={() => setActiveTab('supabase_setup')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 min-h-[44px] active:scale-95 ${
              activeTab === 'supabase_setup'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            Supabase Setup
          </button>
        </div>

        {/* TAB 1: MATERIALS */}
        {activeTab === 'materials' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1120] p-6 rounded-3xl border border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">University Study Materials</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Upload lectures, practical sections, quizzes, and revision cheat sheets.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleOpenMaterialModal(null, 'lecture')}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Lecture
                </button>
                <button
                  onClick={() => handleOpenMaterialModal(null, 'section')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Section
                </button>
                <button
                  onClick={() => handleOpenMaterialModal(null, 'quiz')}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Quiz
                </button>
                <button
                  onClick={() => handleOpenMaterialModal(null, 'study_material')}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Study Notes
                </button>
                <button
                  onClick={() => handleOpenWarningModal(null)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-rose-950/40"
                >
                  <AlertTriangle className="w-4 h-4" /> Add Warning
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={searchMaterial}
                onChange={(e) => setSearchMaterial(e.target.value)}
                placeholder="Filter by title..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#0B1120] border border-slate-800 text-base sm:text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0B1120] border border-slate-800 text-base sm:text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0B1120] border border-slate-800 text-base sm:text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="lecture">Lectures</option>
                <option value="section">Sections</option>
                <option value="quiz">Quizzes</option>
                <option value="study_material">Study Notes</option>
              </select>
            </div>

            {/* Table */}
            <div className="bg-[#0B1120] rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto touch-pan-x">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#0F172A] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-6 py-4">Title</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">File / Link</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredMaterials.map((mat) => {
                      const sub = subjects.find((s) => s.id === mat.subject_id);
                      return (
                        <tr key={mat.id} className="hover:bg-slate-900/40">
                          <td className="px-6 py-4 font-semibold text-white max-w-xs truncate">
                            {mat.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
                              {mat.type} #{mat.number}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                            {sub?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                            {mat.file_url ? 'PDF Attached' : mat.external_url ? 'External Link' : 'None'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenMaterialModal(mat, mat.type)}
                                className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  const typeLabel =
                                    mat.type === 'lecture'
                                      ? 'Lecture'
                                      : mat.type === 'section'
                                      ? 'Section'
                                      : mat.type === 'quiz'
                                      ? 'Quiz'
                                      : 'Study Notes';
                                  setDeleteModal({
                                    isOpen: true,
                                    type: 'material',
                                    id: mat.id,
                                    title: mat.title,
                                    typeName: typeLabel,
                                    details: [
                                      `Category: ${typeLabel}`,
                                      mat.file_name ? `Cloud file: ${mat.file_name}` : 'No cloud file attached',
                                      'Record and associated cloud storage files will be permanently deleted.',
                                    ],
                                  });
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                                title="Delete material"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUBJECTS */}
        {activeTab === 'subjects' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-[#0B1120] p-6 rounded-3xl border border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">University Subjects</h2>
                <p className="text-xs text-slate-400 mt-1">Manage courses and roadmaps.</p>
              </div>
              <button
                onClick={() => handleOpenSubjectModal(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Subject
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((sub) => (
                <div key={sub.id} className="p-6 bg-[#0B1120] border border-slate-800 rounded-3xl flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-900/50 text-blue-300 border border-blue-700/50">
                      {sub.code || 'CS'}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-3">{sub.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{sub.instructor || 'Department Faculty'}</p>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">{sub.description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <Link to={`/subject/${sub.id}`} className="text-xs font-bold text-blue-400 hover:underline">
                      Preview Subject →
                    </Link>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenSubjectModal(sub)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const relatedLecs = materials.filter((m) => m.subject_id === sub.id && m.type === 'lecture').length;
                          const relatedSecs = materials.filter((m) => m.subject_id === sub.id && m.type === 'section').length;
                          const relatedQuiz = materials.filter((m) => m.subject_id === sub.id && m.type === 'quiz').length;
                          const relatedNotes = materials.filter((m) => m.subject_id === sub.id && m.type === 'study_material').length;
                          const relatedAnn = allAnnouncements.filter((a) => a.subject_id === sub.id).length;

                          const details = [
                            `${relatedLecs} Lecture${relatedLecs === 1 ? '' : 's'}`,
                            `${relatedSecs} Practical Section${relatedSecs === 1 ? '' : 's'}`,
                            `${relatedQuiz} Quiz${relatedQuiz === 1 ? '' : 'zes'}`,
                            `${relatedNotes} Study Note${relatedNotes === 1 ? '' : 's'} / Resource${relatedNotes === 1 ? '' : 's'}`,
                            `${relatedAnn} Announcement${relatedAnn === 1 ? '' : 's'}`,
                          ].filter((item) => !item.startsWith('0 '));

                          setDeleteModal({
                            isOpen: true,
                            type: 'subject',
                            id: sub.id,
                            title: sub.name,
                            typeName: 'Subject',
                            details: details.length > 0 ? details : ['All subject records and student progress will be removed.'],
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                        title="Delete subject and all related data"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ANNOUNCEMENTS MANAGEMENT */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-[#0B1120] p-6 rounded-3xl border border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">Announcements Management</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Publish notices that appear on the homepage and inside the designated subject.
                </p>
              </div>
              <button
                onClick={() => handleOpenAnnouncementModal(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> New Announcement
              </button>
            </div>

            <div className="space-y-3">
              {allAnnouncements.map((ann) => {
                const sub = subjects.find((s) => s.id === ann.subject_id);
                return (
                  <div
                    key={ann.id}
                    className="p-5 bg-[#0B1120] border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-900/50 text-blue-300">
                          {sub?.name || 'Department'}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {ann.category}
                        </span>
                        {ann.is_important && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-900/60 text-rose-300">
                            IMPORTANT
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white">{ann.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-2xl">{ann.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenAnnouncementModal(ann)}
                        className="p-2 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const sub = subjects.find((s) => s.id === ann.subject_id);
                          setDeleteModal({
                            isOpen: true,
                            type: 'announcement',
                            id: ann.id,
                            title: ann.title,
                            typeName: 'Announcement',
                            details: [
                              `Subject: ${sub?.name || 'All Subjects'}`,
                              `Category: ${ann.category}`,
                              'This announcement will be permanently removed for all students.',
                            ],
                          });
                        }}
                        className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                        title="Delete announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: WARNINGS PDF DOCUMENTS MANAGEMENT */}
        {activeTab === 'warnings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1120] p-6 rounded-3xl border border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">Academic Warning Documents (PDF)</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950/60 text-rose-300 border border-rose-800/50">
                    {warnings.length} Active
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Upload and publish official PDF documents containing lists of students who received academic warnings.
                </p>
              </div>

              <button
                onClick={() => handleOpenWarningModal(null)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-rose-950/40 shrink-0"
              >
                <Plus className="w-4 h-4" /> + Add Warning
              </button>
            </div>

            {/* Warning Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={warningSearch}
                  onChange={(e) => setWarningSearch(e.target.value)}
                  placeholder="Search warnings by title, description or file name..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B1120] border border-slate-800 text-base sm:text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <select
                value={warningSubjectFilter}
                onChange={(e) => setWarningSubjectFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0B1120] border border-slate-800 text-base sm:text-sm text-white focus:outline-none focus:border-rose-500"
              >
                <option value="all">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Warnings Table */}
            <div className="bg-[#0B1120] rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto touch-pan-x">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#0F172A] border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-6 py-4">Warning PDF Document</th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Upload Date</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Document</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredWarnings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-60" />
                          <p className="font-medium text-slate-300">No warning PDF documents found</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {warningSearch || warningSubjectFilter !== 'all'
                              ? 'Try adjusting your search query or filter.'
                              : 'Click "+ Add Warning" above to upload an academic warning list.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredWarnings.map((warn) => {
                        const sub = subjects.find((s) => s.id === warn.subject_id);
                        return (
                          <tr key={warn.id} className="hover:bg-slate-900/40 transition-colors">
                            {/* Title & File Name */}
                            <td className="px-6 py-4">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 shrink-0 mt-0.5">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-white text-sm">
                                    {warn.title}
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span className="font-mono text-slate-400">
                                      {warn.file_name || 'warning_list.pdf'}
                                    </span>
                                    {warn.file_size && (
                                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400">
                                        {warn.file_size}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Subject */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-semibold text-slate-200">
                                {sub?.name || 'Department Subject'}
                              </span>
                              {sub?.code && (
                                <span className="block text-[11px] text-blue-400 font-mono mt-0.5">
                                  {sub.code}
                                </span>
                              )}
                            </td>

                            {/* Upload Date */}
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                              {warn.created_at ? new Date(warn.created_at).toLocaleDateString() : 'N/A'}
                            </td>

                            {/* Description */}
                            <td className="px-6 py-4 max-w-xs">
                              <p className="text-xs text-slate-300 line-clamp-2">
                                {warn.description || '—'}
                              </p>
                            </td>

                            {/* PDF View / Download */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleViewWarning(warn)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold transition-colors"
                                  title="View PDF inside website"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View
                                </button>
                                <button
                                  onClick={() => handleDownloadWarning(warn)}
                                  className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
                                  title="Download PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenWarningModal(warn)}
                                  className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-colors"
                                  title="Edit warning or replace PDF"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteModal({
                                      isOpen: true,
                                      type: 'warning',
                                      id: warn.id,
                                      title: warn.title,
                                      typeName: 'Warning Document',
                                      details: [
                                        `Subject: ${sub?.name || 'Department'}`,
                                        `File: ${warn.file_name || 'PDF Document'}`,
                                        'This warning PDF will be permanently removed from Supabase and the website.',
                                      ],
                                    })
                                  }
                                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                                  title="Delete warning"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: WEBSITE ANALYTICS */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard dbStatus={dbStatus} />
        )}

        {/* TAB 4: SUPABASE SETUP */}
        {activeTab === 'supabase_setup' && (
          <div className="max-w-4xl space-y-6 bg-[#0B1120] p-6 sm:p-8 rounded-3xl border border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                Supabase Cloud Database Synchronization
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Connect Supabase so that all subjects, lectures, quizzes, and warnings are stored in the cloud and instantly synchronized across all student browsers and devices.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0F172A] border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    Cloud Connection Status:
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        dbStatus.checking
                          ? 'bg-amber-950/60 text-amber-300'
                          : dbStatus.connected && dbStatus.tablesReady
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                          : dbStatus.connected
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                          : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                      }`}
                    >
                      {dbStatus.checking
                        ? 'Testing Connection...'
                        : dbStatus.connected && dbStatus.tablesReady
                        ? 'Connected & Tables Ready'
                        : dbStatus.connected
                        ? 'Connected (Tables Pending)'
                        : 'Supabase Disconnected'}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {dbStatus.connected && dbStatus.tablesReady
                      ? 'Connected to Supabase PostgreSQL (qksklthfpbcwseiqpajq). All additions, edits, and deletions are saved to Supabase and broadcast via Realtime.'
                      : dbStatus.connected
                      ? 'Connected to Supabase project qksklthfpbcwseiqpajq! Run the SQL schema below to create the database tables.'
                      : dbStatus.error || 'Database connection could not be established.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={checkDbConnectivity}
                    disabled={dbStatus.checking}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${dbStatus.checking ? 'animate-spin' : ''}`} />
                    Test Connection
                  </button>

                  {dbStatus.connected && dbStatus.tablesReady && (
                    <button
                      onClick={handleSeedDatabase}
                      disabled={isSeeding}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isSeeding ? 'Seeding...' : 'Seed Curriculum'}
                    </button>
                  )}
                </div>
              </div>

              {/* Cloud Database Record Summary when Connected and Tables Ready */}
              {dbStatus.connected && dbStatus.tablesReady && dbStatus.counts && (
                <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-[11px] text-slate-400 font-medium">Subjects in DB</p>
                    <p className="text-lg font-black text-white">{dbStatus.counts.subjects}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-[11px] text-slate-400 font-medium">Materials / Lectures</p>
                    <p className="text-lg font-black text-white">{dbStatus.counts.materials}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-[11px] text-slate-400 font-medium">Announcements</p>
                    <p className="text-lg font-black text-white">{dbStatus.counts.announcements}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <p className="text-[11px] text-slate-400 font-medium">Warning Documents</p>
                    <p className="text-lg font-black text-white">{dbStatus.counts.warnings}</p>
                  </div>
                </div>
              )}
            </div>

            {/* If tables are pending, show the 1-Click SQL Schema Runner section */}
            {dbStatus.connected && !dbStatus.tablesReady && (
              <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-600/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Database className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Execute SQL Schema in Supabase</h3>
                      <p className="text-xs text-amber-300/80">Copy the schema below, paste it into the Supabase SQL Editor, and click "Run".</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(SCHEMA_SQL);
                        setCopiedSql(true);
                        addToast('SQL schema copied to clipboard!', 'success');
                        setTimeout(() => setCopiedSql(false), 3000);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
                    >
                      {copiedSql ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedSql ? 'Copied to Clipboard!' : 'Copy Schema SQL'}
                    </button>
                    <a
                      href="https://supabase.com/dashboard/project/qksklthfpbcwseiqpajq/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                    >
                      Open Supabase SQL Editor <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-mono max-h-48 overflow-y-auto">
                  <pre>{SCHEMA_SQL.substring(0, 1000)}... ({SCHEMA_SQL.split('\n').length} lines total)</pre>
                </div>
              </div>
            )}

            {/* Step-by-Step Instructions */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
                How to Connect Supabase (3 Quick Steps)
              </h3>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="font-bold text-blue-400 mb-1">Step 1: Get Supabase Credentials</p>
                  <p className="text-slate-400">
                    Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-semibold">Supabase Dashboard</a> → Project Settings → <strong>API</strong>. Copy your <strong>Project URL</strong>, <strong>anon public key</strong>, and <strong>service_role secret key</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="font-bold text-blue-400 mb-1">Step 2: Add Environment Variables in Vercel</p>
                  <p className="text-slate-400 mb-2">
                    Open <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-semibold">Vercel Dashboard</a> → your Project → <strong>Settings</strong> → <strong>Environment Variables</strong>:
                  </p>
                  <ul className="space-y-1 font-mono text-[11px] text-slate-200">
                    <li className="bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800/80 flex items-center justify-between">
                      <span>VITE_SUPABASE_URL</span>
                      <span className="text-slate-500 font-sans text-xs">Project URL</span>
                    </li>
                    <li className="bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800/80 flex items-center justify-between">
                      <span>VITE_SUPABASE_ANON_KEY</span>
                      <span className="text-slate-500 font-sans text-xs">anon public key</span>
                    </li>
                    <li className="bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800/80 flex items-center justify-between">
                      <span>SUPABASE_SERVICE_ROLE_KEY</span>
                      <span className="text-slate-500 font-sans text-xs">service_role secret key</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="font-bold text-blue-400 mb-1">Step 3: Run Database Schema in SQL Editor</p>
                  <p className="text-slate-400">
                    In Supabase, open <strong>SQL Editor</strong>, paste the content of <code className="text-blue-300">supabase/schema.sql</code> from this repository, and click <strong>Run</strong>. This creates all tables, foreign keys with cascade deletion, storage buckets, and realtime triggers.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Reset Local Mock Data</p>
                <p className="text-xs text-slate-500">Restores default sample subjects and lectures in local browser storage.</p>
              </div>
              <button
                onClick={() => {
                  resetToDemoData();
                  addToast('Reset to default subjects and announcements!', 'info');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Local Defaults
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Subject Modal */}
      {subjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0B1120] border border-slate-800 rounded-3xl p-5 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingSubject ? 'Edit Subject' : 'Add New Subject'}
            </h3>
            <form onSubmit={handleSaveSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Subject Name *</label>
                <input
                  type="text"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="e.g. Compiler Design"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Code</label>
                <input
                  type="text"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  placeholder="e.g. CS321"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Instructor</label>
                <input
                  type="text"
                  value={subjectForm.instructor}
                  onChange={(e) => setSubjectForm({ ...subjectForm, instructor: e.target.value })}
                  placeholder="e.g. Dr. Lamiaa Hassaan"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSubjectModalOpen(false)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 active:scale-95 transition-all min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all active:scale-95 min-h-[44px]"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Modal */}
      {materialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-[#0B1120] border border-slate-800 rounded-3xl p-5 sm:p-8 max-w-xl w-full shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingMaterial ? 'Edit Material' : 'Add Material'}
            </h3>
            <form onSubmit={handleSaveMaterial} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Subject *</label>
                <select
                  value={materialForm.subject_id}
                  onChange={(e) => setMaterialForm({ ...materialForm, subject_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:border-blue-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Type *</label>
                  <select
                    value={materialForm.type}
                    onChange={(e) => setMaterialForm({ ...materialForm, type: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm"
                  >
                    <option value="lecture">Lecture</option>
                    <option value="section">Section</option>
                    <option value="quiz">Quiz</option>
                    <option value="study_material">Study Notes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Number</label>
                  <input
                    type="number"
                    min="1"
                    value={materialForm.number}
                    onChange={(e) => setMaterialForm({ ...materialForm, number: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Title *</label>
                <input
                  type="text"
                  value={materialForm.title}
                  onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">PDF File</label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setSelectedFile(e.target.files[0]);
                      setMaterialForm({ ...materialForm, file_name: e.target.files[0].name });
                    }
                  }}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">External Link / URL</label>
                <input
                  type="url"
                  value={materialForm.external_url}
                  onChange={(e) => setMaterialForm({ ...materialForm, external_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMaterialModalOpen(false)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 active:scale-95 transition-all min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all active:scale-95 min-h-[44px]"
                >
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {announcementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0B1120] border border-slate-800 rounded-3xl p-5 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingAnnouncement ? 'Edit Announcement' : 'Publish Announcement'}
            </h3>
            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Related Subject *</label>
                <select
                  value={announcementForm.subject_id}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, subject_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Category *</label>
                <select
                  value={announcementForm.category}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm"
                >
                  {ANNOUNCEMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Title *</label>
                <input
                  type="text"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  placeholder="e.g. Midterm exam topics announced"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={announcementForm.description}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, description: e.target.value })}
                  placeholder="Details of the announcement..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="important-check"
                  checked={announcementForm.is_important}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, is_important: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-slate-900 border-slate-700"
                />
                <label htmlFor="important-check" className="text-xs font-bold text-slate-300">
                  Mark as High Priority / Important (Highlights on Homepage)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAnnouncementModalOpen(false)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 active:scale-95 transition-all min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all active:scale-95 min-h-[44px]"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warning PDF Document Modal */}
      {warningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-[#0B1120] border border-slate-800 rounded-3xl p-5 sm:p-8 max-w-lg w-full shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {editingWarning ? 'Edit Warning PDF' : 'Upload Warning PDF Document'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingWarning
                    ? 'Update details or replace the official student warning list PDF.'
                    : 'Publish an official academic warning document containing student warning lists.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveWarning} className="space-y-4">
              {/* Warning Title */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Warning Document Title *
                </label>
                <input
                  type="text"
                  value={warningForm.title}
                  onChange={(e) => setWarningForm({ ...warningForm, title: e.target.value })}
                  placeholder="e.g. Midterm Attendance Warning List #1"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Subject Select */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Subject *
                </label>
                <select
                  value={warningForm.subject_id}
                  onChange={(e) => setWarningForm({ ...warningForm, subject_id: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:border-rose-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Description <span className="text-slate-500 lowercase">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={warningForm.description}
                  onChange={(e) => setWarningForm({ ...warningForm, description: e.target.value })}
                  placeholder="Official notice regarding cumulative unexcused absences and coursework requirements..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm resize-none focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* PDF File Upload & Replace */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Warning PDF File *
                </label>

                {editingWarning && warningForm.file_name && !selectedWarningFile && (
                  <div className="mb-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-300 truncate">
                      <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                      <span className="truncate">{warningForm.file_name}</span>
                      {warningForm.file_size && (
                        <span className="text-slate-500">({warningForm.file_size})</span>
                      )}
                    </div>
                    <span className="text-[11px] text-blue-400 font-semibold shrink-0">
                      Current File
                    </span>
                  </div>
                )}

                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setSelectedWarningFile(e.target.files[0]);
                      setWarningForm({ ...warningForm, file_name: e.target.files[0].name });
                    }
                  }}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-600 file:text-white hover:file:bg-rose-500 cursor-pointer min-h-[44px]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Upload a PDF document. You can replace the existing file at any time.
                </p>
              </div>

              {/* External Document URL (Optional Fallback) */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  External Document Link <span className="text-slate-500 lowercase">(optional)</span>
                </label>
                <input
                  type="url"
                  value={warningForm.external_url}
                  onChange={(e) => setWarningForm({ ...warningForm, external_url: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-base sm:text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setWarningModalOpen(false)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 active:scale-95 transition-all min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploadingWarning}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-rose-950/40 transition-all active:scale-95 flex items-center gap-2 min-h-[44px]"
                >
                  <FileText className="w-4 h-4" />
                  {isUploadingWarning ? 'Uploading PDF...' : isSaving ? 'Saving...' : 'Save Warning PDF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        title={`Permanently Delete ${
          deleteModal.typeName ||
          (deleteModal.type === 'subject'
            ? 'Subject'
            : deleteModal.type === 'material'
            ? 'Material'
            : deleteModal.type === 'warning'
            ? 'Warning PDF'
            : 'Announcement')
        }?`}
        message={`Are you sure you want to permanently delete "${deleteModal.title}"?`}
        details={deleteModal.details}
        confirmText={isSaving ? 'Deleting...' : 'Permanently Delete'}
        confirmVariant="danger"
        isLoading={isSaving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, type: '', id: null, title: '', details: null })}
      />

      {/* File Preview Modal for Dashboard */}
      <FilePreviewModal
        isOpen={previewModal.isOpen}
        fileUrl={previewModal.fileUrl}
        title={previewModal.title}
        fileName={previewModal.fileName}
        onClose={() => setPreviewModal({ isOpen: false, fileUrl: '', title: '', fileName: '' })}
      />

      {/* Supabase SQL Migration Assistant Modal */}
      {showMigrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0B1120] border border-amber-500/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Activate Cloud Database Deletion</h3>
                  <p className="text-xs text-slate-400">10-second setup to enable permanent deletion in Supabase</p>
                </div>
              </div>
              <button
                onClick={() => setShowMigrationModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 space-y-2">
              <p className="font-semibold text-white text-sm">Why is this required?</p>
              <p>
                Your website is connected to Supabase project <code className="font-mono bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">qksklthfpbcwseiqpajq</code>. Supabase Row Level Security blocks delete operations by default until the delete procedure is registered or the service role key is provided.
              </p>
            </div>

            {/* Option 1: Run SQL in Supabase */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-600/30 text-blue-400 text-xs font-bold border border-blue-500/30">
                    Option 1 (Fastest — 10 seconds)
                  </span>
                  <span className="text-sm font-bold text-white">Execute SQL Migration</span>
                </div>
              </div>

              <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside">
                <li>
                  Click <strong className="text-white">Copy Migration SQL</strong> below.
                </li>
                <li>
                  Click <strong className="text-white">Open Supabase SQL Editor</strong>.
                </li>
                <li>
                  Paste the script and click the green <strong className="text-emerald-400">Run</strong> button.
                </li>
              </ol>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(MIGRATION_DELETE_SQL || SCHEMA_SQL);
                    setCopiedMigrationSql(true);
                    addToast('Migration SQL copied to clipboard!', 'success');
                    setTimeout(() => setCopiedMigrationSql(false), 3000);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
                >
                  {copiedMigrationSql ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedMigrationSql ? 'Copied to Clipboard!' : 'Copy Migration SQL'}
                </button>
                <a
                  href="https://supabase.com/dashboard/project/qksklthfpbcwseiqpajq/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
                >
                  Open Supabase SQL Editor <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Option 2: Add Service Role Key to Vercel */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs font-bold">
                  Option 2 (Alternative)
                </span>
                <span className="text-sm font-bold text-white">Add SUPABASE_SERVICE_ROLE_KEY to Vercel</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                1. Open <a href="https://supabase.com/dashboard/project/qksklthfpbcwseiqpajq/settings/api" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Supabase API Settings</a> and copy your <code className="text-slate-300 font-mono">service_role</code> secret key.<br />
                2. In Vercel Project Settings $\rightarrow$ Environment Variables, add <code className="text-amber-300 font-mono">SUPABASE_SERVICE_ROLE_KEY</code> with that value and redeploy.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={async () => {
                  await checkDbConnectivity();
                  addToast('Refreshed database status check.', 'info');
                }}
                disabled={dbStatus.checking}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${dbStatus.checking ? 'animate-spin' : ''}`} />
                Check Status Again
              </button>
              <button
                onClick={() => setShowMigrationModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
