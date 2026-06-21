# SafeHer AI - Women's Safety Commuting Platform

SafeHer AI is a web application designed to empower women with route safety intelligence, real-time telemetry, automated deviation alerts, and a voice-controlled SOS system.

## 🚀 Key Features

1. **AI Route Safety Evaluation**: Evaluates route safety (Scikit-Learn RandomForest) based on lighting, isolated paths, police proximity, and community warnings.
2. **Distributed Emergency Coverage**: Places mock police control booths and hospitals near the start, midpoint, and destination coordinates for accurate proximity score assessments.
3. **GPS Autodetection & IP Fallback**: Detects high-accuracy GPS coordinates with a fallback to IP geolocation for map centering.
4. **Voice Emergency Control**: Actively listens for triggers like "HELP" or "SOS" to invoke the emergency alarm.
5. **Interactive AI Safety Advisor**: An in-app sidebar chatbot that provides real-time safety tips and calculates nearest emergency service distances dynamically.
6. **Path Deviation Alarms**: Automatically flags route deviations and triggers a 10s countdown to SOS dispatch unless cancelled with a secure PIN (`1234`).
7. **Theme Switcher**: Fully customizable light/dark styling mode support.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Tailwind CSS v4, Framer Motion, Leaflet Map API (React-Leaflet)
- **Backend Node Server**: Express.js, Socket.io, Node-Fetch, Mongoose
- **AI Flask Service**: Python, Flask, Scikit-Learn (RandomForestRegressor), Joblib, NumPy, Pandas
- **Database**: MongoDB (with local persistent JSON file fail-safe fallback)

---

## 💻 Installation & Startup Guide

### Prerequisites
- Node.js (v18+)
- Python (3.9+)

### Installation Steps

1. **Install Root & Server Dependencies**:
   ```bash
   npm install
   cd backend
   npm install
   cd ..
   ```

2. **Install Frontend Dependencies**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Install Python AI Dependencies**:
   ```bash
   pip install -r ai/requirements.txt
   ```

### Running the Dev Stack
In the root directory, run:
```bash
npm run dev
```
This concurrently starts:
- The Python AI Flask Service on `http://127.0.0.1:5000`
- The Express Backend Server on `http://localhost:3001`
- The React Frontend Development Server on `http://localhost:5173/`

Access the web application in your browser at:
👉 **[http://localhost:5173/](http://localhost:5173/)**

**Demo login credentials**:
- **Username**: `demo`
- **Password**: `1234` (seeds demo user and past commutes logs)

---

## 📹 Demo Video & Presentation Slides
- **Presentation Deck**: Refer to [PRESENTATION.md](PRESENTATION.md) for the project pitch and slides structure.
- **Architecture Diagram**: Refer to [ARCHITECTURE.md](ARCHITECTURE.md) for detailed components flowcharts.
- **Demo Video Walkthrough**: [Watch SafeHer AI Demonstration](https://youtu.be/dummy-safeher-demo) (Placeholder Link) or execute the built-in automated navigation simulation inside the app.
