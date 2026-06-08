<div align="center">

# AIMs — AI Talent Intelligence Platform

**Advanced Intern Management System powered by AI**

[![Django](https://img.shields.io/badge/Django-4.2+-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Celery](https://img.shields.io/badge/Celery-5.3+-37814A?style=for-the-badge&logo=celery&logoColor=white)](https://docs.celeryq.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

> An end-to-end platform that automates intern recruitment, performance tracking, AI-driven task generation, career progression management, and certification issuance — all in a single cohesive system.

[Live Demo](#) · [API Docs](#api-documentation) · [Report Bug](https://github.com/Parthch106/AI-Talent-Intelligence-Platform/issues) · [Request Feature](https://github.com/Parthch106/AI-Talent-Intelligence-Platform/issues)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Running with Celery](#running-with-celery)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [User Roles & Permissions](#-user-roles--permissions)
- [AI & ML Capabilities](#-ai--ml-capabilities)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔍 Overview

**AIMs (Advanced Intern Management System)** is a full-stack, production-ready platform designed to intelligently manage the entire intern lifecycle — from resume screening and onboarding, through real-time performance monitoring, to certificate issuance and full-time offer decisions.

The platform combines a **Django REST Framework** backend with a **React + TypeScript** frontend, backed by **PostgreSQL**, **Redis**, and **Celery** for robust, scalable async processing. The AI layer integrates **LLMs (via GitHub Models API / Groq)**, **scikit-learn**, **XGBoost**, and a custom **Reinforcement Learning** task assigner to power intelligent recommendations.

### Core Problems Solved

| Problem | AIMs Solution |
|---|---|
| Manual resume screening is slow & biased | LLM-powered resume parser with ML suitability scoring |
| No visibility into intern day-to-day performance | Real-time task Kanban, attendance heatmaps & weekly report analytics |
| Task assignment is ad-hoc and inefficient | AI task generator + RL-based adaptive task assigner |
| Career progression lacks structure | Phase-gate system with automatic milestone evaluation |
| Certificate issuance is manual & insecure | Automated PDF certificate generation with QR-code verification |

---

## ✨ Key Features

### 👤 Identity & Access
- JWT-based authentication with OTP email verification
- Role-based access control: **Admin**, **Manager**, **Intern**
- Secure password reset flow with time-limited tokens
- Staff onboarding portal with self-registration approval

### 📄 Resume Intelligence
- Multi-format resume parsing (PDF, DOCX) using **PyMuPDF** + LLM extraction
- Automated suitability scoring with **XGBoost** & feature engineering
- Skill extraction, education parsing, and experience normalization
- Side-by-side candidate comparison on a single dashboard

### 📊 Performance Monitoring
- **Kanban Task Board** with drag-and-drop (DnD Kit) for task management
- Weekly report submission and manager review workflow
- Attendance tracking with GitHub-style contribution heatmaps
- Performance analytics with interactive charts (Recharts)
- Red-flag detection for underperforming interns

### 🤖 AI-Powered Task Generation
- LLM-driven task generator personalized to intern skills and project context
- **Reinforcement Learning** task assigner that adapts based on past performance
- AI chatbot assistant integrated into the dashboard

### 🚀 Career Phase Management
- Configurable phase-gate system (e.g., Onboarding → Mid-term → Final)
- Automated conversion probability scoring for full-time offers
- Full-time offer builder with customizable letter templates

### 🏆 Certification Engine
- Automated PDF certificate generation using **WeasyPrint** + custom templates
- QR code embedding for public certificate verification (`/verify/:certId`)
- Certificate registry for admins with download and revocation controls

### 💰 Stipend Management
- Configurable stipend rules per intern/role
- Approval workflow for managers and admins
- Export-ready reports

### 📧 Notifications & Email
- In-app notification center with real-time badge counts
- Transactional emails via **SMTP** (Gmail / custom) using **RedMail**
- Email templates: OTP, login confirmation, weekly performance reports, manager summaries

### ⚡ Background Processing
- **Celery** + **Redis** for async task execution
- Scheduled tasks via `django-celery-beat` (e.g., weekly report digest, ML model retraining)
- Rate limiting with `django-ratelimit` on sensitive endpoints

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                           │
│         React 19 + TypeScript + Vite (Port 5173)                │
│    TailwindCSS · Recharts · DnD Kit · React Router v7           │
└──────────────────────────┬──────────────────────────────────────┘
                           │  REST API (JWT Bearer Tokens)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API LAYER                              │
│        Django 4.2 + Django REST Framework (Port 8000)           │
│   CORS · WhiteNoise · SimpleJWT · django-ratelimit              │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │accounts  │ │ interns  │ │analytics │ │    documents     │  │
│  │ projects │ │ feedback │ │assessmts │ │  notifications   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│                                                                 │
│         AI / ML Services Layer (analytics/services/)            │
│  ┌──────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │ LLM Resume Parser│  │ ML Models      │  │RL Task Assign │  │
│  │ (GitHub Models)  │  │ (XGBoost/SKL)  │  │(Q-Learning)   │  │
│  └──────────────────┘  └────────────────┘  └───────────────┘  │
│  ┌──────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │Talent Intelligence│  │ Certification  │  │ Embedding     │  │
│  │    Service       │  │   Engine       │  │   Engine      │  │
│  └──────────────────┘  └────────────────┘  └───────────────┘  │
└────────┬────────────────────────────────────────┬──────────────┘
         │                                        │
         ▼                                        ▼
┌─────────────────┐                    ┌─────────────────────────┐
│   PostgreSQL    │                    │  Redis (Cache + Broker)  │
│  (Primary DB)   │                    │                         │
└─────────────────┘                    └──────────┬──────────────┘
                                                  │
                                                  ▼
                                       ┌─────────────────────────┐
                                       │   Celery Workers         │
                                       │  (Async Tasks + Beat)    │
                                       └─────────────────────────┘
```

---

## 🛠 Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | Django 4.2, Django REST Framework 3.14 |
| Auth | djangorestframework-simplejwt |
| Database | PostgreSQL 15+ (via psycopg2) |
| Cache & Broker | Redis 7+ (via django-redis) |
| Task Queue | Celery 5.3, django-celery-beat |
| ML / AI | scikit-learn, XGBoost, NumPy, pandas, scipy |
| LLM | OpenAI SDK, Groq, LangChain, GitHub Models API |
| PDF | PyMuPDF, pymupdf4llm, WeasyPrint, ReportLab |
| Email | RedMail, Django SMTP backend |
| Serving | Gunicorn (Linux), Waitress / wfastcgi (Windows/IIS) |
| Static Files | WhiteNoise |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 19, TypeScript 5.8 |
| Build Tool | Vite 6.3 |
| Routing | React Router v7 |
| Styling | TailwindCSS 3.4, custom CSS variables |
| Charts | Recharts 3 |
| HTTP Client | Axios + axios-retry |
| Drag & Drop | @dnd-kit/core, @dnd-kit/sortable |
| Notifications | react-hot-toast |
| Markdown | react-markdown + remark-gfm |
| Icons | Lucide React |

---

## 📁 Project Structure

```
AI_Talent_Intelligence_Platform/
├── backend/                          # Django backend
│   ├── apps/
│   │   ├── accounts/                 # User auth, OTP, JWT
│   │   ├── analytics/                # Core intelligence engine
│   │   │   ├── services/
│   │   │   │   ├── llm_resume_parser.py        # LLM-based resume parsing
│   │   │   │   ├── resume_parsing_engine.py    # Rule-based parser fallback
│   │   │   │   ├── ml_models.py                # XGBoost/SKL scoring models
│   │   │   │   ├── rl_task_assigner.py         # Q-Learning task assignment
│   │   │   │   ├── talent_intelligence_service.py  # Master orchestrator
│   │   │   │   ├── performance_evaluator.py    # Performance scoring
│   │   │   │   ├── learning_path_optimizer.py  # Personalized learning paths
│   │   │   │   ├── llm_task_generator.py       # AI task generation
│   │   │   │   ├── certification_service.py    # Certificate PDF engine
│   │   │   │   ├── embedding_engine.py         # Vector embeddings
│   │   │   │   ├── chatbot_service.py          # AI chatbot backend
│   │   │   │   └── internship_monitoring_service.py
│   │   │   ├── models.py             # TaskTracking, MLModels, Certificates, etc.
│   │   │   ├── views.py              # Primary analytics views
│   │   │   └── tasks.py              # Celery async tasks
│   │   ├── assessments/              # Skill assessments
│   │   ├── documents/                # Resume/document upload & analysis
│   │   ├── feedback/                 # Manager feedback system
│   │   ├── interns/                  # Intern profiles & management
│   │   ├── notifications/            # In-app notification system
│   │   ├── projects/                 # Project & module management
│   │   ├── roles/                    # Role definitions
│   │   └── system/                   # Seed data management commands
│   ├── core/
│   │   ├── settings.py               # Central Django configuration
│   │   ├── urls.py                   # Root URL dispatcher
│   │   ├── celery.py                 # Celery app configuration
│   │   ├── wsgi.py                   # WSGI entrypoint (Gunicorn/IIS)
│   │   └── asgi.py                   # ASGI entrypoint
│   ├── templates/
│   │   └── emails/                   # Jinja2 HTML email templates
│   ├── static/                       # Static assets (logo, favicon)
│   ├── media/                        # User-uploaded files, certificates
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example                  # Environment variable template
│
├── frontend/                         # React frontend
│   ├── src/
│   │   ├── api/                      # Axios API client modules
│   │   │   ├── axios.ts              # Base Axios instance + interceptors
│   │   │   ├── criteria.ts           # Phase criteria API calls
│   │   │   ├── offers.ts             # Offer builder API calls
│   │   │   ├── reports.ts            # Weekly reports API calls
│   │   │   └── stipend.ts            # Stipend management API calls
│   │   ├── components/
│   │   │   ├── common/               # Reusable UI primitives
│   │   │   ├── layout/               # Header, Sidebar, Layout shell
│   │   │   ├── monitoring/           # Monitoring tab components
│   │   │   ├── phases/               # Phase gate UI components
│   │   │   ├── reports/              # Report card & timeline components
│   │   │   └── tasks/                # Kanban, AI panel, task drawer
│   │   ├── context/
│   │   │   ├── AuthContext.tsx        # Auth state + JWT management
│   │   │   ├── ThemeContext.tsx       # Dark/light mode
│   │   │   └── MonitoringContext.tsx  # Monitoring data state
│   │   ├── pages/                    # Route-level page components
│   │   └── types/                    # TypeScript type definitions
│   ├── public/                       # Static public assets
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.cjs
│   └── package.json
│
├── test_admins.csv                   # Sample admin seed data
├── test_interns.csv                  # Sample intern seed data
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Ensure the following are installed on your machine:

- **Python** 3.10+
- **Node.js** 18+ and **npm** 9+
- **PostgreSQL** 15+
- **Redis** 7+
- **Git**

> **Windows Users:** Redis can be run via [Memurai](https://www.memurai.com/) or WSL2. For production on Windows Server, use IIS with `wfastcgi` (see `backend/web.config`).

---

### Backend Setup

#### 1. Clone the repository
```bash
git clone https://github.com/Parthch106/AI-Talent-Intelligence-Platform.git
cd AI-Talent-Intelligence-Platform
```

#### 2. Create and activate a virtual environment
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

#### 3. Install Python dependencies
```bash
pip install -r requirements.txt
```

#### 4. Configure environment variables
```bash
cp .env.example .env
# Now edit .env with your actual values (see Environment Variables section below)
```

#### 5. Set up the PostgreSQL database
```sql
-- Run in psql
CREATE DATABASE aims_db;
CREATE USER aims_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE aims_db TO aims_user;
```

#### 6. Apply database migrations
```bash
python manage.py migrate
```

#### 7. Create a superuser
```bash
python manage.py createsuperuser
```

#### 8. (Optional) Seed sample data
```bash
python manage.py seed_data
# Or with CSVs:
# python manage.py add_intern_data
```

#### 9. Collect static files
```bash
python manage.py collectstatic --noinput
```

#### 10. Start the development server
```bash
python manage.py runserver
# API available at: http://localhost:8000
# Django Admin at:  http://localhost:8000/admin/
```

---

### Frontend Setup

#### 1. Install dependencies
```bash
cd frontend
npm install
```

#### 2. Configure environment
```bash
cp .env.example .env.local
# Set VITE_API_BASE_URL to your backend URL
```

`.env.local` minimal config:
```env
VITE_API_BASE_URL=http://localhost:8000
```

#### 3. Start the development server
```bash
npm run dev
# Frontend available at: http://localhost:5173
```

#### 4. Build for production
```bash
npm run build
# Output in: frontend/dist/
```

---

### Running with Celery

Celery is required for background tasks (email sending, ML model retraining, scheduled reports).

**In a separate terminal (with venv activated):**

```bash
cd backend

# Start the Celery worker
celery -A core worker --loglevel=info

# Start the Celery beat scheduler (in another terminal)
celery -A core beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

> **Tip:** On Windows, use `--pool=solo` since Celery's default multiprocessing fork is not supported:
> ```bash
> celery -A core worker --loglevel=info --pool=solo
> ```

---

## 🔐 Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in the values:

| Variable | Description | Example |
|---|---|---|
| `DJANGO_SECRET_KEY` | Django secret key (keep secret!) | `django-insecure-...` |
| `DJANGO_DEBUG` | Debug mode | `True` (dev only) |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,127.0.0.1` |
| `POSTGRES_DB` | Database name | `aims_db` |
| `POSTGRES_USER` | Database user | `aims_user` |
| `POSTGRES_PASSWORD` | Database password | `yourpassword` |
| `POSTGRES_HOST` | Database host | `127.0.0.1` |
| `POSTGRES_PORT` | Database port | `5432` |
| `JWT_SECRET_KEY` | JWT signing key (min 32 chars) | `your_jwt_secret_...` |
| `JWT_ACCESS_TOKEN_LIFETIME` | Access token TTL (minutes) | `60` |
| `JWT_REFRESH_TOKEN_LIFETIME` | Refresh token TTL (minutes) | `1440` |
| `REDIS_URL` | Redis connection URL | `redis://127.0.0.1:6379/0` |
| `AI_TALENT_GITHUB_TOKEN` | GitHub Models API token for LLM | `ghp_...` |
| `HF_TOKEN` | Hugging Face token (embeddings) | `hf_...` |
| `USE_LLM_PARSER` | Enable LLM resume parsing | `true` |
| `EMAIL_HOST` | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_HOST_USER` | Sender email address | `noreply@example.com` |
| `EMAIL_HOST_PASSWORD` | SMTP app password | `xxxx xxxx xxxx xxxx` |
| `FRONTEND_BASE_URL` | Frontend URL (for QR codes) | `http://localhost:5173` |
| `BYPASS_LOGIN_OTP` | Bypass OTP in development | `False` |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | `http://localhost:5173` |

> ⚠️ **Security:** Never commit `.env`, `local.env`, or any `*.bak` files. They are excluded via `.gitignore`.

---

## 📡 API Documentation

The backend exposes a RESTful JSON API. All protected endpoints require a `Bearer` token in the `Authorization` header.

### Base URL
```
http://localhost:8000
```

### Authentication Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/accounts/login/` | Login, returns JWT access + refresh tokens |
| `POST` | `/accounts/register/` | Register new user |
| `POST` | `/accounts/verify-otp/` | Verify email OTP |
| `POST` | `/accounts/token/refresh/` | Refresh access token |
| `POST` | `/accounts/forgot-password/` | Initiate password reset |
| `POST` | `/accounts/reset-password/` | Confirm password reset |

### Core Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/interns/` | List all interns |
| `GET/POST` | `/projects/` | List / create projects |
| `GET` | `/analytics/dashboard/` | Dashboard summary stats |
| `GET/POST` | `/analytics/tasks/` | Task management |
| `POST` | `/analytics/tasks/generate/` | AI task generation |
| `GET` | `/analytics/performance/:id/` | Intern performance data |
| `GET/POST` | `/analytics/weekly-reports/` | Weekly report CRUD |
| `GET` | `/analytics/phase-gates/` | Phase gate status |
| `GET` | `/analytics/certificates/` | Certificate registry |
| `GET` | `/verify/:certId/` | Public certificate verification |
| `POST` | `/documents/upload/` | Upload resume/document |
| `GET` | `/documents/analysis/:id/` | Resume analysis results |
| `GET/POST` | `/feedback/` | Feedback management |
| `GET` | `/notifications/` | User notifications |

> For full request/response schemas, import the API collection from `docs/postman_collection.json` _(coming soon)_ or explore the Django admin at `/admin/`.

---

## 👥 User Roles & Permissions

| Feature | Intern | Manager | Admin |
|---|---|---|---|
| View own dashboard | ✅ | ✅ | ✅ |
| Submit weekly report | ✅ | ❌ | ❌ |
| View own tasks | ✅ | ✅ | ✅ |
| Manage intern tasks | ❌ | ✅ | ✅ |
| View all interns | ❌ | ✅ | ✅ |
| Manage projects | ❌ | ✅ | ✅ |
| View analytics & performance | ❌ | ✅ | ✅ |
| Generate AI tasks | ❌ | ✅ | ✅ |
| Configure phase criteria | ❌ | ❌ | ✅ |
| Issue certificates | ❌ | ❌ | ✅ |
| Manage stipends | ❌ | ✅ | ✅ |
| Build full-time offers | ❌ | ✅ | ✅ |
| Admin user management | ❌ | ❌ | ✅ |

---

## 🤖 AI & ML Capabilities

### 1. LLM Resume Parser
- Extracts structured data from raw PDF/DOCX resumes using GPT-4o / Llama 3 (via GitHub Models API)
- Falls back to a rule-based regex parser if LLM is unavailable
- Normalizes skills, education levels, and work experience into a canonical schema

### 2. ML Suitability Scoring
- **XGBoost** model trained on curated intern profiles to predict role suitability (0–100 score)
- Feature engineering pipeline in `feature_engineering_advanced.py`
- Models stored and versioned in `analytics/management/trained_models/`

### 3. Reinforcement Learning Task Assigner
- Custom **Q-Learning** agent in `rl_task_assigner.py`
- State: intern skill vector + current workload
- Actions: assign task from a category pool
- Reward: task completion rate + performance score improvement
- Adapts task difficulty and type based on feedback loops

### 4. AI Task Generator
- LLM-powered task generation personalized to intern profile + project context
- Generates structured tasks with title, description, estimated hours, and skill tags
- Integrated directly into the Kanban board via a slide-out panel

### 5. Talent Intelligence Service
- Master orchestrator combining resume scoring, performance trends, and conversion probability
- Powers the skill-intelligence dashboard with comparative analytics across all interns

### 6. Learning Path Optimizer
- Generates personalized learning roadmaps based on skill gaps identified in resume analysis
- LLM-augmented with curated resource recommendations

### 7. AI Chatbot
- Context-aware assistant (`chatbot_service.py`) with knowledge of the intern's performance data
- Accessible from the floating chat widget in the bottom-right corner of the UI

---

## 🚢 Deployment

### Linux (Gunicorn + Nginx)

```bash
# Install Gunicorn (already in requirements.txt)
gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers 4

# Nginx config snippet
# location /api/ { proxy_pass http://127.0.0.1:8000; }
# location / { root /var/www/aims/frontend/dist; try_files $uri /index.html; }
```

### Windows Server (IIS + wfastcgi)

A `web.config` is provided at `backend/web.config` pre-configured for IIS with `wfastcgi`. Ensure `wfastcgi` is registered with IIS:
```powershell
wfastcgi-enable
```

### Environment Checklist for Production

- [ ] Set `DJANGO_DEBUG=False`
- [ ] Set a strong, unique `DJANGO_SECRET_KEY`
- [ ] Set `DJANGO_ALLOWED_HOSTS` to your domain
- [ ] Configure `CORS_ALLOWED_ORIGINS` to your frontend domain
- [ ] Use a production-grade PostgreSQL server
- [ ] Configure a persistent Redis instance
- [ ] Set up SSL/TLS (HTTPS) — `SECURE_PROXY_SSL_HEADER` is pre-configured for reverse proxies
- [ ] Run `python manage.py collectstatic`
- [ ] Set up Celery workers as system services (systemd / Windows Service)
- [ ] Configure email SMTP credentials

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Commit** your changes: `git commit -m 'feat: add some feature'`
4. **Push** to the branch: `git push origin feature/your-feature-name`
5. **Open** a Pull Request

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     New feature
fix:      Bug fix
docs:     Documentation changes
style:    Formatting (no logic changes)
refactor: Code refactoring
test:     Adding or updating tests
chore:    Build process / tooling changes
```

### Code Style

- **Backend:** Follow [PEP 8](https://pep8.org/). Use type hints where possible.
- **Frontend:** ESLint + TypeScript strict mode. No `any` types without justification.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ by **Parth Chauhan**

</div>
