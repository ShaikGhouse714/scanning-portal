'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileSpreadsheet, Check, X } from 'lucide-react';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile?: () => void;
  title: string;
  subtitle?: string;
  accept?: string;
  icon?: React.ReactNode;
  statusBadge?: React.ReactNode;
  className?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelect,
  selectedFile,
  onClearFile,
  title,
  subtitle = 'Supports .xlsx, .xls, .csv',
  accept = '.xlsx,.xls,.csv',
  icon,
  statusBadge,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global window drag prevention to prevent browser from navigating/opening dropped file
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only stop dragging if leaving the outer element
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        onFileSelect(file);
      } else {
        alert('Please drop a valid Excel or CSV file (.xlsx, .xls, .csv).');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center select-none ${
          isDragging
            ? 'border-white bg-[#1a1a20] scale-[1.01] shadow-2xl shadow-white/10 ring-2 ring-white/20'
            : selectedFile
            ? 'border-zinc-700 bg-[#0e0e11] hover:border-zinc-500'
            : 'border-zinc-800 bg-[#050505] hover:border-zinc-600 hover:bg-[#0c0c0e]'
        }`}
      >
        <div className="flex items-center justify-center mb-2.5">
          <div
            className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${
              isDragging
                ? 'bg-white text-black border-white scale-110'
                : selectedFile
                ? 'bg-zinc-800 text-white border-zinc-700'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800'
            }`}
          >
            {icon || <FileSpreadsheet className="w-5 h-5" />}
          </div>
        </div>

        <div className="text-xs font-semibold text-white truncate max-w-full px-2">
          {isDragging
            ? 'Drop Excel file here to upload'
            : selectedFile
            ? selectedFile.name
            : title}
        </div>

        <p className="text-[11px] text-zinc-500 mt-1 font-mono">
          {isDragging
            ? 'Release to upload'
            : selectedFile
            ? `${(selectedFile.size / 1024).toFixed(1)} KB • Click or drop to replace`
            : subtitle}
        </p>

        {statusBadge && <div className="mt-2.5 flex justify-center">{statusBadge}</div>}
      </div>

      {selectedFile && onClearFile && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (inputRef.current) inputRef.current.value = '';
            onClearFile();
          }}
          className="absolute top-2 right-2 p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          title="Clear file"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
