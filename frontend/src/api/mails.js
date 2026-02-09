import { getApiUrl } from './config.js';

/**
 * Récupère les mails non lus depuis le backend Django (emails/scan/)
 * @param {Object} credentials - { email, password, host? }
 * @returns {Promise<Array>} Liste des mails
 */
export async function getUnreadMails(credentials = {}) {
  const url = getApiUrl('/emails/scan/');
  const body = credentials.email && credentials.password
    ? JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        host: credentials.host || 'imap.gmail.com',
      })
    : undefined;

  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    ...(body && { body }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const message = errData.error || `Erreur ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.mails ?? data.results ?? [];
}
