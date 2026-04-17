# Conflict Network App

A fullstack application for visualizing conflict networks, consisting of:

- **Frontend** — React app served on port `3000`
- **Backend** — FastAPI (Python) REST API served on port `8000`

---

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/peaceobservatory/conflict-network.git
cd conflict-network
```

---

## Project Structure

```
conflict_network_app/
├── frontend/           # React frontend
│   ├── Dockerfile
│   ├── package.json
│   └── .env            # Environment variables (REACT_APP_BASEURL)
├── backend/            # FastAPI backend
│   ├── Dockerfile
│   ├── main.py
│   ├── requirements.txt
│   ├── api/
│   ├── models/
│   ├── utils/
│   ├── config/
│   └── data/
└── docker-compose.yml
```

---

## Running with Docker (Recommended)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Configure the frontend environment

Before building, ensure `frontend/.env` points to the correct backend URL:

```env
# For Docker (local):
REACT_APP_BASEURL=http://localhost:8000

```

### 2. Build and start all services

From the project root:

```bash
docker compose up --build -d
```

This will:

- Build and start the **frontend** container → [http://localhost:3000](http://localhost:3000)
- Build and start the **backend** container → [http://localhost:8000](http://localhost:8000)

### 3. View logs

```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Frontend only
docker compose logs -f frontend
```

### 4. Stop all services

```bash
docker compose down
```

---

## Running Locally (Without Docker)

### Prerequisites

- **Node.js** v20+ and **npm**
- **Python** 3.11+
- **Redis** (required by the backend for caching)

---

### Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate       # macOS/Linux
# venv\Scripts\activate        # Windows

# Install dependencies
pip install -r requirements.txt

# Ensure Redis is running
redis-cli ping                 # Expected: PONG

# Start the API server
uvicorn main:app --reload --port 8000
```

The backend API will be available at:

- **API root:** [http://localhost:8000](http://localhost:8000)
- **Swagger UI (interactive docs):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### Frontend

In a separate terminal:

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Set the backend URL
# Edit frontend/.env and set:
# REACT_APP_BASEURL=http://localhost:8000

# Start the development server
npm start
```

The frontend will open automatically at [http://localhost:3000](http://localhost:3000).

---

## Mapbox Setup

This application uses Mapbox for conflict network visualizations. You must provide a valid Mapbox Access Token for the maps to render correctly.

### 1. Get a Mapbox Access Token
1. Create a free account at [Mapbox.com](https://www.mapbox.com/).
2. Go to your [Account Dashboard](https://account.mapbox.com/).
3. Copy your **Default public token** (or create a new one).

### 2. Configure the Frontend
Add your token to the `frontend/.env` file:

```env
REACT_APP_MAPBOX_TOKEN=pk.your_actual_token_here
```

---

## Environment Variables

| Variable                 | Location        | Description                         |
| ------------------------ | --------------- | ----------------------------------- |
| `REACT_APP_BASEURL`      | `frontend/.env` | Base URL of the backend API         |
| `REACT_APP_MAPBOX_TOKEN` | `frontend/.env` | Your Mapbox Access Token (required) |

---

## Useful API Endpoints

| Endpoint                                                             | Description            |
| -------------------------------------------------------------------- | ---------------------- |
| `GET /`                                                              | Health check           |
| `GET /get-event-graph?start=YYYY-MM-DD&end=YYYY-MM-DD&gw_number=770` | Fetch event graph data |
| `GET /get-map-overlay?gw_number=770`                                 | Fetch map overlay data |
| `GET /docs`                                                          | Interactive Swagger UI |

---
