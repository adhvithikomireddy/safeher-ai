// API Configuration for SafeHer application
// During development, default to localhost:3001. In production, respect the environment variable
// or fallback to the current origin (relative paths) for Nginx reverse proxy setups.
export const API_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
);
