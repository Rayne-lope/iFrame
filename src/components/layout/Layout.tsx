import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import MobileTabBar from './MobileTabBar'

export default function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const routeKey = location.pathname

  return (
    <div className={isHome ? 'min-h-screen bg-background' : 'app-nonhome'}>
      {!isHome && <Navbar />}
      <main className={isHome ? 'mobile-safe-shell' : 'route-shell mobile-safe-shell'}>
        {isHome ? (
          <Outlet />
        ) : (
          <div key={routeKey} className="route-enter">
            <Outlet />
          </div>
        )}
      </main>
      <MobileTabBar />
    </div>
  )
}
