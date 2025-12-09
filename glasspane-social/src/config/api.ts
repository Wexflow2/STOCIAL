// API Configuration - centralizado para fácil cambio de entorno

const getApiUrl = () => {
  // En producción usar variable de entorno, en desarrollo localhost
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Fallback para desarrollo
  return 'https://stocial.eliverdiaz72.workers.dev';
};

export const API_BASE_URL = getApiUrl();
export const API_ENDPOINTS = {
  base: API_BASE_URL,
  api: `${API_BASE_URL}/api`,
};

// Para usar en tu código:
// import { API_BASE_URL } from '@/config/api';
// const response = await fetch(`${API_BASE_URL}/api/posts`);
