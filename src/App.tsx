import { SpeedInsights } from '@vercel/speed-insights/react'
import StudioPage from './pages/StudioPage'

export default function App() {
  return (
    <>
      <StudioPage />
      <SpeedInsights />
    </>
  )
}
