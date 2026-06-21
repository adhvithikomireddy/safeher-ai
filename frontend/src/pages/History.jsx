import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Calendar, Clock, Shield, AlertTriangle, CheckCircle, ChevronRight, 
  MapPin, ShieldAlert, Navigation, ArrowLeftRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';

// Custom Leaflet Icons styled with Tailwind CSS
const startIcon = L.divIcon({
  html: `<div class="bg-violet-600 border-2 border-white text-white rounded-full p-1.5 w-7 h-7 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
           <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
           </svg>
         </div>`,
  className: 'custom-div-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 28]
});

const endIcon = L.divIcon({
  html: `<div class="bg-fuchsia-600 border-2 border-white text-white rounded-full p-1.5 w-7 h-7 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
           <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
           </svg>
         </div>`,
  className: 'custom-div-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// Component to dynamically recenter map to path bounds
function MapBoundsRecenter({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    if (coordinates && coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [coordinates, map]);
  return null;
}

// Client-side AI safety analyzer for past commutes
function generateHistoryExplanation(score, source, destination) {
  const srcName = source.split(',')[0];
  const destName = destination.split(',')[0];
  
  if (score >= 85) {
    return `This route from ${srcName} to ${destName} has a stellar safety rating of ${score}%. It is characterized by highly active public avenues, optimal street lighting, and immediate proximity to emergency response stations, making it highly secure for walking.`;
  } else if (score >= 70) {
    return `This route from ${srcName} to ${destName} is moderately safe (${score}% score). It is generally well-lit and active, though certain connecting streets may have slightly reduced foot traffic or less illumination during late hours.`;
  } else if (score >= 50) {
    return `This route from ${srcName} to ${destName} has a moderate safety index of ${score}%. It contains stretches with moderate street lighting and slightly delayed police response times. Exercise caution when traveling this route late at night.`;
  } else {
    return `This route from ${srcName} to ${destName} is NOT recommended (${score}% score). It passes through historically isolated or poorly lit areas and contains multiple community safety warning alerts. We advise using alternative routes.`;
  }
}

export default function History() {
  const [commutes, setCommutes] = useState([]);
  const [selectedCommute, setSelectedCommute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('safeher_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchCommuteHistory(parsedUser.id);
    } else {
      fetchCommuteHistory();
    }
  }, []);

  const fetchCommuteHistory = async (userId = null) => {
    setIsLoading(true);
    try {
      const url = userId 
        ? `${API_URL}/api/commutes?userId=${userId}`
        : `${API_URL}/api/commutes`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCommutes(data);
        if (data.length > 0) {
          setSelectedCommute(data[0]);
        }
      }
    } catch (err) {
      console.warn("Could not fetch commutes history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" /> Completed
          </span>
        );
      case 'sos':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 animate-pulse">
            <ShieldAlert className="w-3 h-3" /> SOS Alarm
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> Cancelled
          </span>
        );
    }
  };

  const formatDuration = (sec) => {
    if (!sec) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="pt-16 h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-hidden">
      
      {/* Sidebar - Commute List */}
      <div className="w-full md:w-[420px] h-[45vh] md:h-full flex flex-col glass-sidebar z-10 shadow-2xl overflow-y-auto">
        <div className="p-5 flex-grow flex flex-col space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5.5 h-5.5 text-violet-500" />
              Commute History
            </h2>
            <span className="text-[10px] font-bold text-slate-400">
              {commutes.length} journeys logged
            </span>
          </div>

          {isLoading ? (
            <div className="flex-grow flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : commutes.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center py-12 px-6">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 mb-4">
                <Navigation className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No Journeys Recorded</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed">
                Your completed, cancelled, or SOS triggered journeys will appear here once you start navigating.
              </p>
              <Link
                to="/dashboard"
                className="mt-4 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="flex-grow space-y-3 overflow-y-auto pr-1">
              {commutes.map((comm) => (
                <div
                  key={comm._id || comm.id}
                  onClick={() => setSelectedCommute(comm)}
                  className={`p-3.5 rounded-2xl cursor-pointer border transition-all duration-300 transform hover:scale-[1.01] text-left relative overflow-hidden ${
                    selectedCommute?._id === comm._id || selectedCommute?.id === comm.id
                      ? 'border-violet-500 bg-violet-500/10 dark:bg-violet-500/20 shadow-lg shadow-violet-500/10 dark:shadow-violet-500/20 glow-border-active'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 max-w-[70%]">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                        <span className="truncate">{comm.sourceAddress.split(',')[0]}</span>
                      </p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-fuchsia-500 flex-shrink-0" />
                        <span className="truncate">{comm.destinationAddress.split(',')[0]}</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-xs font-black ${
                        comm.safetyScore >= 80 ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {comm.safetyScore}% Safe
                      </span>
                      {getStatusBadge(comm.status)}
                    </div>
                  </div>

                  <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(comm.startedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(comm.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {comm.elapsedTimeSec > 0 && (
                      <span>Time: {formatDuration(comm.elapsedTimeSec)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Details Card at Bottom of Sidebar if selected */}
          <AnimatePresence>
            {selectedCommute && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="mt-auto p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-850 rounded-2xl text-left space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Safety Explanation</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedCommute.safetyScore >= 80 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}>
                    {selectedCommute.safetyScore}% Safe Profile
                  </span>
                </div>
                
                <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed font-medium">
                  {generateHistoryExplanation(
                    selectedCommute.safetyScore,
                    selectedCommute.sourceAddress,
                    selectedCommute.destinationAddress
                  )}
                </p>

                <div className="grid grid-cols-2 gap-2.5 text-[10px] border-t border-slate-200/60 dark:border-slate-800/80 pt-3">
                  <div>
                    <span className="text-slate-400 block">Start Point:</span>
                    <strong className="text-slate-700 dark:text-slate-300 truncate block">
                      {selectedCommute.sourceAddress.split(',')[0]}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">End Point:</span>
                    <strong className="text-slate-700 dark:text-slate-300 truncate block">
                      {selectedCommute.destinationAddress.split(',')[0]}
                    </strong>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Map View */}
      <div className="flex-grow md:flex-1 h-[55vh] md:h-full relative z-0 min-h-[400px] md:min-h-0">
        <MapContainer center={[28.6304, 77.2177]} zoom={14} className="w-full h-full" zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {selectedCommute && selectedCommute.routeCoords && selectedCommute.routeCoords.length > 0 && (
            <>
              {/* Recenter Map to bounds */}
              <MapBoundsRecenter coordinates={selectedCommute.routeCoords} />

              {/* Start Location Pin */}
              <Marker position={selectedCommute.routeCoords[0]} icon={startIcon}>
                <Popup>
                  <div className="font-sans text-xs">
                    <p className="font-bold text-violet-600">Start Location</p>
                    <p className="text-slate-650 mt-0.5">{selectedCommute.sourceAddress}</p>
                  </div>
                </Popup>
              </Marker>

              {/* End Location Pin */}
              <Marker position={selectedCommute.routeCoords[selectedCommute.routeCoords.length - 1]} icon={endIcon}>
                <Popup>
                  <div className="font-sans text-xs">
                    <p className="font-bold text-fuchsia-600">Destination Location</p>
                    <p className="text-slate-650 mt-0.5">{selectedCommute.destinationAddress}</p>
                  </div>
                </Popup>
              </Marker>

              {/* Route Polyline */}
              <Polyline
                positions={selectedCommute.routeCoords}
                color={selectedCommute.safetyScore >= 80 ? '#10b981' : '#f43f5e'}
                weight={6}
                opacity={0.85}
              />
            </>
          )}
        </MapContainer>
      </div>

    </div>
  );
}
