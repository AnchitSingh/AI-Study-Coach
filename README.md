# AI Study Coach

> Transform any study material into personalized, adaptive quizzes powered by Google Gemini 2.5 Flash

A production-ready microservices application built for the **Google Cloud Run Hackathon 2025**, demonstrating serverless architecture, intelligent prompt engineering, and cost-efficient scaling.

[![Cloud Run](https://img.shields.io/badge/Google%20Cloud-Run-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![Gemini](https://img.shields.io/badge/Google-Gemini%202.5%20Flash-EA4335?logo=google&logoColor=white)](https://ai.google.dev/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)

[Video Walkthrough](https://youtu.be/804uznQGtJc)

***

## Features

- **Smart Quiz Generation** - Paste any text and get personalized questions across 4 types: MCQ, True/False, Fill-in-the-blank, Short Answer
- **AI-Powered Evaluation** - Intelligent grading with partial credit, detailed feedback, and improvement suggestions
- **Story Mode** - ELI5 explanations for difficult concepts using analogies and simple language
- **Performance Analytics** - Identifies weak topics, strong areas, and common misconceptions with personalized study recommendations
- **Bookmark System** - Save difficult questions for later review
- **Persistent State** - Quiz progress saved locally—resume anytime without login
- **Serverless Architecture** - Zero idle cost with request-based autoscaling

---

## Architecture

Built as **two independent Cloud Run services** with complete separation of concerns:

![Architecture Diagram](./demo/architecture-diagram.png)

| Service | Tech Stack | Configuration |
|-----------|-----------|-----------|
| **Frontend** | React + Vite + Nginx | 512MB, 1 vCPU | Min instances: 0 |
| **Backend** | Flask + Gunicorn | 2GB, 2 vCPU | Min instances: 0 |
| **AI Engine** | Gemini 2.5 Flash | API-based | 4 specialized prompts |
| **Deployment** | Cloud Build + Cloud Run | us-central1 | Auto-deploy on push |

### Frontend Service (`quiz-frontend`)

**Purpose**: Responsive UI and client-side state management

**Tech Stack**:
- React 18 with Vite for fast builds
- Tailwind CSS for styling
- localStorage for quiz state persistence
- React Router for navigation

**Deployment**:
- Multi-stage Docker build (optimized image size)
- Nginx web server serving static assets
- CORS-enabled for backend communication
- Cloud Run service with HTTPS auto-provisioning

**Key Features**:
- Completely stateless (no server-side sessions)
- Quiz state managed in browser—survives page refreshes
- Bookmark and pause functionality stored locally

***

### Backend Service (`quiz-backend`)

**Purpose**: Secure AI integration and prompt orchestration

**Tech Stack**:
- Python 3.11 with Flask framework
- Gunicorn WSGI server (production-ready)
- Custom JSON extraction/repair logic
- Structured prompt engineering

**API Endpoints**:

```
POST /api/generate-quiz
Body: { extractedSource: { text, title }, config: { questionCount, difficulty, questionTypes } }
Returns: Structured quiz JSON with questions, options, answers, explanations

POST /api/evaluate-subjective
Body: { question: {...}, userAnswer: "string" }
Returns: Evaluation with isCorrect, feedback, explanation

POST /api/get-story
Body: { extractedSource: { text, title }, config: { storyStyle } }
Returns: ELI5 explanation with analogies in Markdown

POST /api/get-feedback
Body: { quizMeta: {...}, stats: { correct, incorrect, weakTopics, ... } }
Returns: Performance analysis and personalized study recommendations

GET /api/health
Returns: { status: "ok", model_configured: true }
```

**Deployment**:
- Dockerfile with production dependencies
- Gunicorn configured for AI workload (1 worker, 8 threads, 300s timeout)
- Binds to Cloud Run's injected `PORT` environment variable
- Environment-specific CORS configuration

***

### AI Integration (Google Gemini)

**Model**: `gemini-2.5-flash` via AI Studio API

**Four Specialized Prompts** (all with JSON schema enforcement):

1. **[Quiz Generator](https://aistudio.google.com/app/prompts/1Pn4t0chQJwKPhpwNcjnj6n_REqmDoGJZ)** - Transforms input text into structured questions with answers, explanations, and metadata
2. **[Subjective Evaluator](https://aistudio.google.com/app/prompts/1CuWNEVTdZJYDCtHWnEHrn7sTDWvRhMdv)** - Analyzes answers with partial credit and constructive feedback
3. **[Story Explainer](https://aistudio.google.com/app/prompts/17a3owZtp5HglZ-OdCaO1G560DkUDdkND)** - Breaks down concepts into ELI5 explanations with analogies
4. **[Feedback Generator](https://aistudio.google.com/app/prompts/1PFOhcyBXwY7TcqHcAhyJPSPrwznVokmW)** - Analyzes stats to provide personalized study recommendations

**Prompt Engineering Best Practices**:
- Explicit JSON schemas with example structures
- Few-shot examples for consistent behavior
- Boundary instructions to prevent markdown wrapping
- Custom regex-based extraction for variable output
- All prompts saved in AI Studio with shareable links

---

## Technology Stack

### Project Structure

```
ai-study-coach/
├── backend
│   ├── app.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend
│   ├── Dockerfile
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── public
│   ├── src
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── components
│   │   │   ├── quiz
│   │   │   ├── story
│   │   │   └── ui
│   │   ├── contexts
│   │   ├── hooks
│   │   ├── index.css
│   │   ├── main.jsx
│   │   ├── pages
│   │   ├── services
│   │   └── utils
│   └── vite.config.js
├── LICENCE
└── README.md
```

***

## Getting Started

### Prerequisites

- **Google Cloud Account** with billing enabled
- **Gemini API Key** from [AI Studio](https://aistudio.google.com/apikey)
- **Docker** (for local development)
- **Node.js 20+** and **Python 3.11+**
- **gcloud CLI** installed and configured

***

### Local Development

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
echo "GEMINI_API_KEY=your_actual_key_here" > .env

# Run development server
python app.py
# Backend runs at http://localhost:5000
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
echo "VITE_API_URL=http://localhost:5000/api" > .env.production

# Run development server
npm run dev
# Frontend runs at http://localhost:5173
```

***

### Cloud Deployment

#### 1. Initial Setup

```bash
# Install Google Cloud CLI
# https://cloud.google.com/sdk/docs/install

# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

#### 2. Deploy Backend

```bash
cd backend

# Deploy to Cloud Run
gcloud run deploy quiz-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --set-env-vars GEMINI_API_KEY=your_actual_api_key

```

#### 3. Deploy Frontend

```bash
cd frontend

# Update .env.production with backend URL
echo "VITE_API_URL=https://quiz-backend-xxxxx.run.app/api" > .env.production

# Rebuild with production config
npm run build

# Deploy to Cloud Run
gcloud run deploy quiz-frontend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 20

```

***

## Configuration

### Environment Variables

**Backend** (`.env` or Cloud Run environment):
```bash
GEMINI_API_KEY=your_gemini_api_key_here
PORT=8080  # Auto-set by Cloud Run
```

**Frontend** (`.env.production`):
```bash
VITE_API_URL=https://your-backend-service.run.app/api
```

### Cloud Run Settings

**Backend Service**:
- Memory: 2GB (for AI processing)
- CPU: 2 vCPU
- Timeout: 300s (for slow Gemini responses)
- Concurrency: 160 (default)
- Min instances: 0 (cost optimization)

**Frontend Service**:
- Memory: 512MB (static serving)
- CPU: 1 vCPU
- Timeout: 60s
- Concurrency: 80
- Min instances: 0

***

## Testing

### Backend API Testing

```bash
# Health check
curl https://quiz-backend-xxxxx.run.app/api/health

# Generate quiz
curl -X POST https://quiz-backend-xxxxx.run.app/api/generate-quiz \
  -H "Content-Type: application/json" \
  -d '{
    "extractedSource": {
      "text": "Photosynthesis is the process by which plants convert light energy into chemical energy.",
      "title": "Photosynthesis"
    },
    "config": {
      "questionCount": 5,
      "difficulty": "medium",
      "questionTypes": ["MCQ", "Short Answer"]
    }
  }'
```

### Frontend Local Testing

```bash
cd frontend
npm run build    # Test production build
npm run preview  # Preview production build locally
```

***

## Key Technical Achievements

- **Production-ready microservices** - Independent services scaling 0→100+ instances
- **Zero idle costs** - Min instances = 0 with fast cold starts (~3-5s)
- **Robust prompt engineering** - 4 specialized prompts with JSON schema enforcement
- **Stateless architecture** - Client-side state management for infinite scalability
- **Defensive AI parsing** - Custom extraction logic handles unreliable model output
- **CI/CD automation** - Cloud Build → Artifact Registry → Cloud Run pipeline

---


## Future Enhancements

- **Firestore integration** - Cross-device quiz history sync with anonymous user IDs
- **Adaptive difficulty** - Questions adjust based on real-time performance
- **Social features** - Shareable quizzes and friend leaderboards
- **Cloud Run Jobs** - Batch PDF processing for quiz bank generation
- **Cost optimization** - Intelligent prompt caching and response memoization
- **Analytics dashboard** - Aggregated performance insights across all users

***

## Contributing

This project was built for the Google Cloud Run Hackathon 2025. Feel free to fork and adapt for your own use cases!

***

## License

MIT License - feel free to use this project as a reference for your own Cloud Run applications.

***

## Acknowledgments

Built for **Google Cloud Run Hackathon 2025**

- **Google Cloud Run** - Serverless container platform
- **Google Gemini** - AI-powered content generation via AI Studio API
- **AI Studio** - Prompt engineering and testing environment
- **Devpost** - Hackathon platform and community

***


Built with ☁️ on Google Cloud Run