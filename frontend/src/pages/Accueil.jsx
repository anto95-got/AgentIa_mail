import { useState, useEffect } from 'react'

export default function Accueil() {
  const [user, setUser] = useState(null)
  const [mails, setMails] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

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

  // 2. Action : Scanner Gmail
  const handleScan = async () => {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/gmail/scan/', { credentials: 'include' })
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

  // 3. Action : Déconnexion
  const handleLogout = () => {
    fetch('http://localhost:8000/api/auth/logout/', { 
      method: 'POST', 
      credentials: 'include' 
    }).then(() => {
        // On redirige vers l'accueil pour nettoyer l'état proprement
        window.location.href = 'http://localhost:8000/';
    })
  }

  return (
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      
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
        <div style={{ backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <h2 style={{ padding: '20px', margin: 0, borderBottom: '1px solid #eee', fontSize: '1.2rem' }}>
            {mails.length} derniers messages trouvés
          </h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '15px' }}>Expéditeur</th>
                <th style={{ padding: '15px' }}>Sujet</th>
                <th style={{ padding: '15px' }}>Résumé</th>
              </tr>
            </thead>
            <tbody>
              {mails.length > 0 ? mails.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '15px', fontSize: '14px', fontWeight: '500' }}>{m.sender}</td>
                  <td style={{ padding: '15px', fontSize: '14px' }}>{m.subject}</td>
                  <td style={{ padding: '15px', fontSize: '13px', color: '#777' }}>{m.snippet}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="3" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Aucun mail trouvé.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}