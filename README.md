# Study Hub — University Study Platform

A modern, clean, and responsive educational web platform designed for university students to access their lectures, practical sections, quizzes, announcements, and visual study roadmaps in one organized place.

Inspired by [Study Deck](https://study-deck-five.vercel.app/), redesigned with a premium dark-themed interface, interactive zigzag learning paths, student progress tracking, and seamless document viewing.

---

## 🌟 Key Features

### For Students
* **No Registration Required**: Direct, friction-free access to all university study materials.
* **Top Navigation Subject Pills**: Instant one-click switching between subjects directly from the top bar (e.g., *Compiler Design*, *Database 2*, *DSS*, *E-Commerce*, *Data Protection*).
* **Interactive Study Roadmap**:
  * Connected zigzag learning path with animated node transitions.
  * Visual states:
    * **Not Started**: Dark circle with subtle border.
    * **Current Lecture**: Highlighted circle with glowing yellow/blue halo.
    * **Completed**: Green circle with checkmark.
  * Real-time progress bar: *"X of Y lectures completed — Z%"*.
  * Mark lectures as completed or reopen them with instant local persistence.
* **Continue Studying (Homepage)**:
  * Automatically remembers the student's last active subject, lecture number, title, and progress.
  * One-click "Continue Learning →" button returns directly to the exact study session.
* **Latest News & Announcements (Homepage)**:
  * Displays the 5 newest announcements across all subjects.
  * Category tags (*New Lecture*, *New Section*, *Quiz*, *Assignment*, *Exam*, *General*).
  * Priority indicator for urgent exam and assignment deadlines.
* **Subject Dashboard (`/subject/:id`)**:
  * Course breadcrumbs, instructor name, and academic level.
  * 3 Spotlight Cards: **Read the Lecture**, **Study Materials**, and **Take the Quiz**.
  * Organized tabs: **Path / Overview**, **Lectures**, **Sections**, **Quizzes**, **Study Notes**, **News & Announcements**, and **Study Roadmap**.
* **Fixed In-App File Preview & Download**:
  * **View Button**: Previews PDFs (via embedded viewer & Google Docs Reader fallback), images, and videos directly inside the platform without triggering browser downloads.
  * **Download Button**: Directly downloads the file to the student's computer.
* **Global Search Modal (`Search /`)**:
  * Quick shortcut `/` opens instant search across all subjects, lectures, practical sections, and study notes.
* **Bilingual Support (English / Arabic)**:
  * One-click language switcher (`EN` / `عربي`) in the header.

---

## 🔐 Admin Dashboard

* **Exact Admin URL**: `/admin`
* **Admin Login URL**: `/admin/login`
* **Security**:
  * Completely hidden from public homepage and navbar navigation.
  * Protected by authentication guards.
  * Demo credentials for instant testing:
    * **Email**: `admin@csstudyhub.edu`
    * **Password**: `admin123`
    *(or click the "One-Click Quick Login" button on `/admin/login`)*

### Admin Capabilities
1. **Subject Management**: Create, edit, and delete department courses (including instructor names, course codes, and custom accent colors).
2. **Lecture Management**: Upload lecture PDFs, assign lecture sequence numbers, and descriptions.
3. **Section Management**: Upload lab worksheets and practical tutorials.
4. **Quiz Management**: Add Google Form or external practice test links.
5. **Study Notes**: Publish revision cheat sheets and YouTube explanation videos.
6. **Announcements Management**:
   * Publish announcements linked to specific subjects.
   * Categorize announcements (*Exam*, *Assignment*, *Quiz*, *New Lecture*, *New Section*, *General*).
   * Toggle **High Priority / Important** badge.
   * Automatically appear in both the subject's News tab and homepage Latest News.

---

## 🚀 Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Development server runs on: `http://localhost:5173`.
