# ⚽ Typer LM – Champions League Match Predictor

A full-stack web application designed for predicting UEFA Champions League match outcomes, tracking live leaderboard rankings, analyzing player statistics, and community interaction.

🚀 **Live Demo:** (https://typerlm.vercel.app)

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React 18, Vite, JavaScript (ES6+), CSS3
- **Backend & Database:** Supabase (PostgreSQL)
- **Database Logic:** PL/pgSQL Triggers, Stored Functions, Row Level Security (RLS)
- **State & Session Management:** Supabase Auth & Realtime Subscriptions
- **Deployment & Hosting:** Vercel (CI/CD connected to GitHub `main` branch)

---

## ✨ Key Features

- **Match Prediction System:** Allows users to submit and update score predictions prior to match kickoff deadlines (enforced via database triggers).
- **Automated Point Calculation:** PostgreSQL database trigger (`calculate_prediction_points`) automatically computes user points immediately upon match result entry.
- **Leaderboard & Player Analytics:** Real-time table rankings, hit-rate percentage stats, and historical performance tracking.
- **Community Forum:** Built-in discussion board with Supabase Realtime badges for unread posts.
- **Admin Panel:** Privileged interface for updating match scores, managing schedules, and system overrides.

---

## 🗄️ Database Architecture & Security

The project relies on a relational schema in PostgreSQL configured with security-first practices:

- **Core Tables:** `profiles`, `matches`, `predictions`, `forum_posts`, `teams`, `bracket_matches`.
- **Database Triggers:** 
  - Deadline validation before accepting predictions.
  - Automatic calculation of exact score vs. outcome points upon match result updates.
- **Row Level Security (RLS):** Granular policy configuration restricting read/write capabilities per user session. `SECURITY DEFINER` functions used where elevated table permissions are strictly required.

---

## 💻 Local Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MatM99/typer-lm.git
   cd typer-lm
   
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and specify your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```  
