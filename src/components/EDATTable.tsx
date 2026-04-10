'use client';

import React from 'react';
import { EDATEntry } from '@/types/edat';
import { format } from 'date-fns';
import { Edit, Trash2 } from 'lucide-react';

interface EDATTableProps {
  entries: EDATEntry[];
  onEdit: (entry: EDATEntry) => void;
  onDelete: (id: string) => void;
}

export default function EDATTable({ entries, onEdit, onDelete }: EDATTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-emerald-900/60 dark:text-emerald-300/60">
        <thead className="text-[11px] text-emerald-800 uppercase bg-emerald-50/50 dark:bg-emerald-900/50 dark:text-emerald-100 border-b border-emerald-200 dark:border-emerald-800 font-bold tracking-wider">
          <tr>
            <th scope="col" className="px-6 py-4">Tracking #</th>
            <th scope="col" className="px-6 py-4">eDATs #</th>
            <th scope="col" className="px-6 py-4">Status</th>
            <th scope="col" className="px-6 py-4">Date Sent</th>
            <th scope="col" className="px-6 py-4">Sender</th>
            <th scope="col" className="px-6 py-4">Subject</th>
            <th scope="col" className="px-6 py-4">Actioned By</th>
            <th scope="col" className="px-6 py-4">Action Taken</th>
            <th scope="col" className="px-6 py-4">Receiver</th>
            <th scope="col" className="px-6 py-4">Receiver Action</th>
            <th scope="col" className="px-6 py-4">Date Received</th>
            <th scope="col" className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-100 dark:divide-emerald-800/50">
          {entries.length === 0 ? (
            <tr className="bg-white dark:bg-emerald-900/20">
              <td colSpan={12} className="px-6 py-12 text-center text-emerald-400 font-medium italic">No records found in registry.</td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry.id} className="bg-white dark:bg-emerald-900/20 hover:bg-emerald-50 dark:hover:bg-emerald-800/40 transition-colors group">
                <td className="px-6 py-4 font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{entry.trackingNumber}</td>
                <td className="px-6 py-4 font-medium text-emerald-800 dark:text-emerald-200">{entry.edatsNumber}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    entry.status?.toLowerCase() === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-300' : 
                    entry.status?.toLowerCase() === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' : 
                    'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  }`}>
                    {entry.status || 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-emerald-600/70 dark:text-emerald-400/70">{entry.dateSent ? format(new Date(entry.dateSent), 'MMM dd, yyyy') : '-'}</td>
                <td className="px-6 py-4 font-medium text-emerald-900 dark:text-emerald-50">{entry.sender}</td>
                <td className="px-6 py-4 max-w-xs truncate text-emerald-700/80 dark:text-emerald-300/80" title={entry.subject}>{entry.subject}</td>
                <td className="px-6 py-4 text-emerald-700/80 dark:text-emerald-300/80">{entry.actionedBy}</td>
                <td className="px-6 py-4 max-w-xs truncate text-emerald-700/80 dark:text-emerald-300/80" title={entry.actionTaken}>{entry.actionTaken}</td>
                <td className="px-6 py-4 font-medium text-emerald-900 dark:text-emerald-50">{entry.receiver}</td>
                <td className="px-6 py-4 max-w-xs truncate text-emerald-700/80 dark:text-emerald-300/80" title={entry.actionTakenReceiver}>{entry.actionTakenReceiver}</td>
                <td className="px-6 py-4 whitespace-nowrap text-emerald-600/70 dark:text-emerald-400/70">{entry.dateReceived ? format(new Date(entry.dateReceived), 'MMM dd, yyyy') : '-'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(entry)} className="p-2 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-800/50 rounded-lg transition-all" title="Edit Entry">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => onDelete(entry.id)} className="p-2 text-emerald-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all" title="Delete Entry">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
