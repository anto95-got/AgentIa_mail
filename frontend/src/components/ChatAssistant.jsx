import { useState, useRef, useEffect } from 'react'

const API_BASE = 'http://localhost:8000'

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()?.trim() ?? ''
  return ''
}

export default function ChatAssistant({ onUnauthorized }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', text }])
    setLoading(true)
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(getCookie('csrftoken') && { 'X-CSRFToken': getCookie('csrftoken') }),
      }
      const res = await fetch(`${API_BASE}/api/chat/`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ message: text }),
      })
      let data = {}
        try {
          data = await res.json()
        } catch {
          data = {}
        }
      if (res.status === 401) {
        setError('Session expirée ou non connecté. Veuillez vous reconnecter.')
        onUnauthorized?.()
        return
      }
      if (!res.ok) {
        setError(data.error || `Erreur ${res.status} lors de l'envoi du message.`)
        return
      }
      const reply = data.reply ?? ''
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }])
    } catch (err) {
      console.error('Chat error:', err)
      setError('Impossible de contacter le serveur.')
    } finally {
      setLoading(false)
    }
  }

  const handleReconnect = () => {
    window.location.href = `${API_BASE}/api/auth/login/`
  }

  const suggestions = [
    'Résume les 3 derniers mails',
    'Liste les 5 derniers e-mails',
    'Supprime les mails de plus de 90 jours',
    'Quels sont mes derniers messages ?',
  ]

  const useSuggestion = (text) => {
    setInput(text)
    setError(null)
  }

  return (
    <div className="chat-assistant">
      <div className="chat-messages">
        {messages.length === 0 && !error && (
          <div className="chat-placeholder">
            <span className="chat-placeholder-icon">💬</span>
            <p>Posez une question ou demandez une action sur vos mails.</p>
            <div className="chat-suggestions">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  className="chat-suggestion-chip"
                  onClick={() => useSuggestion(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble chat-bubble--${msg.role}`}>
            <span className="chat-bubble-label">{msg.role === 'user' ? 'Vous' : 'Assistant'}</span>
            <div className="chat-bubble-text">{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble chat-bubble--assistant">
            <span className="chat-bubble-label">Assistant</span>
            <div className="chat-bubble-text chat-typing">Réflexion…</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="chat-error">
          <p>{error}</p>
          <button type="button" className="chat-reconnect-btn" onClick={handleReconnect}>
            Se reconnecter
          </button>
        </div>
      )}

      {!error && (
        <>
          <div className="chat-suggestions-inline">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                className="chat-suggestion-chip"
                onClick={() => useSuggestion(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
          >
          <input
            type="text"
            className="chat-input"
            placeholder="Votre message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()}>
            {loading ? '…' : 'Envoyer'}
          </button>
        </form>
        </>
      )}
    </div>
  )
}
