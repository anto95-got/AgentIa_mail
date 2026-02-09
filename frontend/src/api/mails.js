import { getApiUrl } from './config.js';

/**
 * Récupère les mails non lus depuis le backend Django
 * @returns {Promise<Array>} Liste des mails non lus
 */
export async function getUnreadMails() {
  const url = ('https://127.0.1:8000/'); // getApiUrl('emails/scan/');
  const response = await fetch(url+"emails/scan/", {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    
  });

  if (!response.ok) {
    throw new Error(`Erreur ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.mails ?? data.results ?? [];
}
