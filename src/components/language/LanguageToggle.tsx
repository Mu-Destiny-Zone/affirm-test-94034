import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const { profile, updateProfile } = useAuth();

  const changeLanguage = async (locale: 'en' | 'bg') => {
    i18n.changeLanguage(locale);
    
    // Update profile if user is logged in
    if (profile) {
      await updateProfile({ locale });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Languages className="h-4 w-4 mr-2" />
          {i18n.language === 'bg' ? 'БГ' : 'EN'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => changeLanguage('en')}>
          🇺🇸 {t('english')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeLanguage('bg')}>
          🇧🇬 {t('bulgarian')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}