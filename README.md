# APK Converter - Advanced Reverse Engineering Platform

**✅ Consolidated Next.js + Supabase Application**

This is a professional-grade APK converter and reverse engineering platform that provides advanced security bypass and analysis capabilities. All functionality has been consolidated into a single Next.js application using Supabase as the database.

## 🏗️ Architecture

**Single Unified Application:**
- **Frontend**: Next.js 15 with React 19 and TypeScript
- **Backend**: Next.js API Routes (no separate backend server)
- **Database**: Supabase PostgreSQL
- **Deployment**: Optimized for Vercel

## 🚀 Features

### APK Conversion Capabilities
- **Debug Mode**: Advanced debugging with pro-level reverse engineering tools
- **Sandbox Mode**: Military-grade security bypass and advanced analysis capabilities  
- **Combined Mode**: Professional security research platform with comprehensive bypass capabilities

### Advanced Reverse Engineering Features (From Previous Implementation)
- Dynamic Code Analysis and Runtime Manipulation
- Military-Grade Security Bypass Systems
- Pro-Level Payment & License Bypass
- Advanced Analysis & Reporting Platform
- Frida Integration & Advanced Hooking
- Vulnerability Scanning and Penetration Testing

### Migrated Backend Functionality
- Status check API endpoints
- Database operations using Supabase
- Real-time logging and monitoring

## 📁 Project Structure

```
/app
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (replaces separate backend)
│   │   ├── route.ts       # Root API endpoint
│   │   ├── status/        # Status check endpoints (migrated from backend)
│   │   ├── convert/       # APK conversion endpoints
│   │   ├── download/      # File download endpoints
│   │   └── cleanup/       # Cleanup endpoints
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page with integrated functionality
├── components/            # React components
│   ├── apk-converter.tsx  # Main APK converter component
│   ├── theme-provider.tsx # Theme provider
│   └── ui/               # UI components
├── lib/                   # Utility libraries
│   ├── supabase.ts       # Supabase configuration and helpers
│   ├── supabaseAdmin.ts  # Admin Supabase client
│   ├── neon.ts           # Legacy file (kept for compatibility)
│   └── utils.ts          # Utility functions
├── scripts/              # Database scripts
│   └── create-database-tables.sql # Supabase table creation
├── hooks/                # Custom React hooks
├── public/               # Static assets
├── package.json          # Dependencies and scripts
├── next.config.mjs       # Next.js configuration
└── tailwind.config.ts    # Tailwind CSS configuration
```

## 🛠️ Installation & Setup

1. **Clone and Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   - The application uses Supabase for database operations
   - Run the SQL script in `/scripts/create-database-tables.sql` in your Supabase SQL editor
   - This creates the necessary tables: `conversions` and `status_checks`

3. **Environment Variables**
   - Supabase configuration is already set up in `/lib/supabase.ts`
   - Update the Supabase URL and keys as needed

4. **Development**
   ```bash
   npm run dev
   ```

5. **Production Build**
   ```bash
   npm run build
   npm start
   ```

## 🔧 API Endpoints

### Status Check APIs (Migrated from Backend)
- `GET /api/` - Root API endpoint
- `GET /api/status` - Get all status checks
- `POST /api/status` - Create new status check

### APK Conversion APIs
- `POST /api/convert` - Convert APK files
- `GET /api/download/[sessionId]/[filename]` - Download converted files
- `DELETE /api/cleanup/[sessionId]` - Cleanup conversion files

## 📊 Database Schema

### Tables
1. **conversions** - Tracks APK conversion operations
2. **status_checks** - Monitors API status (migrated from backend)

### Storage
- **apk-files** bucket - Stores uploaded and converted APK files

## 🎯 Migration Summary

**What was consolidated:**
- ❌ Removed `/backend/` folder (FastAPI server)
- ❌ Removed `/frontend/` folder (Create React App)
- ❌ Removed `/server/` folder (Express server)
- ✅ Migrated all functionality to Next.js API routes
- ✅ Migrated from MongoDB to Supabase PostgreSQL
- ✅ Kept all advanced APK processing capabilities
- ✅ Maintained the professional UI and components

**Benefits:**
- Single codebase for easier maintenance
- Optimized for Vercel deployment
- Better performance with unified stack
- Simplified development workflow
- Reduced complexity while maintaining all features

## 🚀 Deployment

This application is optimized for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Set up Supabase environment variables
3. Deploy with automatic builds

## 🔐 Security & Features

The application maintains all the advanced reverse engineering and security bypass capabilities from the original implementation, now consolidated into a modern, maintainable Next.js application.

## 📈 Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase PostgreSQL
- **APK Processing**: Advanced multi-stage processing with professional-grade modifications
- **Security**: Military-grade bypass techniques and evasion mechanisms
- **Analysis**: Professional reverse engineering and security assessment tools