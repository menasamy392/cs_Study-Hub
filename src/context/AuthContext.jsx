import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext();

const STORAGE_KEYS = {
  ADMIN_SESSION: 'study_hub_admin_session',
  LEGACY_ADMIN: 'cs_study_hub_mock_admin',
  STUDENT_SESSION: 'study_hub_student_session',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [studentUser, setStudentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(!isSupabaseConfigured);

  // Check server-side admin session via HttpOnly cookie
  const checkAdminServerSession = async () => {
    try {
      const res = await fetch('/api/admin/session', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          const adminObj = {
            id: 'admin-server-session',
            username: data.user.username,
            name: data.user.name || 'Study Hub Administrator',
            role: 'admin',
            email: `${data.user.username}@studyhub.internal`,
            user_metadata: { role: 'admin', name: data.user.name || 'Study Hub Administrator' },
          };
          setUser(adminObj);
          return adminObj;
        }
      }
    } catch (e) {
      console.warn('Admin session check unreachable:', e);
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      // Clean up any deprecated legacy admin credentials from localStorage
      try {
        const legacy = localStorage.getItem(STORAGE_KEYS.LEGACY_ADMIN) || localStorage.getItem(STORAGE_KEYS.ADMIN_SESSION);
        if (legacy) {
          try {
            const parsed = JSON.parse(legacy);
            if (parsed.email === 'admin@csstudyhub.edu' || parsed.id === 'mock-admin-001') {
              localStorage.removeItem(STORAGE_KEYS.LEGACY_ADMIN);
              localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
            }
          } catch {
            localStorage.removeItem(STORAGE_KEYS.LEGACY_ADMIN);
            localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
          }
        }
      } catch {}

      // 1. Verify server-side admin session first
      const adminSession = await checkAdminServerSession();

      if (!adminSession) {
        // If not admin, check Supabase session if configured
        if (isSupabaseConfigured && supabase) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const u = session?.user ?? null;
            if (isMounted) {
              setUser(u);
              if (u && !u.email?.toLowerCase().includes('admin') && u.user_metadata?.role !== 'admin') {
                setStudentUser({
                  id: u.id,
                  email: u.email,
                  name: u.user_metadata?.name || u.email?.split('@')[0],
                  studentId: u.user_metadata?.student_id || '',
                });
              }
            }
          } catch (err) {
            console.warn('Error fetching Supabase session:', err);
          }
        } else {
          // Check student session for demo/local mode
          try {
            const storedStudent = localStorage.getItem(STORAGE_KEYS.STUDENT_SESSION);
            if (storedStudent && isMounted) {
              setStudentUser(JSON.parse(storedStudent));
            }
          } catch (e) {
            console.warn('Error reading stored student session', e);
          }
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    initAuth();

    // Listen for Supabase auth changes for student accounts
    let subscription = null;
    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        const u = session?.user ?? null;
        if (!u?.email?.toLowerCase().includes('admin') && u?.user_metadata?.role !== 'admin') {
          if (u) {
            setStudentUser({
              id: u.id,
              email: u.email,
              name: u.user_metadata?.name || u.email?.split('@')[0],
              studentId: u.user_metadata?.student_id || '',
            });
          } else {
            setStudentUser(null);
          }
        }
      });
      subscription = data.subscription;
    }

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // Admin Sign In - Secure Server-Side Endpoint
  const signIn = async (usernameOrEmail, password) => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        username: usernameOrEmail,
        password: password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed. Please verify credentials.');
    }

    const adminUser = {
      id: 'admin-server-session',
      username: data.user?.username || 'minasami',
      name: data.user?.name || 'Study Hub Administrator',
      role: 'admin',
      email: `${data.user?.username || 'minasami'}@studyhub.internal`,
      user_metadata: { role: 'admin', name: data.user?.name || 'Study Hub Administrator' },
    };

    setUser(adminUser);
    return { user: adminUser };
  };

  // Sign Out
  const signOut = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.warn('Logout server request failed:', err);
    }

    setUser(null);
    setStudentUser(null);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    localStorage.removeItem(STORAGE_KEYS.LEGACY_ADMIN);

    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
  };

  // Student Authentication
  const loginStudent = async ({ email, studentId, name, password }) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: password || 'student123',
        });
        if (error) throw error;
        return data;
      } catch (err) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password: password || 'student123',
          options: {
            data: {
              name: name || email.split('@')[0],
              student_id: studentId || '',
              role: 'student',
            },
          },
        });
        if (signUpErr) throw signUpErr;
        return data;
      }
    } else {
      const student = {
        id: `std-${Date.now()}`,
        email: email.trim().toLowerCase(),
        studentId: (studentId || '').trim(),
        name: (name || email.split('@')[0]).trim(),
      };
      setStudentUser(student);
      localStorage.setItem(STORAGE_KEYS.STUDENT_SESSION, JSON.stringify(student));
      return student;
    }
  };

  const logoutStudent = () => {
    setStudentUser(null);
    localStorage.removeItem(STORAGE_KEYS.STUDENT_SESSION);
    if (isSupabaseConfigured && supabase && !user?.email?.toLowerCase().includes('admin')) {
      supabase.auth.signOut().catch(() => {});
    }
  };

  const isAdmin = Boolean(
    user &&
      (user.role === 'admin' ||
        user.user_metadata?.role === 'admin' ||
        user.username === 'minasami' ||
        user.email?.toLowerCase().includes('admin'))
  );

  const isStudent = Boolean(studentUser);

  return (
    <AuthContext.Provider
      value={{
        user,
        studentUser,
        isAdmin,
        isStudent,
        loading,
        isConfigured: isSupabaseConfigured,
        isDemoMode,
        signIn,
        signOut,
        loginStudent,
        logoutStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
