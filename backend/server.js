import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Import Mongoose Models
import User from './models/User.js';
import Commute from './models/Commute.js';
import Report from './models/Report.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5000/api/evaluate-safety';
const JWT_SECRET = process.env.JWT_SECRET || 'safeher_jwt_secret_token_key_2026';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/safeher';

app.use(cors());
app.use(express.json());

// Database Connection & Fail-safe Persistent JSON Fallback Setup
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, 'data_users.json');
const COMMUTES_FILE = path.join(__dirname, 'data_commutes.json');
const REPORTS_FILE = path.join(__dirname, 'data_reports.json');

// Helper function to load data from JSON files
function loadLocalData(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.warn(`Failed to read persistent file ${filePath}:`, err.message);
  }
  return defaultValue;
}

// Helper function to save data to JSON files
function saveLocalData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn(`Failed to write persistent file ${filePath}:`, err.message);
  }
}

let isMongoConnected = false;
let memoryUsers = loadLocalData(USERS_FILE, []);
let memoryCommutes = loadLocalData(COMMUTES_FILE, []);
let memoryReports = loadLocalData(REPORTS_FILE, []);

// Landmark Geocoding Dictionary for New Delhi (Instant search matches)
const landmarkCoordinates = {
  'connaught place': [28.6304, 77.2177],
  'cp': [28.6304, 77.2177],
  'india gate': [28.6129, 77.2295],
  'lady hardinge': [28.6335, 77.2120],
  'lady hardinge hospital': [28.6335, 77.2120],
  'parliament street': [28.6250, 77.2140],
  'minto road': [28.6230, 77.2240],
  'ram manohar lohia hospital': [28.6270, 77.2030],
  'rml hospital': [28.6270, 77.2030],
  'janpath': [28.6220, 77.2185],
  'janpath market': [28.6220, 77.2185],
  'delhi gate': [28.6210, 77.2400],
  'karol bagh': [28.6440, 77.1880],
  'rajendra place': [28.6415, 77.1770],
  'khan market': [28.6000, 77.2270]
};

// Seed Mock Data Helper (for both Mongo & In-Memory fallbacks)
const seedDatabase = async () => {
  const defaultReports = [
    {
      lat: 28.6220,
      lng: 77.2220,
      category: 'Poor Lighting',
      description: 'Subway underpass lighting is broken. Pitch black after 8 PM.',
      severity: 'High',
      reportedBy: 'System'
    },
    {
      lat: 28.6265,
      lng: 77.2085,
      category: 'Isolated Area',
      description: 'Very quiet street with deserted sidewalks. Recommended to avoid walking alone.',
      severity: 'Medium',
      reportedBy: 'System'
    }
  ];

  const defaultContacts = [
    { name: 'Mother', phone: '+91-9876543210' },
    { name: 'Sister', phone: '+91-9876543211' }
  ];

  if (isMongoConnected) {
    try {
      // Seed reports if empty
      const reportCount = await Report.countDocuments();
      if (reportCount === 0) {
        await Report.insertMany(defaultReports);
        console.log('Seeded database with initial safety reports.');
      }
      
      // Create demo user
      const demoUserExist = await User.findOne({ username: 'demo' });
      if (!demoUserExist) {
        const hashedPassword = await bcrypt.hash('1234', 10);
        const demoUser = await User.create({
          username: 'demo',
          email: 'demo@safeher.com',
          password: hashedPassword,
          emergencyContacts: defaultContacts
        });

        // Seed some past commutes (Previous History also!)
        await Commute.create([
          {
            userId: demoUser._id,
            sourceAddress: 'Connaught Place',
            destinationAddress: 'Lady Hardinge Hospital',
            safetyScore: 94.0,
            routeCoords: [[28.6304, 77.2177], [28.6320, 77.2140], [28.6335, 77.2120]],
            status: 'completed',
            elapsedTimeSec: 480,
            startedAt: new Date(Date.now() - 172800000) // 2 days ago
          },
          {
            userId: demoUser._id,
            sourceAddress: 'Janpath Market',
            destinationAddress: 'Parliament Street',
            safetyScore: 89.5,
            routeCoords: [[28.6220, 77.2185], [28.6240, 77.2160], [28.6250, 77.2140]],
            status: 'completed',
            elapsedTimeSec: 360,
            startedAt: new Date(Date.now() - 86400000) // Yesterday
          },
          {
            userId: demoUser._id,
            sourceAddress: 'Minto Road',
            destinationAddress: 'Connaught Place',
            safetyScore: 48.0,
            routeCoords: [[28.6230, 77.2240], [28.6280, 77.2200], [28.6304, 77.2177]],
            status: 'completed',
            elapsedTimeSec: 620,
            startedAt: new Date(Date.now() - 259200000) // 3 days ago
          }
        ]);
        console.log('Seeded database with demo user & past commute history.');
      }
    } catch (err) {
      console.error('Error seeding MongoDB data:', err);
    }
  } else {
    // Seed persistent JSON files only if empty
    if (memoryReports.length === 0) {
      memoryReports = defaultReports.map((r, i) => ({ ...r, _id: `report-${i}`, id: `report-${i}`, timestamp: new Date().toISOString() }));
      saveLocalData(REPORTS_FILE, memoryReports);
    }
    
    // Demo user
    const hashedPass = bcrypt.hashSync('1234', 10);
    const demoUser = {
      _id: 'demo-user-id-1234',
      username: 'demo',
      email: 'demo@safeher.com',
      password: hashedPass,
      emergencyContacts: defaultContacts,
      createdAt: new Date().toISOString()
    };
    
    const demoUserExist = memoryUsers.find(u => u.username === 'demo');
    if (!demoUserExist) {
      memoryUsers.push(demoUser);
      saveLocalData(USERS_FILE, memoryUsers);
    }

    // Mock history
    if (memoryCommutes.length === 0) {
      memoryCommutes = [
        {
          _id: 'c1',
          id: 'c1',
          userId: demoUser._id,
          sourceAddress: 'Connaught Place',
          destinationAddress: 'Lady Hardinge Hospital',
          safetyScore: 94.0,
          routeCoords: [[28.6304, 77.2177], [28.6320, 77.2140], [28.6335, 77.2120]],
          status: 'completed',
          elapsedTimeSec: 480,
          startedAt: new Date(Date.now() - 172800000).toISOString()
        },
        {
          _id: 'c2',
          id: 'c2',
          userId: demoUser._id,
          sourceAddress: 'Janpath Market',
          destinationAddress: 'Parliament Street',
          safetyScore: 89.5,
          routeCoords: [[28.6220, 77.2185], [28.6240, 77.2160], [28.6250, 77.2140]],
          status: 'completed',
          elapsedTimeSec: 360,
          startedAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          _id: 'c3',
          id: 'c3',
          userId: demoUser._id,
          sourceAddress: 'Minto Road',
          destinationAddress: 'Connaught Place',
          safetyScore: 48.0,
          routeCoords: [[28.6230, 77.2240], [28.6280, 77.2200], [28.6304, 77.2177]],
          status: 'completed',
          elapsedTimeSec: 620,
          startedAt: new Date(Date.now() - 259200000).toISOString()
        }
      ];
      saveLocalData(COMMUTES_FILE, memoryCommutes);
    }
    console.log('Seeded persistent JSON fallbacks with demo user and commute history.');
  }
};

// Connect Mongoose with graceful fallback
mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 })
  .then(() => {
    console.log('Successfully connected to MongoDB database.');
    isMongoConnected = true;
    seedDatabase();
  })
  .catch((err) => {
    console.warn('MongoDB connection timed out. Falling back to fail-safe In-Memory DB operations:', err.message);
    isMongoConnected = false;
    seedDatabase();
  });

// Static Emergency Stations (Connaught Place Center area)
const staticEmergencyServices = {
  police: [
    { id: 'p1', name: 'Connaught Place Police Station', lat: 28.6320, lng: 77.2195, phone: '011-23351100', status: 'Active Patrol' },
    { id: 'p2', name: 'Parliament Street Police Station', lat: 28.6250, lng: 77.2140, phone: '011-23361100', status: 'Active Patrol' },
    { id: 'p3', name: 'Tilak Marg Police Station', lat: 28.6180, lng: 77.2340, phone: '011-23381100', status: 'On Call' }
  ],
  hospitals: [
    { id: 'h1', name: 'Ram Manohar Lohia Hospital', lat: 28.6270, lng: 77.2030, phone: '011-23365550', emergency: '24/7 ER Open' },
    { id: 'h2', name: 'Lady Hardinge Hospital', lat: 28.6335, lng: 77.2120, phone: '011-23363700', emergency: '24/7 ER Open' }
  ]
};

// Helper: Calculate distance (in meters)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const phi1 = lat1 * Math.PI/180;
  const phi2 = lat2 * Math.PI/180;
  const deltaPhi = (lat2-lat1) * Math.PI/180;
  const deltaLambda = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// User Authenticator Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = decoded;
    next();
  });
};

// Helper: Geocoder with OSM nominatim fallback
async function geocodeAddress(query) {
  if (typeof query !== 'string') {
    if (Array.isArray(query) && query.length === 2) return query;
    return [28.6304, 77.2177];
  }
  const normalized = query.toLowerCase().trim();
  
  // 0. Coordinate String Check (e.g. "28.6304, 77.2177")
  const coordsRegex = /^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/;
  const match = normalized.match(coordsRegex);
  if (match) {
    return [parseFloat(match[1]), parseFloat(match[3])];
  }

  // 1. Dictionary Check
  if (landmarkCoordinates[normalized]) {
    return landmarkCoordinates[normalized];
  }
  
  // Try matching substring keywords
  for (const landmark of Object.keys(landmarkCoordinates)) {
    if (normalized.includes(landmark)) {
      return landmarkCoordinates[landmark];
    }
  }

  // 2. Query OpenStreetMap Nominatim Geocoding API (Direct search first)
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const response = await fetch(osmUrl, {
      headers: {
        'User-Agent': 'SafeHer-Commute-Assistant/1.0 (adhvi@safeher.com)'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    }
  } catch (err) {
    console.warn(`Direct OSM Nominatim Geocoder failed: ${err.message}`);
  }

  // 3. Query with local context if direct search returned nothing
  try {
    const localQuery = query + ', New Delhi, India';
    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(localQuery)}&format=json&limit=1`;
    const response = await fetch(osmUrl, {
      headers: {
        'User-Agent': 'SafeHer-Commute-Assistant/1.0 (adhvi@safeher.com)'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    }
  } catch (err) {
    console.warn(`Local OSM Nominatim Geocoder failed: ${err.message}`);
  }

  // 4. Fallback offset close to CP
  const offsetLat = 28.6304 + (Math.random() - 0.5) * 0.02;
  const offsetLng = 77.2177 + (Math.random() - 0.5) * 0.02;
  return [offsetLat, offsetLng];
}

// --- REST ROUTES ---

// 1. Auth Handlers
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, emergencyContacts } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing registration details' });
    }

    const emailLow = email.toLowerCase().trim();
    const contacts = emergencyContacts || [];

    // Check availability
    let userExist = false;
    if (isMongoConnected) {
      userExist = await User.findOne({ $or: [{ username }, { email: emailLow }] });
    } else {
      userExist = memoryUsers.find(u => u.username === username || u.email === emailLow);
    }

    if (userExist) {
      return res.status(400).json({ error: 'Username or email already registered' });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);
    let newUser;

    if (isMongoConnected) {
      newUser = await User.create({
        username,
        email: emailLow,
        password: hashedPassword,
        emergencyContacts: contacts
      });
    } else {
      newUser = {
        _id: `user-${Date.now()}`,
        username,
        email: emailLow,
        password: hashedPassword,
        emergencyContacts: contacts,
        createdAt: new Date().toISOString()
      };
      memoryUsers.push(newUser);
      saveLocalData(USERS_FILE, memoryUsers);
    }

    // Token
    const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: newUser._id, username: newUser.username, email: newUser.email, emergencyContacts: newUser.emergencyContacts }
    });

  } catch (err) {
    console.error('Registration API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }

    const query = usernameOrEmail.toLowerCase().trim();
    let user = null;

    if (isMongoConnected) {
      user = await User.findOne({ $or: [{ username: query }, { email: query }] });
    } else {
      user = memoryUsers.find(u => u.username === query || u.email === query);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email, emergencyContacts: user.emergencyContacts }
    });

  } catch (err) {
    console.error('Login API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    let userProfile = null;
    if (isMongoConnected) {
      userProfile = await User.findById(req.user.id).select('-password');
    } else {
      userProfile = memoryUsers.find(u => u._id === req.user.id);
    }

    if (!userProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const { password, ...safeUser } = userProfile;
    res.json(isMongoConnected ? userProfile : safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Commute Storage Handlers
app.post('/api/commutes', async (req, res) => {
  try {
    const { userId, sourceAddress, destinationAddress, safetyScore, routeCoords } = req.body;
    if (!sourceAddress || !destinationAddress || !safetyScore || !routeCoords) {
      return res.status(400).json({ error: 'Missing journey details to log' });
    }

    let newCommute;
    if (isMongoConnected) {
      newCommute = await Commute.create({
        userId: userId || null,
        sourceAddress,
        destinationAddress,
        safetyScore: parseFloat(safetyScore),
        routeCoords,
        status: 'active'
      });
    } else {
      newCommute = {
        _id: `commute-${Date.now()}`,
        userId: userId || null,
        sourceAddress,
        destinationAddress,
        safetyScore: parseFloat(safetyScore),
        routeCoords,
        status: 'active',
        elapsedTimeSec: 0,
        startedAt: new Date().toISOString()
      };
      memoryCommutes.unshift(newCommute);
      saveLocalData(COMMUTES_FILE, memoryCommutes);
    }

    res.status(201).json(newCommute);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/commutes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, elapsedTimeSec } = req.body;

    let updatedCommute;
    if (isMongoConnected) {
      updatedCommute = await Commute.findByIdAndUpdate(
        id,
        { status, elapsedTimeSec },
        { new: true }
      );
    } else {
      const idx = memoryCommutes.findIndex(c => c._id === id || c.id === id);
      if (idx !== -1) {
        memoryCommutes[idx].status = status;
        memoryCommutes[idx].elapsedTimeSec = elapsedTimeSec || memoryCommutes[idx].elapsedTimeSec;
        updatedCommute = memoryCommutes[idx];
        saveLocalData(COMMUTES_FILE, memoryCommutes);
      }
    }

    if (!updatedCommute) {
      return res.status(404).json({ error: 'Commute session not found' });
    }

    res.json(updatedCommute);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/commutes', async (req, res) => {
  try {
    const { userId } = req.query;
    let commuteHistory = [];

    if (isMongoConnected) {
      const filter = userId ? { userId } : {};
      commuteHistory = await Commute.find(filter).sort({ startedAt: -1 }).limit(10);
    } else {
      commuteHistory = userId 
        ? memoryCommutes.filter(c => c.userId === userId)
        : memoryCommutes;
    }

    res.json(commuteHistory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Reports Persistence Handlers
app.get('/api/reports', async (req, res) => {
  try {
    let list = [];
    if (isMongoConnected) {
      list = await Report.find().sort({ reportedAt: -1 });
    } else {
      list = memoryReports;
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const { lat, lng, category, description, severity, reportedBy } = req.body;
    if (!lat || !lng || !category || !description || !severity) {
      return res.status(400).json({ error: 'Missing reporting parameters' });
    }

    let savedReport;
    if (isMongoConnected) {
      savedReport = await Report.create({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        category,
        description,
        severity,
        reportedBy: reportedBy || 'Anonymous'
      });
    } else {
      savedReport = {
        _id: `report-${Date.now()}`,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        category,
        description,
        severity,
        reportedBy: reportedBy || 'Anonymous',
        timestamp: new Date().toISOString()
      };
      memoryReports.unshift(savedReport);
      saveLocalData(REPORTS_FILE, memoryReports);
    }

    io.emit('new-report', savedReport);
    res.status(201).json(savedReport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Dynamic routing via OSRM & Safety Scoring
app.post('/api/routes/evaluate', async (req, res) => {
  try {
    const { source, destination, time_of_day } = req.body;
    if (!source || !destination) {
      return res.status(400).json({ error: 'Please enter both source and destination locations.' });
    }

    const currentHour = time_of_day !== undefined ? time_of_day : new Date().getHours();

    // A. Geocode Locations
    console.log(`Geocoding locations... Source: "${source}" | Destination: "${destination}"`);
    const sourceCoords = Array.isArray(source) ? source : await geocodeAddress(source);
    const destCoords = Array.isArray(destination) ? destination : await geocodeAddress(destination);

    // B. Call OSRM Walking/Foot Routing Engine for multiple alternatives
    const osrmUrl = `http://router.project-osrm.org/route/v1/foot/${sourceCoords[1]},${sourceCoords[0]};${destCoords[1]},${destCoords[0]}?alternatives=true&geometries=geojson&overview=full`;
    
    let routesData = [];
    try {
      const response = await fetch(osrmUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          routesData = data.routes;
        }
      }
    } catch (osrmErr) {
      console.warn("OSM OSRM Router is offline. Generating synthetic path coordinates offsets.", osrmErr.message);
    }

    // If OSRM returned nothing, build fallback routes between the coordinates
    if (routesData.length === 0) {
      // Build 2 synthetic paths
      routesData = [
        {
          duration: 1200,
          distance: 1500,
          geometry: {
            coordinates: [
              [sourceCoords[1], sourceCoords[0]],
              [sourceCoords[1] + (destCoords[1]-sourceCoords[1])*0.5, sourceCoords[0] + (destCoords[0]-sourceCoords[0])*0.3],
              [destCoords[1], destCoords[0]]
            ]
          }
        },
        {
          duration: 900,
          distance: 1200,
          geometry: {
            coordinates: [
              [sourceCoords[1], sourceCoords[0]],
              [sourceCoords[1] + (destCoords[1]-sourceCoords[1])*0.3, sourceCoords[0] + (destCoords[0]-sourceCoords[0])*0.7],
              [destCoords[1], destCoords[0]]
            ]
          }
        }
      ];
    }

    // Calculate distance to New Delhi CP
    const distToCP = calculateDistance(sourceCoords[0], sourceCoords[1], 28.6304, 77.2177);
    console.log(`[EVALUATE] Source Coords: ${sourceCoords}, distToCP: ${distToCP}`);
    
    const midLat = (sourceCoords[0] + destCoords[0]) / 2;
    const midLng = (sourceCoords[1] + destCoords[1]) / 2;
    
    const activeEmergencyServices = distToCP > 50000 
      ? {
          police: [
            // Start area stations
            { id: 'p_local_1', name: 'Sector Police Control Booth', lat: sourceCoords[0] + 0.003, lng: sourceCoords[1] + 0.004, phone: '112', status: 'Active Patrol' },
            { id: 'p_local_2', name: 'Area Division Police Station', lat: sourceCoords[0] - 0.004, lng: sourceCoords[1] - 0.005, phone: '112', status: 'Active Patrol' },
            // Mid area stations
            { id: 'p_local_mid', name: 'Highway Patrol Hub', lat: midLat + 0.001, lng: midLng - 0.002, phone: '112', status: 'Active Patrol' },
            // Destination area stations
            { id: 'p_local_dest', name: 'Town Police Station', lat: destCoords[0] + 0.002, lng: destCoords[1] - 0.003, phone: '112', status: 'Active Patrol' }
          ],
          hospitals: [
            // Start area hospitals
            { id: 'h_local_1', name: 'Medicare Emergency Hospital', lat: sourceCoords[0] - 0.002, lng: sourceCoords[1] + 0.003, phone: '102', emergency: '24/7 ER Open' },
            // Mid area hospitals
            { id: 'h_local_mid', name: 'Regional Medical Clinic', lat: midLat - 0.003, lng: midLng + 0.002, phone: '102', emergency: '24/7 ER Open' },
            // Destination area hospitals
            { id: 'h_local_dest', name: 'City Wellness Center & ER', lat: destCoords[0] + 0.004, lng: destCoords[1] - 0.004, phone: '102', emergency: '24/7 ER Open' }
          ]
        }
      : staticEmergencyServices;

    console.log(`[EVALUATE] Selected Emergency Services count: police=${activeEmergencyServices.police.length}, hospitals=${activeEmergencyServices.hospitals.length}`);

    // C. Evaluate each route geometry
    const evaluatedRoutes = [];
    
    for (let index = 0; index < routesData.length; index++) {
      const route = routesData[index];
      
      // OSRM coordinates are [lng, lat]. Map to [lat, lng].
      const leafletCoords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      
      // Midpoint calculations
      const midIdx = Math.floor(leafletCoords.length / 2);
      const midPoint = leafletCoords[midIdx];

      console.log(`[EVALUATE] Route ${index} MidPoint: ${midPoint}`);

      // Calculate distances to police / hospitals using dynamic activeEmergencyServices
      let minPoliceDist = 99999;
      activeEmergencyServices.police.forEach(p => {
        const d = calculateDistance(midPoint[0], midPoint[1], p.lat, p.lng);
        console.log(`[EVALUATE] Dist to police ${p.name} (${p.lat}, ${p.lng}) from midpoint (${midPoint[0]}, ${midPoint[1]}): ${d}m`);
        if (d < minPoliceDist) minPoliceDist = d;
      });

      let minHospitalDist = 99999;
      activeEmergencyServices.hospitals.forEach(h => {
        const d = calculateDistance(midPoint[0], midPoint[1], h.lat, h.lng);
        console.log(`[EVALUATE] Dist to hospital ${h.name} (${h.lat}, ${h.lng}) from midpoint (${midPoint[0]}, ${midPoint[1]}): ${d}m`);
        if (d < minHospitalDist) minHospitalDist = d;
      });

      console.log(`[EVALUATE] Route ${index} MinPoliceDist: ${minPoliceDist}, MinHospitalDist: ${minHospitalDist}`);

      // Count reports near this route path
      let reportsList = isMongoConnected ? await Report.find() : memoryReports;
      let nearbyReportsCount = 0;
      let poorLightingCount = 0;
      let isolatedAreaCount = 0;
      let harassmentSpotCount = 0;

      reportsList.forEach(report => {
        let closeToRoute = false;
        for (let coord of leafletCoords) {
          if (calculateDistance(coord[0], coord[1], report.lat, report.lng) < 400) {
            closeToRoute = true;
            break;
          }
        }
        if (closeToRoute) {
          nearbyReportsCount++;
          const cat = report.category.toLowerCase();
          const sev = report.severity.toLowerCase();
          let weight = 1;
          if (sev === 'high') weight = 3;
          if (sev === 'medium') weight = 2;

          if (cat.includes('light')) {
            poorLightingCount += weight;
          } else if (cat.includes('isolate')) {
            isolatedAreaCount += weight;
          } else if (cat.includes('harass') || cat.includes('suspicious')) {
            harassmentSpotCount += weight;
          }
        }
      });

      // Calculate lighting and area risk dynamically based on reports and police stations
      const isRouteA = index === 0;
      
      // Base values
      let lighting = isRouteA ? 85.0 : 70.0;
      let areaRisk = isRouteA ? 2 : 3;

      // Penalize for poor lighting reports
      lighting -= poorLightingCount * 12.0;

      // Penalize for safety reports / risk factors
      areaRisk += (isolatedAreaCount * 0.8) + (harassmentSpotCount * 1.2);

      // Proximity to police station helps
      if (minPoliceDist <= 500) {
        lighting += 10;
        areaRisk -= 1;
      } else if (minPoliceDist > 2000) {
        lighting -= 10;
        areaRisk += 1;
      }

      // Proximity to hospital helps slightly
      if (minHospitalDist <= 800) {
        areaRisk -= 0.5;
      }

      // Clip parameters to bounds
      lighting = Math.max(10.0, Math.min(100.0, lighting));
      areaRisk = Math.max(1, Math.min(5, Math.round(areaRisk)));

      const durationMins = Math.round(route.duration / 60);
      const distanceKm = (route.distance / 1000).toFixed(1);

      // Generate description tags dynamically
      const tags = [];
      if (lighting >= 75) tags.push('Well-lit Avenue');
      if (lighting < 50) tags.push('Poorly Lit Stretch');
      if (minPoliceDist <= 800) tags.push('Police Proximity');
      if (areaRisk <= 2) tags.push('High Activity Area');
      if (areaRisk >= 4) tags.push('Isolated Path');
      if (nearbyReportsCount > 0) tags.push(`${nearbyReportsCount} Safety Warnings`);

      if (tags.length === 0) {
        tags.push(isRouteA ? 'Standard Route' : 'Alternative path');
      }

      evaluatedRoutes.push({
        id: `route-${index}`,
        name: isRouteA ? 'Recommended Safety Path' : `Alternative Route ${index}`,
        time: `${durationMins} min`,
        distance: `${distanceKm} km`,
        coordinates: leafletCoords,
        tags: tags,
        time_of_day: currentHour,
        lighting_level: lighting,
        reports_nearby: nearbyReportsCount,
        police_distance_m: Math.round(minPoliceDist),
        hospital_distance_m: Math.round(minHospitalDist),
        area_risk_level: areaRisk
      });
    }

function generateSafetyExplanation(timeOfDay, lighting, reports, policeDist, areaRisk, score) {
  const positives = [];
  const negatives = [];

  if (lighting >= 75) {
    positives.push("is exceptionally well-lit with active street illumination");
  } else if (lighting >= 50) {
    positives.push("has moderate street lighting");
  } else {
    negatives.push("contains several dark stretches with poor visibility");
  }

  if (policeDist <= 800) {
    positives.push(`maintains immediate access to police assistance (nearest booth is ${Math.round(policeDist)}m away)`);
  } else if (policeDist > 2000) {
    negatives.push(`is isolated from emergency support, with the nearest police station over ${(policeDist/1000).toFixed(1)}km away`);
  }

  if (areaRisk <= 2) {
    positives.push("traverses a highly active zone with steady foot traffic");
  } else if (areaRisk >= 4) {
    negatives.push("goes through an isolated area with a higher historical risk index");
  }

  if (reports > 0) {
    negatives.push(`passes near ${reports} community-reported safety incident(s)`);
  }

  let explanation = "";
  if (score >= 75) {
    explanation = "This route is highly recommended. It ";
    if (positives.length > 0) {
      explanation += positives.slice(0, 2).join(" and ") + ".";
    } else {
      explanation += "has a standard safety profile.";
    }
    if (negatives.length > 0) {
      explanation += " However, be aware that it " + negatives.join(" and ") + ".";
    }
  } else if (score >= 50) {
    explanation = "This route is moderately safe. While it ";
    if (positives.length > 0) {
      explanation += positives.slice(0, 2).join(" and ");
    } else {
      explanation += "is walking-compatible";
    }
    if (negatives.length > 0) {
      explanation += ", it also " + negatives.join(" and ") + ".";
    } else {
      explanation += ".";
    }
  } else {
    explanation = "This path is NOT recommended, especially after dark. It ";
    if (negatives.length > 0) {
      explanation += negatives.join(" and ") + ".";
    } else {
      explanation += "has a low overall safety index.";
    }
    if (positives.length > 0) {
      explanation += " Even though it " + positives.slice(0, 2).join(" and ") + ", it remains a high-risk option.";
    }
  }

  return explanation;
}

    // D. Fetch AI Safety Scores from Python Flask service
    try {
      const response = await fetch(AI_SERVICE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routes: evaluatedRoutes })
      });

      if (response.ok) {
        const aiData = await response.json();
        
        const mergedRoutes = evaluatedRoutes.map((route, index) => {
          const aiResult = aiData.results[index];
          return {
            ...route,
            safetyScore: aiResult.safety_score,
            explanation: aiResult.explanation,
            breakdown: aiResult.breakdown,
            risk_factors: aiResult.risk_factors
          };
        });

        // Sort: Suggested Best Safety Route always first
        mergedRoutes.sort((a, b) => b.safetyScore - a.safetyScore);

        return res.json({
          sourceCoords,
          destCoords,
          routes: mergedRoutes,
          source: 'AI Engine (Scikit-Learn)'
        });
      } else {
        throw new Error('Flask AI service error status');
      }

    } catch (aiErr) {
      console.warn("Flask AI service offline. Calculating safety score locally.", aiErr.message);

      // Local mathematical scoring backup
      const mergedRoutes = evaluatedRoutes.map((route, idx) => {
        let base = 85.0;
        const isNight = (currentHour >= 19) || (currentHour <= 5);
        const nightPenalty = isNight ? -20.0 * (1 - route.lighting_level / 100) : 0;
        const lightingEffect = 15.0 * (route.lighting_level / 100) - 15.0;
        const reportsPenalty = -7.0 * route.reports_nearby;
        const policePenalty = -12.0 * Math.min(route.police_distance_m / 2000.0, 1.5);
        const areaPenalty = -10.0 * (route.area_risk_level - 1);
        
        let score = base + nightPenalty + lightingEffect + reportsPenalty + policePenalty + areaPenalty;
        score = Math.round(Math.max(5.0, Math.min(98.0, score)));

        const lightingDesc = route.lighting_level >= 75 ? "Excellent Lighting" : (route.lighting_level >= 50 ? "Moderate Lighting" : "Poorly Lit Road");
        const emergencyDesc = (route.police_distance_m + route.hospital_distance_m)/2 <= 800 ? "Quick Access (Under 5 mins)" : "Delayed Assistance";
        const riskDesc = route.area_risk_level <= 2 ? "High Activity / Low Risk Area" : "Isolated / High Risk Area";

        const riskFactors = [];
        if (isNight && route.lighting_level < 50) riskFactors.push("Poorly lit street at night");
        if (route.reports_nearby > 0) riskFactors.push(`${route.reports_nearby} community alerts reported nearby`);
        if (route.police_distance_m > 2000) riskFactors.push("Police station is distant");
        if (route.area_risk_level >= 4) riskFactors.push("Isolated/High-risk neighborhood");

        const explanation = generateSafetyExplanation(
          currentHour,
          route.lighting_level,
          route.reports_nearby,
          route.police_distance_m,
          route.area_risk_level,
          score
        );

        return {
          ...route,
          safetyScore: score,
          explanation: explanation,
          breakdown: {
            lighting: lightingDesc,
            emergency_accessibility: emergencyDesc,
            crime_risk: riskDesc
          },
          risk_factors: riskFactors.length > 0 ? riskFactors : ["No major risks detected"]
        };
      });

      // Sort
      mergedRoutes.sort((a, b) => b.safetyScore - a.safetyScore);

      return res.json({
        sourceCoords,
        destCoords,
        routes: mergedRoutes,
        source: 'Local Fallback Engine'
      });
    }

  } catch (err) {
    console.error("Dynamic evaluation critical error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Fetch emergency services (with local coordinate dynamic rendering)
app.get('/api/emergency-services', (req, res) => {
  const { lat, lng } = req.query;
  if (lat && lng) {
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const distToCP = calculateDistance(userLat, userLng, 28.6304, 77.2177);
    if (distToCP > 50000) {
      return res.json({
        police: [
          { id: 'p_local_1', name: 'Sector Police Control Booth', lat: userLat + 0.003, lng: userLng + 0.004, phone: '112', status: 'Active Patrol' },
          { id: 'p_local_2', name: 'Area Division Police Station', lat: userLat - 0.004, lng: userLng - 0.005, phone: '112', status: 'Active Patrol' },
          { id: 'p_local_3', name: 'Community Security Post', lat: userLat + 0.001, lng: userLng - 0.002, phone: '112', status: 'On Call' }
        ],
        hospitals: [
          { id: 'h_local_1', name: 'Medicare Emergency Hospital', lat: userLat - 0.002, lng: userLng + 0.003, phone: '102', emergency: '24/7 ER Open' },
          { id: 'h_local_2', name: 'City Wellness Center & ER', lat: userLat + 0.005, lng: userLng - 0.004, phone: '102', emergency: '24/7 ER Open' }
        ]
      });
    }
  }
  res.json(staticEmergencyServices);
});

// Trigger SOS
app.post('/api/sos', (req, res) => {
  const { lat, lng, timestamp, contacts, user } = req.body;
  const sosEvent = {
    id: `sos-${Date.now()}`,
    user: user || 'Anonymous Commuter',
    lat: lat || 28.6139,
    lng: lng || 77.2090,
    timestamp: timestamp || new Date().toISOString(),
    contacts: contacts || ['Mother', 'Police Control Room']
  };
  
  io.emit('sos-alert', sosEvent);
  res.json({ success: true, event: sosEvent });
});

// Socket Connections
io.on('connection', (socket) => {
  socket.on('journey-update', (data) => {
    socket.broadcast.emit('live-journey-feed', data);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Express Node server running on port ${PORT}`);
});
