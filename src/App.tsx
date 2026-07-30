import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import StaticAsciiPage from './pages/StaticAsciiPage'
import ThreeDAsciiPage from './pages/ThreeDAsciiPage'
import GifAsciiPage from './pages/GifAsciiPage'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{
        minHeight: '100vh',
        background: '#0d0d1a',
        color: '#f0e6d0',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/static" element={<StaticAsciiPage />} />
          <Route path="/3d" element={<ThreeDAsciiPage />} />
          <Route path="/gif" element={<GifAsciiPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
