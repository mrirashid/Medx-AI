# HealthAI Admin - Quick Start Guide

## 🚀 Getting Started

### 1. Start the Application

```bash
cd frontend/health
npm install
npm run dev
```

Visit: **http://localhost:5173/**

### 2. Login

Use the demo credentials:

- **Email:** admin@healthai.com
- **Password:** admin123

## 📋 Page Navigation

### Main Navigation (Left Sidebar)

- 🏠 **Dashboard** - Overview and statistics
- 📝 **New Case** - Create new patient cases
- 📁 **All Cases** - Manage existing cases
- 💡 **Recommendations** - AI treatment suggestions
- 👥 **Patient Profiles** - Patient information
- ⚙️ **Settings** - Account settings

## 🎯 Key Features

### Dashboard

- View total cases, pending recommendations, and saved reports
- Interactive pie chart showing prediction confidence distribution
- Line chart displaying diagnosis trends over time
- Recent activity feed

### User Management

- Search and filter doctors and nurses
- View user details and contact information
- Add new users, edit existing users, or delete users
- Filter by role (doctors/nurses)

### Case Management

- View all cases with status indicators
- Search cases by patient name or case ID
- Filter by status (pending, in-progress, completed)
- View case details and download reports
- Track confidence levels for each diagnosis

### New Case Creation

1. Enter patient information (ID, name, age, gender)
2. Record vital signs (BP, heart rate, temperature, O2 saturation)
3. Add clinical information (symptoms, medical history, medications)
4. Upload medical documents (images, scans, reports)
5. Submit for AI diagnosis

### AI Recommendations

- Review AI-generated treatment recommendations
- View confidence scores for each recommendation
- Approve or reject recommendations
- Track recommendation status

### Patient Profiles

- Browse patient cards with key information
- Search patients by name or ID
- View patient statistics and contact details
- Access patient history and active cases

### Settings

- **Profile Tab:** Update personal information
- **Security Tab:** Change password, enable 2FA
- **Notifications Tab:** Configure email, SMS, and push notifications
- **Preferences Tab:** Set language, timezone, date format

## 🎨 UI Elements

### Color Coding

- 🔵 **Blue** - Primary actions, links, and important info
- 🟢 **Green** - Success, completed, active status
- 🟡 **Yellow** - Pending, warnings, attention needed
- 🔴 **Red** - Errors, rejected, high priority
- ⚫ **Gray** - Inactive, secondary info

### Status Indicators

- **Pending** - Yellow badge
- **In Progress** - Blue badge
- **Completed** - Green badge
- **Active** - Green badge
- **Inactive** - Gray badge

## 💡 Tips

1. **Quick Navigation**: Use the sidebar to quickly switch between pages
2. **Search**: Use the search bars to find specific users, cases, or patients
3. **Filters**: Apply filters to narrow down results
4. **Actions**: Hover over table rows to see available actions
5. **Notifications**: Check the bell icon for new updates

## 🔐 Security

- All routes are protected and require authentication
- Sessions are stored in localStorage
- Logout clears all authentication data

## 📱 Responsive Design

The admin dashboard is fully responsive and works on:

- Desktop computers (optimized)
- Tablets (responsive layout)
- Mobile phones (mobile-friendly)

## 🆘 Need Help?

Refer to the full documentation in `README_ADMIN.md` for detailed information about each feature and component.
