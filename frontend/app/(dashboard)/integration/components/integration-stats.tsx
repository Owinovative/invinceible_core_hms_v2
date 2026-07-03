'use client';

import { Activity, CheckCircle2, AlertCircle, RefreshCw, Server, Shield, Database, LayoutDashboard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIntegrationStats, useDhaStatus } from '@/hooks/use-integration-stats';

export function IntegrationStats() {
  const { data: queueStats, isLoading: isQueueLoading } = useIntegrationStats();
  const { data: dhaStatus, isLoading: isDhaLoading } = useDhaStatus();

  // Basic derivation of system health from API status
  const dhaEnabled = dhaStatus?.enabled ?? false;
  const isOnline = dhaEnabled ? 'Online' : 'Offline';
  const dhaColor = dhaEnabled ? 'bg-primary/5' : 'bg-destructive/5';
  const dhaBorder = dhaEnabled ? 'border-primary/30' : 'border-destructive/30';
  const dhaIcon = dhaEnabled ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <AlertCircle className="h-6 w-6 text-destructive" />;

  const stats = [
    {
      title: 'Client Registry',
      value: isOnline,
      description: dhaEnabled ? 'Connected to DHA Hub' : 'Integration disabled',
      icon: dhaIcon,
      color: dhaColor,
      border: dhaBorder
    },
    {
      title: 'SHA Claims Engine',
      value: isOnline,
      description: 'API v' + (dhaStatus?.apiVersion ?? '1'),
      icon: <Activity className="h-6 w-6 text-primary" />,
      color: 'bg-primary/5',
      border: 'border-primary/30'
    },
    {
      title: 'Queue Activity',
      value: queueStats ? queueStats.reduce((sum, item) => sum + item.count, 0).toString() : '0',
      description: 'Pending / Processing Jobs',
      icon: <Server className="h-6 w-6 text-primary" />,
      color: 'bg-primary/5',
      border: 'border-primary/30'
    },
    {
      title: 'DHA Auth Token',
      value: isOnline,
      description: dhaEnabled ? 'Managed automatically' : 'N/A',
      icon: <Shield className="h-6 w-6 text-primary" />,
      color: 'bg-primary/5',
      border: 'border-primary/30'
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <Card key={i} className={`overflow-hidden border ${stat.color} ${stat.border} transition-all duration-300 hover:shadow-lg hover:-translate-y-1 backdrop-blur-xl`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            <div className="p-2 rounded-full bg-background/80 shadow-sm border border-border/50">
              {stat.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
