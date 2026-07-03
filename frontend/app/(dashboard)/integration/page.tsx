import { Metadata } from 'next';
import { IntegrationStats } from './components/integration-stats';
import { Network, Search, Zap, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'DHA AfyaLink Integration',
  description: 'Health Information Exchange Command Center',
};

export default function IntegrationDashboardPage() {
  return (
    <div className="flex-1 space-y-8 p-8 pt-6 min-h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            AfyaLink Command Center
          </h2>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring and management of your DHA Health Information Exchange connection.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="gap-2 backdrop-blur-sm bg-background/50 hover:bg-accent/50 border-blue-200 dark:border-blue-800">
            <Search className="h-4 w-4 text-blue-500" />
            Check Eligibility
          </Button>
          <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md">
            <Network className="h-4 w-4" />
            Sync Now
          </Button>
        </div>
      </div>

      <IntegrationStats />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-8">
        <Card className="col-span-4 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Zap className="h-5 w-5 text-amber-500" />
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
                  <div className="bg-emerald-500/10 p-2 rounded-full mr-4">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
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

        <Card className="col-span-3 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-purple-500"></div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Network className="h-5 w-5 text-indigo-500" />
              Queue Health
            </CardTitle>
            <CardDescription>
              Background processing metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="flex items-center">
                <div className="flex-1">
                  <div className="text-sm font-medium">Pending Jobs</div>
                  <div className="text-2xl font-bold mt-1 text-foreground">0</div>
                </div>
                <div className="h-16 w-16 rounded-full border-4 border-border flex items-center justify-center">
                  <span className="text-muted-foreground">0%</span>
                </div>
              </div>
              <div className="flex items-center">
                <div className="flex-1">
                  <div className="text-sm font-medium">Failed / Dead Letter</div>
                  <div className="text-2xl font-bold mt-1 text-emerald-500">0</div>
                </div>
                <div className="h-16 w-16 rounded-full border-4 border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
