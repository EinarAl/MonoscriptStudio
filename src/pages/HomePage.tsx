import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '4rem 1rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 0.5rem' }}>
        ASCII 3D Studio
      </h1>
      <p style={{ color: '#999', marginBottom: '3rem' }}>
        Convert images and SVGs to ASCII art &mdash; static or animated 3D
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Link to="/3d" style={cardStyle}>
          <h2 style={{ margin: '0 0 0.5rem' }}>3D ASCII &rarr; Hero</h2>
          <p style={{ margin: 0, color: '#999', fontSize: 13 }}>
            Upload SVG &mdash; extrude to 3D, spinning ASCII preview, export terminal spinner
          </p>
        </Link>

        <Link to="/gif" style={cardStyle}>
          <h2 style={{ margin: '0 0 0.5rem' }}>Image &rarr; ASCII GIF</h2>
          <p style={{ margin: 0, color: '#999', fontSize: 13 }}>
            Upload any image &mdash; generate color-preserving animated ASCII GIFs
          </p>
        </Link>

        <Link to="/static" style={cardStyle}>
          <h2 style={{ margin: '0 0 0.5rem' }}>Image/SVG &rarr; Static ASCII</h2>
          <p style={{ margin: 0, color: '#999', fontSize: 13 }}>
            Upload PNG, JPEG, or SVG &mdash; get static ASCII art
          </p>
        </Link>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  display: 'block',
  padding: '1.5rem 2rem',
  borderRadius: 12,
  border: '1px solid #333',
  textDecoration: 'none',
  color: 'inherit',
  transition: 'border-color 0.2s',
}
