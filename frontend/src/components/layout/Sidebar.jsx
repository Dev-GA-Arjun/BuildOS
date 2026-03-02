import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './Sidebar.module.css'

const navItems = [
  { label: 'Dashboard', icon: '⚡', path: '/dashboard' },
  { label: 'Projects', icon: '🗂️', path: '/projects' },
  { label: 'New Project', icon: '＋', path: '/projects/new' },
]

export default function Sidebar() {
  const { user, logoutUser } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logoutUser()
    navigate('/')
  }

  return (
    <div className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <span className={styles.logoBracket}>&lt;</span>
        BuildOS
        <span className={styles.logoBracket}>/&gt;</span>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className={styles.bottom}>
        <div className={styles.user}>
          <div className={styles.userAvatar}>
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.full_name}</span>
            <span className={styles.userEmail}>{user?.email}</span>
          </div>
        </div>
        <button className={styles.logout} onClick={handleLogout}>
          logout
        </button>
      </div>
    </div>
  )
}