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

## 🛠️ Tech Stack

### Backend

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

## 📁 Project Structure

```
AI-Talent-Intelligence-Platform/
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

### Backend (.env)

```env
# Database
DATABASE_NAME=your_db_name
DATABASE_USER=your_db_user
DATABASE_PASSWORD=your_db_password
DATABASE_HOST=localhost
DATABASE_PORT=5432

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

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
```

---

## 📝 License

> This project is developed for educational purposes as part of the **CSU Internship Program**.

---

<div align="center">

### 🌟 Star this project if you find it useful!

Made with ❤️ by **PARTH CHAUHAN**

</div>
