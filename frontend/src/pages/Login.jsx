import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, User, Phone, ArrowRight, AlertCircle } from 'lucide-react';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    usernameOrEmail: '',
    password: '',
    emergencyContacts: [
      { name: 'Mother', phone: '' },
      { name: 'Sister/Friend', phone: '' }
    ]
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContactChange = (index, field, value) => {
    const updatedContacts = [...formData.emergencyContacts];
    updatedContacts[index][field] = value;
    setFormData(prev => ({ ...prev, emergencyContacts: updatedContacts }));
  };

  const handleToggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setFormData({
      username: '',
      email: '',
      usernameOrEmail: '',
      password: '',
      emergencyContacts: [
        { name: 'Mother', phone: '' },
        { name: 'Sister/Friend', phone: '' }
      ]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isRegister 
      ? `${API_URL}/api/auth/register` 
      : `${API_URL}/api/auth/login`;

    const payload = isRegister 
      ? {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          emergencyContacts: formData.emergencyContacts.filter(c => c.name && c.phone)
        }
      : {
          usernameOrEmail: formData.usernameOrEmail,
          password: formData.password
        };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Save token and user details to localStorage
      localStorage.setItem('safeher_token', data.token);
      localStorage.setItem('safeher_user', JSON.stringify(data.user));

      // Trigger standard local storage change event to notify navbar
      window.dispatchEvent(new Event('storage'));

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Graphic Wallpaper with Low Opacity */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.06]">
        <img 
          src="/login_bg.png" 
          alt="Safety Background Wallpaper" 
          className="w-full h-full object-cover filter grayscale scale-105" 
        />
      </div>

      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-violet-600/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-fuchsia-600/10 rounded-full filter blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-slate-900/40 border border-slate-800 p-8 rounded-[32px] backdrop-blur-md shadow-2xl relative"
      >
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {isRegister ? 'Join SafeHer Community' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-slate-400">
            {isRegister ? 'Create an account to track commutes & alert contacts' : 'Navigate confidently with AI-backed safety systems'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-xs text-rose-400 font-medium leading-relaxed">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister ? (
            <>
              {/* Username */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="text"
                    name="username"
                    required
                    placeholder="Enter your username"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                    value={formData.username}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="Enter your email"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Login field (Username or Email) */
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Username or Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="text"
                  name="usernameOrEmail"
                  required
                  placeholder="Enter your username or email"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                  value={formData.usernameOrEmail}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
              <input
                type="password"
                name="password"
                required
                placeholder="Enter password"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
                value={formData.password}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Emergency Contacts (Only for Sign Up) */}
          {isRegister && (
            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Emergency Contacts</label>
              {formData.emergencyContacts.map((contact, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder={`Contact ${idx + 1} Name`}
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-violet-500"
                    value={contact.name}
                    onChange={(e) => handleContactChange(idx, 'name', e.target.value)}
                  />
                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-violet-500"
                    value={contact.phone}
                    onChange={(e) => handleContactChange(idx, 'phone', e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-2xl shadow-xl shadow-violet-500/25 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{isRegister ? 'Create Account' : 'Secure Login'}</span>
                <ArrowRight className="w-4.5 h-4.5" />
              </>
            )}
          </button>
        </form>
        <div className="mt-6 text-center">
          <button
            onClick={handleToggleMode}
            className="text-xs text-violet-400 hover:text-violet-300 hover:underline font-semibold"
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </div>      </motion.div>
    </div>
  );
}
