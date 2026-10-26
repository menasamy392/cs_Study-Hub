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

  // Load progress and last studied from localStorage (student-specific device state)
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

  // Load Data from Supabase Cloud or Fallback to LocalStorage
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Fetch subjects from Supabase
        const { data: subData, error: subError } = await supabase
          .from('subjects')
          .select('*')
          .order('order_index', { ascending: true })
          .order('name', { ascending: true });

        if (subError) throw subError;

        // 2. Fetch materials from Supabase
        const { data: matData, error: matError } = await supabase
          .from('materials')
          .select('*')
          .order('number', { ascending: true })
          .order('created_at', { ascending: false });

        if (matError) throw matError;

        // 3. Fetch announcements from Supabase
        let annData = [];
        try {
          const { data: fetchedAnn, error: annError } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });
          if (!annError && fetchedAnn) {
            annData = fetchedAnn;
          }
        } catch (annErr) {
          console.warn('Note on announcements query:', annErr);
        }

        // 4. Fetch academic warning PDFs from Supabase
        let warnData = [];
        try {
          const { data: fetchedWarn, error: warnError } = await supabase
            .from('warnings')
            .select('*')
            .order('created_at', { ascending: false });
          if (!warnError && fetchedWarn) {
            warnData = fetchedWarn;
          }
        } catch (warnErr) {
          console.warn('Note on warnings query:', warnErr);
        }

        setSubjects(subData || []);
        setMaterials(matData || []);
        setAnnouncements(annData || []);
        setWarnings(warnData || []);

        // Cache fresh cloud data in local storage for instant initial paint
        try {
          localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subData || []));
          localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(matData || []));
          localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(annData || []));
          localStorage.setItem(STORAGE_KEYS.WARNINGS, JSON.stringify(warnData || []));
        } catch {}
      } catch (err) {
        console.error('Error fetching Supabase data, falling back to local cache:', err);
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

  // Local Storage Data Loader (Used when Supabase is not configured)
  const loadLocalData = () => {
    try {
      const deletedIds = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.DELETED_SUBJECT_IDS) || '[]'
      );

      const storedSubs = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
      const storedMats = localStorage.getItem(STORAGE_KEYS.MATERIALS);
      const storedAnn = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      const storedWarn = localStorage.getItem(STORAGE_KEYS.WARNINGS);

      // Subjects
      if (storedSubs !== null) {
        const parsed = JSON.parse(storedSubs).filter((s) => !deletedIds.includes(s.id));
        setSubjects(parsed);
      } else {
        const initial = INITIAL_SUBJECTS.filter((s) => !deletedIds.includes(s.id));
        setSubjects(initial);
        localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(initial));
      }

      // Materials
      if (storedMats !== null) {
        const parsedMats = JSON.parse(storedMats).filter((m) => !deletedIds.includes(m.subject_id));
        setMaterials(parsedMats);
      } else {
        const initialMats = INITIAL_MATERIALS.filter((m) => !deletedIds.includes(m.subject_id));
        setMaterials(initialMats);
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(initialMats));
      }

      // Announcements
      if (storedAnn !== null) {
        const parsedAnn = JSON.parse(storedAnn).filter((a) => !deletedIds.includes(a.subject_id));
        setAnnouncements(parsedAnn);
      } else {
        const initialAnn = INITIAL_ANNOUNCEMENTS.filter((a) => !deletedIds.includes(a.subject_id));
        setAnnouncements(initialAnn);
        localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(initialAnn));
      }

      // Student Warnings
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

  // Setup Initial Load, Tab Focus Re-sync, and Supabase Realtime Subscription
  useEffect(() => {
    loadData();

    // Auto-refresh data when student switches back to this browser tab
    const handleFocus = () => {
      loadData();
    };
    window.addEventListener('focus', handleFocus);

    // Setup Supabase Realtime synchronization across all devices and browsers
    let channel = null;
    if (isSupabaseConfigured && supabase) {
      try {
        channel = supabase
          .channel('study-hub-realtime-sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, () => {
            loadData();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'materials' }, () => {
            loadData();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
            loadData();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'warnings' }, () => {
            loadData();
          })
          .subscribe();
      } catch (e) {
        console.warn('Realtime subscription error:', e);
      }
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadData]);

  // Serverless Admin Cloud Mutation Helper (bypasses RLS safely via serverless session)
  const mutateCloudDatabase = async (action, table, data = null, id = null) => {
    const res = await fetch('/api/admin/mutate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, table, data, id }),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || `Failed to execute ${action} on ${table}`);
    }

    return result.data;
  };

  // Sync state & storage helpers for fallback
  const saveLocalSubjects = (newSubs) => {
    setSubjects(newSubs);
    try {
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(newSubs));
    } catch {}
  };

  const saveLocalMaterials = (newMats) => {
    setMaterials(newMats);
    try {
      localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(newMats));
    } catch {}
  };

  const saveLocalAnnouncements = (newAnn) => {
    setAnnouncements(newAnn);
    try {
      localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(newAnn));
    } catch {}
  };

  const saveLocalWarnings = (newWarn) => {
    setWarnings(newWarn);
    try {
      localStorage.setItem(STORAGE_KEYS.WARNINGS, JSON.stringify(newWarn));
    } catch {}
  };

  // Helper to clean all caches & register a permanent tombstone on deletion
  const cleanLocalStorageAfterSubjectDelete = (subjectId) => {
    try {
      const deletedIds = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.DELETED_SUBJECT_IDS) || '[]'
      );
      if (!deletedIds.includes(subjectId)) {
        deletedIds.push(subjectId);
        localStorage.setItem(STORAGE_KEYS.DELETED_SUBJECT_IDS, JSON.stringify(deletedIds));
      }

      const storedSubs = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
      if (storedSubs) {
        const updatedSubs = JSON.parse(storedSubs).filter((s) => s.id !== subjectId);
        localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(updatedSubs));
      }

      const storedMats = localStorage.getItem(STORAGE_KEYS.MATERIALS);
      if (storedMats) {
        const updatedMats = JSON.parse(storedMats).filter((m) => m.subject_id !== subjectId);
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(updatedMats));
      }

      const storedAnn = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      if (storedAnn) {
        const updatedAnn = JSON.parse(storedAnn).filter((a) => a.subject_id !== subjectId);
        localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(updatedAnn));
      }

      const storedWarn = localStorage.getItem(STORAGE_KEYS.WARNINGS);
      if (storedWarn) {
        const updatedWarn = JSON.parse(storedWarn).filter((w) => w.subject_id !== subjectId);
        localStorage.setItem(STORAGE_KEYS.WARNINGS, JSON.stringify(updatedWarn));
      }

      const storedProg = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      if (storedProg) {
        const parsedProg = JSON.parse(storedProg);
        delete parsedProg[subjectId];
        localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(parsedProg));
        setProgress(parsedProg);
      }

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
      } catch {}
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
    } catch {}
  };

  // ==========================================
  // SUBJECT ACTIONS (SYNCHRONIZED TO CLOUD)
  // ==========================================
  const addSubject = async (subjectData) => {
    const payload = {
      name: subjectData.name.trim(),
      code: subjectData.code?.trim() || '',
      instructor: subjectData.instructor?.trim() || '',
      semester: subjectData.semester?.trim() || 'Level 3 • Semester 1 • Core course',
      description: subjectData.description?.trim() || '',
      icon: subjectData.icon || 'BookOpen',
      color: subjectData.color || 'blue',
      order_index: subjects.length + 1,
    };

    try {
      // 1. Try serverless admin cloud mutation
      const cloudData = await mutateCloudDatabase('insert', 'subjects', payload);
      setSubjects((prev) => [...prev, cloudData]);
      await loadData();
      return cloudData;
    } catch (err) {
      // 2. Direct client Supabase fallback
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('subjects')
          .insert([payload])
          .select()
          .single();
        if (error) throw new Error(`Supabase error: ${error.message}`);
        setSubjects((prev) => [...prev, data]);
        return data;
      }

      console.warn('Cloud database unavailable, saving to local demo state:', err);
      const newSubject = {
        ...payload,
        id: `sub-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      const updated = [...subjects, newSubject];
      saveLocalSubjects(updated);
      return newSubject;
    }
  };

  const updateSubject = async (id, updates) => {
    const payload = {
      name: updates.name?.trim(),
      code: updates.code?.trim() || '',
      instructor: updates.instructor?.trim() || '',
      semester: updates.semester?.trim() || '',
      description: updates.description?.trim() || '',
      icon: updates.icon || 'BookOpen',
      color: updates.color || 'blue',
    };

    try {
      const cloudData = await mutateCloudDatabase('update', 'subjects', payload, id);
      setSubjects((prev) => prev.map((s) => (s.id === id ? cloudData : s)));
      return cloudData;
    } catch (err) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('subjects')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (error) throw new Error(`Supabase error: ${error.message}`);
        setSubjects((prev) => prev.map((s) => (s.id === id ? data : s)));
        return data;
      }

      console.warn('Cloud database unavailable, updating local demo state:', err);
      const updated = subjects.map((s) => (s.id === id ? { ...s, ...updates } : s));
      saveLocalSubjects(updated);
      return updated.find((s) => s.id === id);
    }
  };

  const deleteSubject = async (id) => {
    if (!id) throw new Error('Subject ID is required for deletion');

    try {
      await mutateCloudDatabase('delete', 'subjects', null, id);
      cleanLocalStorageAfterSubjectDelete(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      setMaterials((prev) => prev.filter((m) => m.subject_id !== id));
      setAnnouncements((prev) => prev.filter((a) => a.subject_id !== id));
      setWarnings((prev) => prev.filter((w) => w.subject_id !== id));
      await loadData();
    } catch (err) {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('materials').delete().eq('subject_id', id);
        await supabase.from('announcements').delete().eq('subject_id', id);
        await supabase.from('warnings').delete().eq('subject_id', id);
        const { error } = await supabase.from('subjects').delete().eq('id', id);
        if (error) throw new Error(`Supabase delete failed: ${error.message}`);
        cleanLocalStorageAfterSubjectDelete(id);
        await loadData();
        return;
      }

      console.warn('Cloud database unavailable, deleting from local demo state:', err);
      cleanLocalStorageAfterSubjectDelete(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      setMaterials((prev) => prev.filter((m) => m.subject_id !== id));
      setAnnouncements((prev) => prev.filter((a) => a.subject_id !== id));
      setWarnings((prev) => prev.filter((w) => w.subject_id !== id));
    }
  };

  // ==========================================
  // MATERIAL ACTIONS (SYNCHRONIZED TO CLOUD)
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

    try {
      const cloudData = await mutateCloudDatabase('insert', 'materials', payload);
      setMaterials((prev) => [cloudData, ...prev]);
      return cloudData;
    } catch (err) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('materials')
          .insert([payload])
          .select()
          .single();
        if (error) throw new Error(`Supabase error: ${error.message}`);
        setMaterials((prev) => [data, ...prev]);
        return data;
      }

      console.warn('Cloud database unavailable, saving material locally:', err);
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

    try {
      const cloudData = await mutateCloudDatabase('update', 'materials', payload, id);
      setMaterials((prev) => prev.map((m) => (m.id === id ? cloudData : m)));
      return cloudData;
    } catch (err) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('materials')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (error) throw new Error(`Supabase error: ${error.message}`);
        setMaterials((prev) => prev.map((m) => (m.id === id ? data : m)));
        return data;
      }

      console.warn('Cloud database unavailable, updating material locally:', err);
      const updated = materials.map((m) => (m.id === id ? { ...m, ...updates } : m));
      saveLocalMaterials(updated);
      return updated.find((m) => m.id === id);
    }
  };

  const deleteMaterial = async (id) => {
    try {
      await mutateCloudDatabase('delete', 'materials', null, id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      const stored = localStorage.getItem(STORAGE_KEYS.MATERIALS);
      if (stored) {
        const updated = JSON.parse(stored).filter((m) => m.id !== id);
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(updated));
      }
    } catch (err) {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('materials').delete().eq('id', id);
        if (error) throw new Error(`Supabase error: ${error.message}`);
        setMaterials((prev) => prev.filter((m) => m.id !== id));
        return;
      }

      console.warn('Cloud database unavailable, deleting material locally:', err);
      const updated = materials.filter((m) => m.id !== id);
      saveLocalMaterials(updated);
    }
  };

  // ==========================================
  // ANNOUNCEMENTS ACTIONS (SYNCHRONIZED TO CLOUD)
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

    try {
      const cloudData = await mutateCloudDatabase('insert', 'announcements', payload);
      setAnnouncements((prev) => [cloudData, ...prev]);
      return cloudData;
    } catch (err) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('announcements')
          .insert([payload])
          .select()
          .single();
        if (error) throw new Error(`Supabase error: ${error.message}`);
        setAnnouncements((prev) => [data, ...prev]);
        return data;
      }

      console.warn('Cloud database unavailable, saving announcement locally:', err);
      const newAnn = {
        ...payload,
        id: `ann-${Date.now()}`,
      };
      const updated = [newAnn, ...announcements];
      saveLocalAnnouncements(updated);
      return newAnn;
    }
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

    try {
      const cloudData = await mutateCloudDatabase('update', 'announcements', payload, id);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? cloudData : a)));
      return cloudData;
    } catch (err) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (error) throw new Error(`Supabase error: ${error.message}`);
        setAnnouncements((prev) => prev.map((a) => (a.id === id ? data : a)));
        return data;
      }

      console.warn('Cloud database unavailable, updating announcement locally:', err);
      const updated = announcements.map((a) => (a.id === id ? { ...a, ...payload } : a));
      saveLocalAnnouncements(updated);
      return updated.find((a) => a.id === id);
    }
  };

  const deleteAnnouncement = async (id) => {
    try {
      await mutateCloudDatabase('delete', 'announcements', null, id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      const stored = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      if (stored) {
        const updated = JSON.parse(stored).filter((a) => a.id !== id);
        localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(updated));
      }
    } catch (err) {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) throw new Error(`Supabase error: ${error.message}`);
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        return;
      }

      console.warn('Cloud database unavailable, deleting announcement locally:', err);
      const updated = announcements.filter((a) => a.id !== id);
      saveLocalAnnouncements(updated);
    }
  };

  // ==========================================
  // WARNING PDF DOCUMENTS ACTIONS (SYNCHRONIZED TO CLOUD)
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

    try {
      const cloudData = await mutateCloudDatabase('insert', 'warnings', payload);
      setWarnings((prev) => [cloudData, ...prev]);
      saveLocalWarnings([cloudData, ...warnings]);
      return cloudData;
    } catch (err) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('warnings')
          .insert([payload])
          .select()
          .single();
        if (error) throw new Error(`Supabase error: ${error.message}`);
        setWarnings((prev) => [data, ...prev]);
        saveLocalWarnings([data, ...warnings]);
        return data;
      }

      console.warn('Cloud database unavailable, saving warning PDF locally:', err);
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

    try {
      const cloudData = await mutateCloudDatabase('update', 'warnings', payload, id);
      setWarnings((prev) => prev.map((w) => (w.id === id ? cloudData : w)));
      saveLocalWarnings(warnings.map((w) => (w.id === id ? cloudData : w)));
      return cloudData;
    } catch (err) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('warnings')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (error) throw new Error(`Supabase error: ${error.message}`);
        setWarnings((prev) => prev.map((w) => (w.id === id ? data : w)));
        saveLocalWarnings(warnings.map((w) => (w.id === id ? data : w)));
        return data;
      }

      console.warn('Cloud database unavailable, updating warning PDF locally:', err);
      const updated = warnings.map((w) => (w.id === id ? { ...w, ...payload } : w));
      saveLocalWarnings(updated);
      return updated.find((w) => w.id === id);
    }
  };

  const deleteWarning = async (id) => {
    try {
      await mutateCloudDatabase('delete', 'warnings', null, id);
      setWarnings((prev) => prev.filter((w) => w.id !== id));
      saveLocalWarnings(warnings.filter((w) => w.id !== id));
    } catch (err) {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('warnings').delete().eq('id', id);
        if (error) throw new Error(`Supabase error: ${error.message}`);
        setWarnings((prev) => prev.filter((w) => w.id !== id));
        saveLocalWarnings(warnings.filter((w) => w.id !== id));
        return;
      }

      console.warn('Cloud database unavailable, deleting warning PDF locally:', err);
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

  // Upload file to Supabase Cloud Storage
  const uploadFile = async (file, folder = 'documents') => {
    if (!file) throw new Error('No file provided');

    // Convert file to Base64 for the serverless upload endpoint
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    try {
      // 1. Try serverless admin upload to Supabase Storage
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || 'application/pdf',
          fileBase64: base64Data,
          folder,
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        return {
          file_url: result.file_url,
          file_name: result.file_name,
          file_size: result.file_size,
        };
      }
      throw new Error(result.error || 'Server upload failed');
    } catch (serverErr) {
      // 2. Direct client Supabase Storage upload fallback
      if (isSupabaseConfigured && supabase) {
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${folder}/${Date.now()}_${cleanFileName}`;

        const { error: uploadError } = await supabase.storage
          .from(SUPABASE_STORAGE_BUCKET)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (!uploadError) {
          const { data } = supabase.storage
            .from(SUPABASE_STORAGE_BUCKET)
            .getPublicUrl(filePath);

          return {
            file_url: data.publicUrl,
            file_name: file.name,
            file_size: formatBytes(file.size),
          };
        }
      }

      console.warn('Cloud storage unavailable, using local file reader preview:', serverErr);
      return {
        file_url: base64Data,
        file_name: file.name,
        file_size: formatBytes(file.size),
      };
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
        isCloudConnected: isSupabaseConfigured,
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
