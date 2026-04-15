'use client';

import React from 'react';
import { EDATEntry } from '@/types/edat';
import { format } from 'date-fns';
import { Edit, Trash2, Eye } from 'lucide-react';

interface EDATTableProps {
  entries: EDATEntry[];
  onEdit: (entry: EDATEntry) => void;
  onDelete: (id: string) => void;
  onView: (entry: EDATEntry) => void;
}

export default function EDATTable({ entries, onEdit, onDelete, onView }: EDATTableProps) {
  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return '-';
    // Remove milliseconds if present (e.g., "14:20:00.000000" -> "14:20:00")
    return timeStr.split('.')[0];
  };

  return (
    <div className="m-1.5 rounded-lg overflow-auto relative shadow-inner scrollbar-thin scrollbar-thumb-emerald-200 dark:scrollbar-thumb-emerald-800 max-h-[60vh] sm:max-h-[calc(100vh-350px)] min-h-[300px]">
      <table className="w-full text-xs sm:text-sm lg:text-base text-left min-w-[1200px] text-emerald-900 dark:text-emerald-300">
        <thead className="text-[10px] sm:text-xs lg:text-sm uppercase bg-emerald-50 dark:bg-emerald-900/50 border-b border-emerald-200 dark:border-emerald-800 font-bold tracking-wider text-emerald-800 dark:text-emerald-100 sticky top-0 z-10">
          <tr>
            <th scope="col" className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 text-center bg-emerald-50 dark:bg-emerald-900/50">Tracking #</th>
            <th scope="col" className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 text-center bg-emerald-50 dark:bg-emerald-900/50">eDTs #</th>
            <th scope="col" className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 text-center bg-emerald-50 dark:bg-emerald-900/50">Status</th>
            <th scope="col" className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 text-center bg-emerald-50 dark:bg-emerald-900/50">Time Sent</th>
            <th scope="col" className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 text-center bg-emerald-50 dark:bg-emerald-900/50">Date Sent</th>
            <th scope="col" className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 text-center bg-emerald-50 dark:bg-emerald-900/50">Sender</th>
            <th scope="col" className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 text-center bg-emerald-50 dark:bg-emerald-900/50">Subject</th>
            <th scope="col" className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 text-center bg-emerald-50 dark:bg-emerald-900/50">Actioned By</th>
            <th scope="col" className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 text-center bg-emerald-50 dark:bg-emerald-900/50">Action Taken</th>
            <th scope="col" className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 text-center bg-emerald-50 dark:bg-emerald-900/50">Receiver</th>
            <th scope="col" className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 text-center bg-emerald-50 dark:bg-emerald-900/50">Receiver Action</th>
            <th scope="col" className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 text-center bg-emerald-50 dark:bg-emerald-900/50">Time Received</th>
            <th scope="col" className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 text-center bg-emerald-50 dark:bg-emerald-900/50">Date Received</th>
            <th scope="col" className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 text-center sticky right-0 bg-emerald-50 dark:bg-emerald-900 z-20 shadow-[-4px_0_4px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_4px_rgba(0,0,0,0.2)]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-100 dark:divide-emerald-800/50">
          {entries.length === 0 ? (
            <tr className="bg-white dark:bg-emerald-900/20">
              <td colSpan={14} className="px-4 py-12 text-center text-emerald-400 dark:text-emerald-500 font-medium italic text-base">No records found in registry.</td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry.id} className="bg-white dark:bg-emerald-900/20 hover:bg-emerald-50 dark:hover:bg-emerald-800/40 transition-colors group">
                <td className="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{entry.trackingNumber}</td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 font-medium text-emerald-800 dark:text-emerald-200">{entry.edatsNumber}</td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-center">
                  <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs lg:text-sm font-bold uppercase ${
                    entry.status?.toLowerCase() === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800/50 dark:text-emerald-300' :
                    entry.status?.toLowerCase() === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                    'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  }`}>
                    {entry.status || 'Pending'}
                  </span>
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-center whitespace-nowrap text-emerald-600/70 dark:text-emerald-400/70 font-mono text-[10px] sm:text-xs lg:text-sm">{formatTime(entry.timeSent)}</td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-center whitespace-nowrap text-emerald-600/70 dark:text-emerald-400/70">{entry.dateSent ? format(new Date(entry.dateSent), 'MMM dd, yyyy') : '-'}</td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-center font-medium text-emerald-900 dark:text-emerald-50 max-w-[100px] sm:max-w-[120px] lg:max-w-[160px] xl:max-w-[200px] truncate" title={entry.sender}>{entry.sender}</td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-center max-w-[150px] sm:max-w-[180px] lg:max-w-[240px] xl:max-w-[300px] truncate text-emerald-700/80 dark:text-emerald-300/80" title={entry.subject}>{entry.subject}</td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-center max-w-[100px] sm:max-w-[120px] lg:max-w-[160px] xl:max-w-[200px] truncate text-emerald-700/80 dark:text-emerald-300/80" title={entry.actionedBy}>{entry.actionedBy}</td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-center max-w-[120px] sm:max-w-[140px] lg:max-w-[200px] xl:max-w-[250px] truncate text-emerald-700/80 dark:text-emerald-300/80" title={entry.actionTaken}>{entry.actionTaken}</td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-center font-medium text-emerald-900 dark:text-emerald-50 max-w-[100px] sm:max-w-[120px] lg:max-w-[160px] xl:max-w-[200px] truncate" title={entry.receiver}>{entry.receiver}</td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-center max-w-[120px] sm:max-w-[140px] lg:max-w-[200px] xl:max-w-[250px] truncate text-emerald-700/80 dark:text-emerald-300/80" title={entry.actionTakenReceiver}>{entry.actionTakenReceiver}</td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-center whitespace-nowrap text-emerald-600/70 dark:text-emerald-400/70 font-mono text-[10px] sm:text-xs lg:text-sm">{formatTime(entry.timeReceived)}</td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-emerald-600/70 dark:text-emerald-400/70">{entry.dateReceived ? format(new Date(entry.dateReceived), 'MMM dd, yyyy') : '-'}</td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-right sticky right-0 bg-white dark:bg-emerald-950 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-800 transition-colors z-10 shadow-[-4px_0_4px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_4px_rgba(0,0,0,0.2)]">
                  <div className="flex justify-end gap-1 sm:gap-2 lg:gap-3">
                    <button onClick={() => onView(entry)} className="p-1.5 sm:p-2 lg:p-2.5 text-emerald-500 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 rounded-lg transition-all" title="View Entry">
                      <Eye size={18} className="lg:w-5 lg:h-5" />
                    </button>
                    <button onClick={() => onEdit(entry)} className="p-1.5 sm:p-2 lg:p-2.5 text-emerald-500 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 rounded-lg transition-all" title="Edit Entry">
                      <Edit size={18} className="lg:w-5 lg:h-5" />
                    </button>
                    <button onClick={() => onDelete(entry.id)} className="p-1.5 sm:p-2 lg:p-2.5 text-emerald-500 dark:text-emerald-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all" title="Delete Entry">
                      <Trash2 size={18} className="lg:w-5 lg:h-5" />
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
