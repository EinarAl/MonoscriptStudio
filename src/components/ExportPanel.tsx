interface Props {
  ascii: string
  onExportTxt: () => void
  terminalScript?: string
  onExportTerminal?: () => void
}

export default function ExportPanel({ ascii, onExportTxt, terminalScript, onExportTerminal }: Props) {
  if (!ascii) return null

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      padding: '12px 0',
      flexWrap: 'wrap',
      alignItems: 'center',
    }}>
      <span style={{ color: '#999', fontSize: 12 }}>Export:</span>
      <button onClick={onExportTxt} style={btnStyle}>
        .txt (static frame)
      </button>
      {terminalScript && onExportTerminal && (
        <button onClick={onExportTerminal} style={btnStyle}>
          logo.js (terminal spinner)
        </button>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 8,
  border: '1px solid #4f46e5',
  background: '#4f46e5',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
}
