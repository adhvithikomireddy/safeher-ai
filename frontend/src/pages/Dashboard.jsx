import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Search, Navigation, ShieldAlert, Phone, ShieldCheck, MapPin, 
  AlertTriangle, Mic, MicOff, Layers, Activity, Info, Lock, Clock, Calendar, CheckCircle, Shield,
  Volume2, VolumeX, Send, MessageSquare
} from 'lucide-react';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { API_URL } from '../config';

// Custom Leaflet DivIcons styled with Tailwind CSS
const userLocationIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center">
           <div class="absolute w-6 h-6 bg-blue-500/30 rounded-full animate-ping"></div>
           <div class="w-4.5 h-4.5 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
         </div>`,
  className: 'custom-div-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const policeIcon = L.divIcon({
  html: `<div class="bg-blue-600 border-2 border-white text-white rounded-xl p-1.5 w-8 h-8 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
           </svg>
         </div>`,
  className: 'custom-div-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const hospitalIcon = L.divIcon({
  html: `<div class="bg-emerald-600 border-2 border-white text-white rounded-xl p-1.5 w-8 h-8 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path>
           </svg>
         </div>`,
  className: 'custom-div-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const reportIcon = L.divIcon({
  html: `<div class="bg-rose-500 border-2 border-white text-white rounded-full p-1.5 w-8 h-8 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform animate-bounce">
           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
           </svg>
         </div>`,
  className: 'custom-div-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const tempPinIcon = L.divIcon({
  html: `<div class="relative flex flex-col items-center">
           <div class="bg-amber-500 text-white rounded-full p-2 shadow-2xl border-2 border-white animate-pulse">
             <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg>
           </div>
           <span class="text-[9px] bg-slate-900 border border-slate-700 text-slate-100 rounded px-1 mt-1 font-bold whitespace-nowrap">Report Location</span>
         </div>`,
  className: 'custom-div-icon',
  iconSize: [80, 48],
  iconAnchor: [40, 24]
});

function MapRecenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView(coords, 14, { animate: true });
    }
  }, [coords, map]);
  return null;
}

// Helper: Calculate distance in meters between two lat/lng coordinates
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
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

export default function Dashboard() {
  // Navigation & Search State
  const [source, setSource] = useState('My Location (Detecting...)');
  const [destination, setDestination] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [dataSource, setDataSource] = useState('Offline');
  const [locationAccuracy, setLocationAccuracy] = useState('detecting');

  // User Profile
  const [user, setUser] = useState(null);
  const [commuteHistory, setCommuteHistory] = useState([]);

  // activeTab State
  const [activeTab, setActiveTab] = useState('routes'); // 'routes' or 'advisor'
  
  // chat state
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hello! I am your SafeHer AI Advisor. Ask me anything about women safety features, emergency protocols, or destination safety details!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);

  // text-to-speech state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechUtteranceRef = useRef(null);

  const handleSpeakText = (text) => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        const cleanText = text.replace(/<[^>]*>/g, ''); // strip html
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.onend = () => {
          setIsSpeaking(false);
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
        };
        speechUtteranceRef.current = utterance;
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      }
    } else {
      alert("Text-to-speech is not supported by your browser.");
    }
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setIsBotTyping(true);
    
    setTimeout(() => {
      let botResponse = "I'm processing that safety query. SafeHer recommends staying on well-lit main avenues and configuring emergency contacts for immediate SOS alarm dispatch.";
      
      const query = userMsg.toLowerCase();
      if (query.includes('sos') || query.includes('alarm') || query.includes('trigger')) {
        botResponse = "SafeHer provides three ways to trigger SOS:\n1. Click the big red 'SOS EMERGENCY' button.\n2. Say 'HELP', 'SOS', or 'DANGER' when Voice Emergency Support is active.\n3. SafeHer automatically starts a 10s countdown if you deviate significantly from your selected safety path during live navigation. Enter '1234' to deactivate.";
      } else if (query.includes('police') || query.includes('station') || query.includes('booth')) {
        if (policeStations.length > 0) {
          const nearest = policeStations[0];
          const distKm = (getDistanceInMeters(userCoords[0], userCoords[1], nearest.lat, nearest.lng)/1000).toFixed(1);
          botResponse = `The nearest police station is "${nearest.name}" which is currently ${distKm}km away from your position. You can contact them immediately at "${nearest.phone || '112'}".`;
        } else {
          botResponse = "The nearest police station can be contacted at emergency number 112. Connect to high accuracy GPS to query local precinct stations on the map.";
        }
      } else if (query.includes('hospital') || query.includes('clinic')) {
        if (hospitals.length > 0) {
          const nearest = hospitals[0];
          const distKm = (getDistanceInMeters(userCoords[0], userCoords[1], nearest.lat, nearest.lng)/1000).toFixed(1);
          botResponse = `The nearest hospital is "${nearest.name}" located ${distKm}km away from you. Their contact phone number is "${nearest.phone || '102'}".`;
        } else {
          botResponse = "The nearest medical clinic or hospital can be reached at emergency number 102. Check the map layers to view medical markers.";
        }
      } else if (query.includes('features') || query.includes('safeher') || query.includes('app')) {
        botResponse = "SafeHer includes:\n- Live Walking Navigation telemetry.\n- Scikit-Learn RandomForest Safety Scoring.\n- GPS location tracking with automatic IP fallbacks.\n- Voice control SOS activations.\n- Automatic Route Deviation alert warnings.\n- Persistent commute logs & custom incident reporting markers.";
      } else if (query.includes('women') || query.includes('safety') || query.includes('safe')) {
        botResponse = "Women safety is our priority. Always share your active commutes with guardians, keep Voice Emergency active, and review route safety ratings before heading out after dark.";
      }
      
      setChatMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
      setIsBotTyping(false);
    }, 1000);
  };

  // Journey Tracking
  const [isJourneyActive, setIsJourneyActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userCoords, setUserCoords] = useState([28.6304, 77.2177]); // CP Center
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeCommuteSessionId, setActiveCommuteSessionId] = useState(null);

  // Deviation Warnings
  const [isDeviated, setIsDeviated] = useState(false);
  const [deviationCountdown, setDeviationCountdown] = useState(10);
  const [showDeviationWarning, setShowDeviationWarning] = useState(false);

  // SOS Emergency
  const [isSosActive, setIsSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(3);
  const [sosCancelPin, setSosCancelPin] = useState('');
  const [sosError, setSosError] = useState('');
  const [sosLogs, setSosLogs] = useState([]);

  // Voice SOS
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);

  // Map reporting state
  const [isDropPinMode, setIsDropPinMode] = useState(false);
  const [tempPinCoords, setTempPinCoords] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState({
    category: 'Poor Lighting',
    severity: 'Medium',
    description: ''
  });

  // Layer filters
  const [showPolice, setShowPolice] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showReports, setShowReports] = useState(true);

  // Database lists
  const [reports, setReports] = useState([]);
  const [policeStations, setPoliceStations] = useState([]);
  const [hospitals, setHospitals] = useState([]);

  const socketRef = useRef(null);
  const trackingIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const sosCountdownRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const watchPositionRef = useRef(null);

  // Location detection function (accessible globally inside the component)
  const detectLocation = async () => {
    setSource('My Location (Detecting...)');
    setLocationAccuracy('detecting');
    
    const fallbackToIP = async () => {
      try {
        console.log("Attempting IP-based geolocation fallback...");
        const ipRes = await fetch('https://ipapi.co/json/');
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData && ipData.latitude && ipData.longitude) {
            const lat = parseFloat(ipData.latitude);
            const lng = parseFloat(ipData.longitude);
            setUserCoords([lat, lng]);
            setSource(`My Location (${ipData.city || 'IP Fallback'})`);
            setLocationAccuracy('ip');
            console.log(`IP Autodetected Location: ${lat}, ${lng} (${ipData.city || ''})`);
            fetchInitialData([lat, lng]); // Reload local emergency services
            return;
          }
        }
      } catch (ipErr) {
        console.warn("IP Geolocation fallback failed:", ipErr.message);
      }
      console.log("Defaulting to CP (Delhi) center coords.");
      setSource('Connaught Place, New Delhi');
      setLocationAccuracy('failed');
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserCoords([lat, lng]);
          setSource('My Location (GPS)');
          setLocationAccuracy('gps');
          console.log(`GPS Autodetected Location: ${lat}, ${lng}`);
          fetchInitialData([lat, lng]); // Reload local emergency services
        },
        (error) => {
          console.warn("GPS Geolocation failed. Trying IP fallback...", error.message);
          fallbackToIP();
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      console.warn("GPS Geolocation not supported by browser. Trying IP fallback...");
      fallbackToIP();
    }
  };

  // Sync auth & load data on start
  useEffect(() => {
    // Connect socket
    socketRef.current = io(API_URL);

    socketRef.current.on('new-report', (newReport) => {
      setReports(prev => [newReport, ...prev]);
    });

    // Load auth
    const storedUser = localStorage.getItem('safeher_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchCommuteHistory(parsedUser.id);
    } else {
      fetchCommuteHistory();
    }

    fetchInitialData();

    detectLocation();

    // Setup speech
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        addSosLog('Voice assistant activated and listening...');
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        addSosLog(`Voice assistant error: ${event.error}`);
        if (event.error === 'not-allowed') {
          alert("Microphone access was blocked. Please check your browser's microphone permissions for this site.");
        }
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        const text = event.results[event.results.length - 1][0].transcript.toLowerCase();
        setTranscript(text);
        if (text.includes('help') || text.includes('sos') || text.includes('emergency') || text.includes('danger')) {
          recognition.stop();
          setIsListening(false);
          triggerSosEmergency();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };
      speechRecognitionRef.current = recognition;
    }

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (sosCountdownRef.current) clearInterval(sosCountdownRef.current);
      if (watchPositionRef.current) navigator.geolocation.clearWatch(watchPositionRef.current);
    };
  }, []);

  const fetchInitialData = async (coords = null) => {
    try {
      const reportsRes = await fetch(`${API_URL}/api/reports`);
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setReports(reportsData);
      }
      
      const queryLat = coords ? coords[0] : userCoords[0];
      const queryLng = coords ? coords[1] : userCoords[1];
      const url = `\${API_URL}/api/emergency-services?lat=${queryLat}&lng=${queryLng}`;
      
      const servicesRes = await fetch(url);
      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setPoliceStations(servicesData.police);
        setHospitals(servicesData.hospitals);
      }
    } catch (err) {
      console.warn("Could not query DB. Fallback data loaded.");
    }
  };

  const fetchCommuteHistory = async (userId = null) => {
    try {
      const url = userId 
        ? `\${API_URL}/api/commutes?userId=\${userId}`
        : `\${API_URL}/api/commutes`;
      const res = await fetch(url);
      if (res.ok) {
        const history = await res.json();
        setCommuteHistory(history);
      }
    } catch (err) {
      console.warn("Could not fetch commutes history.");
    }
  };
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!destination) return;
    setIsSearching(true);
    setShowRoutes(false);

    const sourcePayload = source.startsWith('My Location') ? userCoords : source;

    try {
      const res = await fetch(`\${API_URL}/api/routes/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: sourcePayload, destination })
      });
      if (res.ok) {
        const data = await res.json();
        setRoutes(data.routes);
        setSelectedRoute(data.routes[0]);
        setDataSource(data.source);
        if (data.sourceCoords) {
          setUserCoords(data.sourceCoords);
          fetchInitialData(data.sourceCoords); // Reload local emergency services
        }
        setShowRoutes(true);
      }
    } catch (err) {
      console.error("OSRM Evaluation API failed.", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartJourney = async (existingSessionId = null, startFromIndex = 0) => {
    if (!selectedRoute) return;
    
    // Log commute start to DB if it doesn't exist
    let sessionId = existingSessionId;
    if (!sessionId) {
      try {
        const res = await fetch(`\${API_URL}/api/commutes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user ? user.id : null,
            sourceAddress: source,
            destinationAddress: destination,
            safetyScore: selectedRoute.safetyScore,
            routeCoords: selectedRoute.coordinates
          })
        });
        if (res.ok) {
          const loggedCommute = await res.json();
          sessionId = loggedCommute._id || loggedCommute.id;
          setActiveCommuteSessionId(sessionId);
        }
      } catch (err) {
        console.warn("Could not log commute to database.");
      }
    }

    setIsJourneyActive(true);
    setCurrentStepIndex(startFromIndex);
    if (startFromIndex === 0) {
      setElapsedTime(0);
    }
    setIsDeviated(false);
    setShowDeviationWarning(false);
    
    if (selectedRoute.coordinates.length > startFromIndex) {
      setUserCoords(selectedRoute.coordinates[startFromIndex]);
    }

    addSosLog(`Commute started: ${source} ➜ ${destination}`);

    // Simulation Step Interval (1 second ticks)
    trackingIntervalRef.current = setInterval(async () => {
      setElapsedTime(prev => prev + 1);
      
      setCurrentStepIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= selectedRoute.coordinates.length) {
          clearInterval(trackingIntervalRef.current);
          handleEndJourney(true, sessionId || activeCommuteSessionId);
          return prevIndex;
        }

        const nextCoords = selectedRoute.coordinates[nextIndex];
        setUserCoords(nextCoords);

        if (socketRef.current) {
          socketRef.current.emit('journey-update', {
            routeId: selectedRoute.id,
            coords: nextCoords,
            elapsed: elapsedTime + 1,
            user: user ? user.username : 'Anonymous Commuter'
          });
        }

        return nextIndex;
      });
    }, 1000);
  };

  const handleEndJourney = async (completed = false, sessionId = activeCommuteSessionId) => {
    if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    
    setIsJourneyActive(false);
    setCurrentStepIndex(0);
    setIsDeviated(false);
    setShowDeviationWarning(false);

    // Save update status in Database
    const targetSessionId = sessionId || activeCommuteSessionId;
    if (targetSessionId) {
      try {
        await fetch(`\${API_URL}/api/commutes/\${targetSessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: completed ? 'completed' : 'cancelled',
            elapsedTimeSec: elapsedTime
          })
        });
      } catch (err) {
        console.warn("Could not update commute status in DB.");
      }
    }

    if (completed) {
      alert("You have arrived safely at your destination. Commute logged.");
    }
  };

  const handleSimulateDeviation = () => {
    if (!isJourneyActive) return;
    if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    
    setIsDeviated(true);
    setShowDeviationWarning(true);
    setDeviationCountdown(10);
    
    // Offset coordinate simulating deviation
    setUserCoords([userCoords[0] + 0.003, userCoords[1] - 0.003]);
    playWarningBeep();

    countdownIntervalRef.current = setInterval(() => {
      setDeviationCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          triggerSosEmergency();
          return 0;
        }
        playWarningBeep();
        return prev - 1;
      });
    }, 1000);
  };

  const handleConfirmSafety = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setIsDeviated(false);
    setShowDeviationWarning(false);
    
    // Resume simulated walking from last coordinate index
    handleStartJourney(activeCommuteSessionId, currentStepIndex);
  };

  const playWarningBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  };

  const triggerSosEmergency = async () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    
    setIsSosActive(true);
    setSosCountdown(3);
    setSosCancelPin('');
    setSosError('');
    setSosLogs(['SOS emergency signal initialized...', 'Accessing live GPS tracker...']);

    // Log SOS status to commute session
    if (activeCommuteSessionId) {
      try {
        await fetch(`\${API_URL}/api/commutes/\${activeCommuteSessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'sos', elapsedTimeSec: elapsedTime })
        });
      } catch (e) {}
    }

    sosCountdownRef.current = setInterval(() => {
      setSosCountdown(prev => {
        if (prev <= 1) {
          clearInterval(sosCountdownRef.current);
          broadcastSosAlert();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const broadcastSosAlert = async () => {
    addSosLog('BROADCASTING SOS ALERT...');
    addSosLog(`Sending GPS details: ${userCoords[0].toFixed(5)}, ${userCoords[1].toFixed(5)}`);
    
    const contacts = user && user.emergencyContacts.length > 0 
      ? user.emergencyContacts.map(c => `${c.name} (${c.phone})`)
      : ['Mother (+91-9876543210)', 'Sister (+91-9876543211)'];

    addSosLog(`Alert SMS dispatched to: ${contacts.join(', ')}`);
    addSosLog('Dispatching alert to Police Emergency Hotline (112)...');

    try {
      await fetch(`\${API_URL}/api/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: userCoords[0],
          lng: userCoords[1],
          user: user ? user.username : 'Anonymous Commuter',
          contacts
        })
      });
    } catch (err) {}
  };

  const handleDeactivateSos = () => {
    if (sosCancelPin === '1234') {
      setIsSosActive(false);
      setIsDeviated(false);
      setShowDeviationWarning(false);
      addSosLog('SOS deactivated. Protocols reset.');
      if (activeCommuteSessionId) {
        fetchCommuteHistory(user ? user.id : null);
      }
      alert('Safety confirmed. SOS deactivated.');
    } else {
      setSosError('Incorrect PIN. Emergency broadcast remains active.');
    }
  };

  const addSosLog = (msg) => {
    setSosLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const toggleVoiceListening = () => {
    if (!voiceSupported) {
      alert("Web Speech API is not supported in this browser. Please use the simulated voice trigger button to verify the SOS emergency activation loop.");
      return;
    }
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('Listening for words "Help", "SOS"...');
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Speech start error:", err);
      }
    }
  };

  const MapEvents = () => {
    const map = useMap();
    useEffect(() => {
      if (!isDropPinMode) return;
      const onClick = (e) => {
        setTempPinCoords(e.latlng);
        setShowReportForm(true);
        setIsDropPinMode(false);
      };
      map.on('click', onClick);
      return () => map.off('click', onClick);
    }, [isDropPinMode, map]);
    return null;
  };

  const handleReportFormSubmit = async (e) => {
    e.preventDefault();
    if (!tempPinCoords) return;

    try {
      const res = await fetch(`\${API_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: tempPinCoords.lat,
          lng: tempPinCoords.lng,
          category: reportForm.category,
          severity: reportForm.severity,
          description: reportForm.description,
          reportedBy: user ? user.username : 'Anonymous'
        })
      });

      if (res.ok) {
        const savedReport = await res.json();
        if (!socketRef.current.connected) {
          setReports(prev => [savedReport, ...prev]);
        }
      }
    } catch (err) {
      console.warn("Could not save report to database.");
    }

    setShowReportForm(false);
    setTempPinCoords(null);
    setReportForm({ category: 'Poor Lighting', severity: 'Medium', description: '' });
    alert('Safety report submitted to the database.');
  };

  return (
    <div className={`pt-16 h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-hidden ${isSosActive ? 'ring-8 ring-rose-600 animate-pulse' : ''}`}>
      
      {/* Edge SOS Flash */}
      <AnimatePresence>
        {isSosActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 border-[16px] border-red-600 z-[9999] pointer-events-none animate-pulse"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Controls */}
      <div className="w-full md:w-[420px] h-[45vh] md:h-full flex flex-col glass-sidebar z-10 shadow-2xl overflow-hidden">
        <div className="p-5 flex-grow flex flex-col min-h-0 space-y-4 overflow-y-auto">
          <div className="flex justify-between items-center shrink-0">
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5.5 h-5.5 text-violet-500" />
              Route Intelligence
            </h2>
            <span className="text-[9px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase">
              {dataSource}
            </span>
          </div>

          {/* Interactive Navigation Tabs */}
          {!isJourneyActive && !isSosActive && (
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-250 dark:border-slate-850 shrink-0">
              <button
                onClick={() => setActiveTab('routes')}
                className={`flex-grow py-2 text-center text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'routes'
                    ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350'
                }`}
              >
                Route Finder
              </button>
              <button
                onClick={() => setActiveTab('advisor')}
                className={`flex-grow py-2 text-center text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'advisor'
                    ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350'
                }`}
              >
                Safety AI Advisor
              </button>
            </div>
          )}

          {!isJourneyActive && !isSosActive && activeTab === 'routes' && (
            <>
              {/* Source & Destination Search Form */}
              <form onSubmit={handleSearchSubmit} className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="text"
                    required
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none premium-input"
                    placeholder="Enter starting location..."
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  />
                  {!isJourneyActive && !isSosActive && (
                    <button
                       type="button"
                       onClick={detectLocation}
                       className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-violet-500 transition-colors"
                       title="Detect precise location via GPS"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Accuracy Status Badge */}
                <div className="flex items-center gap-1.5 px-1 mt-1 text-[10px] font-semibold text-left">
                  {locationAccuracy === 'gps' && (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      GPS High Accuracy (Precise Coordinates)
                    </span>
                  )}
                  {locationAccuracy === 'ip' && (
                    <span className="text-amber-500 flex items-center gap-1" title="ISP routing centers are approximate. Click the compass pin to request precise GPS coordinates.">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      IP Location (Approximate). Click arrow to request exact GPS.
                    </span>
                  )}
                  {locationAccuracy === 'detecting' && (
                    <span className="text-violet-400 flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      Detecting exact location...
                    </span>
                  )}
                  {locationAccuracy === 'failed' && (
                    <span className="text-slate-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      Location query fallback. Enter exact address manually.
                    </span>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="text"
                    required
                    className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none premium-input"
                    placeholder="Enter destination location..."
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 shrink-0"
                >
                  {isSearching ? 'Analyzing Maps...' : 'Find Safest Path'}
                </button>
              </form>

              {/* Suggestions Alternatives */}
              <AnimatePresence>
                {showRoutes && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-2">
                    {routes.map((route, idx) => (
                      <div
                        key={route.id}
                        onClick={() => {
                          setSelectedRoute(route);
                          setUserCoords(route.coordinates[0]);
                        }}
                        className={`p-3.5 rounded-2xl cursor-pointer border transition-all duration-300 transform hover:scale-[1.01] ${
                          selectedRoute?.id === route.id
                            ? 'border-violet-500 bg-violet-500/10 dark:bg-violet-500/20 shadow-lg shadow-violet-500/10 dark:shadow-violet-500/20 glow-border-active'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{route.name}</h4>
                            <p className="text-[10px] text-slate-400 mt-1">{route.time} • {route.distance}</p>
                          </div>
                          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            route.safetyScore >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}>
                            {route.safetyScore}% Safe
                          </div>
                        </div>

                        {selectedRoute?.id === route.id && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-[10px] text-slate-500 dark:text-slate-400">
                            <div className="grid grid-cols-2 gap-2 text-left">
                              <div>💡 Lighting: <strong className="text-slate-700 dark:text-slate-300">{route.breakdown.lighting}</strong></div>
                              <div>🚨 Access: <strong className="text-slate-700 dark:text-slate-300">{route.breakdown.emergency_accessibility}</strong></div>
                            </div>
                            {route.explanation && (
                              <div className="text-left bg-violet-500/5 dark:bg-violet-500/10 p-2.5 rounded-xl border border-violet-500/10 mt-1 relative">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-violet-600 dark:text-violet-400 block">AI Safety Analysis:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSpeakText(route.explanation)}
                                    className="p-1 rounded bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900 transition-colors"
                                    title="Speak Safety Analysis"
                                  >
                                    {isSpeaking ? (
                                      <div className="flex items-center gap-0.5 px-0.5">
                                        <span className="audio-bar" />
                                        <span className="audio-bar" />
                                        <span className="audio-bar" />
                                        <span className="audio-bar" />
                                      </div>
                                    ) : (
                                      <Volume2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{route.explanation}</p>
                              </div>
                            )}
                            <div className="text-left">
                              <span className="font-bold text-slate-400">Alerts: </span>
                              <span>{route.risk_factors.join(', ')}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    <button
                      onClick={handleStartJourney}
                      className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <Navigation className="w-4 h-4" /> Start Live Navigation
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>


            </>
          )}

          {/* Chatbot View */}
          {!isJourneyActive && !isSosActive && activeTab === 'advisor' && (
            <div className="flex flex-col flex-grow min-h-0 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-850 overflow-hidden">
              {/* Messages Area */}
              <div className="flex-grow p-4 overflow-y-auto space-y-3 flex flex-col max-h-[300px] md:max-h-[350px]">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col max-w-[85%] ${
                      msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    <div
                      className={`px-3 py-2 rounded-2xl text-[11px] leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-violet-600 text-white rounded-tr-none shadow-md shadow-violet-500/10'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-tl-none shadow-sm'
                      }`}
                      style={{ whiteSpace: 'pre-line' }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isBotTyping && (
                  <div className="self-start bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-2xl rounded-tl-none text-[11px] text-slate-400 italic">
                    AI Advisor is thinking...
                  </div>
                )}
              </div>
              
              {/* Chat Input form */}
              <form onSubmit={handleSendChatMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-850 flex gap-2 shrink-0 mt-auto">
                <input
                  type="text"
                  className="flex-grow bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-violet-500"
                  placeholder="Ask advisor (e.g. nearest police, SOS info)..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="p-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* Active Journeys */}
          {isJourneyActive && !isSosActive && (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl text-left space-y-1.5">
                <span className="text-xs font-bold text-violet-500 dark:text-violet-400 block">Commuting Telemetry: Active</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Real-time coordinate tracking is active. Current location saved in the database.
                </p>
              </div>

              {/* Progress bar */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-850 text-left space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Duration</span>
                  <span className="text-slate-850 dark:text-slate-100">{elapsedTime}s elapsed</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5">
                  <div 
                    className="bg-violet-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(currentStepIndex / (selectedRoute.coordinates.length - 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleEndJourney(true)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10"
                >
                  <CheckCircle className="w-4 h-4" /> Arrived Safely (Complete)
                </button>
                <button
                  onClick={handleSimulateDeviation}
                  className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-4 h-4 animate-bounce" /> Simulate Route Deviation
                </button>
                <button
                  onClick={() => handleEndJourney(false)}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 border border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400 font-semibold rounded-xl text-xs"
                >
                  Cancel Commute
                </button>
              </div>
            </div>
          )}

          {/* Active SOS Panel */}
          {isSosActive && (
            <div className="space-y-4 pt-2 text-center">
              <div className="inline-flex p-3.5 rounded-full bg-rose-500/10 border border-rose-500/35 text-rose-500 animate-pulse">
                <ShieldAlert className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-lg font-black text-rose-500 uppercase tracking-wider">SOS Alarm Triggered</h3>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-3.5 rounded-xl text-left font-mono text-[9px] text-slate-500 dark:text-slate-400 h-40 overflow-y-auto space-y-1">
                {sosLogs.map((log, idx) => (
                  <p key={idx}>{log}</p>
                ))}
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-xl space-y-3 text-left">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Enter PIN to cancel alarm (1234)</span>
                <div className="flex gap-2">
                  <input
                    type="password"
                    maxLength="4"
                    className="flex-grow bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-2 py-2 text-center text-lg font-bold tracking-widest text-slate-800 dark:text-slate-100 focus:outline-none"
                    placeholder="••••"
                    value={sosCancelPin}
                    onChange={(e) => setSosCancelPin(e.target.value)}
                  />
                  <button
                    onClick={handleDeactivateSos}
                    className="px-4 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-200 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-200"
                  >
                    Deactivate
                  </button>
                </div>
                {sosError && <p className="text-[10px] text-rose-500 font-bold">{sosError}</p>}
              </div>
            </div>
          )}
        </div>

        {/* SOS Emergency footer triggers */}
        {!isSosActive && (
          <div className="mt-auto p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col gap-4 shrink-0">
                        {/* Voice microphone widget */}
            <div className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl shadow-sm">
              <div className="flex justify-between items-center">
                <div className="text-left">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-violet-500" />
                    Voice Emergency Support
                  </span>
                  <span className="text-[9px] text-slate-400 block">Triggers SOS on keyword "HELP"</span>
                </div>
                <button
                  type="button"
                  onClick={toggleVoiceListening}
                  className={`p-2 rounded-lg border transition-all ${
                    isListening
                      ? 'bg-rose-500/20 border-rose-500 text-rose-500'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-400 hover:border-slate-350'
                  }`}
                >
                  {isListening ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
                </button>
              </div>

              {isListening && (
                <div className="text-[9px] text-violet-500 bg-violet-500/5 px-2 py-1 rounded border border-violet-500/10 italic text-left">
                  {transcript || 'Listening for "help", "sos", "emergency"...'}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setTranscript('help');
                  triggerSosEmergency();
                }}
                className="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
              >
                Simulate Say "HELP" (Voice SOS Test)
              </button>
            </div>
            <button
              onClick={triggerSosEmergency}
              className="w-full py-4 bg-rose-600 hover:bg-rose-550 text-white rounded-2xl font-black text-sm tracking-wider uppercase flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-rose-600/20 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] sos-button-pulse"
            >
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              <span>SOS EMERGENCY ALERT</span>
            </button>
          </div>
        )}
      </div>

      {/* Map view section */}
      <div className="flex-grow md:flex-1 h-[55vh] md:h-full relative z-0 min-h-[400px] md:min-h-0">
        
        {/* Float Map Layer Controls */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1.5 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl text-left min-w-[130px]">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <Layers className="w-3 h-3" />
            <span>Map Layers</span>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer py-1">
            <input type="checkbox" checked={showPolice} onChange={(e) => setShowPolice(e.target.checked)} className="accent-violet-500 rounded cursor-pointer" />
            <span>Police booths</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer py-1">
            <input type="checkbox" checked={showHospitals} onChange={(e) => setShowHospitals(e.target.checked)} className="accent-violet-500 rounded cursor-pointer" />
            <span>Hospitals</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer py-1">
            <input type="checkbox" checked={showReports} onChange={(e) => setShowReports(e.target.checked)} className="accent-violet-500 rounded cursor-pointer" />
            <span>Safety Alerts</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer py-1">
            <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} className="accent-violet-500 rounded cursor-pointer" />
            <span>Safety zones</span>
          </label>
        </div>

        {/* Drop Pin Reporter Banner */}
        {isDropPinMode && (
          <div className="absolute top-4 left-4 z-[1000] bg-amber-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl border border-amber-400 shadow-2xl flex items-center gap-2 animate-bounce">
            <MapPin className="w-4.5 h-4.5 animate-pulse" />
            <span className="text-[11px]">Click anywhere on the map to drop a safety incident report pin</span>
          </div>
        )}

        <MapContainer center={[28.6304, 77.2177]} zoom={14} className="w-full h-full" zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapRecenter coords={userCoords} />

          {/* User Location Pulse */}
          <Marker position={userCoords} icon={userLocationIcon}>
            <Popup>
              <div className="font-sans text-xs">
                <p className="font-bold text-slate-950">Your Location</p>
                <p className="text-slate-500 mt-0.5">{userCoords[0].toFixed(5)}, {userCoords[1].toFixed(5)}</p>
              </div>
            </Popup>
          </Marker>

          {/* Render Route Alternative Polylines */}
          {showRoutes && routes.map(route => (
            <Polyline
              key={route.id}
              positions={route.coordinates}
              color={selectedRoute?.id === route.id ? '#8b5cf6' : '#ec4899'}
              weight={selectedRoute?.id === route.id ? 7 : 4}
              opacity={selectedRoute?.id === route.id ? 0.95 : 0.4}
              eventHandlers={{
                click: () => setSelectedRoute(route)
              }}
            />
          ))}

          {/* Police stations */}
          {showPolice && policeStations.map(station => (
            <Marker key={station.id || station._id} position={[station.lat, station.lng]} icon={policeIcon}>
              <Popup>
                <div className="font-sans text-xs p-1">
                  <p className="font-bold text-slate-900">{station.name}</p>
                  <p className="text-slate-500 mt-1">Status: <span className="font-semibold text-emerald-600">Active</span></p>
                  <p className="text-slate-600">Tel: {station.phone}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Hospitals */}
          {showHospitals && hospitals.map(hosp => (
            <Marker key={hosp.id || hosp._id} position={[hosp.lat, hosp.lng]} icon={hospitalIcon}>
              <Popup>
                <div className="font-sans text-xs p-1">
                  <p className="font-bold text-slate-900">{hosp.name}</p>
                  <p className="text-slate-600 mt-1">Tel: {hosp.phone}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Safety incident reports */}
          {showReports && reports.map(rep => (
            <Marker key={rep.id || rep._id} position={[rep.lat, rep.lng]} icon={reportIcon}>
              <Popup>
                <div className="font-sans text-xs p-1 max-w-[200px]">
                  <p className="font-bold text-rose-650 text-[9px] uppercase tracking-wide">{rep.severity} Severity</p>
                  <p className="font-bold text-slate-950 mt-0.5">{rep.category}</p>
                  <p className="text-slate-700 mt-1">{rep.description}</p>
                  <p className="text-[9px] text-slate-400 mt-1">Reported by {rep.reportedBy}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {tempPinCoords && (
            <Marker position={tempPinCoords} icon={tempPinIcon} />
          )}

          {/* Heatmaps */}
          {showHeatmap && reports.map(rep => (
            <Circle
              key={`heat-${rep._id || rep.id}`}
              center={[rep.lat, rep.lng]}
              radius={250}
              pathOptions={{
                color: rep.severity === 'High' ? '#ef4444' : '#f59e0b',
                fillColor: rep.severity === 'High' ? '#ef4444' : '#f59e0b',
                fillOpacity: 0.12,
                stroke: false
              }}
            />
          ))}

          <MapEvents />
        </MapContainer>

        {/* Route Deviation Prompt */}
        <AnimatePresence>
          {showDeviationWarning && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-6"
            >
              <div className="bg-white dark:bg-slate-900 border-2 border-amber-500 p-8 rounded-[32px] max-w-sm w-full text-center space-y-6 shadow-2xl">
                <div className="inline-flex p-3 rounded-full bg-amber-500/10 border-2 border-amber-500 text-amber-500 animate-pulse">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-black text-amber-600 dark:text-amber-500 uppercase">Route Deviation Detected</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-350">
                    You have strayed from the safe recommended path. Escalating to SOS alarms in:
                  </p>
                </div>
                <div className="text-4xl font-black text-slate-850 dark:text-white py-1">{deviationCountdown}s</div>
                <div className="flex gap-3">
                  <button onClick={handleConfirmSafety} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs">
                    I am Safe
                  </button>
                  <button onClick={triggerSosEmergency} className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs">
                    Trigger SOS
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Float report pin action */}
        {!isJourneyActive && !isSosActive && (
          <button 
            type="button"
            onClick={() => {
              setIsDropPinMode(!isDropPinMode);
              setTempPinCoords(null);
              setShowReportForm(false);
            }}
            className={`absolute bottom-6 right-6 z-[1000] p-4.5 rounded-full shadow-2xl hover:scale-105 transition-all flex items-center gap-2 border ${
              isDropPinMode 
                ? 'bg-amber-500 text-slate-950 border-amber-400' 
                : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white border-slate-200 dark:border-slate-800 hover:border-slate-350'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span className="text-xs font-bold">{isDropPinMode ? 'Tap Map to Pin' : 'Report Unsafe Spot'}</span>
          </button>
        )}

        {/* Report form widget overlay */}
        <AnimatePresence>
          {showReportForm && tempPinCoords && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="absolute bottom-24 right-6 z-[1000] w-[340px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 text-left"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Report Unsafe Spot</span>
                <button 
                  onClick={() => { setShowReportForm(false); setTempPinCoords(null); }}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleReportFormSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Category</label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                    value={reportForm.category}
                    onChange={(e) => setReportForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="Poor Lighting">Poor Lighting</option>
                    <option value="Isolated Area">Isolated Area</option>
                    <option value="Harassment Spot">Harassment Spot</option>
                    <option value="Suspicious Activity">Suspicious Activity</option>
                    <option value="Road Construction/Obstacle">Road Obstruction</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Severity</label>
                  <div className="flex gap-2">
                    {['Low', 'Medium', 'High'].map(sev => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setReportForm(prev => ({ ...prev, severity: sev }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          reportForm.severity === sev
                            ? 'bg-rose-500/10 border-rose-500 text-rose-550 dark:text-rose-400'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-400 hover:border-slate-350'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase block">Description Details</label>
                  <textarea
                    required
                    rows="3.5"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none placeholder-slate-400"
                    placeholder="Describe lighting issues, low foot traffic, suspicious individuals..."
                    value={reportForm.description}
                    onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold rounded-xl shadow-md">
                  Submit Report
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
