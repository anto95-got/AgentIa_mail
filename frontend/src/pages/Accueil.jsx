import { useState } from 'react'
import { getUnreadMails } from '../api'

export default function Accueil() {
  const [mails, setMails] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [hasSearched, setHasSearched] = useState(false)

  const openModal = () => setShowModal(true)
  const closeModal = () => {
    setShowModal(false)
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const data = await getUnreadMails({
        email: formData.email,
        password: formData.password,
        host: 'imap.gmail.com',
      })
      setMails(data)
      setHasSearched(true)
      closeModal()
    } catch (err) {
      setError(err.message)
      setMails([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <main className="accueil">
      <div className="accueil-content">
        <div className="hero-section">
          <h1 className="accueil-title">Vos e-mails non lus</h1>
          <p className="accueil-subtitle">
            Cliquez pour vous connecter et récupérer vos derniers messages
          </p>

          <button
            className="fetch-button"
            onClick={openModal}
            disabled={loading}
          >
            <span className="fetch-button-icon">📬</span>
            Récupérer les mails non lus
          </button>
        </div>

        {(mails.length > 0 || hasSearched) && (
          <div className="mails-section">
            <h2 className="mails-list-title">
              {mails.length > 0
                ? `${mails.length} mail${mails.length > 1 ? 's' : ''} trouvé${mails.length > 1 ? 's' : ''}`
                : 'Aucun mail non lu'}
            </h2>
            {mails.length > 0 ? (
            <div className="mails-table-wrapper">
              <table className="mails-table">
                <thead>
                  <tr>
                    <th>Expéditeur</th>
                    <th>Sujet</th>
                    <th>Date</th>
                    <th>Aperçu</th>
                  </tr>
                </thead>
                <tbody>
                  {mails.map((mail) => (
                    <tr key={mail.id || mail.subject}>
                      <td className="mail-sender">{mail.sender || mail.from}</td>
                      <td className="mail-subject">{mail.subject || 'Sans objet'}</td>
                      <td className="mail-date">
                        {formatDate(mail.date_received || mail.date)}
                      </td>
                      <td className="mail-body">
                        {(mail.body || mail.snippet || '').slice(0, 80)}
                        {(mail.body || mail.snippet || '').length > 80 ? '…' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            ) : (
              <p className="mails-empty">Aucun message non lu dans votre boîte mail.</p>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label="Fermer">
              ×
            </button>
            <h2 className="modal-title">Connexion IMAP</h2>
            <p className="modal-subtitle">
              Entrez vos identifiants pour récupérer vos mails non lus
            </p>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="votre@email.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Mot de passe d&apos;application</label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••••••••••"
                  required
                  autoComplete="current-password"
                />
                <small className="form-hint">
                  Pour Gmail : utilisez un mot de passe d&apos;application (Google Compte → Sécurité)
                </small>
              </div>
              {error && (
                <div className="modal-error">{error}</div>
              )}
              <button type="submit" className="modal-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="fetch-button-spinner" />
                    Connexion...
                  </>
                ) : (
                  'Se connecter et récupérer les mails'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
