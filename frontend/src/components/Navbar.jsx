import { NavLink } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">✉</span>
        <span>AgentMail</span>
      </div>
      <ul className="navbar-links">
        <li>
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            end
          >
            Accueil
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/configuration"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Configuration
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}
