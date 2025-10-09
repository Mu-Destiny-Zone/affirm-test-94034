import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';

// Hook to sync user preferences with i18n and theme
export function useUserPreferences() {
  const { profile } = useAuth();
  const { i18n } = useTranslation();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (profile?.locale && profile.locale !== i18n.language) {
      i18n.changeLanguage(profile.locale);
    }
  }, [profile?.locale, i18n]);

  useEffect(() => {
    if (profile?.theme) {
      setTheme(profile.theme);
    }
  }, [profile?.theme, setTheme]);
}