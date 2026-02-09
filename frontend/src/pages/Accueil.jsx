import { useState } from 'react'
import { getUnreadMails } from '../api'

export default function Accueil() {
  const [mails, setMails] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchUnreadMails = async () => {
    setLoading(true)
    setError(null)
    setMails([])

    try {
      const data = await getUnreadMails()
      setMails(data)
    } catch (err) {
      setError(err.message)
      // Données de démonstration quand le backend n'est pas disponible
      setMails([
        {
          id: 1,
          subject: 'Exemple de mail non lu',
          from: 'contact@example.com',
          date: new Date().toLocaleDateString('fr-FR'),
          snippet: 'Contenu de démonstration...',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="accueil">
      <div className="accueil-content">
        <div className="hero-section">
          <h1 className="accueil-title">
            Vos e-mails non lus
          </h1>
          <p className="accueil-subtitle">
            Cliquez sur le bouton pour récupérer vos derniers messages
          </p>

          <button
            className="fetch-button"
            onClick={fetchUnreadMails}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="fetch-button-spinner" />
                Récupération...
              </>
            ) : (
              <>
                <span className="fetch-button-icon">📬</span>
                Récupérer les mails non lus
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="accueil-notice">
            <span className="notice-icon">ℹ</span>
            Le backend n'est pas encore connecté. Affichage des données de démonstration.
          </div>
        )}

        {mails.length > 0 && (
          <div className="mails-list">
            <h2 className="mails-list-title">
              {mails.length} mail{mails.length > 1 ? 's' : ''} trouvé{mails.length > 1 ? 's' : ''}
            </h2>
            <ul className="mails-items">
              {mails.map((mail) => (
                <li key={mail.id || mail.subject} className="mail-card">
                  <div className="mail-header">
                    <span className="mail-from">{mail.from || mail.sender}</span>
                    <span className="mail-date">{mail.date}</span>
                  </div>
                  <h3 className="mail-subject">{mail.subject || 'Sans objet'}</h3>
                  {mail.snippet && (
                    <p className="mail-snippet">{mail.snippet}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
