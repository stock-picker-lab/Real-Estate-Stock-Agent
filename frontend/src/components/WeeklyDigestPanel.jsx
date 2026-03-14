import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

export default function WeeklyDigestPanel({ type }) {
  const [digest, setDigest] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(null) // 查看历史周报

  const loadWeekly = useCallback(async (force = false) => {
    setLoading(true)
    setError('')
    try {
      const data = type === 'industry'
        ? await api.getWeeklyIndustry(force)
        : type === 'ai_picks'
        ? await api.getWeeklyAiPicks(force)
        : await api.getWeeklyWatchlist(force)
      setDigest(data)
      setSelectedWeek(null)
    } catch (err) {
      if (err.message?.includes('404')) {
        setError(type === 'industry'
          ? '本周暂无评级数据，无法生成周报'
          : type === 'ai_picks'
          ? '本周暂无AI推荐数据'
          : '请先添加自选股')
      } else {
        setError(err.message || '加载失败')
      }
    }
    setLoading(false)
  }, [type])

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.getWeeklyHistory(type, 10)
      setHistory(data.items || [])
    } catch {
      // 静默失败
    }
  }, [type])

  useEffect(() => {
    loadWeekly(false)
  }, [loadWeekly])

  const handleRegenerate = () => {
    if (loading) return
    loadWeekly(true)
  }

  const handleToggleHistory = () => {
    if (!showHistory && history.length === 0) {
      loadHistory()
    }
    setShowHistory(!showHistory)
  }

  const handleSelectWeek = (item) => {
    setSelectedWeek(item)
    setShowHistory(false)
  }

  const currentDigest = selectedWeek || digest

  const renderMarkdown = (text) => {
    if (!text) return null
    const lines = text.split('\n')
    const elements = []
    let i = 0

    while (i < lines.length) {
      const line = lines[i]

      if (line.startsWith('### ')) {
        elements.push(<h4 key={i} style={{ margin: '16px 0 8px', fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{renderInline(line.slice(4))}</h4>)
      } else if (line.startsWith('## ')) {
        elements.push(<h3 key={i} style={{ margin: '18px 0 10px', fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>{renderInline(line.slice(3))}</h3>)
      } else if (line.startsWith('# ')) {
        elements.push(<h2 key={i} style={{ margin: '20px 0 12px', fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{renderInline(line.slice(2))}</h2>)
      } else if (line.match(/^[-*]\s/)) {
        const items = []
        while (i < lines.length && lines[i].match(/^[-*]\s/)) {
          items.push(<li key={i} style={{ marginBottom: 4 }}>{renderInline(lines[i].replace(/^[-*]\s/, ''))}</li>)
          i++
        }
        elements.push(<ul key={`ul-${i}`} style={{ margin: '8px 0', paddingLeft: 20, lineHeight: 1.7 }}>{items}</ul>)
        continue
      } else if (line.match(/^\d+\.\s/)) {
        const items = []
        while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
          items.push(<li key={i} style={{ marginBottom: 4 }}>{renderInline(lines[i].replace(/^\d+\.\s/, ''))}</li>)
          i++
        }
        elements.push(<ol key={`ol-${i}`} style={{ margin: '8px 0', paddingLeft: 20, lineHeight: 1.7 }}>{items}</ol>)
        continue
      } else if (line.trim() === '') {
        elements.push(<div key={i} style={{ height: 8 }} />)
      } else {
        elements.push(<p key={i} style={{ margin: '6px 0', lineHeight: 1.8, fontSize: 14, color: '#333' }}>{renderInline(line)}</p>)
      }
      i++
    }
    return elements
  }

  const renderInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#1a1a1a' }}>{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  const isIndustry = type === 'industry'
  const isAiPicks = type === 'ai_picks'
  const title = isIndustry ? '地产行业周报' : isAiPicks ? 'AI推荐选股周报' : '自选股周报'
  const icon = isIndustry ? '📋' : isAiPicks ? '🤖' : '📈'

  const weekLabel = currentDigest
    ? `${currentDigest.week_start} ~ ${currentDigest.week_end}`
    : ''

  return (
    <div className="weekly-panel">
      <div
        className="weekly-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="weekly-header-left">
          <span className="weekly-icon">{icon}</span>
          <div>
            <h3 className="weekly-title">{title}</h3>
            {currentDigest && (
              <span className="weekly-date">
                {weekLabel} · AI三模型融合生成
                {currentDigest.model_sources ? ` (${currentDigest.model_sources})` : ''}
                {selectedWeek && <span className="weekly-history-badge">历史</span>}
              </span>
            )}
          </div>
        </div>
        <div className="weekly-header-right">
          <button
            className="weekly-history-btn"
            onClick={(e) => { e.stopPropagation(); handleToggleHistory() }}
            title="查看历史周报"
          >
            📂 历史
          </button>
          <button
            className="weekly-regen-btn"
            onClick={(e) => { e.stopPropagation(); handleRegenerate() }}
            disabled={loading}
            title="重新生成本周周报"
          >
            {loading ? '生成中...' : '刷新'}
          </button>
          <span className={`weekly-toggle ${expanded ? 'expanded' : ''}`}>&#x25B6;</span>
        </div>
      </div>

      {expanded && showHistory && (
        <div className="weekly-history-list">
          <div className="weekly-history-header">
            <span>📂 历史周报</span>
            <button className="weekly-history-close" onClick={() => setShowHistory(false)}>✕</button>
          </div>
          {history.length === 0 ? (
            <div className="weekly-history-empty">暂无历史周报</div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className={`weekly-history-item ${selectedWeek?.id === item.id ? 'active' : ''}`}
                onClick={() => handleSelectWeek(item)}
              >
                <div className="weekly-history-item-title">{item.title}</div>
                <div className="weekly-history-item-date">{item.week_start} ~ {item.week_end}</div>
              </div>
            ))
          )}
          {selectedWeek && (
            <button className="weekly-back-btn" onClick={() => { setSelectedWeek(null); setShowHistory(false) }}>
              ← 返回本周
            </button>
          )}
        </div>
      )}

      {expanded && !showHistory && (
        <div className="weekly-body">
          {loading && !currentDigest && (
            <div className="weekly-loading">
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
              <span style={{ marginLeft: 8, fontSize: 13, color: '#9ca3af' }}>AI正在综合三个大模型生成周报，请稍候...</span>
            </div>
          )}

          {loading && currentDigest && (
            <div className="weekly-loading-overlay">
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
              <span style={{ marginLeft: 8, fontSize: 13 }}>重新生成中...</span>
            </div>
          )}

          {error && !currentDigest && (
            <div className="weekly-error">
              <span>{error}</span>
              <button className="btn btn-sm" onClick={() => loadWeekly(false)}>重试</button>
            </div>
          )}

          {currentDigest && (
            <div className={`weekly-content ${loading ? 'weekly-content-dim' : ''}`}>
              <h3 className="weekly-content-title">{currentDigest.title}</h3>
              <div className="weekly-content-body">
                {renderMarkdown(currentDigest.content)}
              </div>
              <div className="weekly-footer">
                <span>生成时间：{currentDigest.created_at ? new Date(currentDigest.created_at).toLocaleString('zh-CN') : '-'}</span>
                <span>AI评级仅供参考，不构成投资建议</span>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .weekly-panel {
          margin-top: 16px;
          border-radius: var(--radius, 12px);
          overflow: hidden;
          border: 1px solid var(--border, #e5e7eb);
          background: var(--bg-card, #fff);
          box-shadow: var(--shadow, 0 1px 3px rgba(0,0,0,0.04));
          border-left: 3px solid #8b5cf6;
        }
        .weekly-header {
          padding: 16px 20px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background 0.2s;
          user-select: none;
          background: linear-gradient(135deg, rgba(139,92,246,0.03) 0%, rgba(124,58,237,0.01) 100%);
        }
        .weekly-header:hover {
          background: linear-gradient(135deg, rgba(139,92,246,0.07) 0%, rgba(124,58,237,0.03) 100%);
        }
        .weekly-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .weekly-icon {
          font-size: 22px;
        }
        .weekly-title {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #7c3aed;
        }
        .weekly-date {
          font-size: 12px;
          color: var(--text-muted, #9ca3af);
        }
        .weekly-history-badge {
          display: inline-block;
          margin-left: 6px;
          padding: 1px 6px;
          font-size: 10px;
          border-radius: 4px;
          background: #f5f3ff;
          color: #7c3aed;
          border: 1px solid #ddd6fe;
        }
        .weekly-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .weekly-history-btn,
        .weekly-regen-btn {
          padding: 4px 12px;
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 6px;
          background: var(--card-bg, #fff);
          color: var(--text-muted, #6b7280);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .weekly-history-btn:hover,
        .weekly-regen-btn:hover:not(:disabled) {
          border-color: #8b5cf6;
          color: #8b5cf6;
        }
        .weekly-regen-btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }
        .weekly-toggle {
          font-size: 10px;
          color: var(--text-muted, #9ca3af);
          transition: transform 0.25s ease;
        }
        .weekly-toggle.expanded {
          transform: rotate(90deg);
        }
        .weekly-history-list {
          border-top: 1px solid var(--border, #e5e7eb);
          padding: 12px 20px;
          background: #faf8ff;
        }
        .weekly-history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 600;
          color: #7c3aed;
          margin-bottom: 10px;
        }
        .weekly-history-close {
          background: none;
          border: none;
          font-size: 14px;
          color: #9ca3af;
          cursor: pointer;
          padding: 2px 6px;
        }
        .weekly-history-close:hover {
          color: #7c3aed;
        }
        .weekly-history-empty {
          text-align: center;
          color: #9ca3af;
          font-size: 13px;
          padding: 16px 0;
        }
        .weekly-history-item {
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
          margin-bottom: 4px;
        }
        .weekly-history-item:hover {
          background: #ede9fe;
        }
        .weekly-history-item.active {
          background: #ede9fe;
          border: 1px solid #c4b5fd;
        }
        .weekly-history-item-title {
          font-size: 13px;
          font-weight: 500;
          color: #1a1a1a;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .weekly-history-item-date {
          font-size: 11px;
          color: #9ca3af;
        }
        .weekly-back-btn {
          display: block;
          width: 100%;
          margin-top: 8px;
          padding: 6px;
          border: 1px solid #ddd6fe;
          border-radius: 6px;
          background: white;
          color: #7c3aed;
          font-size: 12px;
          cursor: pointer;
          text-align: center;
        }
        .weekly-back-btn:hover {
          background: #f5f3ff;
        }
        .weekly-body {
          padding: 20px;
          position: relative;
        }
        .weekly-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 0;
        }
        .weekly-loading-overlay {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 0 16px;
          color: #8b5cf6;
        }
        .weekly-error {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 30px 0;
          color: var(--text-muted, #9ca3af);
          font-size: 14px;
        }
        .weekly-content {
          transition: opacity 0.2s;
        }
        .weekly-content-dim {
          opacity: 0.4;
        }
        .weekly-content-title {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #8b5cf6;
        }
        .weekly-content-body {
          font-size: 14px;
          line-height: 1.8;
          color: #333;
        }
        .weekly-footer {
          margin-top: 20px;
          padding-top: 12px;
          border-top: 1px solid var(--border, #e5e7eb);
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--text-muted, #9ca3af);
          flex-wrap: wrap;
          gap: 8px;
        }
      `}</style>
    </div>
  )
}
