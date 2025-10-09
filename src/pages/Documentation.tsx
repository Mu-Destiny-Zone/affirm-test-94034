import { useTranslation } from 'react-i18next';
import { BookOpen, ClipboardList, TestTube, Bug, Lightbulb, PlayCircle, FileText, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Documentation() {
  const { t } = useTranslation();

  const sections = [
    {
      icon: ClipboardList,
      title: t('myTasks'),
      description: t('docMyTasksDetail'),
      color: 'text-blue-500'
    },
    {
      icon: TestTube,
      title: t('tests'),
      description: t('docTestsDetail'),
      color: 'text-green-500'
    },
    {
      icon: Bug,
      title: t('bugs'),
      description: t('docBugsDetail'),
      color: 'text-red-500'
    },
    {
      icon: Lightbulb,
      title: t('suggestions'),
      description: t('docSuggestionsDetail'),
      color: 'text-yellow-500'
    },
    {
      icon: PlayCircle,
      title: t('docTestExecution'),
      description: t('docTestExecutionDetail'),
      color: 'text-purple-500'
    },
    {
      icon: FileText,
      title: t('docBugReporting'),
      description: t('docBugReportingDetail'),
      color: 'text-orange-500'
    },
    {
      icon: MessageSquare,
      title: t('docCollaborationTitle'),
      description: t('docCollaborationDetail'),
      color: 'text-pink-500'
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">{t('documentation')}</h1>
        </div>
        <p className="text-muted-foreground text-lg">{t('docPageDescription')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <section.icon className={`h-6 w-6 ${section.color}`} />
                <CardTitle>{section.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed">
                {section.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 bg-accent/30">
        <CardHeader>
          <CardTitle>{t('docGettingStarted')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="font-semibold text-primary">1.</span>
              <span>{t('docStep1')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-primary">2.</span>
              <span>{t('docStep2')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-primary">3.</span>
              <span>{t('docStep3')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-primary">4.</span>
              <span>{t('docStep4')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-primary">5.</span>
              <span>{t('docStep5')}</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
