import { ToolCardProps } from './types'

const formatSection = (name: string) =>
  name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())

const friendlyMode = (mode: string) => {
  switch (mode) {
    case 'search_keywords':
      return 'Keyword search'
    case 'search_regex':
      return 'Regex search'
    default:
      return 'Section extraction'
  }
}

const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter(item => typeof item === 'string') as string[]
  }
  return []
}

export default function FilingExtractCard({ tool, envelope }: ToolCardProps) {
  if (!envelope) return null

  if (envelope.ok === false) {
    return (
      <div className="card error-card">
        <h4>{tool ?? 'mf-filing-extract'} failed</h4>
        <p className="muted">{envelope.error ?? 'Unable to extract information from the filing.'}</p>
      </div>
    )
  }

  const payload = (envelope.data ?? {}) as Record<string, any>
  const result = (payload.result ?? {}) as Record<string, any>
  const provenance = Array.isArray(payload.provenance) ? payload.provenance : []
  const modeRaw = (provenance?.[0]?.mode as string) ?? (payload.mode as string) ?? (result.mode as string) ?? 'extract_sections'
  const mode = ['extract_sections', 'search_keywords', 'search_regex'].includes(modeRaw)
    ? modeRaw
    : 'extract_sections'

  const savedPaths = toArray(payload.paths)
  const snippetPath = typeof result.snippets === 'string' ? result.snippets : undefined
  const allPaths = Array.from(new Set([...savedPaths, snippetPath].filter(Boolean))) as string[]

  const keywords = mode === 'search_keywords' ? toArray(result.keywords ?? payload.keywords) : []
  const pattern = mode === 'search_regex' ? (result.pattern ?? payload.pattern ?? '') : ''
  const matchCount = mode === 'search_regex' && typeof result.match_count === 'number' ? result.match_count : undefined

  const reservedKeys = new Set(['snippets', 'keywords', 'pattern', 'match_count', 'mode'])
  const sectionEntries =
    mode === 'extract_sections'
      ? Object.entries(result).filter(([key]) => !reservedKeys.has(key))
      : []

  const extractedSections = sectionEntries.filter(([, value]) => typeof value === 'string') as Array<[string, string]>

  const highlight = (() => {
    if (mode === 'search_keywords') {
      return {
        label: 'Keywords',
        value: keywords.length ? keywords.length.toString() : '0',
        secondary: keywords.slice(0, 4).join(', ') || 'No keywords provided'
      }
    }
    if (mode === 'search_regex') {
      return {
        label: 'Matches',
        value: typeof matchCount === 'number' ? matchCount.toString() : '0',
        secondary: pattern || 'No pattern specified'
      }
    }
    return {
      label: 'Sections saved',
      value: extractedSections.length ? extractedSections.length.toString() : '0',
      secondary: extractedSections.length ? 'Written to workspace' : 'No section content captured'
    }
  })()

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Filing extraction</div>
          <h3 className="card-title">{friendlyMode(mode)}</h3>
        </div>
        <span className="badge">{tool ?? 'mf-filing-extract'}</span>
      </div>

      <div className="card-body">
        {highlight && (
          <div className="metric">
            <span className="metric-label">{highlight.label}</span>
            <span className="metric-value">{highlight.value}</span>
            {highlight.secondary && <div className="muted">{highlight.secondary}</div>}
          </div>
        )}

        {mode === 'extract_sections' && (
          <div style={{ marginTop: '16px' }}>
            <div className="muted">Sections</div>
            <div className="file-list" style={{ marginTop: '8px' }}>
              {sectionEntries.length === 0 && (
                <div className="file-item">
                  <span className="muted">No sections were extracted.</span>
                </div>
              )}
              {sectionEntries.map(([section, value]) => (
                <div key={section} className="file-item">
                  <strong>{formatSection(section)}</strong>
                  <span className="muted">
                    {typeof value === 'string' && value
                      ? value
                      : 'No content found for this section'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === 'search_keywords' && keywords.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div className="muted">Keywords searched</div>
            <div className="pill-list" style={{ marginTop: '8px' }}>
              {keywords.map(keyword => (
                <span key={keyword} className="pill">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {mode === 'search_regex' && (
          <div style={{ marginTop: '16px' }}>
            <div className="muted">Pattern</div>
            <div className="file-list" style={{ marginTop: '8px' }}>
              <div className="file-item">
                <strong>{pattern || 'Pattern not provided'}</strong>
                {typeof matchCount === 'number' && (
                  <span className="muted">{matchCount} match{matchCount === 1 ? '' : 'es'}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {allPaths.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div className="muted">Saved outputs</div>
            <div className="file-list" style={{ marginTop: '8px' }}>
              {allPaths.map(path => (
                <div key={path} className="file-item">
                  <strong>{path}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
