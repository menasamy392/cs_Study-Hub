import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured, supabaseConfigReason, SUPABASE_STORAGE_BUCKET } from '../lib/supabase';
import { INITIAL_SUBJECTS, INITIAL_MATERIALS, INITIAL_ANNOUNCEMENTS, INITIAL_WARNINGS } from '../lib/mockData';

const DataContext = createContext();

const STORAGE_KEYS = {
  SUBJECTS: 'study_hub_subjects_v2',
  MATERIALS: 'study_hub_materials_v2',
  ANNOUNCEMENTS: 'study_hub_announcements_v2',
  WARNINGS: 'study_hub_pdf_warnings_v3',
  PROGRESS: 'study_hub_progress_v2',
  LAST_STUDIED: 'study_hub_last_studied_v2',
  DELETED_IDS: 'study_hub_deleted_ids_v3',
};

// Safe helpers for tombstoned (deleted) records
function getDeletedIdsSet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

// Unpack encoded metadata from external_url if columns were stored as fallback
export function normalizeMaterial(m) {
  if (!m || typeof m !== 'object') return m;
  let res = { ...m };
  if (res.external_url && typeof res.external_url === 'string' && res.external_url.startsWith('__studyhub_meta__:')) {
    try {
      const meta = JSON.parse(res.external_url.replace('__studyhub_meta__:', ''));
      res = {
        ...res,
        sheet_pdf_url: res.sheet_pdf_url || meta.sheet_pdf_url || (res.type === 'section' ? res.file_url : ''),
        sheet_file_name: res.sheet_file_name || meta.sheet_file_name || (res.type === 'section' ? res.file_name : ''),
        sheet_file_size: res.sheet_file_size || meta.sheet_file_size || (res.type === 'section' ? res.file_size : ''),
        solution_pdf_url: res.solution_pdf_url || meta.solution_pdf_url || '',
        solution_file_name: res.solution_file_name || meta.solution_file_name || '',
        solution_file_size: res.solution_file_size || meta.solution_file_size || '',
        external_url: meta.real_external_url || '',
      };
    } catch {}
  } else if (res.type === 'section') {
    if (!res.sheet_pdf_url && res.file_url) {
      res.sheet_pdf_url = res.file_url;
      res.sheet_file_name = res.file_name || '';
      res.sheet_file_size = res.file_size || '';
    }
  }
  return res;
}

function markItemDeleted(id) {
  if (!id) return;
  try {
    const set = getDeletedIdsSet();
    set.add(id);
    localStorage.setItem(STORAGE_KEYS.DELETED_IDS, JSON.stringify([...set]));
  } catch {}
}

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

  // Load Data directly from Supabase Cloud
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isSupabaseConfigured && supabase) {
      try {
        const deletedSet = getDeletedIdsSet();

        // 1. Fetch subjects from Supabase
        const { data: subData, error: subError } = await supabase
          .from('subjects')
          .select('*')
          .order('order_index', { ascending: true })
          .order('name', { ascending: true });

        if (subError) throw new Error(`Supabase subjects error: ${subError.message}`);

        // 2. Fetch materials from Supabase
        const { data: matData, error: matError } = await supabase
          .from('materials')
          .select('*')
          .order('number', { ascending: true })
          .order('created_at', { ascending: false });

        if (matError) throw new Error(`Supabase materials error: ${matError.message}`);

        // 3. Fetch announcements from Supabase
        let annData = [];
        try {
          const { data: fetchedAnn, error: annError } = await supabase
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });
          if (annError) throw annError;
          annData = fetchedAnn || [];
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
          if (warnError) throw warnError;
          warnData = fetchedWarn || [];
        } catch (warnErr) {
          console.warn('Note on warnings query:', warnErr);
        }

        // Filter out any tombstoned/deleted records and normalize metadata
        const activeSubs = (subData || []).filter((s) => !deletedSet.has(s.id));
        const activeMats = (matData || [])
          .map(normalizeMaterial)
          .filter((m) => !deletedSet.has(m.id) && !deletedSet.has(m.subject_id));
        const activeAnn = (annData || []).filter(
          (a) => !deletedSet.has(a.id) && !deletedSet.has(a.subject_id)
        );
        const activeWarn = (warnData || []).filter(
          (w) => !deletedSet.has(w.id) && !deletedSet.has(w.subject_id)
        );

        setSubjects(activeSubs);
        setMaterials(activeMats);
        setAnnouncements(activeAnn);
        setWarnings(activeWarn);

        // Cache fresh cloud data for offline resiliency
        try {
          localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(activeSubs));
          localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(activeMats));
          localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(activeAnn));
          localStorage.setItem(STORAGE_KEYS.WARNINGS, JSON.stringify(activeWarn));
        } catch {}
      } catch (err) {
        console.error('Supabase query error:', err);
        setError(err.message || 'Failed to load content from Supabase cloud database.');
        loadLocalFallback();
      } finally {
        setLoading(false);
      }
    } else {
      setError(supabaseConfigReason || 'Supabase cloud database is not connected.');
      loadLocalFallback();
      setLoading(false);
    }
  }, []);

  // Fallback loader (preserves existing local view if cloud is disconnected)
  const loadLocalFallback = () => {
    try {
      const deletedSet = getDeletedIdsSet();
      const storedSubs = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
      const storedMats = localStorage.getItem(STORAGE_KEYS.MATERIALS);
      const storedAnn = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      const storedWarn = localStorage.getItem(STORAGE_KEYS.WARNINGS);

      const rawSubs = storedSubs ? JSON.parse(storedSubs) : INITIAL_SUBJECTS;
      const rawMats = storedMats ? JSON.parse(storedMats) : INITIAL_MATERIALS;
      const rawAnn = storedAnn ? JSON.parse(storedAnn) : INITIAL_ANNOUNCEMENTS;
      const rawWarn = storedWarn ? JSON.parse(storedWarn) : INITIAL_WARNINGS;

      setSubjects((rawSubs || []).filter((s) => !deletedSet.has(s.id)));
      setMaterials(
        (rawMats || [])
          .map(normalizeMaterial)
          .filter((m) => !deletedSet.has(m.id) && !deletedSet.has(m.subject_id))
      );
      setAnnouncements((rawAnn || []).filter((a) => !deletedSet.has(a.id) && !deletedSet.has(a.subject_id)));
      setWarnings((rawWarn || []).filter((w) => !deletedSet.has(w.id) && !deletedSet.has(w.subject_id)));
    } catch {
      const deletedSet = getDeletedIdsSet();
      setSubjects(INITIAL_SUBJECTS.filter((s) => !deletedSet.has(s.id)));
      setMaterials(
        INITIAL_MATERIALS.map(normalizeMaterial).filter(
          (m) => !deletedSet.has(m.id) && !deletedSet.has(m.subject_id)
        )
      );
      setAnnouncements(INITIAL_ANNOUNCEMENTS.filter((a) => !deletedSet.has(a.id) && !deletedSet.has(a.subject_id)));
      setWarnings(INITIAL_WARNINGS.filter((w) => !deletedSet.has(w.id) && !deletedSet.has(w.subject_id)));
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
        console.warn('Realtime subscription setup notice:', e);
      }
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadData]);

  // Serverless Admin Cloud Mutation Helper (bypasses RLS safely via verified admin session)
  const mutateCloudDatabase = async (action, table, data = null, id = null) => {
    const res = await fetch('/api/admin/mutate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, table, data, id }),
    });

    const result = await res.json();
    if (!res.ok) {
      const err = new Error(result.error || `Failed to execute ${action} on ${table}`);
      err.requiresMigration = Boolean(result.requiresMigration);
      throw err;
    }

    return result.data;
  };

  // Helper to clean all caches on subject delete
  const cleanLocalStorageAfterSubjectDelete = (subjectId) => {
    try {
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
      console.warn('Cache clean error:', e);
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
  // SUBJECT ACTIONS (STRICT CLOUD PERSISTENCE)
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
      const cloudData = await mutateCloudDatabase('insert', 'subjects', payload);
      setSubjects((prev) => [...prev, cloudData]);
      await loadData();
      return cloudData;
    } catch (err) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('subjects')
          .insert([payload])
          .select()
          .single();
        if (error) throw new Error(`Supabase insert failed: ${error.message}`);
        setSubjects((prev) => [...prev, data]);
        return data;
      }

      throw new Error(
        `Cloud Database Error: ${err.message || supabaseConfigReason || 'Supabase is not configured'}. Changes cannot be saved.`
      );
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
        if (error) throw new Error(`Supabase update failed: ${error.message}`);
        setSubjects((prev) => prev.map((s) => (s.id === id ? data : s)));
        return data;
      }

      throw new Error(
        `Cloud Database Error: ${err.message || supabaseConfigReason || 'Supabase is not configured'}. Changes cannot be saved.`
      );
    }
  };

  const deleteSubject = async (id) => {
    if (!id) throw new Error('Subject ID is required for deletion');

    // 1. Permanently delete from Supabase via serverless admin mutation
    await mutateCloudDatabase('delete', 'subjects', null, id);

    // 2. Mark as permanently deleted in local tombstone blacklist
    markItemDeleted(id);

    // 3. Immediately clean local storage caches
    cleanLocalStorageAfterSubjectDelete(id);

    // 4. Update in-memory state
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setMaterials((prev) => prev.filter((m) => m.subject_id !== id));
    setAnnouncements((prev) => prev.filter((a) => a.subject_id !== id));
    setWarnings((prev) => prev.filter((w) => w.subject_id !== id));
  };

  // ==========================================
  // MATERIAL ACTIONS (STRICT CLOUD PERSISTENCE)
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
      sheet_pdf_url: materialData.sheet_pdf_url || '',
      sheet_file_name: materialData.sheet_file_name || '',
      sheet_file_size: materialData.sheet_file_size || '',
      solution_pdf_url: materialData.solution_pdf_url || '',
      solution_file_name: materialData.solution_file_name || '',
      solution_file_size: materialData.solution_file_size || '',
    };

    try {
      const rawCloudData = await mutateCloudDatabase('insert', 'materials', payload);
      const cloudData = normalizeMaterial(rawCloudData);
      setMaterials((prev) => {
        const next = [cloudData, ...prev];
        try {
          localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(next));
        } catch {}
        return next;
      });
      loadData();
      return cloudData;
    } catch (err) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('materials')
          .insert([payload])
          .select()
          .single();
        if (error) throw new Error(`Supabase material insert failed: ${error.message}`);
        const norm = normalizeMaterial(data);
        setMaterials((prev) => {
          const next = [norm, ...prev];
          try {
            localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(next));
          } catch {}
          return next;
        });
        loadData();
        return norm;
      }

      throw new Error(`Cloud Database Error: ${err.message || supabaseConfigReason || 'Supabase is not configured'}`);
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
      sheet_pdf_url: updates.sheet_pdf_url !== undefined ? updates.sheet_pdf_url : '',
      sheet_file_name: updates.sheet_file_name !== undefined ? updates.sheet_file_name : '',
      sheet_file_size: updates.sheet_file_size !== undefined ? updates.sheet_file_size : '',
      solution_pdf_url: updates.solution_pdf_url !== undefined ? updates.solution_pdf_url : '',
      solution_file_name: updates.solution_file_name !== undefined ? updates.solution_file_name : '',
      solution_file_size: updates.solution_file_size !== undefined ? updates.solution_file_size : '',
    };

    try {
      const rawCloudData = await mutateCloudDatabase('update', 'materials', payload, id);
      const cloudData = normalizeMaterial(rawCloudData);
      setMaterials((prev) => {
        const next = prev.map((m) => (m.id === id ? { ...m, ...cloudData } : m));
        try {
          localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(next));
        } catch {}
        return next;
      });
      loadData();
      return cloudData;
    } catch (err) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('materials')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (error) throw new Error(`Supabase material update failed: ${error.message}`);
        const norm = normalizeMaterial(data);
        setMaterials((prev) => {
          const next = prev.map((m) => (m.id === id ? { ...m, ...norm } : m));
          try {
            localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(next));
          } catch {}
          return next;
        });
        loadData();
        return norm;
      }

      throw new Error(`Cloud Database Error: ${err.message || supabaseConfigReason || 'Supabase is not configured'}`);
    }
  };

  // Dedicated Atomic Safe Replace for Section PDFs (Sheet or Solution)
  const safeReplaceSectionPdf = async (materialId, field, file, oldFileUrl) => {
    if (!materialId) throw new Error('Material ID is required for replacement');
    if (!file) throw new Error('No PDF file provided for replacement');

    const folder = field === 'solution' ? 'sections/solutions' : 'sections/sheets';
    const uploadRes = await uploadFile(file, folder);

    const rawUpdated = await mutateCloudDatabase(
      'safe_replace_file',
      'materials',
      {
        field,
        newUrl: uploadRes.file_url,
        newName: uploadRes.file_name,
        newSize: uploadRes.file_size,
        oldUrl: oldFileUrl,
      },
      materialId
    );

    const updatedItem = normalizeMaterial(rawUpdated);

    setMaterials((prev) => {
      const next = prev.map((m) => (m.id === materialId ? { ...m, ...updatedItem } : m));
      try {
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(next));
      } catch {}
      return next;
    });

    loadData();
    return updatedItem;
  };

  // Dedicated Atomic Safe Delete for Section PDFs (Sheet or Solution)
  const safeDeleteSectionPdf = async (materialId, field) => {
    if (!materialId) throw new Error('Material ID is required for deletion');

    const rawUpdated = await mutateCloudDatabase(
      'safe_delete_pdf',
      'materials',
      { field },
      materialId
    );

    const updatedItem = normalizeMaterial(rawUpdated);

    setMaterials((prev) => {
      const next = prev.map((m) => (m.id === materialId ? { ...m, ...updatedItem } : m));
      try {
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(next));
      } catch {}
      return next;
    });

    loadData();
    return updatedItem;
  };

  const deleteMaterial = async (id) => {
    if (!id) throw new Error('Material ID is required for deletion');

    await mutateCloudDatabase('delete', 'materials', null, id);
    markItemDeleted(id);

    setMaterials((prev) => prev.filter((m) => m.id !== id));
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MATERIALS);
      if (stored) {
        const updated = JSON.parse(stored).filter((m) => m.id !== id);
        localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(updated));
      }
    } catch {}
  };

  // ==========================================
  // ANNOUNCEMENTS ACTIONS (STRICT CLOUD PERSISTENCE)
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
        if (error) throw new Error(`Supabase announcement insert failed: ${error.message}`);
        setAnnouncements((prev) => [data, ...prev]);
        return data;
      }

      throw new Error(`Cloud Database Error: ${err.message || supabaseConfigReason || 'Supabase is not configured'}`);
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
        if (error) throw new Error(`Supabase announcement update failed: ${error.message}`);
        setAnnouncements((prev) => prev.map((a) => (a.id === id ? data : a)));
        return data;
      }

      throw new Error(`Cloud Database Error: ${err.message || supabaseConfigReason || 'Supabase is not configured'}`);
    }
  };

  const deleteAnnouncement = async (id) => {
    if (!id) throw new Error('Announcement ID is required for deletion');

    await mutateCloudDatabase('delete', 'announcements', null, id);
    markItemDeleted(id);

    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      if (stored) {
        const updated = JSON.parse(stored).filter((a) => a.id !== id);
        localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(updated));
      }
    } catch {}
  };

  // ==========================================
  // WARNING PDF DOCUMENTS ACTIONS (STRICT CLOUD PERSISTENCE)
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
      return cloudData;
    } catch (err) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('warnings')
          .insert([payload])
          .select()
          .single();
        if (error) throw new Error(`Supabase warning insert failed: ${error.message}`);
        setWarnings((prev) => [data, ...prev]);
        return data;
      }

      throw new Error(`Cloud Database Error: ${err.message || supabaseConfigReason || 'Supabase is not configured'}`);
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
      return cloudData;
    } catch (err) {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('warnings')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (error) throw new Error(`Supabase warning update failed: ${error.message}`);
        setWarnings((prev) => prev.map((w) => (w.id === id ? data : w)));
        return data;
      }

      throw new Error(`Cloud Database Error: ${err.message || supabaseConfigReason || 'Supabase is not configured'}`);
    }
  };

  const deleteWarning = async (id) => {
    if (!id) throw new Error('Warning ID is required for deletion');

    await mutateCloudDatabase('delete', 'warnings', null, id);
    markItemDeleted(id);

    setWarnings((prev) => prev.filter((w) => w.id !== id));
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WARNINGS);
      if (stored) {
        const updated = JSON.parse(stored).filter((w) => w.id !== id);
        localStorage.setItem(STORAGE_KEYS.WARNINGS, JSON.stringify(updated));
      }
    } catch {}
  };

  // Seed Cloud Database with Initial Curriculum
  const seedCloudDatabase = async () => {
    const res = await fetch('/api/admin/mutate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action: 'seed',
        data: {
          subjects: INITIAL_SUBJECTS,
          materials: INITIAL_MATERIALS,
          announcements: INITIAL_ANNOUNCEMENTS,
        },
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to seed cloud database');
    }
    await loadData();
    return result;
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
      // 2. Direct client Supabase Storage upload fallback if configured
      if (isSupabaseConfigured && supabase) {
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueSalt = Math.random().toString(36).substring(2, 9);
        const filePath = `${folder}/${Date.now()}_${uniqueSalt}_${cleanFileName}`;

        const { error: uploadError } = await supabase.storage
          .from(SUPABASE_STORAGE_BUCKET)
          .upload(filePath, file, {
            cacheControl: '60',
            upsert: false,
          });

        if (!uploadError) {
          const { data } = supabase.storage
            .from(SUPABASE_STORAGE_BUCKET)
            .getPublicUrl(filePath);

          return {
            file_url: `${data.publicUrl}?v=${Date.now()}`,
            file_name: file.name,
            file_size: formatBytes(file.size),
          };
        }
      }

      throw new Error(`Cloud Storage Error: ${serverErr.message || supabaseConfigReason || 'Supabase Storage is not connected.'}`);
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
    localStorage.removeItem(STORAGE_KEYS.DELETED_IDS);
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
        safeReplaceSectionPdf,
        safeDeleteSectionPdf,
        // Announcement operations
        addAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        // Student Warnings operations
        addWarning,
        updateWarning,
        deleteWarning,
        // Seed database
        seedCloudDatabase,
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
