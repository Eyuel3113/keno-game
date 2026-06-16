// API Configuration
// Change this to your server's IP address or domain name for mobile access
// For local development on PC, use: http://localhost:5000
// For mobile access, use your PC's IP address, e.g.: http://192.168.1.100:5000
// For production, use your domain, e.g.: https://your-domain.com

export const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
