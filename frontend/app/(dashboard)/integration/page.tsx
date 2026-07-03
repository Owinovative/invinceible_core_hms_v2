import { Metadata } from 'next';
import { IntegrationStats } from './components/integration-stats';
import { Network, Search, Zap, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QueueHealth } from './components/queue-health';

export const metadata: Metadata = {
  title: 'DHA AfyaLink Integration',
  description: 'Health Information Exchange Command Center',
};

export default function IntegrationDashboardPage() {
  return (
    <div className="flex-1 space-y-8 p-8 pt-6 min-h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            AfyaLink Command Center
          </h2>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring and management of your DHA Health Information Exchange connection.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="gap-2 backdrop-blur-sm bg-background/50 hover:bg-accent/50 border-primary/20">
            <Search className="h-4 w-4 text-primary" />
            Check Eligibility
          </Button>
          <Button className="gap-2 shadow-md">
            <Network className="h-4 w-4" />
            Sync Now
          </Button>
        </div>
      </div>

      <IntegrationStats />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-8">
        <Card className="col-span-4 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Zap className="h-5 w-5 text-primary" />
              Recent Claims Activity
            </CardTitle>
            <CardDescription>
              Real-time feed of SHA preauthorizations and claims.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center p-4 rounded-lg bg-surface-2/50 border border-border/50 transition-colors hover:bg-surface-2">
                  <div className="bg-primary/10 p-2 rounded-full mr-4">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">Claim #SHA-{54289 + i}</p>
                    <p className="text-xs text-muted-foreground">Successfully transmitted and queued for processing.</p>
                  </div>
                  <div className="text-sm text-muted-foreground bg-background px-2 py-1 rounded-md border shadow-sm">
                    {i * 12} mins ago
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <QueueHealth />
      </div>
    </div>
  );
}
