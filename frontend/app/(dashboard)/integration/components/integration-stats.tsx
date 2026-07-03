'use client';

import { Activity, CheckCircle2, AlertCircle, RefreshCw, Server, Shield, Database, LayoutDashboard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function IntegrationStats() {
  const stats = [
    {
      title: 'Client Registry',
      value: 'Online',
      description: 'Last synced 2 mins ago',
      icon: <CheckCircle2 className="h-6 w-6 text-emerald-400" />,
      color: 'from-emerald-500/20 to-emerald-500/5',
      border: 'border-emerald-500/30'
    },
    {
      title: 'SHA Claims Engine',
      value: 'Online',
      description: '99.9% Success Rate',
      icon: <Activity className="h-6 w-6 text-blue-400" />,
      color: 'from-blue-500/20 to-blue-500/5',
      border: 'border-blue-500/30'
    },
    {
      title: 'Facility Registry',
      value: 'Online',
      description: 'Cache up to date',
      icon: <Server className="h-6 w-6 text-purple-400" />,
      color: 'from-purple-500/20 to-purple-500/5',
      border: 'border-purple-500/30'
    },
    {
      title: 'DHA Auth Token',
      value: 'Active',
      description: 'Expires in 45 mins',
      icon: <Shield className="h-6 w-6 text-indigo-400" />,
      color: 'from-indigo-500/20 to-indigo-500/5',
      border: 'border-indigo-500/30'
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <Card key={i} className={`overflow-hidden border bg-gradient-to-br ${stat.color} ${stat.border} transition-all duration-300 hover:shadow-lg hover:-translate-y-1 backdrop-blur-xl bg-background/50`}>
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
