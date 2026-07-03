'use client';

import { Shield, ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';

interface PatientEligibilityBadgeProps {
  patientId: string;
}

export function PatientEligibilityBadge({ patientId }: PatientEligibilityBadgeProps) {
  const [status, setStatus] = useState<'LOADING' | 'ACTIVE' | 'INACTIVE' | 'ERROR'>('LOADING');

  useEffect(() => {
    // In a real implementation, this would fetch from the backend API
    // e.g. /api/patients/${patientId}/eligibility
    const checkEligibility = async () => {
      try {
        // Simulate network call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStatus('ACTIVE');
      } catch {
        setStatus('ERROR');
      }
    };
    checkEligibility();
  }, [patientId]);

  if (status === 'LOADING') {
    return (
      <Badge variant="outline" className="gap-1 text-slate-500 bg-slate-50 border-slate-200">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking SHA...
      </Badge>
    );
  }

  if (status === 'ACTIVE') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 cursor-pointer shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              SHA Active
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="bg-emerald-950 text-emerald-50 border-emerald-800">
            <p className="font-semibold">Patient is fully covered by SHA.</p>
            <p className="text-xs text-emerald-200/70 mt-1">Last verified just now via AfyaLink</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge variant="destructive" className="gap-1 bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200 shadow-sm">
      <ShieldAlert className="h-3.5 w-3.5" />
      SHA Inactive
    </Badge>
  );
}
