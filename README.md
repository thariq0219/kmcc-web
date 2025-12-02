# KMCC Membership Management System

A web-based membership management system for KMCC (Kerala Muslim Cultural Centre) built with Supabase and vanilla JavaScript.

## Features

- **Member Registration**: Complete registration form with personal details, nominee information, and profile photo upload
- **Real-time Status Updates**: Automatic notifications when membership is approved or rejected
- **ID Card Generation**: Automatic ID card generation and download once membership is approved
- **District & Area Management**: Dynamic dropdowns for district and area selection
- **Profile Photo Storage**: Secure photo storage using Supabase Storage
- **Responsive Design**: Built with Tailwind CSS for mobile and desktop compatibility

## Prerequisites

- A modern web browser
- Supabase account and project
- Git (for version control)
- Node.js and npm (for Tailwind CSS compilation)

## Setup Instructions

### 1. Clone the Repository

```powershell
git clone https://github.com/YOUR_USERNAME/kmcc-membership.git
cd kmcc-membership
```

### 2. Configure Supabase

1. Copy the template configuration file:
   ```powershell
   Copy-Item supabase.config.template.js supabase.config.js
   ```

2. Open `supabase.config.js` and replace the placeholder values with your actual Supabase credentials

### 3. Database Schema

Create the required tables in your Supabase project (see documentation for SQL schema)

### 4. Install Dependencies

```powershell
npm install
```

### 5. Build Tailwind CSS

```powershell
npm run build
```

## Deployment

### GitHub Pages

1. Push your code to GitHub (make sure `supabase.config.js` is in `.gitignore`)
2. Go to repository Settings → Pages
3. Select Deploy from a branch (main)
4. Your site will be available at: `https://YOUR_USERNAME.github.io/kmcc-membership/`

## Technologies Used

- **Supabase**: Backend as a Service
- **Vanilla JavaScript**: ES6 modules
- **Tailwind CSS**: Utility-first CSS framework
- **html2canvas**: ID card generation
- **GitHub Pages**: Static site hosting
