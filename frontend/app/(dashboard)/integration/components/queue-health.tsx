'use client';

import { Network, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useIntegrationStats } from '@/hooks/use-integration-stats';
import { Skeleton } from '@/components/ui/skeleton';

export function QueueHealth() {
  const { data: queueStats, isLoading } = useIntegrationStats();

  const pendingJobs = queueStats?.filter(s => s.statusCode === 'PENDING').reduce((sum, s) => sum + s.count, 0) || 0;
  const deadLetters = queueStats?.filter(s => s.statusCode === 'DEAD_LETTER').reduce((sum, s) => sum + s.count, 0) || 0;
  const total = (queueStats?.reduce((sum, s) => sum + s.count, 0) || 0);
  const pendingPercentage = total > 0 ? Math.round((pendingJobs / total) * 100) : 0;

  return (
    <Card className="col-span-3 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Network className="h-5 w-5 text-primary" />
          Queue Health
        </CardTitle>
        <CardDescription>
          Background processing metrics.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-8">
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center">
              <div className="flex-1">
                <div className="text-sm font-medium">Pending Jobs</div>
                <div className="text-2xl font-bold mt-1 text-foreground">{pendingJobs}</div>
              </div>
              <div className="h-16 w-16 rounded-full border-4 border-border flex items-center justify-center">
                <span className="text-muted-foreground">{pendingPercentage}%</span>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-1">
                <div className="text-sm font-medium">Failed / Dead Letter</div>
                <div className={`text-2xl font-bold mt-1 ${deadLetters > 0 ? 'text-destructive' : 'text-primary'}`}>
                  {deadLetters}
                </div>
              </div>
              <div className={`h-16 w-16 rounded-full border-4 flex items-center justify-center ${deadLetters > 0 ? 'border-destructive/20' : 'border-primary/20'}`}>
                {deadLetters > 0 ? (
                  <AlertCircle className="h-6 w-6 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
