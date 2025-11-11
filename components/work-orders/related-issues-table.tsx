/**
 * Related Issues Table Component
 * Displays linked NCAs and MJCs for a work order
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { FileText, Wrench } from 'lucide-react';

interface RelatedNCA {
  id: string;
  nca_number: string;
  date: string;
  status: string;
  machine_status: string;
  nc_type: string;
}

interface RelatedMJC {
  id: string;
  job_card_number: string;
  date: string;
  status: string;
  urgency: string;
  machine_status: string;
}

interface RelatedIssuesTableProps {
  ncas: RelatedNCA[];
  mjcs: RelatedMJC[];
}

export function RelatedIssuesTable({ ncas, mjcs }: RelatedIssuesTableProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-green-100 text-green-800';
      case 'under-review':
        return 'bg-blue-100 text-blue-800';
      case 'awaiting-clearance':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Linked NCAs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-600" />
            Linked NCAs ({ncas.length})
          </CardTitle>
          <CardDescription>Non-Conformance Advice linked to this work order</CardDescription>
        </CardHeader>
        <CardContent>
          {ncas.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No NCAs linked to this work order</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-semibold text-sm">NCA Number</th>
                    <th className="pb-2 font-semibold text-sm">Date</th>
                    <th className="pb-2 font-semibold text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ncas.map((nca) => (
                    <tr key={nca.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">
                        <Link
                          href={`/nca/${nca.id}`}
                          className="text-primary-600 hover:underline font-medium"
                        >
                          {nca.nca_number}
                        </Link>
                      </td>
                      <td className="py-2 text-sm">
                        {new Date(nca.date).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        <Badge className={getStatusColor(nca.status)}>
                          {nca.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked MJCs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-warning-600" />
            Linked MJCs ({mjcs.length})
          </CardTitle>
          <CardDescription>Maintenance Job Cards linked to this work order</CardDescription>
        </CardHeader>
        <CardContent>
          {mjcs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No MJCs linked to this work order</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-semibold text-sm">MJC Number</th>
                    <th className="pb-2 font-semibold text-sm">Date</th>
                    <th className="pb-2 font-semibold text-sm">Status</th>
                    <th className="pb-2 font-semibold text-sm">Urgency</th>
                  </tr>
                </thead>
                <tbody>
                  {mjcs.map((mjc) => (
                    <tr key={mjc.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">
                        <Link
                          href={`/mjc/${mjc.id}`}
                          className="text-primary-600 hover:underline font-medium"
                        >
                          {mjc.job_card_number}
                        </Link>
                      </td>
                      <td className="py-2 text-sm">
                        {new Date(mjc.date).toLocaleDateString()}
                      </td>
                      <td className="py-2">
                        <Badge className={getStatusColor(mjc.status)}>
                          {mjc.status}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <Badge className={getUrgencyColor(mjc.urgency)}>
                          {mjc.urgency}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

