import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Menu, X, Sun, Moon, LogOut, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('safeher_theme') || 'dark');
  const location = useLocation();
  const navigate = useNavigate();

  // Listen for login/logout changes and theme sync
  useEffect(() => {
    // 1. Sync User Auth
    const checkUserAuth = () => {
      const storedUser = localStorage.getItem('safeher_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    };

    checkUserAuth();

    // Listen to local storage changes to sync user across tabs/sessions
    window.addEventListener('storage', checkUserAuth);

    // 2. Sync Theme Styling
    const element = document.documentElement;
    if (theme === 'dark') {
      element.classList.add('dark');
    } else {
      element.classList.remove('dark');
    }
    localStorage.setItem('safeher_theme', theme);

    return () => {
      window.removeEventListener('storage', checkUserAuth);
    };
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = () => {
    localStorage.removeItem('safeher_token');
    localStorage.removeItem('safeher_user');
    setUser(null);
    navigate('/');
  };

  const navLinks = [
    { name: 'Home', path: '/welcome' },
    ...(user ? [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'History', path: '/history' }
    ] : []),
  ];

  return (
    <nav className="fixed w-full z-[5000] top-0 start-0 border-b border-slate-100 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2.5 transition-transform hover:scale-[1.02] duration-300">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-violet-500/15 border border-violet-500/20 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
              <img src="/logo.png" alt="SafeHer Logo" className="w-full h-full object-cover transform scale-110" />
            </div>
            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 tracking-tight">
              SafeHer AI
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-xs font-bold uppercase tracking-wider transition-colors hover:text-violet-600 dark:hover:text-violet-400 ${
                  location.pathname === link.path
                    ? 'text-violet-600 dark:text-violet-400'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {link.name}
              </Link>
            ))}

            {/* Light/Dark Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors text-slate-500 dark:text-slate-400"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {/* Authentication Buttons */}
            {user ? (
              <div className="flex items-center gap-4 pl-4 border-l border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div className="w-6.5 h-6.5 bg-violet-600/10 border border-violet-500/25 rounded-full flex items-center justify-center text-violet-500 font-bold uppercase">
                    {user.username.slice(0, 1)}
                  </div>
                  <span>Hi, {user.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-rose-500/10 hover:border-rose-500/25 text-slate-500 hover:text-rose-500 transition-all"
                  title="Logout"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full shadow-lg shadow-violet-500/25 hover:shadow-violet-500/35 hover:-translate-y-0.5 transition-all duration-300"
              >
                Access Platform
              </Link>
            )}
          </div>

          {/* Mobile Menu Actions */}
          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-850 text-slate-500 dark:text-slate-400"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-600 dark:text-slate-300 hover:text-violet-600 focus:outline-none p-1.5"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800"
          >
            <div className="px-4 pt-2 pb-6 space-y-1.5 sm:px-3 text-left">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-violet-600 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                >
                  {link.name}
                </Link>
              ))}
              {user ? (
                <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="px-3 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                    <User className="w-4 h-4 text-violet-500" />
                    <span>Hi, {user.username}</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-center px-4 py-2.5 bg-rose-500/10 text-rose-500 border border-rose-500/25 rounded-xl text-xs font-bold"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center px-5 py-3 text-sm font-bold uppercase tracking-wider text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl shadow-md"
                  >
                    Access Platform
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
