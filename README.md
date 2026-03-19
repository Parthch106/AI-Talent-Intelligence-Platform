<<<<<<< HEAD
# 🎯 AI Talent Intelligence Platform

<p align="center">
  <img src="https://img.shields.io/badge/Django-4.2+-092E20?style=for-the-badge&logo=django" alt="Django">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Machine-Learning+-FF6F00?style=for-the-badge&logo=tensorflow" alt="ML">
</p>

> A comprehensive full-stack internship management system with AI-powered talent intelligence, resume parsing, performance analytics, and learning path optimization.

---

## ✨ Features

### 🔐 Core Functionality

| Feature                 | Description                                                    |
| :---------------------- | :------------------------------------------------------------- |
| **User Authentication** | Role-based access control (Admin, Manager, Intern)             |
| **Intern Management**   | Track and manage intern profiles, departments, and assignments |
| **Project Management**  | Assign and track projects with modules and deliverables        |
| **Attendance Tracking** | Monitor intern attendance and working hours                    |
| **Weekly Reports**      | Interns submit weekly progress reports with PDF generation     |

### 🤖 AI-Powered Features

| Feature                        | Description                                                             |
| :----------------------------- | :---------------------------------------------------------------------- |
| **Resume Parsing**             | AI-powered extraction of skills, education, certifications from resumes |
| **Talent Intelligence**        | ML-based intern suitability scoring for job roles                       |
| **Performance Analytics**      | Predictive analytics for intern performance and risk assessment         |
| **Learning Path Optimization** | AI-generated personalized learning paths based on skill gaps            |
| **Task Generation**            | AI-powered task generation for interns                                  |

### 📋 Additional Features

- 📢 Notifications - Real-time notifications for tasks and deadlines
- 📄 Document Management - Upload and manage resumes, reports
- 💬 Feedback System - Structured feedback collection
- 👔 Role Management - Predefined job roles with skill requirements

---
=======
# AI Talent Intelligence Platform

A comprehensive full-stack internship management system with AI-powered talent intelligence, resume parsing, performance analytics, and learning path optimization.

## 🚀 Features

### Core Functionality

- **User Authentication & Authorization** - Role-based access control (Admin, Manager, Intern)
- **Intern Management** - Track and manage intern profiles, departments, and assignments
- **Project Management** - Assign and track projects with modules and deliverables
- **Attendance Tracking** - Monitor intern attendance and working hours
- **Weekly Reports** - Interns submit weekly progress reports with PDF generation

### AI-Powered Features

- **Resume Parsing** - AI-powered extraction of skills, education, certifications, and experience from resumes (PDF/DOCX)
- **Talent Intelligence** - ML-based intern suitability scoring for job roles
- **Performance Analytics** - Predictive analytics for intern performance and risk assessment
- **Learning Path Optimization** - AI-generated personalized learning paths based on skill gaps
- **Task Generation** - AI-powered task generation for interns based on their learning paths

### Additional Features

- **Feedback System** - Structured feedback collection between interns and managers
- **Notifications** - Real-time notifications for tasks, deadlines, and updates
- **Document Management** - Upload and manage resumes, reports, and other documents
- **Role Management** - Predefined job roles with skill requirements
>>>>>>> f3e0c622b1331c6a016ff506cce119720d88b137

## 🛠️ Tech Stack

### Backend

<<<<<<< HEAD
![Django](https://img.shields.io/badge/Django-092E20?style=flat&logo=django)
![Django REST Framework](https://img.shields.io/badge/DRF-ff6904?style=flat)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat&logo=postgresql)
![JWT](https://img.shields.io/badge/JWT-auth-FF6F00?style=flat)

### ML/AI

![TensorFlow](https://img.shields.io/badge/TensorFlow-FF6F00?style=flat&logo=tensorflow)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=flat)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat)
![LangChain](https://img.shields.io/badge/LangChain-2A2A2A?style=flat)

### Frontend

![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwind-css)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=flat&logo=react-router)

---
=======
- **Framework:** Django 4.2+ with Django REST Framework
- **Database:** PostgreSQL
- **Authentication:** JWT (djangorestframework-simplejwt)
- **ML/AI:**
  - Sentence Transformers (bge-large-en-v1.5) for embeddings
  - scikit-learn for ML models
  - OpenAI/Groq API for LLM-powered features
  - LangChain for AI workflows

### Frontend

- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite
- **Routing:** React Router DOM v7
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios
- **Icons:** Lucide React
>>>>>>> f3e0c622b1331c6a016ff506cce119720d88b137

## 📁 Project Structure

```
AI-Talent-Intelligence-Platform/
<<<<<<< HEAD
├── 📂 django_pg_backend/           # Django REST API backend
│   └── 📂 core/
│       └── 📂 apps/                # Django applications
│           ├── 📄 accounts/        # User authentication & profiles
│           ├── 📄 analytics/       # AI/ML services & talent intelligence
│           ├── 📄 assessments/     # Assessment models
│           ├── 📄 documents/       # Document management
│           ├── 📄 feedback/        # Feedback system
│           ├── 📄 interns/         # Intern management
│           ├── 📄 notifications/   # Notification system
│           ├── 📄 projects/        # Project management
│           └── 📄 roles/           # Job role definitions
│
└── 📂 frontend/                    # React TypeScript frontend
    └── 📂 src/
        ├── 📂 api/                 # API client & endpoints
        ├── 📂 components/          # Reusable React components
        │   └── 📂 layout/         # Layout components
        ├── 📂 context/             # React context providers
        └── 📂 pages/               # Page components
            ├── 📄 Dashboard.tsx
            ├── 📄 InternList.tsx
            ├── 📄 LearningPath.tsx
            ├── 📄 PerformanceAnalytics.tsx
            └── 📄 ...
```

---

## 🚀 Getting Started

### Prerequisites

| Component      | Version |
| :------------- | :------ |
| **Python**     | 3.10+   |
| **PostgreSQL** | 14+     |
| **Node.js**    | 18+     |
| **npm**        | 9+      |

---

### 📦 Backend Setup

```bash
# 1. Navigate to backend
cd django_pg_backend/core

# 2. Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
copy .env.example .env
# Edit .env with your database credentials

# 5. Run migrations
python manage.py migrate

# 6. Start server
python manage.py runserver
```

> 🏠 **Backend API:** `http://localhost:8000/`

---

### 💻 Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

> 🌐 **Frontend:** `http://localhost:5173/`

---

## ⚙️ Environment Variables
=======
├── django_pg_backend/           # Django REST API backend
│   └── core/
│       ├── apps/               # Django applications
│       │   ├── accounts/       # User authentication & profiles
│       │   ├── analytics/      # AI/ML services & talent intelligence
│       │   ├── assessments/    # Assessment models
│       │   ├── documents/      # Document management
│       │   ├── feedback/       # Feedback system
│       │   ├── interns/        # Intern management
│       │   ├── notifications/  # Notification system
│       │   ├── projects/       # Project management
│       │   ├── roles/          # Job role definitions
│       │   └── system/         # System settings
│       ├── static/             # Static files
│       └── templates/          # Django templates
│
└── frontend/                   # React TypeScript frontend
    └── src/
        ├── api/                # API client & endpoints
        ├── components/         # Reusable React components
        │   └── layout/         # Layout components (Header, Sidebar)
        ├── context/            # React context providers
        └── pages/              # Page components
            ├── AITaskGenerator.tsx
            ├── AnalysisPage.tsx
            ├── Dashboard.tsx
            ├── DocumentsPage.tsx
            ├── FeedbackPage.tsx
            ├── InternList.tsx
            ├── InternTasks.tsx
            ├── LearningPath.tsx
            ├── Login.tsx
            ├── ManagerDashboard.tsx
            ├── MonitoringDashboard.tsx
            ├── PerformanceAnalytics.tsx
            ├── ProfilePage.tsx
            ├── ProjectList.tsx
            └── Register.tsx
```

## 🏁 Getting Started

### Prerequisites

- **Backend:**
  - Python 3.10+
  - PostgreSQL 14+
  - Virtual environment (venv)

- **Frontend:**
  - Node.js 18+
  - npm or yarn

### Backend Setup

1. **Navigate to the backend directory:**

   ```bash
   cd django_pg_backend/core
   ```

2. **Create and activate virtual environment:**

   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env with your database and API credentials
   ```

5. **Run database migrations:**

   ```bash
   python manage.py migrate
   ```

6. **Create superuser (optional):**

   ```bash
   python manage.py createsuperuser
   ```

7. **Start the development server:**
   ```bash
   python manage.py runserver
   ```

The backend API will be available at `http://localhost:8000/`

### Frontend Setup

1. **Navigate to the frontend directory:**

   ```bash
   cd frontend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173/`

## 🔧 Environment Variables
>>>>>>> f3e0c622b1331c6a016ff506cce119720d88b137

### Backend (.env)

```env
# Database
DATABASE_NAME=your_db_name
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_HOST=localhost
DATABASE_PORT=5432

<<<<<<< HEAD
# Django
SECRET_KEY=your_secret_key
DEBUG=True

# JWT Authentication
JWT_SECRET_KEY=your_jwt_secret

# AI/ML APIs
OPENAI_API_KEY=your_openai_api_key
GROQ_API_KEY=your_groq_api_key
```

---

## 🔗 API Endpoints

### Authentication

| Method | Endpoint              | Description          |
| :----- | :-------------------- | :------------------- |
| `POST` | `/api/auth/register/` | User registration    |
| `POST` | `/api/auth/login/`    | User login (JWT)     |
| `POST` | `/api/auth/refresh/`  | Refresh access token |

### Interns & Projects

| Method     | Endpoint             | Description          |
| :--------- | :------------------- | :------------------- |
| `GET/POST` | `/api/interns/`      | List/Create interns  |
| `GET/PUT`  | `/api/interns/{id}/` | Get/Update intern    |
| `GET/POST` | `/api/projects/`     | List/Create projects |

### Analytics & AI

| Method | Endpoint                              | Description              |
| :----- | :------------------------------------ | :----------------------- |
| `GET`  | `/api/analytics/talent-intelligence/` | Talent intelligence      |
| `POST` | `/api/analytics/analyze-resume/`      | AI resume parsing        |
| `GET`  | `/api/analytics/performance/`         | Performance analytics    |
| `GET`  | `/api/analytics/learning-path/`       | Learning path generation |

---

## 📱 Frontend Pages

| 📄 Page                  | 📝 Description                      |
| :----------------------- | :---------------------------------- |
| 🔑 Login/Register        | User authentication                 |
| 🏠 Dashboard             | Main dashboard with overview        |
| 👥 Intern List           | Manage intern profiles              |
| 📋 Intern Tasks          | View and manage intern tasks        |
| 📁 Project List          | Project management interface        |
| 📚 Learning Path         | AI-generated learning paths         |
| 📊 Performance Analytics | Performance metrics and predictions |
| 🔍 Analysis Page         | Detailed talent analysis            |
| 📄 Documents             | Document upload and management      |
| 💬 Feedback              | Feedback submission and viewing     |
| 👁️ Monitoring            | Admin/Manager monitoring dashboards |
| 👤 Profile               | User profile management             |

---

## 🤖 AI Models

| Model                          | Purpose                                         |
| :----------------------------- | :---------------------------------------------- |
| 📄 **Resume Parser**           | Extracts structured data from resumes using LLM |
| 🎯 **Suitability Scorer**      | Predicts intern-role fit using ensemble methods |
| 🔢 **Embedding Engine**        | Generates skill/role embeddings for similarity  |
| 📈 **Performance Evaluator**   | Predicts performance metrics                    |
| 🛤️ **Learning Path Optimizer** | Generates personalized learning recommendations |

---

## 📜 Available Commands

### Backend

```bash
python manage.py migrate              # Run database migrations
python manage.py createsuperuser     # Create admin user
python manage.py seed_interns        # Seed sample intern data
python manage.py train_models        # Train ML models
python manage.py compute_intelligence # Compute talent intelligence
```

### Frontend
=======
# Django Secret Key
SECRET_KEY=your_secret_key
DEBUG=True

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173

# JWT Authentication
JWT_SECRET_KEY=your_jwt_secret
ACCESS_TOKEN_LIFETIME=60
REFRESH_TOKEN_LIFETIME=1440

# OpenAI API (for LLM features)
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1

# Groq API (alternative LLM)
GROQ_API_KEY=your_groq_api_key
```

## 📱 API Endpoints

### Authentication

- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login (JWT)
- `POST /api/auth/refresh/` - Refresh access token
- `GET /api/auth/user/` - Get current user

### Interns

- `GET /api/interns/` - List all interns
- `POST /api/interns/` - Create intern profile
- `GET /api/interns/{id}/` - Get intern details
- `PUT /api/interns/{id}/` - Update intern profile

### Projects

- `GET /api/projects/` - List all projects
- `POST /api/projects/` - Create new project
- `GET /api/projects/{id}/` - Get project details

### Analytics

- `GET /api/analytics/talent-intelligence/` - Get talent intelligence
- `POST /api/analytics/analyze-resume/` - AI resume parsing
- `GET /api/analytics/performance/` - Performance analytics
- `GET /api/analytics/learning-path/` - Generate learning path

### Documents

- `GET /api/documents/` - List documents
- `POST /api/documents/upload/` - Upload document
- `GET /api/documents/{id}/` - Download document

### Feedback

- `GET /api/feedback/` - List feedback
- `POST /api/feedback/` - Submit feedback

## 🎨 Frontend Pages

| Page                  | Description                         |
| --------------------- | ----------------------------------- |
| Login/Register        | User authentication pages           |
| Dashboard             | Main dashboard with overview        |
| Intern List           | Manage intern profiles              |
| Intern Tasks          | View and manage intern tasks        |
| Project List          | Project management interface        |
| Learning Path         | AI-generated learning paths         |
| Performance Analytics | Performance metrics and predictions |
| Analysis Page         | Detailed talent analysis            |
| Documents             | Document upload and management      |
| Feedback              | Feedback submission and viewing     |
| Monitoring            | Admin/Manager monitoring dashboards |
| Profile               | User profile management             |

## 🤖 AI Models

The platform uses several ML/AI models:

- **Resume Parser** - Extracts structured data from resumes using LLM
- **Suitability Scorer** - Predicts intern-role fit using ensemble methods
- **Embedding Engine** - Generates skill/role embeddings for similarity matching
- **Performance Evaluator** - Predicts performance metrics
- **Learning Path Optimizer** - Generates personalized learning recommendations

## 📄 Available Commands

### Backend Management Commands

```bash
python manage.py migrate              # Run database migrations
python manage.py createsuperuser      # Create admin user
python manage.py seed_interns         # Seed sample intern data
python manage.py seed_job_roles       # Seed job role definitions
python manage.py train_models          # Train ML models
python manage.py compute_intelligence  # Compute talent intelligence
```

### Frontend Scripts
>>>>>>> f3e0c622b1331c6a016ff506cce119720d88b137

```bash
npm run dev      # Start development server
npm run build    # Build for production
<<<<<<< HEAD
npm run lint     # Run ESLint
```

---

## 📝 License

> This project is developed for educational purposes as part of the **CSU Internship Program**.

---

<div align="center">

### 🌟 Star this project if you find it useful!

Made with ❤️ by **CSU Internship Program**

</div>
=======
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 📝 License

This project is developed for educational purposes as part of the CSU Internship program.

## 👥 Authors

- CSU Internship Program
>>>>>>> f3e0c622b1331c6a016ff506cce119720d88b137
