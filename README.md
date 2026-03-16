# InterviewDiver

A full-stack AI-powered web application that helps candidates practice behavioral interviews, receive structured feedback, and track progress over time.

## Overview

InterviewDiver is a comprehensive interview preparation platform that simulates realistic behavioral interviews using AI and provides actionable insights to help users improve. The application combines customizable interview templates, real-time question flows, and detailed post-interview feedback so candidates can identify strengths and weaknesses across multiple practice sessions.

## Key Features

- **AI-Generated Interviews**: Run practice interviews powered by OpenAI, tailored to your selected role, seniority, and focus areas.
- **Customizable Templates**: Choose or configure interview templates (e.g., behavioral, system design, coding) to match upcoming interviews.
- **Live Interview Flow**: Step through structured questions one by one with clear prompts and guidance.
- **Actionable Feedback**: Receive organized feedback summaries after each session, including strengths, areas to improve, and suggested follow-up questions.
- **History & Progress Tracking**: Review past interviews, revisit questions, and compare feedback over time.
- **Personal Settings**: Adjust difficulty, topics, and other options to align with your learning goals.
- **Template Library Management**: Create and refine reusable templates for different roles and skill levels.
- **Consistent Questioning**: Standardize interview flows so multiple practice sessions follow comparable structures.
- **Feedback Structure**: Use the app’s feedback layout to keep notes organized across multiple candidates or sessions.

## Technical Features

- **Authentication & Protected Routes**: Secure access to interview content and history using JWT-based auth handled by the FastAPI backend and React context on the frontend.
- **RESTful API**: FastAPI backend exposes endpoints for authentication, users, interviews, templates, and feedback.
- **AI Integration**: OpenAI-powered service layer for generating interview questions and feedback summaries.
- **Database Persistence**: SQLAlchemy-based models and database layer to store users, interviews, templates, and results.
- **Type-Safe Frontend**: TypeScript + React with strong typing for API responses and app state.
- **Responsive UI**: Modern, responsive interface built with Tailwind CSS and React Router for client-side navigation.

## Tech Stack

### Frontend

- **React 18** – Component-based UI with hooks.
- **React Router v6** – Client-side routing and protected routes.
- **Vite** – Fast dev server and optimized build pipeline.
- **TypeScript** – Type-safe components and API types.
- **Tailwind CSS** – Utility-first styling for responsive design.
   (Custom authentication handled via JWTs and React context.)

### Backend & Services

- **FastAPI** – High-performance Python web framework for the REST API.
- **Uvicorn** – ASGI server for running the FastAPI app.
- **SQLAlchemy** – ORM for database models and queries.
- **Pydantic / pydantic-settings** – Data validation and configuration management.
- **OpenAI API** – AI-generated interview questions and feedback.
- **python-jose / bcrypt** – JWT handling and password hashing (for backend auth flows).

## Project Architecture

```text
backend/
├── main.py           # FastAPI app entrypoint
├── auth.py           # Auth utilities (tokens, password hashing)
├── database.py       # Database engine and session management
├── models.py         # SQLAlchemy models (users, interviews, templates, etc.)
├── schemas.py        # Pydantic schemas for requests/responses
├── routers/
│   ├── auth.py       # Auth endpoints (login, register, tokens)
│   ├── interviews.py # Interview creation, run, history, feedback
│   ├── templates.py  # Template CRUD and retrieval
│   └── users.py      # User-related endpoints
└── services/
    └── openai_service.py  # OpenAI integration and prompt orchestration

frontend/
├── src/
│   ├── api/
│   │   └── client.ts        # Axios client and API helpers
│   ├── components/
│   │   ├── Layout.tsx       # App shell and navigation
│   │   └── ProtectedRoute.tsx # Route protection based on auth state
│   ├── context/
│   │   └── AuthContext.tsx  # Authentication context provider
│   ├── pages/
│   │   ├── DashboardPage.tsx   # Overview of recent interviews and quick actions
│   │   ├── InterviewPage.tsx   # Run an interview session
│   │   ├── FeedbackPage.tsx    # View feedback for a specific interview
│   │   ├── HistoryPage.tsx     # Browse past sessions and details
│   │   ├── TemplatesPage.tsx   # Manage interview templates
│   │   └── UserOptionsPage.tsx # Personal settings and preferences
│   ├── types/                # Shared TypeScript types
│   ├── App.tsx               # Root app component & routes
│   └── main.tsx              # React entrypoint
└── index.html / config files # Vite + Tailwind configuration
```

## Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- **Python** >= 3.11
- OpenAI API key

---

## Backend Setup (FastAPI)

1. **Install dependencies**

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment variables**

   Create a `.env` file in `backend/` with values similar to:

   ```env
   OPENAI_API_KEY=sk-your-openai-api-key-here
   JWT_SECRET_KEY=your-super-secret-jwt-key-change-this
   DATABASE_URL=sqlite:///./interview_diver.db
   ```

   Adjust `DATABASE_URL` if you are using Postgres or another database.

3. **Run the backend server**

   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at `http://localhost:8000` (with automatic docs at `/docs`).

---

## Frontend Setup (React + Vite)

1. **Install dependencies**

   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables**

   Create a `.env.local` (or `.env`) file in `frontend/` for frontend configuration, for example:

   ```env
   VITE_API_URL=http://localhost:8000
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`.

## Available Frontend Scripts

From the `frontend/` directory:

- `npm run dev` – Start the Vite development server.
- `npm run build` – Type-check and build the production bundle.
- `npm run preview` – Preview the production build locally.

## High-Level Flow

1. User signs in via the built-in username/password flow and accesses the protected app.
2. User configures or selects an interview template and options.
3. Frontend calls the FastAPI backend to start an interview session.
4. Backend orchestrates prompts to OpenAI to generate questions and, after responses, feedback.
5. Results are stored in the database and surfaced on the dashboard, history, and feedback pages.
