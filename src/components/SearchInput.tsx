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
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 lg:pl-5 pointer-events-none text-emerald-400 dark:text-emerald-500">
        <Search size={20} className="lg:w-6 lg:h-6" />
      </div>
      <input
        type="text"
        className="block w-full p-3 lg:p-4 pl-12 lg:pl-14 text-sm lg:text-base rounded-xl lg:rounded-2xl border bg-white dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-50 placeholder:text-gray-400 dark:placeholder:text-emerald-600/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
