import { useLocation } from 'react-router-dom'
import styles from './Topbar.module.css'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/projects/new': 'New Project',
}

export default function Topbar() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'BuildOS'

  return (
    <div className={styles.topbar}>
      <div className={styles.left}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.status}>
          <span className={styles.statusDot} />
          builder mode active
        </span>
      </div>
    </div>
  )
}