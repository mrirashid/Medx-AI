# HealthAI Admin Dashboard

A modern, responsive admin dashboard for the HealthAI medical diagnosis system built with React, TypeScript, and Tailwind CSS.

## 🚀 Features

### Admin Pages

- **Login Page** - Secure authentication for admin users
- **Dashboard** - Overview with statistics, charts, and recent activity
- **User Management** - Manage doctors and nurses
- **Case Management** - View and manage all patient cases
- **New Case** - Create new patient cases for AI diagnosis
- **Recommendations** - Review and approve AI-generated treatment recommendations
- **Patient Profiles** - View and manage patient information
- **Settings** - Configure admin account and system preferences

## 🛠️ Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Recharts** - Data visualization
- **Lucide React** - Icon library
- **Vite** - Build tool and dev server

## 📦 Installation

1. Navigate to the project directory:

```bash
cd frontend/health
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

## 🔐 Demo Credentials

**Admin Login:**

- Email: `admin@healthai.com`
- Password: `admin123`

## 📱 Pages Overview

### 1. Admin Login (`/admin/login`)

- Email and password authentication
- Remember me functionality
- Forgot password link
- Demo credentials display

### 2. Dashboard (`/admin/dashboard`)

- Statistics cards (Total Cases, Pending Recommendations, Saved Reports)
- Prediction Confidence Distribution (Pie Chart)
- Diagnosis Trends Over Time (Line Chart)
- Recent Activity feed

### 3. User Management (`/admin/users`)

- List of all doctors and nurses
- Search and filter functionality
- User details (role, department, contact info)
- Add, edit, and delete users

### 4. Case Management (`/admin/cases`)

- View all patient cases
- Filter by status (pending, in-progress, completed)
- Case details (patient info, diagnosis, confidence level)
- Download reports
- Case statistics

### 5. New Case (`/admin/cases/new`)

- Patient information form
- Vital signs input
- Clinical information (symptoms, medical history, medications)
- Medical document upload
- Submit for AI diagnosis

### 6. Recommendations (`/admin/recommendations`)

- AI-generated treatment recommendations
- Approve or reject recommendations
- Confidence scores
- Status tracking (pending, approved, rejected)

### 7. Patient Profiles (`/admin/patients`)

- Patient cards with essential information
- Search functionality
- Patient statistics
- Contact information
- Medical history overview

### 8. Settings (`/admin/settings`)

- Profile information management
- Security settings (password change, 2FA)
- Notification preferences
- System preferences (language, timezone, date format)

## 🎨 Design Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Modern UI** - Clean, professional interface
- **Color Scheme** - Primary blue theme with intuitive color coding
- **Interactive Elements** - Hover effects, transitions, and animations
- **Accessibility** - Semantic HTML and ARIA labels

## 📂 Project Structure

```
src/
├── components/
│   └── common/
│       └── ProtectedRoute.tsx    # Route protection component
├── layouts/
│   └── AdminLayout.tsx            # Main admin layout with sidebar
├── pages/
│   └── admin/
│       ├── AdminLogin.tsx         # Login page
│       ├── AdminDashboard.tsx     # Dashboard page
│       ├── UserManagement.tsx     # User management
│       ├── CaseManagement.tsx     # Case management
│       ├── NewCase.tsx            # New case form
│       ├── Recommendations.tsx    # AI recommendations
│       ├── PatientProfiles.tsx    # Patient profiles
│       └── AdminSettings.tsx      # Settings page
├── App.tsx                        # Main app with routing
└── main.tsx                       # App entry point
```

## 🔒 Authentication

The application uses localStorage for authentication:

- `authToken` - Stores the authentication token
- `userRole` - Stores the user role (admin, doctor, nurse)

Protected routes check for authentication before allowing access.

## 🎯 Future Enhancements

- [ ] Doctor and Nurse dashboards
- [ ] Real-time notifications
- [ ] Advanced filtering and sorting
- [ ] Data export functionality
- [ ] Integration with backend API
- [ ] AI model integration
- [ ] Report generation
- [ ] Email notifications
- [ ] Audit logs
- [ ] Multi-language support

## 📄 License

Copyright © 2025 HealthAI. All rights reserved.

## 👨‍💻 Development

Built with ❤️ for the HealthAI FYP project.
