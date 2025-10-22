import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export function NoOrganizationAccess() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-2xl w-full border-2 border-yellow-500/50 shadow-lg bg-yellow-50/50 dark:bg-yellow-950/20">
        <CardContent className="pt-12 pb-12">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="p-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <AlertCircle className="h-20 w-20 text-yellow-600 dark:text-yellow-500" />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold">{t('profileUnderReview')}</h1>
              <p className="text-lg text-muted-foreground max-w-md">
                {t('profileBeingReviewed')}
              </p>
              <div className="pt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t('reviewProcess')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('contactSupport')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
