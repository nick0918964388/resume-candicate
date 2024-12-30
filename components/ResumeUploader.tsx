'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Progress } from "@/components/ui/progress";

interface ResumeUploaderProps {
  isUploading: boolean;
  onUpload: (files: File[]) => void;
  error: string | null;
  progress: number;
}

export default function ResumeUploader({ 
  isUploading, 
  onUpload, 
  error,
  progress 
}: ResumeUploaderProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(
      file => file.type === 'application/pdf'
    );
    
    if (pdfFiles.length > 0) {
      onUpload(pdfFiles);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true,
    noClick: false,
    noKeyboard: true,
    preventDropOnDocument: true,
    disabled: isUploading
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} disabled={isUploading} />
        {isDragActive ? (
          <p className="text-blue-500">拖放檔案到這裡...</p>
        ) : (
          <p>點擊或拖放 PDF 檔案到這裡上傳</p>
        )}
      </div>

      {isUploading && (
        <div className="mt-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">上傳進度</span>
            <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      {error && (
        <p className="mt-2 text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
} 