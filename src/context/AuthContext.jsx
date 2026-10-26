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

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // Get current Supabase session
      supabase.auth.getSession().then(({ data: { session } }) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u && !u.email?.toLowerCase().includes('admin') && u.user_metadata?.role !== 'admin') {
          setStudentUser({
            id: u.id,
            email: u.email,
            name: u.user_metadata?.name || u.email?.split('@')[0],
            studentId: u.user_metadata?.student_id || '',
          });
        }
        setLoading(false);
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          const u = session?.user ?? null;
          setUser(u);
          if (u && !u.email?.toLowerCase().includes('admin') && u.user_metadata?.role !== 'admin') {
            setStudentUser({
              id: u.id,
              email: u.email,
              name: u.user_metadata?.name || u.email?.split('@')[0],
              studentId: u.user_metadata?.student_id || '',
            });
          } else {
            setStudentUser(null);
          }
          setLoading(false);
        }
      );

      return () => subscription.unsubscribe();
    } else {
      // Check stored admin session
      try {
        const storedAdmin =
          localStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) ||
          localStorage.getItem(STORAGE_KEYS.LEGACY_ADMIN);
        if (storedAdmin) {
          setUser(JSON.parse(storedAdmin));
        }

        const storedStudent = localStorage.getItem(STORAGE_KEYS.STUDENT_SESSION);
        if (storedStudent) {
          setStudentUser(JSON.parse(storedStudent));
        }
      } catch (e) {
        console.warn('Error reading mock sessions', e);
      }
      setLoading(false);
    }
  }, []);

  // Admin Sign In
  const signIn = async (email, password) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } else {
      // Mock admin authentication for development/demo
      if ((email === 'admin@csstudyhub.edu' || email === 'admin@demo.com' || email === 'admin@studyhub.edu') && password === 'admin123') {
        const mockUser = {
          id: 'mock-admin-001',
          email,
          role: 'authenticated',
          user_metadata: { name: 'CS Department Admin', role: 'admin' },
        };
        setUser(mockUser);
        localStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(mockUser));
        return { user: mockUser };
      } else {
        throw new Error('Invalid demo credentials. Use: admin@csstudyhub.edu / admin123');
      }
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setStudentUser(null);
    } else {
      setUser(null);
      localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
      localStorage.removeItem(STORAGE_KEYS.LEGACY_ADMIN);
    }
  };

  const demoLogin = () => {
    const mockUser = {
      id: 'mock-admin-001',
      email: 'admin@csstudyhub.edu',
      role: 'authenticated',
      user_metadata: { name: 'CS Department Admin', role: 'admin' },
    };
    setUser(mockUser);
    localStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(mockUser));
  };

  // Student Authentication
  const loginStudent = async ({ email, studentId, name, password }) => {
    if (isSupabaseConfigured && supabase) {
      // In Supabase, try signing in with email & password
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: password || 'student123',
        });
        if (error) throw error;
        return data;
      } catch (err) {
        // If user doesn't exist yet, attempt signup
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
      supabase.auth.signOut();
    }
  };

  const isAdmin = Boolean(
    user && (user.email?.toLowerCase().includes('admin') || user.user_metadata?.role === 'admin')
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
        demoLogin,
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
