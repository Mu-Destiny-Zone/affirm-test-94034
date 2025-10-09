import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'dark', // Default to dark as specified
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'dark', // Dark mode default as required
  storageKey = 'qa-platform-theme',
  ...props
}: ThemeProviderProps) {
  const { profile, updateProfile } = useAuth()
  const [theme, setThemeState] = useState<Theme>(defaultTheme)

  // Use profile theme if available, otherwise fallback to localStorage or default
  useEffect(() => {
    if (profile?.theme) {
      setThemeState(profile.theme as Theme)
    } else {
      const stored = localStorage.getItem(storageKey) as Theme
      if (stored) {
        setThemeState(stored)
      }
    }
  }, [profile?.theme, storageKey])

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const setTheme = async (theme: Theme) => {
    localStorage.setItem(storageKey, theme)
    setThemeState(theme)
    
    // Update profile if user is logged in
    if (profile) {
      await updateProfile({ theme })
    }
  }

  const value = {
    theme,
    setTheme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}