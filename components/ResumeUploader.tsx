'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadResume, deleteResume } from '@/lib/services/upload';

interface ResumeUploaderProps {
  onUpload: (files: File[]) => void;
}

interface UploadedFile extends File {
  id?: string;
  progress?: number;
  error?: string;
  filePath?: string;
}

export default function ResumeUploader({ onUpload }: ResumeUploaderProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    try {
      const uploadedFile = { ...file, progress: 0 } as UploadedFile;
      setUploadedFiles(prev => [...prev, uploadedFile]);

      // 上传文件到 Supabase
      const result = await uploadResume(file);
      
      // 更新文件状态
      setUploadedFiles(prev => 
        prev.map(f => 
          f.name === file.name
            ? { ...f, id: result.id, progress: 100, filePath: result.file_path }
            : f
        )
      );

      return result;
    } catch (error) {
      // 更新错误状态
      setUploadedFiles(prev =>
        prev.map(f =>
          f.name === file.name
            ? { ...f, error: '上传失败', progress: 0 }
            : f
        )
      );
      throw error;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(
      file => file.type === 'application/pdf'
    );

    if (pdfFiles.length === 0) return;

    setIsUploading(true);
    try {
      // 并行上传所有文件
      const uploadPromises = pdfFiles.map(handleFileUpload);
      const results = await Promise.all(uploadPromises);
      onUpload(pdfFiles);
    } catch (error) {
      console.error('文件上传失败:', error);
    } finally {
      setIsUploading(false);
    }
  }, [onUpload]);

  const removeFile = async (index: number) => {
    const file = uploadedFiles[index];
    if (file.filePath) {
      try {
        await deleteResume(file.filePath);
      } catch (error) {
        console.error('文件删除失败:', error);
        return;
      }
    }
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true,
    disabled: isUploading
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : isUploading
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 hover:border-gray-400'
          }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-500">将文件放在这里...</p>
        ) : isUploading ? (
          <p className="text-gray-500">正在上传...</p>
        ) : (
          <>
            <p className="text-gray-600 mb-4">拖拽 PDF 文件到这里或点击上传</p>
            <button
              type="button"
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={e => e.stopPropagation()}
              disabled={isUploading}
            >
              选择文件
            </button>
          </>
        )}
      </div>

      {/* 已上传文件列表 */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">已上传文件</h3>
          <ul className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
              >
                <div className="flex-1 mr-4">
                  <span className="text-sm text-gray-600">{file.name}</span>
                  {file.error ? (
                    <p className="text-xs text-red-500 mt-1">{file.error}</p>
                  ) : file.progress !== undefined && file.progress < 100 ? (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 disabled:opacity-50"
                  disabled={isUploading}
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 