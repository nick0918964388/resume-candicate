'use client';

import React, { useState, useEffect } from 'react';
import ResumeUploader from '@/components/ResumeUploader';
import { uploadResume } from '@/lib/services/upload';
import { analyzeAllResumes, getAnalysisResults } from '@/lib/services/analysis';
import { supabase } from '@/lib/supabase';

interface AnalysisResult {
  id: string;
  resume_name: string;
  resume_tech_skills: string;
  resume_experience: string;
  resume_education: string;
  file_url: string;
  iscandidate: boolean;
}

export default function Home() {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [selectedResumes, setSelectedResumes] = useState<string[]>([]);
  const [availableResumes, setAvailableResumes] = useState<AnalysisResult[]>([]);
  const [conditions, setConditions] = useState({
    mandatory: '',
    optional: '',
    excluded: ''
  });

  // 添加分析選項的狀態
  const [analysisOptions, setAnalysisOptions] = useState({
    skills: true,
    experience: true,
    education: true,
    projects: false
  });

  // 加載已有的分析結果
  useEffect(() => {
    loadAnalysisResults();
  }, []);

  // 加載所有簡歷
  useEffect(() => {
    loadAllResumes();
  }, []);

  // 加載所有簡歷（包括未分析的）
  const loadAllResumes = async () => {
    try {
      const { data, error } = await supabase
        .from('resume')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableResumes(data || []);
    } catch (error) {
      console.error('加載簡歷失敗:', error);
    }
  };

  const loadAnalysisResults = async () => {
    try {
      const results = await getAnalysisResults();
      setAnalysisResults(results);
    } catch (error) {
      console.error('加載分析結果失敗:', error);
    }
  };

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    setUploadError(null);
    
    try {
      console.log('開始處理文件上傳，文件數量:', files.length);
      
      const uploadPromises = files.map(async (file) => {
        try {
          console.log(`開始上傳文件: ${file.name}`);
          const result = await uploadResume(file);
          console.log(`文件 ${file.name} 上傳成功:`, result);
          return result;
        } catch (error) {
          console.error(`文件 ${file.name} 上傳失敗:`, error);
          throw error;
        }
      });

      await Promise.all(uploadPromises);
      await loadAnalysisResults(); // 重新加載結果列表
      
    } catch (error) {
      console.error('上傳過程中發生錯誤:', error);
      let errorMessage = '上傳失敗，請重試';
      
      if (error instanceof Error) {
        if (error.message.includes('Storage')) {
          errorMessage = '文件存儲失敗，請檢查文件大小和格式';
        } else if (error.message.includes('數據庫')) {
          errorMessage = '文件信息保存失敗，請重試';
        } else {
          errorMessage = error.message;
        }
      }
      
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // 處理簡歷選擇
  const handleResumeSelect = (resumeId: string) => {
    setSelectedResumes(prev => 
      prev.includes(resumeId)
        ? prev.filter(id => id !== resumeId)
        : [...prev, resumeId]
    );
  };

  const handleAnalyze = async () => {
    if (selectedResumes.length === 0) {
      alert('請選擇至少一份簡歷進行分析');
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysisConditions = {
        mandatory: conditions.mandatory.split(',').map(s => s.trim()),
        optional: conditions.optional.split(',').map(s => s.trim()),
        excluded: conditions.excluded.split(',').map(s => s.trim()),
        options: analysisOptions,
        resumeIds: selectedResumes // 傳遞選中的簡歷 ID
      };

      const results = await analyzeAllResumes(analysisConditions);
      console.log('分析完成:', results);
      await loadAnalysisResults();
      await loadAllResumes(); // 重新加載所有簡歷
    } catch (error) {
      console.error('分析失敗:', error);
      alert('簡歷分析失敗，請重試');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleViewResume = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">简历分析系统</h1>
        
        {/* 上传区域 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">上传简历</h2>
          {uploadError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600">{uploadError}</p>
            </div>
          )}
          <ResumeUploader onUpload={handleUpload} />
        </div>

        {/* 簡歷選擇區域 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">选择简历</h2>
          <div className="space-y-2">
            {availableResumes.map(resume => (
              <label key={resume.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  checked={selectedResumes.includes(resume.id)}
                  onChange={() => handleResumeSelect(resume.id)}
                />
                <span className="ml-2 text-sm text-gray-600">{resume.resume_name}</span>
                {resume.iscandidate && (
                  <span className="ml-2 text-xs text-gray-500">(已分析)</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* 条件设置区域 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">筛选条件</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">必要条件</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="输入必要条件，如：JavaScript, React"
                value={conditions.mandatory}
                onChange={(e) => setConditions(prev => ({ ...prev, mandatory: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">加分条件</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="输入加分条件，如：TypeScript, Node.js"
                value={conditions.optional}
                onChange={(e) => setConditions(prev => ({ ...prev, optional: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排除条件</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="输入排除条件"
                value={conditions.excluded}
                onChange={(e) => setConditions(prev => ({ ...prev, excluded: e.target.value }))}
              />
            </div>

            {/* 添加分析選項 */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">分析选项</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    checked={analysisOptions.skills}
                    onChange={(e) => setAnalysisOptions(prev => ({ ...prev, skills: e.target.checked }))}
                  />
                  <span className="ml-2 text-sm text-gray-600">技能分析</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    checked={analysisOptions.experience}
                    onChange={(e) => setAnalysisOptions(prev => ({ ...prev, experience: e.target.checked }))}
                  />
                  <span className="ml-2 text-sm text-gray-600">工作经验</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    checked={analysisOptions.education}
                    onChange={(e) => setAnalysisOptions(prev => ({ ...prev, education: e.target.checked }))}
                  />
                  <span className="ml-2 text-sm text-gray-600">教育背景</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    checked={analysisOptions.projects}
                    onChange={(e) => setAnalysisOptions(prev => ({ ...prev, projects: e.target.checked }))}
                  />
                  <span className="ml-2 text-sm text-gray-600">项目经验</span>
                </label>
              </div>
            </div>

            <button 
              className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isAnalyzing || isUploading}
              onClick={handleAnalyze}
            >
              {isAnalyzing ? '分析中...' : '开始分析'}
            </button>
          </div>
        </div>

        {/* 分析结果区域 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">分析结果</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">技能</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">经验</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">教育背景</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analysisResults.length > 0 ? (
                  analysisResults.map((result) => (
                    <tr key={result.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.resume_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.resume_tech_skills}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.resume_experience}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {result.resume_education}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => handleViewResume(result.file_url)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          查看简历
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      暂无分析结果
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
