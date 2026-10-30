# ScanTrack Enterprise — Scanning Department Audit & Portal

A production-ready Next.js application designed specifically for **Scanning Departments** to track daily intake vs. upload counts, detect backlogs/discrepancies, and enforce administrative accountability between **Super Admins** and **Scanning Operators**.

---

## 🎯 The Problem Solved

In high-volume document scanning departments (legal documents, student exams, archival records, claim papers):
1. Scripts are received from branches or clients in daily batches.
2. Operators scan and upload them into the central portal.
3. **The Core Challenge:** Due to damaged barcodes, faint markings, scanner jams, or shift cutoffs, **not all received scripts are uploaded on the same day**.
4. **The Solution:** A hierarchical system where:
   - **Operators (Basic Users)** update their **Received Count** and **Uploaded Count** day-by-day with mandatory explanations for any backlog.
   - **Super Admin (You)** has a master dashboard tracking discrepancies, operator performance, station metrics, and team access.

---

## 🌟 Key Features

### 👑 Super Admin Dashboard
- **Executive Metric Cards**: Total Received, Total Uploaded, Unprocessed / Pending Backlog, and Department Completion Rate (%).
- **Backlog Alert Banner**: Real-time notification flagging any station where scripts were received today but remain un-uploaded.
- **Operator Accountability Matrix**: Performance cards for each scanning station displaying completion percentage and sync status.
- **Day-Wise Audit Table**:
  - Filter by date presets (**All Time, Today, Yesterday, Last 7 Days**).
  - Filter by **Operator** or **Status** (*Pending Backlog Only* vs *100% Uploaded*).
  - Live search across notes, station names, and dates.
  - Colored status badges (*100% Synced*, *Discrepancy Detected*).
  - Full visibility into operator backlog reasons.
- **Data Export**: One-click **Export to CSV** for branch audit meetings and physical shift reconciliation.
- **Team Hierarchy & Access Management**: Add new scanning staff, assign workstations/hardware, and toggle user active status.

### 👷 Operator Portal (Basic User)
- **Focused, Distraction-Free Daily Logging Form**:
  - Automatically defaults to today's date and assigned workstation.
  - Enter **Scripts Received** and **Scripts Uploaded**.
  - **Live Dynamic Calculator**: Instantly computes `Pending = Received - Uploaded` and upload percentage before submission.
  - **Backlog Prompt**: If pending scripts exist, prompts the operator to explain the reason (e.g. *"15 scripts had blurred barcodes, sent for manual review"*).
- **Personal Log History**:
  - View all past submissions.
  - Click any date to review or update counts if more scripts are uploaded later in the shift.

### 🔄 Role Switcher Dropdown
- Switch between **Super Admin (Alex Morgan)** and any **Scanning Operator (Sarah, David, Elena, Marcus)** with a single click in the top navigation bar to test both perspectives instantly.
- Demo data reset button to restore fresh realistic test records anytime.

---

## 🚀 Running Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying to Vercel

This application is built for 1-click deployment on **Vercel** with Next.js App Router:

### Option 1: Via GitHub (Recommended)
1. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Scanning Dept Tracker"
   ```
2. Push your repository to GitHub:
   ```bash
   git remote add origin https://github.com/your-username/scanning-portal.git
   git push -u origin main
   ```
3. Go to [vercel.com/new](https://vercel.com/new).
4. Import your GitHub repository.
5. Click **Deploy**. Vercel will automatically detect Next.js and deploy within seconds!

### Option 2: Via Vercel CLI
```bash
npx vercel
```
Follow the interactive prompts to deploy directly from your terminal.

---

## 📂 Project Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── records/route.ts  # REST API for records (GET, POST)
│   │   └── users/route.ts    # REST API for department staff
│   ├── globals.css           # Tailwind CSS styles
│   ├── layout.tsx            # Root layout & metadata
│   └── page.tsx              # Main orchestrator & role switcher
├── components/
│   ├── AdminDashboard.tsx    # Super Admin master view & analytics
│   ├── Navbar.tsx            # Top navigation & role switcher
│   ├── OperatorPortal.tsx    # Basic user daily entry form & personal history
│   ├── RecordModal.tsx       # Audit detail & edit modal
│   ├── StatCard.tsx          # Reusable KPI metric card
│   └── UserManagementModal.tsx # Team hierarchy & access control
├── lib/
│   ├── mockData.ts           # Realistic seed data for scanning department
│   └── storage.ts            # Client/local persistence & metrics calculation
└── types/
    └── index.ts              # TypeScript interfaces (User, DailyRecord, Metrics)
```
