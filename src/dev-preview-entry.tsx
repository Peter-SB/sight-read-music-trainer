import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FingeringChart } from './ui/FingeringChart'
import './App.css'

const notes = [null, 'C4', 'Ab2', 'G3', 'Bb2']

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ display: 'flex', gap: 24 }}>
      {notes.map((n, i) => (
        <FingeringChart key={i} concertNoteName={n} instrument="tenor_sax" />
      ))}
    </div>
  </StrictMode>,
)
