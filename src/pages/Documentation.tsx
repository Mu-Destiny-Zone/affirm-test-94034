import { useTranslation } from 'react-i18next';
import { BookOpen, ClipboardList, TestTube, Bug, Lightbulb, PlayCircle, FileText, MessageSquare, CheckCircle2, AlertCircle, Info, ThumbsUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">{t('documentation')}</h1>
        </div>
        <p className="text-muted-foreground text-lg">{t('docPageDescription')}</p>
      </div>

      {/* Quick Start Guide */}
      <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            {t('docGettingStarted')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4 text-sm">
            <li className="flex items-start gap-3">
              <span className="font-bold text-primary text-lg">1.</span>
              <div>
                <p className="font-medium mb-1">{t('docStep1')}</p>
                <p className="text-muted-foreground text-xs">{t('docStep1Detail')}</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold text-primary text-lg">2.</span>
              <div>
                <p className="font-medium mb-1">{t('docStep2')}</p>
                <p className="text-muted-foreground text-xs">{t('docStep2Detail')}</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold text-primary text-lg">3.</span>
              <div>
                <p className="font-medium mb-1">{t('docStep3')}</p>
                <p className="text-muted-foreground text-xs">{t('docStep3Detail')}</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold text-primary text-lg">4.</span>
              <div>
                <p className="font-medium mb-1">{t('docStep4')}</p>
                <p className="text-muted-foreground text-xs">{t('docStep4Detail')}</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold text-primary text-lg">5.</span>
              <div>
                <p className="font-medium mb-1">{t('docStep5')}</p>
                <p className="text-muted-foreground text-xs">{t('docStep5Detail')}</p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Main Features */}
      <h2 className="text-2xl font-bold mb-4">{t('docMainFeatures')}</h2>
      <div className="grid gap-6 md:grid-cols-2 mb-8">
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

      {/* Detailed Instructions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t('docDetailedInstructions')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Execution Section */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-purple-500" />
              {t('docTestExecutionTitle')}
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground ml-7">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{t('docTestExecStep1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{t('docTestExecStep2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{t('docTestExecStep3')}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{t('docTestExecStep4')}</span>
              </li>
            </ul>
          </div>

          <Separator />

          {/* Bug Reporting Section */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Bug className="h-5 w-5 text-red-500" />
              {t('docBugReportingTitle')}
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground ml-7">
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>{t('docBugStep1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>{t('docBugStep2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>{t('docBugStep3')}</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>{t('docBugStep4')}</span>
              </li>
            </ul>
          </div>

          <Separator />

          {/* Suggestions Section */}
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              {t('docSuggestionsTitle')}
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground ml-7">
              <li className="flex items-start gap-2">
                <ThumbsUp className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span>{t('docSuggestionStep1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <ThumbsUp className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span>{t('docSuggestionStep2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <ThumbsUp className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span>{t('docSuggestionStep3')}</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card className="mb-8 bg-green-50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            {t('docBestPractices')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <span>{t('docBestPractice1')}</span>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <span>{t('docBestPractice2')}</span>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <span>{t('docBestPractice3')}</span>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">4</Badge>
              <span>{t('docBestPractice4')}</span>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">5</Badge>
              <span>{t('docBestPractice5')}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Tips and Tricks */}
      <Card className="bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            {t('docTipsAndTricks')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">💡</span>
              <span>{t('docTip1')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">💡</span>
              <span>{t('docTip2')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">💡</span>
              <span>{t('docTip3')}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">💡</span>
              <span>{t('docTip4')}</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
