import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, MapPin, BellRing, Users, ArrowRight, Sun, Moon, AlertTriangle, Eye, ShieldCheck, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Landing() {
  // AI Sandbox State
  const [sandboxTime, setSandboxTime] = useState(21); // 9 PM
  const [sandboxLighting, setSandboxLighting] = useState(30); // Poorly lit
  const [sandboxReports, setSandboxReports] = useState(2);
  const [sandboxPoliceDist, setSandboxPoliceDist] = useState(1800); // 1.8km
  const [sandboxAreaRisk, setSandboxAreaRisk] = useState(4); // High risk area

  // Dynamic calculation for sandbox safety score
  const calculateSandboxScore = () => {
    const base = 85.0;
    const isNight = sandboxTime >= 19 || sandboxTime <= 5;
    const nightPenalty = isNight ? -20.0 * (1 - sandboxLighting / 100) : 0;
    const lightingEffect = 15.0 * (sandboxLighting / 100) - 15.0;
    const reportsPenalty = -7.0 * sandboxReports;
    const policePenalty = -12.0 * Math.min(sandboxPoliceDist / 2000, 1.5);
    const areaPenalty = -10.0 * (sandboxAreaRisk - 1);
    
    const score = base + nightPenalty + lightingEffect + reportsPenalty + policePenalty + areaPenalty;
    return Math.max(5, Math.min(98, Math.round(score)));
  };

  const sandboxScore = calculateSandboxScore();

  const getScoreColorClass = (score) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 50) return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
  };

  const getScoreBgClass = (score) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const features = [
    {
      icon: <MapPin className="h-6 w-6 text-violet-500" />,
      title: 'AI-Based Safe Routes',
      description: 'Go beyond the fastest path. SafeHer calculates routes based on street lighting, crowd activity, police coverage, and community reports.'
    },
    {
      icon: <BellRing className="h-6 w-6 text-fuchsia-500" />,
      title: 'Instant SOS Emergency Hub',
      description: 'One-tap SOS triggers continuous live location sharing with trusted contacts, records audio logs, and alerts nearby community members.'
    },
    {
      icon: <Shield className="h-6 w-6 text-indigo-500" />,
      title: 'Journey Deviation Alerts',
      description: 'If you stray from the recommended safe route, our AI immediately detects the deviation and checks on you via interactive prompts.'
    },
    {
      icon: <Users className="h-6 w-6 text-pink-500" />,
      title: 'Community Safety Intel',
      description: 'Report issues like poorly lit roads, isolated spots, or harassment incidents in real-time to update the routing algorithm for everyone.'
    }
  ];

  const stats = [
    { value: '87%', label: 'Of women feel anxious during night commutes' },
    { value: '3x', label: 'More likely to avoid travel than men' },
    { value: '94%', label: 'Believe street lighting is key to urban safety' }
  ];

  return (
    <div className="pt-16 min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden selection:bg-violet-500 selection:text-white">
      {/* Decorative Glowing Orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-violet-600/20 rounded-full filter blur-3xl opacity-60 animate-pulse pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-fuchsia-600/15 rounded-full filter blur-3xl opacity-60 pointer-events-none" />

      {/* Hero Section */}
      <div className="relative pt-20 pb-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Hero Text */}
            <div className="lg:col-span-7 space-y-8 text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                <span className="inline-flex items-center gap-1.5 py-1 px-3.5 rounded-full bg-violet-900/40 border border-violet-500/30 text-violet-300 text-xs font-semibold uppercase tracking-wider">
                  <Shield className="w-3.5 h-3.5 animate-pulse text-violet-400" />
                  India 2026 Smart Mobility Initiative
                </span>
                
                <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
                  Making Urban Commuting <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400">
                    Safe, Inclusive, & Free of Fear
                  </span>
                </h1>
                
                <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
                  Existing navigation apps only focus on the shortest routes. SafeHer AI prioritizes your safety by analyzing lighting conditions, area risk factors, nearby emergency services, and live community intelligence.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4 pt-4"
              >
                <Link
                  to="/dashboard"
                  className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group text-base"
                >
                  Start Safe Commute
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                </Link>
                <a
                  href="#sandbox"
                  className="px-8 py-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold rounded-2xl transition-all duration-300 text-center flex items-center justify-center"
                >
                  Explore AI Sandbox
                </a>
              </motion.div>

              {/* Quick stats grid */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-900"
              >
                {stats.map((stat, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-2xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">{stat.value}</p>
                    <p className="text-xs text-slate-500 leading-tight">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right Hero mockup card & Illustration */}
            <div className="lg:col-span-5 relative flex flex-col items-center justify-center gap-6">
              {/* Premium Hero Illustration */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="relative w-full max-w-[380px] rounded-[32px] overflow-hidden border border-slate-800 shadow-2xl shadow-fuchsia-500/5 aspect-[4/3] group"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent z-10" />
                <img 
                  src="/hero.png" 
                  alt="SafeHer Safety Illustration" 
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute bottom-4 left-4 z-20 space-y-1 text-left">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-fuchsia-400 bg-fuchsia-950/80 px-2.5 py-0.5 rounded-full border border-fuchsia-500/20">Empowering Commutes</span>
                  <h4 className="text-sm font-extrabold text-white">Confidence in every step</h4>
                </div>
              </motion.div>

              {/* Visual mockup of the screen */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative w-full max-w-[380px] rounded-[40px] p-4 bg-slate-900 border-4 border-slate-800 shadow-2xl shadow-violet-500/10 overflow-hidden"
              >
                <div className="rounded-[28px] overflow-hidden bg-slate-950 p-4 border border-slate-800/80 space-y-4">
                  {/* Mock map header */}
                  <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-xs font-semibold text-slate-300">Live Journey Tracking</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/20">Route A: 92% Safe</span>
                  </div>

                  {/* Mock Route Map Graphic */}
                  <div className="relative h-44 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center">
                    {/* SVG map lines */}
                    <svg className="absolute inset-0 w-full h-full p-2" viewBox="0 0 100 100">
                      <path d="M10,80 Q40,30 90,20" fill="none" stroke="#6b7280" strokeWidth="3" strokeDasharray="3" />
                      <path d="M10,80 Q50,70 90,20" fill="none" stroke="#8b5cf6" strokeWidth="6" strokeLinecap="round" />
                      {/* Dots */}
                      <circle cx="10" cy="80" r="4" fill="#3b82f6" />
                      <circle cx="50" cy="53" r="5" fill="#a78bfa" className="animate-pulse" />
                      <circle cx="90" cy="20" r="4" fill="#ec4899" />
                    </svg>
                    <div className="absolute bottom-2 left-2 bg-slate-950/90 px-2 py-1 rounded-lg border border-slate-800 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-400">On Safe Path</span>
                    </div>
                  </div>

                  {/* Info widgets */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs bg-slate-900/30 p-2.5 rounded-xl border border-slate-900">
                      <span className="text-slate-400">Time to Destination</span>
                      <span className="font-bold text-white">14 mins remaining</span>
                    </div>
                    <div className="flex justify-between items-center bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span className="text-xs font-bold text-rose-400">Poorly Lit Stretch Ahead</span>
                      </div>
                      <span className="text-[10px] text-rose-300 underline cursor-pointer">View bypass</span>
                    </div>
                  </div>

                  {/* Pulsing SOS Button mockup */}
                  <div className="w-full py-4 bg-red-600 hover:bg-red-500 text-center text-white font-black rounded-2xl tracking-widest text-xs uppercase shadow-lg shadow-red-500/20 border border-red-500/30">
                    SOS Emergency active
                  </div>
                </div>
              </motion.div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-24 border-y border-slate-900 bg-slate-900/20 relative z-10" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold">Preventing Risks Before They Occur</h2>
            <p className="text-slate-400">SafeHer AI acts proactively to secure your travels with intelligent algorithms and immediate response tools.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl hover:border-violet-500/30 hover:bg-slate-900/60 hover:-translate-y-1.5 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-slate-800">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Sandbox Interactive Section */}
      <div className="py-24 relative z-10 scroll-mt-16" id="sandbox">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Sandbox Text */}
            <div className="lg:col-span-5 space-y-6 text-left">
              <span className="px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 text-xs font-bold uppercase tracking-wider">
                AI Engine Simulator
              </span>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight">
                How does AI calculate <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Safety Scores?</span>
              </h2>
              <p className="text-slate-400 leading-relaxed">
                The SafeHer AI scoring engine processes six core parameters in real-time. Use the simulator panel to adjust environmental variables and see how the predicted Safety Score reacts instantly.
              </p>
              
              <div className="space-y-4 pt-2">
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-violet-900/50 flex items-center justify-center border border-violet-500/30 text-xs text-violet-300 font-bold shrink-0 mt-0.5">1</div>
                  <p className="text-sm text-slate-400"><strong className="text-white">Time Factor:</strong> The risk model doubles weight penalties during night hours (7 PM to 6 AM).</p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-violet-900/50 flex items-center justify-center border border-violet-500/30 text-xs text-violet-300 font-bold shrink-0 mt-0.5">2</div>
                  <p className="text-sm text-slate-400"><strong className="text-white">Illumination:</strong> Well-lit streets reduce night penalties by up to 90%.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-violet-900/50 flex items-center justify-center border border-violet-500/30 text-xs text-violet-300 font-bold shrink-0 mt-0.5">3</div>
                  <p className="text-sm text-slate-400"><strong className="text-white">Proximity to Help:</strong> Safe routes prioritize pathways with police checkposts within 800m.</p>
                </div>
              </div>
            </div>

            {/* Right Interactive Simulator Panel */}
            <div className="lg:col-span-7 bg-slate-900/50 border border-slate-800 p-8 sm:p-10 rounded-[32px] shadow-2xl relative">
              <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 w-20 h-20 bg-violet-500/10 rounded-full filter blur-xl pointer-events-none" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Input Controls */}
                <div className="space-y-5">
                  {/* Time of Day */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Time of Day</span>
                      <span className="text-violet-300 flex items-center gap-1">
                        {sandboxTime >= 19 || sandboxTime <= 5 ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                        {sandboxTime === 0 ? '12:00 AM' : sandboxTime === 12 ? '12:00 PM' : sandboxTime > 12 ? `${sandboxTime-12}:00 PM` : `${sandboxTime}:00 AM`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="23"
                      value={sandboxTime}
                      onChange={(e) => setSandboxTime(parseInt(e.target.value))}
                      className="w-full accent-violet-500 bg-slate-850 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Street Lighting Level */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Street Lighting Level</span>
                      <span className="text-violet-300">{sandboxLighting}% ({sandboxLighting >= 70 ? 'Excellent' : sandboxLighting >= 40 ? 'Moderate' : 'Poor'})</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={sandboxLighting}
                      onChange={(e) => setSandboxLighting(parseInt(e.target.value))}
                      className="w-full accent-violet-500 bg-slate-850 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Community Danger Reports */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Active Community Reports</span>
                      <span className="text-rose-400">{sandboxReports} Alerts</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="6"
                      value={sandboxReports}
                      onChange={(e) => setSandboxReports(parseInt(e.target.value))}
                      className="w-full accent-violet-500 bg-slate-850 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Distance to Police station */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Nearest Police Booth</span>
                      <span className="text-violet-300">{(sandboxPoliceDist / 1000).toFixed(1)} km</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="3500"
                      step="100"
                      value={sandboxPoliceDist}
                      onChange={(e) => setSandboxPoliceDist(parseInt(e.target.value))}
                      className="w-full accent-violet-500 bg-slate-850 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Area crime index level */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Neighborhood Risk Index</span>
                      <span className="text-rose-300">Level {sandboxAreaRisk}/5</span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSandboxAreaRisk(lvl)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                            sandboxAreaRisk === lvl
                              ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                              : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Score Output Gauge */}
                <div className="flex flex-col items-center justify-center p-6 bg-slate-950/60 rounded-3xl border border-slate-850/80 space-y-4">
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Safety Score Prediction</span>
                  
                  {/* Gauge Circle */}
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="80" cy="80" r="70" stroke="#1e293b" strokeWidth="10" fill="transparent" />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={440}
                        strokeDashoffset={440 - (440 * sandboxScore) / 100}
                        className={`transition-all duration-300 ${getScoreColorClass(sandboxScore).split(' ')[0]}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black text-white">{sandboxScore}%</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                        {sandboxScore >= 80 ? 'Highly Safe' : sandboxScore >= 50 ? 'Moderate' : 'Caution Required'}
                      </span>
                    </div>
                  </div>

                  {/* Micro alert message */}
                  <div className={`w-full p-2.5 rounded-xl border text-center text-xs font-semibold ${getScoreColorClass(sandboxScore)}`}>
                    {sandboxScore >= 80 
                      ? 'Route is highly lit with good emergency access.'
                      : sandboxScore >= 50
                      ? 'Requires alertness. Minor safety alerts reported.'
                      : 'Unsafe route. Avoid this area at this hour!'}
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* System Workflow section */}
      <div className="py-24 border-t border-slate-900 bg-slate-950 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <span className="text-xs font-bold text-violet-400 uppercase tracking-widest bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/10">App Lifecycle</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold">End-to-End Safety Workflow</h2>
            <p className="text-slate-400">From the moment you specify a destination to reaching your door, SafeHer monitors your journey.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4">
              <span className="text-4xl font-black text-slate-800">01</span>
              <h3 className="text-base font-bold text-white">Enter Destination</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Specify where you want to go. The system identifies all accessible routes.</p>
            </div>
            {/* Step 2 */}
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4">
              <span className="text-4xl font-black text-slate-800">02</span>
              <h3 className="text-base font-bold text-white">AI Evaluation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Our PyTorch & Scikit-Learn engines run predictive scoring based on live telemetry.</p>
            </div>
            {/* Step 3 */}
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4">
              <span className="text-4xl font-black text-slate-800">03</span>
              <h3 className="text-base font-bold text-white">Route Suggested</h3>
              <p className="text-xs text-slate-400 leading-relaxed">The system visually highlights and recommends the route with the highest safety rating.</p>
            </div>
            {/* Step 4 */}
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4">
              <span className="text-4xl font-black text-slate-800">04</span>
              <h3 className="text-base font-bold text-white">Journey Monitoring</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Real-time GPS tracking starts. Smart deviation triggers notify trusted contacts.</p>
            </div>
            {/* Step 5 */}
            <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4">
              <span className="text-4xl font-black text-slate-800">05</span>
              <h3 className="text-base font-bold text-white">SOS & Support</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Emergency response details, contact hotlines, and voice support are kept on instant standby.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-900 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-500" />
            <span className="text-sm font-bold text-white">SafeHer AI</span>
          </div>
          <p className="text-center sm:text-left">© 2026 SafeHer AI Initiative. Built for safe urban mobility. Empowering commutes with intelligence.</p>
          <div className="flex gap-1.5 items-center">
            <span>Made with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>for communities worldwide.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
