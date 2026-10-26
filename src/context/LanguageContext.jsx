import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const TRANSLATIONS = {
  en: {
    brandName: 'Study Hub',
    home: 'Home',
    subjects: 'Subjects',
    search: 'Search',
    searchShortcut: 'Search /',
    welcomeTitle: 'Welcome to Study Hub',
    welcomeSubtitle: 'Everything you need to study, organized in one place.',
    exploreSubjects: 'Explore Subjects',
    continueStudying: 'Continue Studying',
    continueLearning: 'Continue Learning',
    noRecentActivity: 'No study activity recorded yet.',
    startJourney: 'Choose a subject below to begin your learning journey!',
    latestNews: 'Latest News & Announcements',
    latestNewsSub: 'Stay updated with new lectures, practical sections, and exam dates.',
    viewAllNews: 'View All Announcements',
    universitySubjects: 'University Subjects',
    universitySubjectsSub: 'Select a subject to access lectures, sections, roadmap, and materials.',
    openSubject: 'Open Subject',
    progress: 'Progress',
    completed: 'Completed',
    lectures: 'Lectures',
    sections: 'Sections',
    quizzes: 'Quizzes',
    studyNotes: 'Study Notes',
    roadmap: 'Study Roadmap',
    overview: 'Overview',
    announcements: 'Announcements',
    markAsCompleted: 'Mark as Completed',
    completedStatus: 'Completed',
    reopenLecture: 'Mark as Incomplete',
    view: 'View',
    download: 'Download',
    openResource: 'Open Resource',
    readLecture: 'Read the Lecture',
    studyMaterials: 'Study Materials',
    takeQuiz: 'Take the Quiz',
    noQuizzes: 'No quizzes available yet.',
    noLectures: 'No lectures uploaded yet.',
    noSections: 'No practical sections available yet.',
    noNotes: 'No study notes available yet.',
    noAnnouncements: 'No announcements posted yet.',
    backToSubjects: 'Back to Subjects',
    overallProgress: 'Total Progress',
    lecturesRead: 'lectures read',
    cardsKnown: 'materials viewed',
    bestQuiz: 'completion',
  },
  ar: {
    brandName: 'Study Hub',
    home: 'الرئيسية',
    subjects: 'المواد الدراسية',
    search: 'بحث',
    searchShortcut: 'بحث /',
    welcomeTitle: 'مرحباً بك في Study Hub',
    welcomeSubtitle: 'كل ما تحتاجه للدراسة، منظم في مكان واحد.',
    exploreSubjects: 'استكشف المواد',
    continueStudying: 'متابعة الدراسة',
    continueLearning: 'متابعة التعلّم',
    noRecentActivity: 'لا يوجد نشاط دراسي سابق.',
    startJourney: 'اختر مادة من الأسفل لتبدأ مسيرتك الدراسية!',
    latestNews: 'آخر الأخبار والإعلانات',
    latestNewsSub: 'تابع أحدث المحاضرات والسكاشن ومواعيد الامتحانات.',
    viewAllNews: 'عرض كل الإعلانات',
    universitySubjects: 'المواد الدراسية الجامعية',
    universitySubjectsSub: 'اختر مادة للوصول إلى المحاضرات والسكاشن ومسار التعلّم.',
    openSubject: 'فتح المادة',
    progress: 'التقدم',
    completed: 'مكتمل',
    lectures: 'المحاضرات',
    sections: 'السكاشن',
    quizzes: 'الكويزات',
    studyNotes: 'الملخصات',
    roadmap: 'مسار التعلّم',
    overview: 'نظرة عامة',
    announcements: 'الإعلانات',
    markAsCompleted: 'تحديد كمكتمل',
    completedStatus: 'تم الانتهاء',
    reopenLecture: 'إلغاء الإكمال',
    view: 'معاينة',
    download: 'تحميل',
    openResource: 'فتح المصدر',
    readLecture: 'قراءة المحاضرة',
    studyMaterials: 'المواد الدراسية',
    takeQuiz: 'بدء الكويز',
    noQuizzes: 'لا توجد كويزات متاحة حالياً.',
    noLectures: 'لم يتم رفع محاضرات لهذه المادة بعد.',
    noSections: 'لا توجد سكاشن عملية متاحة بعد.',
    noNotes: 'لا توجد ملخصات مضافة بعد.',
    noAnnouncements: 'لا توجد إعلانات منشورة بعد.',
    backToSubjects: 'العودة للمواد',
    overallProgress: 'التقدم العام',
    lecturesRead: 'محاضرات تمت قراءتها',
    cardsKnown: 'ملفاً ومصدراً',
    bestQuiz: 'نسبة الإنجاز',
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('study_hub_lang') || 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('study_hub_lang', lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    } catch (e) {
      console.warn('Language persistence error', e);
    }
  }, [lang]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const t = (key) => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t, isRTL: lang === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
