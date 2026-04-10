'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchInput({ value, onChange, placeholder = "Search records..." }: SearchInputProps) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-emerald-400">
        <Search size={18} />
      </div>
      <input
        type="text"
        className="block w-full p-2.5 pl-10 text-sm text-emerald-900 border border-emerald-100 rounded-xl bg-white/50 dark:bg-emerald-950/30 dark:border-emerald-800 dark:placeholder-emerald-600 dark:text-emerald-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
