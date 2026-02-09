import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Accueil from './pages/Accueil'
import Configuration from './pages/Configuration'
import './App.css'

function App() {
  return (
    <div className="app">
      <Navbar />
      <div className="app-main">
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/configuration" element={<Configuration />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
