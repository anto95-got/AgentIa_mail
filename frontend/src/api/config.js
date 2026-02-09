/**
 * Configuration de l'API - Backend Django
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const getApiUrl = (path) => {
  const base = API_BASE_URL || '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};
