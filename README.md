# CareCircle — Elderly Care & Medication Management Platform

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B%20%7C%20v22%2B%20%7C%20v26%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.21.2-000000?logo=express&logoColor=white)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.4.11-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![SQLite](https://img.shields.io/badge/Database-node%3Asqlite%20(Native)-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)

An interconnected healthcare management and escalation platform designed to empower elderly individuals to stay in control of their daily healthcare decisions while proactively keeping family members and caretakers informed through automated tiered escalation, real-time drug interaction checks, and daily AI wellbeing check-ins.

---

## 🏗️ Architecture & Shared Ecosystem

```text
                                  +-----------------------+
                                  |   CareCircle Server   |
                                  |    (Node + Express)   |
                                  +-----------+-----------+
                                              |
                     +------------------------+------------------------+
                     |                        |                        |
            +--------v--------+      +--------v--------+      +--------v--------+
            |  Primary / Sec  |      |   Family View   |      |  Elderly Mode   |
            |   Caretakers    |      |  (Read-Only)    |      | (Accessibility) |
            |  Dashboard/Meds |      |  Appt Reminders |      | 1-Touch Confirm |
            +--------+--------+      +-----------------+      +--------+--------+
                     |                                                 |
                     v                                                 v
        +----------------------------+                    +----------------------------+
        |   Tiered Escalation Engine |                    |   Daily AI Check-In Engine |
        |   Tier 1 -> Tier 2 -> 99   |                    |   Fuzzy NLP + LLM Parser   |
        +----------------------------+                    +----------------------------+
                     |                                                 |
                     v                                                 v
        +----------------------------+                    +----------------------------+
        |  Nodemailer + Gmail SMTP   |                    |   NIH / NLM RxNav Safety   |
        |  Live Email Transmission   |                    |   Adverse Interaction API  |
        +----------------------------+                    +----------------------------+
```

---

## 🛠️ Exact Tech Stack

* **Runtime:** Node.js (`v20.x`, `v22.x`, or `v26.x` — tested on `v26.13.1`)
* **Backend:** Express.js (`v4.21.2`)
* **Database Driver:** Native `node:sqlite` (`DatabaseSync` — synchronous prepared statements, zero C++ compilation dependencies)
* **Frontend:** React 18 (`v18.3.1`) with Vite (`v5.4.11`), Lucide React icons (`v0.460.0`), and Accessible CSS
* **Authentication:** JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`) with passcode-protected profile sharing
* **Email System:** Nodemailer (`v6.9.16`) with direct Gmail SMTP App Password integration
* **Job Scheduler:** `node-cron` (`v3.0.3`) for 2-minute escalation cycles and nightly schedule generation
* **External Clinical APIs:** National Library of Medicine (NLM / NIH) RxNav REST API (100% free, no key required) + Gemini API / Clinical Fuzzy NLP Engine

---

## ⚡ Quick Demo Credentials

All test accounts come pre-seeded with 14 days of realistic adherence history, active medications, upcoming cardiology appointments, and check-ins:

| Role | Email | Password | Permissions & Purpose |
| :--- | :--- | :--- | :--- |
| **Primary Caretaker** | `john@example.com` | `password123` | **Tier 1 Escalation Contact**, full CRUD for meds, priority ladder reordering, alarms. |
| **Secondary Caretaker** | `sarah@example.com` | `password123` | **Tier 2 Escalation Contact**, records doses on patient's behalf. |
| **Family Viewer** | `emily@example.com` | `password123` | **Read-Only Dashboard**; receives 24h appointment alerts; blocked from mutating meds/doses. |
| **Elderly Patient** | `grandma@example.com` | `password123` | **Elderly Accessibility View** ("I Took This", morning wellbeing check-in). |
| **Shared Passcode** | `482910` | — | 6-digit access code to join **Rose Miller**'s care circle (`Profile #1`). |

> **Tip:** The login screen also features **1-Click Fast Login buttons** for each role for rapid judge evaluation.

---

## 🚀 Setup Instructions (From a Clean Clone)

### Prerequisites
* **Node.js** (v20+ or v22+ or v26+) and **npm** installed.

### 1. Install Backend Dependencies
```powershell
cd backend
npm install
```

### 2. Configure Environment (`.env`)
Copy the example file to `.env`:
```powershell
cp .env.example .env
```
*(On Windows PowerShell, use: `Copy-Item .env.example .env`)*

Edit `backend/.env` with your desired configuration:
```env
PORT=5000
JWT_SECRET=elderly_care_hackathon_super_secret_jwt_key_2026

# Optional: Add Gmail App Password for live inbox delivery
# If left blank, emails safely print formatted to the console in Mock Mode
EMAIL_USER=
EMAIL_PASS=

# Optional: Gemini API Key for check-in analysis
# If left blank, the built-in fuzzy NLP engine analyzes sentiment & symptoms automatically
GEMINI_API_KEY=
```

### 3. Install & Build Frontend
```powershell
cd ../frontend
npm install
npm run build
```

### 4. Start the Full-Stack Application
```powershell
cd ../backend
npm start
```
> **Auto-Seeding:** On its first launch, the backend automatically detects an empty database and **auto-seeds** the complete demo dataset (`users`, `care_profiles`, `medications`, `dose_logs`, `appointments`, and `checkins`). You can also manually reset/reseed the database at any time with `npm run seed`.

Open your browser to: **[http://localhost:5000](http://localhost:5000)**!

---

## 🔍 Core Features Beyond Basic Reminders

### 1. Multi-Tiered Emergency Escalation Ladder
* **Automated Missed-Dose Detection:** If a dose remains unacknowledged past its grace period (default 30 mins):
  1. **Tier 1 (Minute 0):** Primary Caretaker is notified via an HTML alert email with a 1-click **[Acknowledge & Clear Alarm]** button.
  2. **Tier 2 (Minute 30):** If Tier 1 has not clicked acknowledge within 30 minutes, the system automatically escalates to Tier 2 (Secondary Caretaker).
  3. **Terminal Tier 99 (Minute 60):** If still unresolved, a critical **"ALL CARETAKERS EMERGENCY ALERT"** is broadcast to all active caretakers simultaneously.
* **On-Demand Demo Trigger:** Evaluators can trigger an immediate evaluation cycle anytime by clicking the **"Simulate Cron"** button in the UI navbar or calling `POST /api/dev/trigger-cron`.

### 2. Live Drug Interaction Warnings (NIH RxNav API)
* When adding a new medication (e.g., *Warfarin* while *Aspirin* is active), the backend queries the **National Library of Medicine (NLM / NIH) RxNav REST API**.
* Automatically detects dangerous clinical contraindications (e.g., severe gastrointestinal hemorrhage and bleeding risks).
* Displays a high-visibility warning banner with clinical rationale and requires explicit override acknowledgment.

### 3. Daily AI Wellbeing Check-In (Typo-Tolerant Clinical NLP)
* Daily morning conversational prompt: *"How are you feeling today?"*
* **Typo & Phonetic Tolerance:** Designed specifically for senior citizens who may experience tremors or spelling errors. Utilizes Levenshtein edit distance and root-stemming regexes to catch symptoms like:
  * `"dizy"` / `"dizzi"` $\rightarrow$ Flagged as **Dizziness (Moderate Risk)**.
  * `"I fel on carpet"` $\rightarrow$ Flagged as **Fall (High Risk)**.
  * `"ches pain"` / `"cant breath"` $\rightarrow$ Flagged as **Chest Pain / Respiratory Distress (High Risk)**.
* **Emergency Dispatch:** Any moderate or high-risk submission automatically dispatches an immediate email alert to all caretakers with the patient's exact words and flagged symptoms.
* **Assisted Mode:** Co-living caretakers or visiting nurses can verbally prompt the patient and record on their behalf.

### 4. Adherence Analytics Dashboard
* **7-Day & 30-Day Compliance Score:** Real-time percentage tracking.
* **Streak Tracking:** Displays current consecutive days with 100% adherence.
* **Time-of-Day Dips:** Identifies whether missed doses cluster in Morning (5AM–12PM), Afternoon (12PM–5PM), Evening (5PM–10PM), or Night (10PM–5AM) to help families adjust routines.
* **Per-Medication Compliance Breakdown:** Detailed breakdown of scheduled vs taken doses per prescription.

### 5. Human-Centered Elderly Mode
* High-contrast, clean 26px typography and accessible spacing.
* Distraction-free, single-focus cards with extra-large **"✓ I Took This"** action buttons.
* Daily check-in response box with instant feedback confirming their care circle was notified.

---

## 📡 API Reference Overview

| Method | Path | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | Public | Register user account |
| `POST` | `/api/auth/login` | Public | Login and receive JWT |
| `GET` | `/api/auth/me` | JWT | Get current user and linked care profiles |
| `POST` | `/api/profiles` | JWT | Create a new care profile with 6-digit passcode |
| `POST` | `/api/profiles/join` | JWT | Link to existing profile using 6-digit passcode |
| `GET` | `/api/profiles/:id/members` | JWT | Get care circle members and escalation ladder |
| `PUT` | `/api/profiles/:id/members/priority`| JWT | Update caretaker priority ladder order |
| `GET` | `/api/profiles/:id/doses/today` | JWT | Get today's doses with JIT schedule generator |
| `POST` | `/api/doses/:id/action` | JWT | Record dose as `taken` or `skipped` (Role-enforced) |
| `POST` | `/api/doses/:id/acknowledge` | JWT | Clear escalation alarm (Caretakers only) |
| `POST` | `/api/profiles/:id/medications/check-interactions` | JWT | Pre-check drug interactions via NIH RxNav API |
| `POST` | `/api/profiles/:id/medications` | JWT | Add prescription + daily schedule times |
| `GET` | `/api/profiles/:id/analytics` | JWT | Calculate 7d/30d adherence %, streak, and time patterns |
| `POST` | `/api/profiles/:id/checkin` | JWT | Submit daily check-in with AI risk assessment |
| `POST` | `/api/dev/trigger-cron` | JWT | Manually fire cron reminder & escalation cycle |

---

## 🧪 Automated Test Suite

Run the in-memory backend verification suite verifying controllers, database schema, role security, drug interactions, and AI check-in:
```powershell
cd backend
npm test
```
All checks run in-memory without requiring external services.
