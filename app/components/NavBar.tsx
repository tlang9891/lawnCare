'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'

export default function NavBar() {
  const { user, logout } = useAuth()
  const router = useRouter()

  function handleLogout() {
    logout()
    router.push('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-green-800 border-b border-green-700/60 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-green-400 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-900">
              <path d="M17 8C8 10 5.9 16.17 3.82 22H5.71c.19-.51.39-1.03.61-1.53 1.3-2.77 4.5-5.88 9.68-5.88 0-3-1-5.19-3-8z" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">LawnCare</span>
        </Link>

        {/* Right side */}
        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="text-green-200 text-sm font-medium hidden sm:block hover:text-white transition-colors"
            >
              {user.firstName} {user.lastName}
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-xs font-semibold text-green-200 hover:text-white transition-colors px-2 py-1.5"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-xs font-semibold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
