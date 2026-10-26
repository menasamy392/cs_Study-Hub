import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured, SUPABASE_STORAGE_BUCKET } from '../lib/supabase';
import { INITIAL_SUBJECTS, INITIAL_MATERIALS, INITIAL_ANNOUNCEMENTS, INITIAL_WARNINGS } from '../lib/mockData';

const DataContext = createContext();

const STORAGE_KEYS = {
  SUBJECTS: 'study_hub_subjects_v2',
  MATERIALS: 'study_hub_materials_v2',
  ANNOUNCEMENTS: 'study_hub_announcements_v2',
  WARNINGS: 'study_hub_pdf_warnings_v3',
  PROGRESS: 'study_hub_progress_v2',
  LAST_STUDIED: 'study_hub_last_studied_v2',
  DELETED_SUBJECT_IDS: 'study_hub_deleted_subject_ids',
};

export function DataProvider({ children }) {
  const [subjects, setSubjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [progress, setProgress] = useState({}); // { [subjectId]: { [lectureId]: true } }
  const [lastStudied, setLastStudied] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load progress and last studied from localStorage
  useEffect(() => {
    try {
      const storedProgress = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      if (storedProgress) {
        setProgress(JSON.parse(storedProgress));
      }

      const storedLastStudied = localStorage.getItem(STORAGE_KEYS.LAST_STUDIED);
      if (storedLastStudied) {
        setLastStudied(JSON.parse(storedLastStudied));
      }
    } catch (e) {
      console.warn('Error reading stored study progress', e);
    }
  }, []);

  // Load Data from Supabase or Fallback to LocalStorage
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isSupabaseConfigured && supabase) {
      try {
        // Fetch subjects from Supabase
        const { data: subData, error: subError } = await supabase
          .from('subjects')
          .select('*')
          .order('order_index', { ascending: true })
          .order('name', { ascending: true });

        if (subError) throw subError;

        // Fetch materials from Supabase
        const { data: matData, error: matError } = await supabase
          .from('materials')
          .select('*')
          .order('number', { ascending: true })
          .order('created_at', { ascending: false });

        if (matError) throw matError;

        // Fetch announcements from Supabase
        let annData = [];
        try {
          const { data: fetchedAnn, error: annError } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });
          if (!annError && fetchedAnn) {
            annData = fetchedAnn;
          }
        } catch {
          const storedAnn = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
          annData = storedAnn ? JSON.parse(storedAnn) : [];
        }

        // Fetch academic warning PDFs from Supabase
        let warnData = [];
        try {
          const { data: fetchedWarn, error: warnError } = await supabase
            .from('warnings')
            .select('*')
            .order('created_at', { ascending: false });
          if (!warnError && fetchedWarn) {
            warnData = fetchedWarn;
          }
        } catch {
          const storedWarn = localStorage.getItem(STORAGE_KEYS.WARNINGS);
          warnData = storedWarn ? JSON.parse(storedWarn) : [];
        }

        setSubjects(subData || []);
        setMaterials(matData || []);
        setAnnouncements(annData || []);
        setWarnings(warnData || []);

        // Sync fresh database state to local cache for offline/instant initial renders
        try {
          localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subData || []));
          localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(matData || []));
          localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(annData || []));
          localStorage.setItem(STORAGE_KEYS.WARNINGS, JSON.stringify(warnData || []));
        } catch (e) {
          console.warn('Failed to cache Supabase records in localStorage', e);
        }
      } catch (err) {
        console.error('Error fetching Supabase data, falling back to local storage:', err);
        setError(err.message || 'Failed to load data from Supabase');
        loadLocalData();
      } finally {
        setLoading(false);
      }
    } else {
      loadLocalData();
      setLoading(false);
    }
  }, []);

  // Local Storage Data Loader (Ensures deleted subjects NEVER automatically reappear)
  const loadLocalData = () => {
    try {
      // Get list of permanently deleted subject IDs (tombstones)
      const deletedIds = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.DELETED_SUBJECT_IDS) || '[]'
      );

      const storedSubs = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
      const storedMats = localStorage.getItem(STORAGE_KEYS.MATERIALS);
      const storedAnn = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      const storedWarn = localStorage.getItem(STORAGE_KEYS.WARNINGS);

      // 1. Subjects
      if (storedSubs !== null) {
        const parsed = JSON.parse(storedSubs).filter((s) => !deletedIds.includes(s.id));
        setSubjects(parsed);
      } else {
        const initial = INITIAL_SUBJECTS.filter((s) => !deletedIds.includes(s.id));
        setSubjects(initial);
        localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(initial));
      }

      // 2. Materials
      if (storedMats !== null) {
        const parsedMats = JSON.parse(storedMats).filter((m) => !deletedIds.includes(m.subject_id));
        setMaterials(parsedMats);
      } else {
        const initialMats = INITIAL_MATERIALS.filter((m) => !deletedIds.includes(m.subject_id));
        setMaterials(initialMats);
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(initialMats));
      }

      // 3. Announcements
      if (storedAnn !== null) {
        const parsedAnn = JSON.parse(storedAnn).filter((a) => !deletedIds.includes(a.subject_id));
        setAnnouncements(parsedAnn);
      } else {
        const initialAnn = INITIAL_ANNOUNCEMENTS.filter((a) => !deletedIds.includes(a.subject_id));
        setAnnouncements(initialAnn);
        localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(initialAnn));
      }

      // 4. Student Warnings
      if (storedWarn !== null) {
        const parsedWarn = JSON.parse(storedWarn).filter((w) => !deletedIds.includes(w.subject_id));
        setWarnings(parsedWarn);
      } else {
        const initialWarn = INITIAL_WARNINGS.filter((w) => !deletedIds.includes(w.subject_id));
        setWarnings(initialWarn);
        localStorage.setItem(STORAGE_KEYS.WARNINGS, JSON.stringify(initialWarn));
      }
    } catch (e) {
      console.warn('LocalStorage error, using memory mock data', e);
      setSubjects(INITIAL_SUBJECTS);
      setMaterials(INITIAL_MATERIALS);
      setAnnouncements(INITIAL_ANNOUNCEMENTS);
      setWarnings(INITIAL_WARNINGS);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync state & storage helpers
  const saveLocalSubjects = (newSubs) => {
    setSubjects(newSubs);
    try {
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(newSubs));
    } catch (e) {
      console.warn('Failed to save subjects locally', e);
    }
  };

  const saveLocalMaterials = (newMats) => {
    setMaterials(newMats);
    try {
      localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(newMats));
    } catch (e) {
      console.warn('Failed to save materials locally', e);
    }
  };

  const saveLocalAnnouncements = (newAnn) => {
    setAnnouncements(newAnn);
    try {
      localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(newAnn));
    } catch (e) {
      console.warn('Failed to save announcements locally', e);
    }
  };

  const saveLocalWarnings = (newWarn) => {
    setWarnings(newWarn);
    try {
      localStorage.setItem(STORAGE_KEYS.WARNINGS, JSON.stringify(newWarn));
    } catch (e) {
      console.warn('Failed to save warnings locally', e);
    }
  };

  // Helper to clean all caches & register a permanent tombstone on deletion
  const cleanLocalStorageAfterSubjectDelete = (subjectId) => {
    try {
      // 1. Add ID to permanent deleted tombstone list
      const deletedIds = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.DELETED_SUBJECT_IDS) || '[]'
      );
      if (!deletedIds.includes(subjectId)) {
        deletedIds.push(subjectId);
        localStorage.setItem(STORAGE_KEYS.DELETED_SUBJECT_IDS, JSON.stringify(deletedIds));
      }

      // 2. Remove subject from subjects storage
      const storedSubs = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
      if (storedSubs) {
        const updatedSubs = JSON.parse(storedSubs).filter((s) => s.id !== subjectId);
        localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(updatedSubs));
      }

      // 3. Remove all associated materials
      const storedMats = localStorage.getItem(STORAGE_KEYS.MATERIALS);
      if (storedMats) {
        const updatedMats = JSON.parse(storedMats).filter((m) => m.subject_id !== subjectId);
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(updatedMats));
      }

      // 4. Remove all associated announcements
      const storedAnn = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      if (storedAnn) {
        const updatedAnn = JSON.parse(storedAnn).filter((a) => a.subject_id !== subjectId);
        localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(updatedAnn));
      }

      // 5. Remove all associated student warnings
      const storedWarn = localStorage.getItem(STORAGE_KEYS.WARNINGS);
      if (storedWarn) {
        const updatedWarn = JSON.parse(storedWarn).filter((w) => w.subject_id !== subjectId);
        localStorage.setItem(STORAGE_KEYS.WARNINGS, JSON.stringify(updatedWarn));
      }

      // 6. Clear student progress for this subject
      const storedProg = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      if (storedProg) {
        const parsedProg = JSON.parse(storedProg);
        delete parsedProg[subjectId];
        localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(parsedProg));
        setProgress(parsedProg);
      }

      // 7. Clear lastStudied if it referenced the deleted subject
      const storedLast = localStorage.getItem(STORAGE_KEYS.LAST_STUDIED);
      if (storedLast) {
        const parsedLast = JSON.parse(storedLast);
        if (parsedLast.subjectId === subjectId) {
          localStorage.removeItem(STORAGE_KEYS.LAST_STUDIED);
          setLastStudied(null);
        }
      }
    } catch (e) {
      console.warn('Error cleaning local storage after subject delete', e);
    }
  };

  // ==========================================
  // PROGRESS & CONTINUE STUDYING LOGIC
  // ==========================================
  const toggleLectureCompleted = (subjectId, lectureId) => {
    setProgress((prev) => {
      const subProg = { ...(prev[subjectId] || {}) };
      if (subProg[lectureId]) {
        delete subProg[lectureId];
      } else {
        subProg[lectureId] = true;
      }
      const updated = { ...prev, [subjectId]: subProg };
      try {
        localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(updated));
      } catch (e) {
        console.warn('Error saving progress', e);
      }
      return updated;
    });
  };

  const isLectureCompleted = useCallback(
    (subjectId, lectureId) => {
      return Boolean(progress[subjectId]?.[lectureId]);
    },
    [progress]
  );

  const getSubjectProgress = useCallback(
    (subjectId) => {
      const subjectLectures = materials.filter(
        (m) => m.subject_id === subjectId && m.type === 'lecture'
      );
      const totalCount = subjectLectures.length;
      if (totalCount === 0) return { completedCount: 0, totalCount: 0, percentage: 0 };

      const subProg = progress[subjectId] || {};
      const completedCount = subjectLectures.filter((l) => subProg[l.id]).length;
      const percentage = Math.round((completedCount / totalCount) * 100);

      return { completedCount, totalCount, percentage };
    },
    [materials, progress]
  );

  const getOverallProgress = useCallback(() => {
    const allLectures = materials.filter((m) => m.type === 'lecture');
    const totalLectures = allLectures.length;
    if (totalLectures === 0) return { totalCompleted: 0, totalLectures: 0, percentage: 0 };

    let totalCompleted = 0;
    allLectures.forEach((lec) => {
      if (progress[lec.subject_id]?.[lec.id]) {
        totalCompleted += 1;
      }
    });

    const percentage = Math.round((totalCompleted / totalLectures) * 100);
    return { totalCompleted, totalLectures, percentage };
  }, [materials, progress]);

  // Record Last Studied Activity
  const recordStudyActivity = ({ subjectId, lectureId, lectureNumber, lectureTitle }) => {
    const sub = subjects.find((s) => s.id === subjectId);
    if (!sub) return;

    const prog = getSubjectProgress(subjectId);
    const activity = {
      subjectId,
      subjectName: sub.name,
      subjectCode: sub.code || '',
      lectureId,
      lectureNumber: lectureNumber || 1,
      lectureTitle: lectureTitle || `Lecture ${lectureNumber || 1}`,
      timestamp: Date.now(),
      progressPercent: prog.percentage,
    };

    setLastStudied(activity);
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_STUDIED, JSON.stringify(activity));
    } catch (e) {
      console.warn('Failed to store last studied activity', e);
    }
  };

  // ==========================================
  // SUBJECT ACTIONS
  // ==========================================
  const addSubject = async (subjectData) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('subjects')
        .insert([{
          name: subjectData.name.trim(),
          code: subjectData.code?.trim() || '',
          instructor: subjectData.instructor?.trim() || '',
          semester: subjectData.semester?.trim() || 'Level 3 • Semester 1 • Core course',
          description: subjectData.description?.trim() || '',
          icon: subjectData.icon || 'BookOpen',
          color: subjectData.color || 'blue',
          order_index: subjects.length + 1,
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error inserting subject:', error);
        throw new Error(`Failed to create subject in Supabase: ${error.message}`);
      }

      setSubjects((prev) => [...prev, data]);
      return data;
    } else {
      const newSubject = {
        id: `sub-${Date.now()}`,
        name: subjectData.name.trim(),
        code: subjectData.code?.trim() || '',
        instructor: subjectData.instructor?.trim() || 'Department Instructor',
        semester: subjectData.semester?.trim() || 'Level 3 • Core course',
        description: subjectData.description?.trim() || '',
        icon: subjectData.icon || 'BookOpen',
        color: subjectData.color || 'blue',
        order_index: subjects.length + 1,
        created_at: new Date().toISOString(),
      };
      const updated = [...subjects, newSubject];
      saveLocalSubjects(updated);
      return newSubject;
    }
  };

  const updateSubject = async (id, updates) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('subjects')
        .update({
          name: updates.name?.trim(),
          code: updates.code?.trim() || '',
          instructor: updates.instructor?.trim() || '',
          semester: updates.semester?.trim() || '',
          description: updates.description?.trim() || '',
          icon: updates.icon || 'BookOpen',
          color: updates.color || 'blue',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating subject:', error);
        throw new Error(`Failed to update subject in Supabase: ${error.message}`);
      }

      setSubjects((prev) => prev.map((s) => (s.id === id ? data : s)));
      return data;
    } else {
      const updated = subjects.map((s) => (s.id === id ? { ...s, ...updates } : s));
      saveLocalSubjects(updated);
      return updated.find((s) => s.id === id);
    }
  };

  const deleteSubject = async (id) => {
    if (!id) throw new Error('Subject ID is required for deletion');

    if (isSupabaseConfigured && supabase) {
      // 1. Delete associated materials
      const { error: matError } = await supabase
        .from('materials')
        .delete()
        .eq('subject_id', id);

      if (matError) throw new Error(`Failed to delete related materials: ${matError.message}`);

      // 2. Delete associated announcements
      try {
        await supabase.from('announcements').delete().eq('subject_id', id);
      } catch (err) {
        console.warn('Note on deleting announcements:', err);
      }

      // 3. Delete associated warnings
      try {
        await supabase.from('warnings').delete().eq('subject_id', id);
        await supabase.from('student_warnings').delete().eq('subject_id', id);
      } catch (err) {
        console.warn('Note on deleting warnings:', err);
      }

      // 4. Delete subject row
      const { data, error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw new Error(`Failed to delete subject from Supabase: ${error.message}`);

      if (!data || data.length === 0) {
        throw new Error('Supabase did not delete the subject. Either the ID was not found or your user lacks RLS permissions.');
      }

      // 5. Clean local caches
      cleanLocalStorageAfterSubjectDelete(id);

      // 6. Re-synchronize
      await loadData();
    } else {
      cleanLocalStorageAfterSubjectDelete(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      setMaterials((prev) => prev.filter((m) => m.subject_id !== id));
      setAnnouncements((prev) => prev.filter((a) => a.subject_id !== id));
      setWarnings((prev) => prev.filter((w) => w.subject_id !== id));
    }
  };

  // ==========================================
  // MATERIAL ACTIONS
  // ==========================================
  const addMaterial = async (materialData) => {
    const payload = {
      subject_id: materialData.subject_id,
      title: materialData.title.trim(),
      type: materialData.type,
      number: Number(materialData.number) || 1,
      description: materialData.description?.trim() || '',
      category: materialData.category || 'summary',
      file_url: materialData.file_url || '',
      external_url: materialData.external_url || '',
      file_name: materialData.file_name || '',
      file_size: materialData.file_size || '',
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('materials')
        .insert([payload])
        .select()
        .single();

      if (error) throw new Error(`Failed to create material in Supabase: ${error.message}`);
      setMaterials((prev) => [data, ...prev]);
      return data;
    } else {
      const newMaterial = {
        ...payload,
        id: `mat-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      const updated = [newMaterial, ...materials];
      saveLocalMaterials(updated);
      return newMaterial;
    }
  };

  const updateMaterial = async (id, updates) => {
    const payload = {
      title: updates.title?.trim(),
      type: updates.type,
      number: Number(updates.number) || 1,
      description: updates.description?.trim() || '',
      category: updates.category || 'summary',
      file_url: updates.file_url !== undefined ? updates.file_url : '',
      external_url: updates.external_url !== undefined ? updates.external_url : '',
      file_name: updates.file_name !== undefined ? updates.file_name : '',
      file_size: updates.file_size !== undefined ? updates.file_size : '',
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('materials')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update material in Supabase: ${error.message}`);
      setMaterials((prev) => prev.map((m) => (m.id === id ? data : m)));
      return data;
    } else {
      const updated = materials.map((m) => (m.id === id ? { ...m, ...updates } : m));
      saveLocalMaterials(updated);
      return updated.find((m) => m.id === id);
    }
  };

  const deleteMaterial = async (id) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw new Error(`Failed to delete material from Supabase: ${error.message}`);
      if (!data || data.length === 0) {
        throw new Error('Supabase did not delete the material: item not found or permission denied.');
      }

      setMaterials((prev) => prev.filter((m) => m.id !== id));
      const stored = localStorage.getItem(STORAGE_KEYS.MATERIALS);
      if (stored) {
        const updated = JSON.parse(stored).filter((m) => m.id !== id);
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(updated));
      }
    } else {
      const updated = materials.filter((m) => m.id !== id);
      saveLocalMaterials(updated);
    }
  };

  // ==========================================
  // ANNOUNCEMENTS ACTIONS
  // ==========================================
  const addAnnouncement = async (annData) => {
    const payload = {
      subject_id: annData.subject_id,
      title: annData.title.trim(),
      description: annData.description?.trim() || '',
      category: annData.category || 'General Announcement',
      is_important: Boolean(annData.is_important),
      expires_at: annData.expires_at || null,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setAnnouncements((prev) => [data, ...prev]);
          return data;
        }
      } catch (e) {
        console.warn('Supabase announcements insert failed, falling back to local', e);
      }
    }

    const newAnn = {
      ...payload,
      id: `ann-${Date.now()}`,
    };
    const updated = [newAnn, ...announcements];
    saveLocalAnnouncements(updated);
    return newAnn;
  };

  const updateAnnouncement = async (id, updates) => {
    const payload = {
      subject_id: updates.subject_id,
      title: updates.title.trim(),
      description: updates.description?.trim() || '',
      category: updates.category || 'General Announcement',
      is_important: Boolean(updates.is_important),
      expires_at: updates.expires_at || null,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setAnnouncements((prev) => prev.map((a) => (a.id === id ? data : a)));
          return data;
        }
      } catch (e) {
        console.warn('Supabase update announcement failed', e);
      }
    }

    const updated = announcements.map((a) => (a.id === id ? { ...a, ...payload } : a));
    saveLocalAnnouncements(updated);
    return updated.find((a) => a.id === id);
  };

  const deleteAnnouncement = async (id) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .delete()
          .eq('id', id)
          .select();
        if (error) throw error;
      } catch (e) {
        console.warn('Supabase delete announcement error', e);
      }
    }
    const updated = announcements.filter((a) => a.id !== id);
    saveLocalAnnouncements(updated);
  };

  // ==========================================
  // WARNING PDF DOCUMENTS ACTIONS (PERMANENT SUPABASE STORAGE)
  // ==========================================
  const addWarning = async (warningData) => {
    const payload = {
      subject_id: warningData.subject_id,
      title: warningData.title.trim(),
      description: (warningData.description || '').trim(),
      file_url: warningData.file_url || '',
      file_name: warningData.file_name || '',
      file_size: warningData.file_size || '',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('warnings')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Supabase error inserting warning PDF:', error);
        throw new Error(`Failed to save warning PDF in Supabase: ${error.message}`);
      }

      setWarnings((prev) => [data, ...prev]);
      // Update local storage cache
      saveLocalWarnings([data, ...warnings]);
      return data;
    } else {
      const newWarning = {
        ...payload,
        id: `warn-${Date.now()}`,
      };
      const updated = [newWarning, ...warnings];
      saveLocalWarnings(updated);
      return newWarning;
    }
  };

  const updateWarning = async (id, updates) => {
    const payload = {
      subject_id: updates.subject_id,
      title: updates.title.trim(),
      description: (updates.description || '').trim(),
      file_url: updates.file_url !== undefined ? updates.file_url : '',
      file_name: updates.file_name !== undefined ? updates.file_name : '',
      file_size: updates.file_size !== undefined ? updates.file_size : '',
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('warnings')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating warning PDF:', error);
        throw new Error(`Failed to update warning PDF in Supabase: ${error.message}`);
      }

      setWarnings((prev) => prev.map((w) => (w.id === id ? data : w)));
      saveLocalWarnings(warnings.map((w) => (w.id === id ? data : w)));
      return data;
    } else {
      const updated = warnings.map((w) => (w.id === id ? { ...w, ...payload } : w));
      saveLocalWarnings(updated);
      return updated.find((w) => w.id === id);
    }
  };

  const deleteWarning = async (id) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('warnings')
        .delete()
        .eq('id', id)
        .select();

      if (error) {
        console.error('Supabase error deleting warning PDF:', error);
        throw new Error(`Failed to delete warning PDF from Supabase: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('Supabase did not delete the warning: record not found or permission denied.');
      }

      setWarnings((prev) => prev.filter((w) => w.id !== id));
      saveLocalWarnings(warnings.filter((w) => w.id !== id));
    } else {
      const updated = warnings.filter((w) => w.id !== id);
      saveLocalWarnings(updated);
    }
  };

  // Filter out expired announcements automatically
  const activeAnnouncements = useMemo(() => {
    const now = new Date().getTime();
    return announcements.filter((a) => {
      if (!a.expires_at) return true;
      const expireTime = new Date(a.expires_at).getTime();
      return expireTime > now;
    });
  }, [announcements]);

  // Upload file helper
  const uploadFile = async (file, folder = 'lectures') => {
    if (!file) throw new Error('No file provided');

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${folder}/${Date.now()}_${cleanFileName}`;

    if (isSupabaseConfigured && supabase) {
      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(filePath);

      return {
        file_url: data.publicUrl,
        file_name: file.name,
        file_size: formatBytes(file.size),
      };
    } else {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            file_url: reader.result,
            file_name: file.name,
            file_size: formatBytes(file.size),
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  };

  // Reset to default demo data
  const resetToDemoData = () => {
    localStorage.removeItem(STORAGE_KEYS.SUBJECTS);
    localStorage.removeItem(STORAGE_KEYS.MATERIALS);
    localStorage.removeItem(STORAGE_KEYS.ANNOUNCEMENTS);
    localStorage.removeItem(STORAGE_KEYS.WARNINGS);
    localStorage.removeItem(STORAGE_KEYS.PROGRESS);
    localStorage.removeItem(STORAGE_KEYS.LAST_STUDIED);
    localStorage.removeItem(STORAGE_KEYS.DELETED_SUBJECT_IDS);
    setSubjects(INITIAL_SUBJECTS);
    setMaterials(INITIAL_MATERIALS);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setWarnings(INITIAL_WARNINGS);
    setProgress({});
    setLastStudied(null);
  };

  return (
    <DataContext.Provider
      value={{
        subjects,
        materials,
        announcements: activeAnnouncements,
        allAnnouncements: announcements,
        warnings,
        loading,
        error,
        refreshData: loadData,
        // Subject operations
        addSubject,
        updateSubject,
        deleteSubject,
        // Material operations
        addMaterial,
        updateMaterial,
        deleteMaterial,
        // Announcement operations
        addAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        // Student Warnings operations
        addWarning,
        updateWarning,
        deleteWarning,
        // Progress tracking
        progress,
        toggleLectureCompleted,
        isLectureCompleted,
        getSubjectProgress,
        getOverallProgress,
        // Continue Studying
        lastStudied,
        recordStudyActivity,
        // Utils
        uploadFile,
        resetToDemoData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
