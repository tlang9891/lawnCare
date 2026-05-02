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
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white shadow-md">

      {/* Logo + links */}
      <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
              <path d="M17 8C8 10 5.9 16.17 3.82 22H5.71c.19-.51.39-1.03.61-1.53 1.3-2.77 4.5-5.88 9.68-5.88 0-3-1-5.19-3-8z" />
            </svg>
          </div>
          <span className="text-green-900 font-bold text-lg tracking-tight">LawnCare</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="text-green-700 text-sm font-medium hover:text-green-900 transition-colors"
            >
              {user.firstName} {user.lastName}
            </Link>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-white bg-green-700 hover:bg-green-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-xs font-semibold text-green-700 hover:text-green-900 transition-colors px-2 py-1.5"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-xs font-semibold text-white bg-green-700 hover:bg-green-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>

      {/* Grass strip — blades point upward, base at bottom */}
      <svg aria-hidden="true" width="100%" height="56" style={{ display: 'block' }}>
        <defs>
          <pattern id="gp" x="0" y="0" width="80" height="56" patternUnits="userSpaceOnUse">

            {/* ── Back row: short, dark blades ── */}
            <path d="M2 56 C2 47 3.5 42 4 34 C4.5 42 6 47 6 56Z"           fill="#1B5E20"/>
            <path d="M12.5 56 C12.5 48 14.5 44 15 38 C15.5 44 15.5 48 15.5 56Z" fill="#2E7D32"/>
            <path d="M22 56 C22 46 22.5 40 23 32 C23.5 40 26 46 26 56Z"     fill="#1B5E20"/>
            <path d="M33.5 56 C33.5 48 34.5 44 35 36 C35.5 44 36.5 48 36.5 56Z" fill="#2E7D32"/>
            <path d="M44 56 C44 47 46.5 42 47 34 C47.5 42 48 47 48 56Z"     fill="#1B5E20"/>
            <path d="M55.5 56 C55.5 48 55.5 43 56 37 C56.5 43 58.5 48 58.5 56Z" fill="#2E7D32"/>
            <path d="M66 56 C66 46 67.5 41 68 33 C68.5 41 70 46 70 56Z"     fill="#1B5E20"/>
            <path d="M76.5 56 C76.5 47 78.5 43 79 35 C79.5 43 79.5 47 79.5 56Z" fill="#2E7D32"/>

            {/* ── Mid row: medium height, mid greens ── */}
            <path d="M5.5 56 C5.5 42 5 28 6 21 C7 28 10.5 42 10.5 56Z"     fill="#388E3C"/>
            <path d="M16 56 C16 40 20 28 21 16 C22 28 22 40 22 56Z"         fill="#43A047"/>
            <path d="M27.5 56 C27.5 41 29.5 27 30 20 C30.5 27 32.5 41 32.5 56Z" fill="#388E3C"/>
            <path d="M38 56 C38 39 38 26 39 14 C40 26 44 39 44 56Z"         fill="#43A047"/>
            <path d="M49.5 56 C49.5 41 53 27 54 19 C55 27 54.5 41 54.5 56Z" fill="#388E3C"/>
            <path d="M60 56 C60 40 62.5 26 63 18 C63.5 26 66 40 66 56Z"     fill="#43A047"/>
            <path d="M71.5 56 C71.5 42 72.5 28 73 22 C73.5 28 76.5 42 76.5 56Z" fill="#388E3C"/>

            {/* ── Front row: tall, bright blades ── */}
            <path d="M0 56 C0 36 3.5 15 4 7 C4.5 15 4 36 4 56Z"            fill="#4CAF50"/>
            <path d="M8.5 56 C8.5 36 8 24 9 5 C10 24 13.5 36 13.5 56Z"      fill="#66BB6A"/>
            <path d="M19 56 C19 38 21.5 21 22 11 C22.5 21 23 38 23 56Z"     fill="#81C784"/>
            <path d="M29.5 56 C29.5 35 28 16 29 3 C30 16 34.5 35 34.5 56Z"  fill="#4CAF50"/>
            <path d="M41 56 C41 34 45 21 46 2 C47 21 45 34 45 56Z"          fill="#8BC34A"/>
            <path d="M50.5 56 C50.5 37 51.5 20 52 8 C52.5 20 55.5 37 55.5 56Z" fill="#66BB6A"/>
            <path d="M61 56 C61 35 64 21 65 4 C66 21 65 35 65 56Z"          fill="#4CAF50"/>
            <path d="M70.5 56 C70.5 36 70 23 71 6 C72 23 75.5 36 75.5 56Z"  fill="#81C784"/>
            <path d="M78 56 C78 37 80.5 20 81 9 C81.5 20 82 37 82 56Z"      fill="#66BB6A"/>

          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gp)" />
      </svg>

    </nav>
  )
}
