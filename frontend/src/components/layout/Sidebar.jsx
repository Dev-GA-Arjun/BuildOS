import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../api/client'
import styles from './Sidebar.module.css'

const navItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    label: 'New Project',
    path: '/projects/new',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'Profile',
    path: '/profile',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M13.3 9.6a1 1 0 00.2 1.1l.04.04a1.2 1.2 0 010 1.7 1.2 1.2 0 01-1.7 0l-.04-.04a1 1 0 00-1.1-.2 1 1 0 00-.6.9V13a1.2 1.2 0 01-2.4 0v-.06A1 1 0 007 12a1 1 0 00-1.1.2l-.04.04a1.2 1.2 0 01-1.7-1.7l.04-.04A1 1 0 004.4 9.4a1 1 0 00-.9-.6H3a1.2 1.2 0 010-2.4h.06A1 1 0 004 5.7a1 1 0 00-.2-1.1l-.04-.04a1.2 1.2 0 011.7-1.7l.04.04A1 1 0 006.6 3a1 1 0 00.6-.9V2a1.2 1.2 0 012.4 0v.06a1 1 0 00.6.9 1 1 0 001.1-.2l.04-.04a1.2 1.2 0 011.7 1.7l-.04.04A1 1 0 0012.7 5.6a1 1 0 00.9.6H14a1.2 1.2 0 010 2.4h-.06a1 1 0 00-.64.6z" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
  },
]

export default function Sidebar() {
  const { user, logoutUser } = useAuth()
  const navigate = useNavigate()
  const [avatarUrl, setAvatarUrl] = useState(null)

  useEffect(() => {
    if (!user) return
    apiClient.get('/user/profile')
      .then(res => setAvatarUrl(res.data.avatar_url || null))
      .catch(() => {})
  }, [user])

  const handleLogout = () => {
    logoutUser()
    navigate('/')
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoBracket}>&lt;</span>
        BuildOS
        <span className={styles.logoBracket}>/&gt;</span>
      </div>

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
      <a
        href="https://tally.so/r/Zjd7dv"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.feedbackLink}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{flexShrink:0}}>
          <path d="M7 1C3.686 1 1 3.358 1 6.25c0 1.52.683 2.887 1.78 3.864L2.5 13l3.22-1.61A6.8 6.8 0 007 11.5c3.314 0 6-2.358 6-5.25S10.314 1 7 1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        </svg>
        Give Feedback
      </a>

      <div className={styles.bottom}>
        <div className={styles.user}>
          <div className={styles.userAvatar}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className={styles.userAvatarImg} />
              : <span>{user?.full_name?.[0]?.toUpperCase() || 'U'}</span>
            }
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.full_name}</span>
            <span className={styles.userEmail}>{user?.email}</span>
          </div>
        </div>
        <button className={styles.logout} onClick={handleLogout}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{flexShrink:0}}>
            <path d="M5 1H2a1 1 0 00-1 1v9a1 1 0 001 1h3M9 9l3-3-3-3M12 6.5H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          logout
        </button>
        <p className={styles.credit}>vibecoded by KSquad128</p>
      </div>
    </div>
  )
}