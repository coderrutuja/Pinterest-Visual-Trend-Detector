import { useState, useEffect, useRef } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'

function App() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('Home Decor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [history, setHistory] = useState(null)

  const colorCanvasRef = useRef(null)
  const styleCanvasRef = useRef(null)
  const seasonalCanvasRef = useRef(null)

  const categories = [
    'Home Decor',
    'Fashion',
    'Graphic Design',
    'Photography',
    'Food & Drink',
  ]

  async function handleAuth(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Email and password are required')
      return
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed')
      }
      setToken(data.token)
    } catch (err) {
      setError(err.message)
    }
  }

  function handleLogout() {
    setToken('')
    setAnalysis(null)
    setKeyword('')
  }

  function normalizePins(raw) {
    if (!raw) return []
    const list = Array.isArray(raw) ? raw : raw.data || raw.pins || []
    return list
      .map((p) => {
        const imageUrl =
          p.image?.original?.url ||
          p.image?.url ||
          p.image_url ||
          p.img ||
          p.src ||
          p.thumbnail ||
          p.link
        return imageUrl
          ? {
              id: p.id || p.pin_id || p.url || imageUrl,
              imageUrl,
              createdAt: p.created_at || p.created || p.timestamp || null,
            }
          : null
      })
      .filter(Boolean)
  }

  async function handleAnalyze(e) {
    e.preventDefault()
    if (!token) {
      setError('Please login or register first')
      return
    }
    if (!keyword) {
      setError('Pinterest keyword is required')
      return
    }
    setLoading(true)
    setError('')
    setAnalysis(null)

    try {
      const pinsRes = await fetch(
        `${API_BASE}/api/pinterest/pins?keyword=${encodeURIComponent(keyword)}&num=60`,
      )
      const pinsData = await pinsRes.json()
      if (!pinsRes.ok) {
        throw new Error(pinsData.message || 'Failed to fetch pins')
      }

      const normalizedPins = normalizePins(pinsData.pins)

      const trendRes = await fetch(`${API_BASE}/api/trends/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category, pins: normalizedPins }),
      })
      const trendData = await trendRes.json()
      if (!trendRes.ok) {
        throw new Error(trendData.message || 'Trend analysis failed')
      }
      setAnalysis(trendData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!analysis) return
    drawColors()
    drawStyles()
    drawSeasonal()
  }, [analysis])

  useEffect(() => {
    async function loadHistory() {
      if (!token) {
        setHistory(null)
        return
      }
      try {
        const params = new URLSearchParams()
        if (category) params.append('category', category)
        params.append('limit', '5')
        const res = await fetch(`${API_BASE}/api/trends/history?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!res.ok) return
        const data = await res.json()
        setHistory(data)
      } catch (_err) {
        // history is a best-effort enhancement; ignore failures in UI
      }
    }

    loadHistory()
  }, [token, category, analysis])

  function drawColors() {
    const canvas = colorCanvasRef.current
    if (!canvas || !analysis?.dominantColors) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    ctx.clearRect(0, 0, width, height)
    const colors = analysis.dominantColors
    const barWidth = width / colors.length
    colors.forEach((c, index) => {
      ctx.fillStyle = c.hex
      ctx.fillRect(index * barWidth, 0, barWidth, height)
    })
  }

  function drawStyles() {
    const canvas = styleCanvasRef.current
    if (!canvas || !analysis?.styleDistribution) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    ctx.clearRect(0, 0, width, height)

    const styles = analysis.styleDistribution
    const max = Math.max(...styles.map((s) => s.count), 1)
    const barWidth = width / styles.length
    ctx.font = '12px system-ui'

    styles.forEach((s, index) => {
      const barHeight = (s.count / max) * (height - 20)
      const x = index * barWidth + barWidth * 0.15
      const y = height - barHeight
      ctx.fillStyle = '#4f46e5'
      ctx.fillRect(x, y, barWidth * 0.7, barHeight)
      ctx.fillStyle = '#e5e7eb'
      ctx.fillText(s.tag, x, height - 4)
    })
  }

  function drawSeasonal() {
    const canvas = seasonalCanvasRef.current
    if (!canvas || !analysis?.seasonalPattern) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    ctx.clearRect(0, 0, width, height)

    const points = analysis.seasonalPattern
    if (!points.length) return
    const max = Math.max(...points.map((p) => p.count), 1)
    const step = width / (points.length - 1 || 1)

    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 2
    ctx.beginPath()
    points.forEach((p, idx) => {
      const x = idx * step
      const y = height - (p.count / max) * (height - 20)
      if (idx === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <header className="auth-header">
            <h1>Pinterest Visual Trend Detector</h1>
            <p>
              Sign in to run visual trend analyses on Pinterest content across color, style and
              seasonality.
            </p>
          </header>

          <form className="auth-form" onSubmit={handleAuth}>
            <div className="auth-toggle-row">
              <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
              <div className="pill-toggle">
                <button
                  type="button"
                  className={mode === 'login' ? 'active' : ''}
                  onClick={() => setMode('login')}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={mode === 'register' ? 'active' : ''}
                  onClick={() => setMode('register')}
                >
                  Register
                </button>
              </div>
            </div>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="primary" type="submit">
              {mode === 'login' ? 'Login' : 'Register'}
            </button>
            {error && <p className="error-text">{error}</p>}
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Pinterest Visual Trend Detector</h1>
          <p>
            Analyze emerging color palettes, style movements, and seasonal patterns from
            Pinterest content.
          </p>
        </div>
        <div className="user-pill">
          <span className="metric">{email || 'Authenticated user'}</span>
          <button type="button" className="secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="sidebar">
          <form className="card" onSubmit={handleAnalyze}>
            <div className="card-header">
              <h2>Trend configuration</h2>
            </div>
            <label className="field">
              <span>Pinterest keyword</span>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <p className="hint">
              Tip: run analyses across all five categories over time to build a richer
              trend forecast.
            </p>
            <button className="primary" type="submit" disabled={loading}>
              {loading ? 'Analyzing…' : 'Analyze trends'}
            </button>
            {error && <p className="error-text">{error}</p>}
          </form>
        </section>

        <section className="results-grid">
          {!analysis && (
            <p className="empty-state">
              Run an analysis to see color timelines, style evolution, and seasonal patterns.
            </p>
          )}

          {analysis && (
            <>
              <div className="card">
                <div className="card-header">
                  <h2>Color trend timeline</h2>
                  <span className="metric">
                    {keyword && category
                      ? `${keyword} · ${category} · Pins analyzed: ${analysis.totalPins}`
                      : `Pins analyzed: ${analysis.totalPins}`}
                  </span>
                </div>
                <canvas ref={colorCanvasRef} width={640} height={120} />
                <div className="palette-row">
                  {analysis.dominantColors.map((c) => (
                    <div key={c.hex} className="swatch">
                      <span
                        className="swatch-color"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="swatch-label">{c.hex}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2>Style evolution</h2>
                </div>
                <canvas ref={styleCanvasRef} width={640} height={180} />
              </div>

              <div className="card">
                <div className="card-header">
                  <h2>Seasonal pattern</h2>
                </div>
                <canvas ref={seasonalCanvasRef} width={640} height={120} />
              </div>

              <div className="card">
                <div className="card-header">
                  <h2>Mood board</h2>
                  {analysis.sampleImages && (
                    <span className="metric">
                      Representative pins: {analysis.sampleImages.length}
                    </span>
                  )}
                </div>
                {analysis.sampleImages && analysis.sampleImages.length > 0 ? (
                  <div className="mood-grid">
                    {analysis.sampleImages.map((url) => (
                      <div key={url} className="mood-tile">
                        <img src={url} alt="Trend sample" loading="lazy" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="hint">No sample images available for this run.</p>
                )}
              </div>

              <div className="card">
                <div className="card-header">
                  <h2>Trend report snapshot</h2>
                </div>
                <pre className="report-block">
{JSON.stringify(analysis, null, 2)}
                </pre>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2>History & forecast</h2>
                </div>
                {!history || !history.snapshots || history.snapshots.length === 0 ? (
                  <p className="hint">
                    Run multiple analyses (ideally across different days or categories) to see
                    history and a simple forecast summary.
                  </p>
                ) : (
                  <>
                    <p className="hint">{history.forecastSummary}</p>
                    <ul className="history-list">
                      {history.snapshots.map((s) => (
                        <li key={s.id} className="history-item">
                          <div>
                            <span className="history-date">
                              {new Date(s.capturedAt).toLocaleString()}
                            </span>
                            <span className="history-text">
                              {s.category} · Pins: {s.totalPins}
                            </span>
                          </div>
                          <div className="history-meta">
                            {s.topColor && (
                              <span className="history-color" style={{ backgroundColor: s.topColor.hex }} />
                            )}
                            {s.topColor && (
                              <span className="history-label">{s.topColor.hex}</span>
                            )}
                            {s.topStyle && (
                              <span className="history-label">{s.topStyle.tag}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
