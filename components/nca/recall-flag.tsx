/**
 * Recall Flag Component
 * Displays recall flag in NCA detail view
 * PRD Enhancement: Product Recall Flagging
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { createServerClient } from '@/lib/database/client';

interface RecallFlagProps {
  ncaId: string;
  recallId: string | null;
  recallFlagged: boolean;
}

interface Recall {
  id: string;
  recall_number: string;
  recall_date: string;
  recall_class: 'class-i' | 'class-ii' | 'class-iii';
  recall_reason: string;
  product_description: string;
  status: string;
}

export function RecallFlag({ ncaId, recallId, recallFlagged }: RecallFlagProps) {
  const [recall, setRecall] = useState<Recall | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecall() {
      if (!recallId) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createServerClient();
        const { data, error } = await (supabase
          .from('recalls') as any)
          .select('id, recall_number, recall_date, recall_class, recall_reason, product_description, status')
          .eq('id', recallId)
          .single();

        if (!error && data) {
          setRecall(data as Recall);
        }
      } catch (error) {
        console.error('Error fetching recall:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecall();
  }, [recallId]);

  if (!recallFlagged || !recallId) {
    return null;
  }

  if (loading) {
    return (
      <Card className="mb-6 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="h-5 w-5" />
            Recall Flagged
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading recall information...</p>
        </CardContent>
      </Card>
    );
  }

  if (!recall) {
    return null;
  }

  const getRecallClassBadge = (recallClass: string) => {
    switch (recallClass) {
      case 'class-i':
        return <Badge variant="destructive">CLASS I - EMERGENCY</Badge>;
      case 'class-ii':
        return <Badge variant="default">CLASS II - PRIORITY</Badge>;
      case 'class-iii':
        return <Badge variant="secondary">CLASS III - COMMERCIAL</Badge>;
      default:
        return <Badge variant="outline">{recallClass}</Badge>;
    }
  };

  return (
    <Card className="mb-6 border-red-200 bg-red-50" data-testid="recall-flag">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-900">
          <AlertTriangle className="h-5 w-5" />
          Product Recall Flagged (Form 3.11F1)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Recall Number</label>
            <p className="text-gray-900 font-mono">{recall.recall_number}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Recall Class</label>
            <div className="mt-1">{getRecallClassBadge(recall.recall_class)}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Recall Date</label>
            <p className="text-gray-900">
              {new Date(recall.recall_date).toLocaleDateString('en-GB')}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <Badge variant="outline" className="ml-2">
              {recall.status.replace('-', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Recall Reason</label>
          <p className="text-gray-900 whitespace-pre-wrap mt-1">{recall.recall_reason}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Product Description</label>
          <p className="text-gray-900 mt-1">{recall.product_description}</p>
        </div>
        <div className="pt-2 border-t">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/recalls/${recall.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full Recall
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

