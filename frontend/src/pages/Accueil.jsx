import { useState, useEffect } from 'react'
import ChatAssistant from '../components/ChatAssistant'

export default function Accueil() {
  const [user, setUser] = useState(null)
  const [mails, setMails] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [deletingIds, setDeletingIds] = useState([])

  // Fermer le chat avec Escape
  useEffect(() => {
    if (!chatOpen) return
    const onEscape = (e) => { if (e.key === 'Escape') setChatOpen(false) }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [chatOpen])

  // 1. Vérification de la session au chargement
  useEffect(() => {
    fetch('http://localhost:8000/api/user/me/', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.is_logged_in) {
          setUser(data)
        }
      })
      .catch(err => console.error("Erreur de session:", err))
  }, [])

  const API_BASE = 'http://localhost:8000'

  // 2. Action : Scanner Gmail
  const handleScan = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/gmail/scan/`, { credentials: 'include' })
      if (!res.ok) throw new Error("Erreur serveur")
      const data = await res.json()
      setMails(data)
      setHasSearched(true)
    } catch (err) {
      console.error("Erreur scan:", err)
      alert("Impossible de récupérer les mails.")
    } finally {
      setLoading(false)
    }
  }

  // Supprimer un ou plusieurs mails (par ID) — les IDs Gmail sont des chaînes
  const handleDeleteMails = async (ids) => {
    const idList = Array.isArray(ids) ? ids.map(String) : [String(ids)]
    if (!idList.length) return
    setDeletingIds((prev) => [...prev, ...idList])
    try {
      const res = await fetch(`${API_BASE}/api/gmail/delete/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idList }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `Erreur ${res.status}`)
      }
      setMails((prev) => prev.filter((m) => !idList.includes(String(m.id))))
    } catch (err) {
      console.error("Erreur suppression:", err)
      alert(err.message || "Impossible de supprimer le(s) mail(s).")
    } finally {
      setDeletingIds((prev) => prev.filter((id) => !idList.includes(id)))
    }
  }

  const formatMailDate = (internalDate) => {
    if (!internalDate) return ''
    const d = new Date(Number(internalDate))
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return "À l'instant"
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  // 3. Action : Déconnexion
  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8000/api/auth/logout/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(document.cookie.includes('csrftoken') && { 'X-CSRFToken': document.cookie.split('csrftoken=')[1]?.split(';')[0]?.trim() || '' }),
        },
      })
    } finally {
      // Réafficher tout de suite l’écran "reconnecter"
      setUser(null)
      setMails([])
      setHasSearched(false)
      setChatOpen(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Chat IA : affiché uniquement si connecté */}
      {user && (
        <>
          <button
            type="button"
            className="chat-toggle"
            onClick={() => setChatOpen(true)}
            title="Ouvrir l’assistant IA"
            aria-label="Ouvrir le chat"
          >
            💬
          </button>
          {chatOpen && (
            <>
              <div
                className="chat-panel-overlay"
                onClick={() => setChatOpen(false)}
                role="button"
                tabIndex={0}
                aria-label="Fermer le chat"
                onKeyDown={(e) => e.key === 'Escape' && setChatOpen(false)}
              />
              <div className="chat-panel">
                <header className="chat-panel-header">
                  <h2 className="chat-panel-title">Assistant IA</h2>
                  <button
                    type="button"
                    className="chat-panel-close"
                    onClick={() => setChatOpen(false)}
                    aria-label="Fermer"
                  >
                    ×
                  </button>
                </header>
                <ChatAssistant onUnauthorized={() => setUser(null)} />
              </div>
            </>
          )}
        </>
      )}
      
      {/* HEADER SECTION */}
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#333' }}>
          {user ? `Bienvenue, ${user.full_name} 👋` : 'Agent IA Scanner'}
        </h1>
        <p style={{ color: '#666' }}>
          {user ? `Connecté avec ${user.email}` : 'Veuillez vous connecter pour analyser vos emails'}
        </p>

        <div style={{ marginTop: '20px' }}>
          {!user ? (
            <button 
              onClick={() => window.location.href='http://localhost:8000/api/auth/login/'}
              style={{ padding: '12px 24px', fontSize: '16px', backgroundColor: '#4285F4', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              Se connecter avec Google
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={handleScan} 
                disabled={loading}
                style={{ padding: '12px 24px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {loading ? 'Analyse en cours...' : '🤖 Lancer le Scanner IA'}
              </button>
              
              <button 
                onClick={handleLogout}
                style={{ padding: '12px 24px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MAILS SECTION */}
      {hasSearched && (
        <section className="mails-section">
          <h2 className="mails-list-title">
            {mails.length} dernier{mails.length > 1 ? 's' : ''} message{mails.length > 1 ? 's' : ''} trouvé{mails.length > 1 ? 's' : ''}
          </h2>
          {mails.length > 0 ? (
            <ul className="mails-items">
              {mails.map((m) => (
                <li key={m.id} className="mail-card">
                  <div className="mail-header">
                    <span className="mail-from">{m.sender}</span>
                    <span className="mail-date">{formatMailDate(m.date)}</span>
                    <button
                      type="button"
                      className="mail-delete-btn"
                      onClick={() => handleDeleteMails([m.id])}
                      disabled={deletingIds.includes(String(m.id))}
                      title="Supprimer ce mail"
                      aria-label="Supprimer"
                    >
                      {deletingIds.includes(String(m.id)) ? '…' : '🗑 Supprimer'}
                    </button>
                  </div>
                  <div className="mail-subject">{m.subject || 'Sans objet'}</div>
                  {m.snippet && <p className="mail-snippet">{m.snippet}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mails-empty">Aucun mail trouvé.</p>
          )}
        </section>
      )}
    </div>
  )
}