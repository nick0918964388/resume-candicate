'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ResumeUploader from '@/components/ResumeUploader';
import { uploadResume, deleteResume, downloadResume } from '@/lib/services/upload';
import { 
  analyzeAllResumes, 
  getAnalysisResults, 
  clearAllAnalysis, 
  updateSelectedStatus, 
  getSelectedCandidates,
  saveAIRecommendation,
  getAIRecommendationHistory
} from '@/lib/services/analysis';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import debounce from 'lodash/debounce';
import { Loader2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import ExpandableText from '@/components/ExpandableText';
import { getAIRecommendations } from '@/lib/openAIClient';
import { createProject, getAllProjects, Project, deleteProject } from '@/lib/services/project';
import { generateInterviewQuestions } from '@/lib/openAIClient';

interface AnalysisResult {
  id: string;
  resume_name: string;
  resume_tech_skills: string;
  resume_experience: string;
  resume_education: string;
  file_url: string;
  file_path: string;
  iscandidate: boolean;
  score?: number;
  created_at: string;
  url?: string;
  is_selected: boolean;
  selected_at: string | null;
  selected_note: string | null;
  analyzed_at?: string;
  display_name?: string;
  resume_projects?: string;
}

// 添加在檔案開頭的介面定義部分
interface Recommendation {
  name: string;
  score: number;
  reason: string;
  matching_points: string[];
  concerns: string[];
}

// 添加排序用的介面
interface CandidateWithRecommendation extends AnalysisResult {
  recommendation: Recommendation | null;
  sortPriority: number;
  aiScore: number;
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
    optional: 'C語言, 前端框架, CI/CD知識 , Docker',
    excluded: ''
  });

  // 添加分析選項的狀態
  const [analysisOptions, setAnalysisOptions] = useState({
    skills: true,
    experience: true,
    education: true,
    projects: false
  });

  // 添加篩選狀態
  const [showAnalyzedOnly, setShowAnalyzedOnly] = useState(true);

  // 添加新的狀態
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<'resume_name' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 10;

  // 添加進度狀態
  const [uploadProgress, setUploadProgress] = useState(0);

  // 添加分析進度狀態
  const [analyzedCount, setAnalyzedCount] = useState(0);

  // 添加新的狀態
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [finalCandidates, setFinalCandidates] = useState<AnalysisResult[]>([]);

  // 添加新的狀態
  const [analyzedSortField, setAnalyzedSortField] = useState<'resume_name' | 'score' | 'created_at'>('created_at');
  const [analyzedSortDirection, setAnalyzedSortDirection] = useState<'asc' | 'desc'>('desc');
  const [scoreFilter, setScoreFilter] = useState<number>(0);

  // 添加新的狀態
  const [selectedNote, setSelectedNote] = useState<string>('');

  // 添加新的狀態
  const [hideSelected, setHideSelected] = useState(false);

  // 添加已選擇清單的搜尋和排序狀態
  const [selectedListSearchTerm, setSelectedListSearchTerm] = useState('');
  const [selectedListSortField, setSelectedListSortField] = useState<'resume_name' | 'score' | 'selected_at' | 'remark_length'>('selected_at');
  const [selectedListSortDirection, setSelectedListSortDirection] = useState<'asc' | 'desc'>('desc');

  // 添加編輯備註的狀態
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  // 添加新的狀態
  const [requirements, setRequirements] = useState('');
  const [isAnalyzingRecommendations, setIsAnalyzingRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<any>(null);

  // 添加新的狀態
  const [recommendationHistory, setRecommendationHistory] = useState<any[]>([]);

  // 添加新的狀態
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  // 添加新的狀態
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // 在現有的 state 定義中添加
  const [showInterviewQuestions, setShowInterviewQuestions] = useState<string | null>(null);
  const [interviewQuestions, setInterviewQuestions] = useState<any>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // 在頁面載入時獲取專案列表
  useEffect(() => {
    loadProjects();
  }, []);

  // 載入專案列表
  const loadProjects = async () => {
    try {
      const projectsData = await getAllProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('載入專案列表失敗:', error);
    }
  };

  // 創建新專案
  const handleCreateProject = async () => {
    try {
      if (!newProjectName.trim()) {
        alert('請輸入專案名稱');
        return;
      }

      const project = await createProject(newProjectName, newProjectDescription);
      setProjects(prev => [project, ...prev]);
      setCurrentProject(project);
      setShowNewProjectModal(false);
      setNewProjectName('');
      setNewProjectDescription('');
    } catch (error) {
      console.error('創建專案失敗:', error);
      alert('創建專案失敗，請重試');
    }
  };

  // 添加預設的推薦需求範本
  const recommendationTemplates = [
    {
      label: "SCO範本",
      text: "請幫我把人選的技能經驗經歷來排序，找出最適合科技軟體公司的人選，主要要有潛力，經歷越豐富越好，備註有SCO的可以較為優先"
    },
    {
      label: "前端開發人才",
      text: "請幫我分析這些候選人，找出最適合前端開發職位的人選。重點關注React、Vue等前端框架經驗，以及網頁開發相關技能。UI/UX設計經驗為加分項。"
    },
    {
      label: "後端開發人才",
      text: "請分析並推薦最適合後端開發職位的候選人。需要具備資料庫設計、API開發經驗，重視系統架構能力和效能優化經驗。雲端服務經驗為加分項。"
    },
    {
      label: "全端工程師",
      text: "尋找具備全端開發能力的人才，前後端技能均需扎實。特別注重系統整合經驗、架構設計能力，以及獨立開發專案的經驗。DevOps經驗為加分項。"
    }
  ];

  // 添加處理按鍵事件的函數
  const handleNoteKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>, candidateId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleSaveNote(candidateId);
    } else if (e.key === 'Escape') {
      setEditingNote(null);
      setEditingNoteContent('');
    }
  };

  // 加載已有的分析結果
  useEffect(() => {
    loadAnalysisResults();
  }, []);

  // 加載所有簡歷
  useEffect(() => {
    loadAllResumes();
  }, []);

  // 加載已選擇候選人
  useEffect(() => {
    loadSelectedCandidates();
  }, []);

  // 加載所有簡歷
  const loadAllResumes = async () => {
    try {
      if (!currentProject) return;  // 如果沒有選擇專案，直接返回
      
      const { data, error } = await supabase
        .from('resume')
        .select('*')
        .eq('project_id', currentProject.id)  // 添加專案過濾
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableResumes(data || []);
    } catch (error) {
      console.error('加載簡歷失敗:', error);
    }
  };

  const loadAnalysisResults = async () => {
    try {
      if (!currentProject) return;  // 如果沒有選擇專案，直接返回
      
      const { data, error } = await supabase
        .from('resume')
        .select('*')
        .eq('project_id', currentProject.id)  // 添加專案過濾
        .eq('iscandidate', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnalysisResults(data || []);
    } catch (error) {
      console.error('加載分析結果失敗:', error);
    }
  };

  const handleUpload = useCallback(
    debounce(async (files: File[]) => {
      if (!currentProject) {
        alert('請先選擇專案');
        return;
      }
      
    setIsUploading(true);
    setUploadError(null);
      setUploadProgress(0);
      
      try {
        const totalFiles = files.length;
        let completedFiles = 0;

        for (const file of files) {
          try {
            await uploadResume(file, currentProject.id);  // 傳入 project_id
            completedFiles++;
            setUploadProgress((completedFiles / totalFiles) * 100);
        } catch (error) {
          console.error(`文件 ${file.name} 上傳失敗:`, error);
          throw error;
        }
        }

        await loadAllResumes();
    } catch (error) {
      console.error('上傳過程中發生錯誤:', error);
        setUploadError(error instanceof Error ? error.message : '上傳失敗，請重試');
    } finally {
      setIsUploading(false);
        setTimeout(() => setUploadProgress(0), 1000);
    }
    }, 300),
    [currentProject]  // 添加 currentProject 作為依賴
  );

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
    setAnalyzedCount(0);
    try {
      const analysisConditions = {
        mandatory: conditions.mandatory.split(',').map(s => s.trim()),
        optional: conditions.optional.split(',').map(s => s.trim()),
        excluded: conditions.excluded.split(',').map(s => s.trim()),
        options: analysisOptions,
        resumeIds: selectedResumes,
        onProgress: (count: number) => setAnalyzedCount(count)
      };

      await analyzeAllResumes(analysisConditions);
      await loadAnalysisResults();
      await loadAllResumes();
      
      // 顯示成功訊息
      alert(`已完成 ${selectedResumes.length} 份履歷的分析`);
      
      // 清空選擇的履歷
      setSelectedResumes([]);
      
      // 切換到已分析履歷頁面
      const tabsElement = document.querySelector('[value="analyzed"]') as HTMLElement;
      if (tabsElement) {
        tabsElement.click();
      }
      
    } catch (error) {
      console.error('分析失敗:', error);
      alert('簡歷分析失敗，請重試');
    } finally {
      setIsAnalyzing(false);
      setAnalyzedCount(0);
    }
  };

  // 修改 handleViewResume 函數為 handleDownloadResume
  const handleDownloadResume = async (filePath: string) => {
    try {
      const result = await downloadResume(filePath);
      if (!result.success) {
        throw result.error;
      }
    } catch (error) {
      console.error('下載履歷失敗:', error);
      alert('下載失敗，請重試');
    }
  };

  // 添加刪除處理函數
  const handleDeleteResume = async (resume: AnalysisResult) => {
    if (!confirm(`確定要刪除 ${resume.resume_name} 嗎？`)) {
      return;
    }

    try {
      await deleteResume(resume.file_path);
      // 重新載入履歷列表
      await loadAllResumes();
      // 如果該履歷有分析結果，也重新載入分析結果
      await loadAnalysisResults();
    } catch (error) {
      console.error('刪除失敗:', error);
      alert('刪除失敗，請重試');
    }
  };

  // 添加排序函數
  const handleSort = (field: 'resume_name' | 'created_at') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 過濾和排序履歷
  const filteredResumes = availableResumes
    .filter(resume => 
      resume.resume_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortField === 'resume_name') {
        return sortDirection === 'asc' 
          ? a.resume_name.localeCompare(b.resume_name)
          : b.resume_name.localeCompare(a.resume_name);
      } else {
        return sortDirection === 'asc'
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // 計算分頁
  const totalPages = Math.ceil(filteredResumes.length / itemsPerPage);
  const paginatedResumes = filteredResumes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 添加全選/清除功能
  const handleBatchSelect = (selectAll: boolean) => {
    if (selectAll) {
      // 獲取所有未分析的履歷 ID
      const unanalyzedIds = availableResumes
        .filter(resume => !showAnalyzedOnly || !resume.iscandidate)
        .map(resume => resume.id);
      setSelectedResumes(unanalyzedIds);
    } else {
      // 清除所有選擇
      setSelectedResumes([]);
    }
  };

  // 添加清除評分的處理函數
  const handleClearAllAnalysis = async () => {
    if (!confirm('確定要清除所有履歷的評分結果嗎？')) {
      return;
    }
    
    try {
      await clearAllAnalysis();
      await loadAnalysisResults();
      await loadAllResumes();
      alert('已清除所有評分結果');
    } catch (error) {
      console.error('清除評分失敗:', error);
      alert('清除評分失敗，請重試');
    }
  };

  // 添加候選人選擇處理函數
  const handleCandidateSelect = (candidateId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  // 添加確認候選人的處理函數
  const handleConfirmCandidates = async () => {
    try {
      const newCandidates = analysisResults.filter(result => 
        selectedCandidates.includes(result.id)
      );
      
      // 檢查是否有重複的候選人
      const duplicates = newCandidates.filter(newCandidate => 
        finalCandidates.some(existing => existing.id === newCandidate.id)
      );

      if (duplicates.length > 0) {
        alert(`以下履歷已在已選擇人選清單中：\n${duplicates.map(d => d.resume_name).join('\n')}`);
        return;
      }

      // 更新資料庫
      for (const candidate of newCandidates) {
        await updateSelectedStatus(candidate.id, true, selectedNote);
      }

      // 重新載入已選擇的候選人
      await loadSelectedCandidates();
      setSelectedCandidates([]); // 清空選擇
      setSelectedNote(''); // 清空備註
      alert(`已成功加入 ${newCandidates.length} 位候選人至已選擇人選清單`);
    } catch (error) {
      console.error('更新已選擇人選失敗:', error);
      alert('更新失敗，請重試');
    }
  };

  // 添加移除候選人的處理函數
  const handleRemoveCandidate = async (candidateId: string) => {
    try {
      await updateSelectedStatus(candidateId, false);
      await loadSelectedCandidates(); // 重新載入已選擇的候選人
    } catch (error) {
      console.error('移除候選人失敗:', error);
      alert('移除失敗，請重試');
    }
  };

  // 添加排序處理函數
  const handleAnalyzedSort = (field: 'resume_name' | 'score' | 'created_at') => {
    if (analyzedSortField === field) {
      setAnalyzedSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setAnalyzedSortField(field);
      setAnalyzedSortDirection('asc');
    }
  };

  // 添加載入已選擇候選人的函數
  const loadSelectedCandidates = async () => {
    try {
      if (!currentProject) return;  // 如果沒有選擇專案，直接返回
      
      const selectedData = await getSelectedCandidates(currentProject.id);  // 修改函數調用
      setFinalCandidates(selectedData);
    } catch (error) {
      console.error('載入已選擇人選失敗:', error);
    }
  };

  // 添加已選擇清單的排序處理函數
  const handleSelectedListSort = (field: 'resume_name' | 'score' | 'selected_at' | 'remark_length') => {
    if (selectedListSortField === field) {
      setSelectedListSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSelectedListSortField(field);
      setSelectedListSortDirection('asc');
    }
  };

  // 添加儲存備註的處理函數
  const handleSaveNote = async (candidateId: string) => {
    try {
      await updateSelectedStatus(candidateId, true, editingNoteContent);
      await loadSelectedCandidates(); // 重新載入資料
      setEditingNote(null); // 關閉編輯模式
      setEditingNoteContent(''); // 清空編輯內容
    } catch (error) {
      console.error('儲存備註失敗:', error);
      alert('儲存失敗，請重試');
    }
  };

  // 添加處理推薦的函數
  const handleGetRecommendations = async () => {
    if (!currentProject) {
      alert('請先選擇專案');
      return;
    }

    try {
      setIsAnalyzingRecommendations(true);
      const result = await getAIRecommendations(finalCandidates, requirements);
      setRecommendations(result);

      // 添加：儲存推薦結果
      await saveAIRecommendation(
        requirements,
        result,
        new Date().toISOString(),
        currentProject.id
      );

      // 重新載入推薦歷史
      await loadRecommendationHistory();
    } catch (error) {
      console.error('獲取推薦失敗:', error);
      alert('分析過程發生錯誤，請重試');
    } finally {
      setIsAnalyzingRecommendations(false);
    }
  };

  // 確保在組件初始化時載入推薦歷史
  useEffect(() => {
    if (currentProject) {
      loadRecommendationHistory();
    }
  }, [currentProject]);

  // 添加載入推薦歷史的函數
  const loadRecommendationHistory = async () => {
    try {
      if (!currentProject) return;
      const history = await getAIRecommendationHistory(currentProject.id);
      setRecommendationHistory(history);
    } catch (error) {
      console.error('載入推薦歷史失敗:', error);
    }
  };

  // 修改 useEffect 的依賴
  useEffect(() => {
    if (currentProject) {
      loadAllResumes();
      loadAnalysisResults();
      loadSelectedCandidates();
      loadRecommendationHistory();
    } else {
      // 當沒有選擇專案時，清空所有資料
      setAvailableResumes([]);
      setAnalysisResults([]);
      setFinalCandidates([]);
      setRecommendationHistory([]);
      setRecommendations(null);
    }
  }, [currentProject]); // 添加 currentProject 作為依賴

  // 修改專案選擇的處理函數
  const handleProjectChange = async (projectId: string) => {
    setIsLoading(true);
    try {
      const project = projects.find(p => p.id === projectId);
      setCurrentProject(project || null);
    } finally {
      // 使用 setTimeout 來確保 loading 效果至少顯示一段時間
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  };

  // 添加刪除專案的處理函數
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    
    try {
      setIsLoading(true);
      await deleteProject(projectToDelete.id);
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      if (currentProject?.id === projectToDelete.id) {
        setCurrentProject(null);
      }
      setShowDeleteConfirm(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('刪除專案失敗:', error);
      alert('刪除專案失敗，請重試');
    } finally {
      setIsLoading(false);
    }
  };

  // 修改 handleGenerateQuestions 函數
  const handleGenerateQuestions = async (candidate: any) => {
    try {
      setInterviewQuestions(null);
      setIsGeneratingQuestions(true);
      
      // 先取得完整的候選人資料
      let fullCandidate = null;
      console.log('candidate:', candidate);
      // 如果是從推薦列表點擊的
      if (candidate.name) {
        // 標準化名稱比對
        const normalizeFileName = (name: string) => {
          return name
            .replace(/\.pdf$/i, '')  // 移除 .pdf 副檔名
            .replace(/\s+/g, '')     // 移除空格
            .toLowerCase();          // 轉小寫
        };

        const targetName = normalizeFileName(candidate.name);
        console.log('finalCandidates:', finalCandidates);
        fullCandidate = finalCandidates.find(c => {
          const resumeName = normalizeFileName(c.resume_name);
          const displayName = c.display_name ? normalizeFileName(c.display_name) : '';
          
          // 除了完全匹配外，也檢查是否包含目標名稱
          return resumeName === targetName || 
                 displayName === targetName || 
                 resumeName.includes(targetName) || 
                 displayName.includes(targetName);
        });
        console.log('fullCandidate:', fullCandidate);
        // 如果還是找不到，輸出一些調試信息
        if (!fullCandidate) {
          console.log('目標名稱:', targetName);
          console.log('可用的候選人名稱:', finalCandidates.map(c => ({
            resume_name: normalizeFileName(c.resume_name),
            display_name: c.display_name ? normalizeFileName(c.display_name) : ''
          })));
        }
      } else {
        // 如果已經是完整的候選人資料
        fullCandidate = candidate;
        console.log('fullCandidate:', fullCandidate);
      }

      if (!fullCandidate) {
        throw new Error('找不到候選人完整資料');
      }

      // 設置要顯示的名稱（使用原始推薦中的名稱）
      console.log('candidate.name:', candidate.name);
      console.log('fullCandidate.display_name:', fullCandidate.display_name);
      console.log('fullCandidate.resume_name:', fullCandidate.resume_name);
      // 移除.pdf結尾
      const displayName = (candidate.name || '').replace(/\.pdf$/i, '');
      setShowInterviewQuestions(displayName || candidate.name || fullCandidate.display_name || fullCandidate.resume_name);

      // 準備候選人資料
      const candidateInfo = {
        skills: fullCandidate.resume_tech_skills || '',
        experience: fullCandidate.resume_experience || '',
        education: fullCandidate.resume_education || '',
        projects: fullCandidate.resume_projects || ''
      };

      // 驗證資料
      const hasValidData = Object.values(candidateInfo).some(value => 
        value && value.trim() !== '' && value !== '無'
      );

      if (!hasValidData) {
        throw new Error('候選人資料不完整，無法生成面試問題');
      }

      // 生成面試問題
      const result = await generateInterviewQuestions(
        candidateInfo,
        (progress) => {
          if (progress && progress.questions) {
            setInterviewQuestions(progress);
          }
        }
      );

      setInterviewQuestions(result);
    } catch (error) {
      console.error('生成面試問題失敗:', error);
      alert(error instanceof Error ? error.message : '生成面試問題時發生錯誤，請稍後再試');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      {/* 修改標題區域 */}
      <div className="flex flex-col space-y-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-800">SCO AI履歷分析系統</h1>
        
        {/* 專案選擇和操作 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <select
              value={currentProject?.id || ''}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="px-4 py-2 border rounded-md"
              disabled={isLoading}
            >
              <option value="">選擇專案</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_name}
                </option>
              ))}
            </select>
            {currentProject && (
              <button
                onClick={() => {
                  setProjectToDelete(currentProject);
                  setShowDeleteConfirm(true);
                }}
                className="px-4 py-2 text-red-600 hover:text-red-800"
                disabled={isLoading}
              >
                刪除專案
              </button>
            )}
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              disabled={isLoading}
            >
              新增專案
            </button>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
            </div>
          )}

      {/* 刪除確認 Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-semibold mb-4">確認刪除專案</h2>
            <p className="text-gray-600 mb-4">
              確定要刪除專案「{projectToDelete?.project_name}」嗎？
              此操作將會刪除所有相關的履歷和分析記錄，且無法復原。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setProjectToDelete(null);
                }}
                className="px-4 py-2 border rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleDeleteProject}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                確認刪除
              </button>
        </div>
          </div>
        </div>
      )}

      {/* 只有在選擇專案後才顯示功能頁面 */}
      {currentProject ? (
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="upload">履歷上傳</TabsTrigger>
            <TabsTrigger value="analysis">AI履歷分析</TabsTrigger>
            <TabsTrigger value="analyzed">已分析履歷</TabsTrigger>
            <TabsTrigger value="selected">人選手動挑選</TabsTrigger>
            <TabsTrigger value="ai-recommend">AI智能推薦</TabsTrigger>
          </TabsList>

          {/* 履歷上傳頁面 */}
          <TabsContent value="upload">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">上傳履歷</h2>
              <div className="space-y-6">
                <ResumeUploader
                  isUploading={isUploading}
                  onUpload={handleUpload}
                  error={uploadError}
                  progress={uploadProgress}
                />
                
                {/* 已上傳履歷列表 */}
                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-4">
                      <h2 className="text-2xl font-semibold text-gray-800">已上傳履歷清單</h2>
                      <span className="text-sm text-gray-600">
                        共 {paginatedResumes.length} / {filteredResumes.length} 筆資料
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <input
                        type="text"
                        placeholder="搜尋履歷..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1); // 重置頁碼
                        }}
                        className="px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>
                  
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('resume_name')}
                        >
                          檔案名稱
                          {sortField === 'resume_name' && (
                            <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => handleSort('created_at')}
                        >
                          上傳時間
                          {sortField === 'created_at' && (
                            <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedResumes.map((resume) => (
                        <tr key={resume.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {resume.display_name || resume.resume_name}  {/* 優先使用 display_name */}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(resume.created_at).toLocaleString('zh-TW')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {resume.iscandidate ? '已分析' : '未分析'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap space-x-2">
                            <button
                              onClick={() => handleDownloadResume(resume.file_path)}
                              className="text-blue-600 hover:text-blue-800 mr-2"
                            >
                              下載
                            </button>
                            <button
                              onClick={() => handleDeleteResume(resume)}
                              className="text-red-600 hover:text-red-800"
                            >
                              刪除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* 分頁控制 */}
                  <div className="mt-4 flex justify-between items-center">
                    <div className="text-sm text-gray-700">
                      顯示 {(currentPage - 1) * itemsPerPage + 1} 到{' '}
                      {Math.min(currentPage * itemsPerPage, filteredResumes.length)} 筆，
                      共 {filteredResumes.length} 筆
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border rounded-md disabled:opacity-50"
                      >
                        上一頁
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 border rounded-md ${
                            currentPage === page ? 'bg-blue-500 text-white' : ''
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border rounded-md disabled:opacity-50"
                      >
                        下一頁
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 履歷分析頁面 */}
          <TabsContent value="analysis">
            <div className="space-y-8">
              {/* 分析條件設定 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">分析條件</h2>
                
                {/* 履歷選擇 */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium text-gray-700">選擇要分析的履歷</h3>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                          checked={showAnalyzedOnly}
                          onChange={(e) => setShowAnalyzedOnly(e.target.checked)}
                          className="form-checkbox h-4 w-4 text-blue-600"
                        />
                        <span className="text-sm text-gray-600">隱藏已分析的履歷</span>
                      </label>
                      <button
                        onClick={() => handleBatchSelect(true)}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        全選未分析履歷
                      </button>
                      <button
                        onClick={() => handleBatchSelect(false)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                      >
                        清除選擇
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableResumes
                      .filter(resume => !showAnalyzedOnly || !resume.iscandidate)
                      .map((resume) => (
                        <label 
                          key={resume.id} 
                          className={`flex items-center space-x-3 p-2 rounded-md ${
                            resume.iscandidate ? 'bg-blue-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                  checked={selectedResumes.includes(resume.id)}
                  onChange={() => handleResumeSelect(resume.id)}
                            className="form-checkbox h-5 w-5 text-blue-600"
                />
                          <div className="flex flex-col">
                            <span className="text-sm">{resume.display_name || resume.resume_name}</span>
                {resume.iscandidate && (
                              <span className="text-xs text-blue-600">
                                已分析 - {new Date(resume.created_at).toLocaleDateString('zh-TW')}
                              </span>
                )}
                          </div>
              </label>
            ))}
          </div>
        </div>

                {/* 分析條件輸入 */}
          <div className="space-y-4">
            <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">必要條件</label>
              <input
                type="text"
                value={conditions.mandatory}
                onChange={(e) => setConditions(prev => ({ ...prev, mandatory: e.target.value }))}
                      className="w-full p-2 border rounded-md"
                      placeholder="請輸入必要條件，用逗號分隔"
              />
            </div>
            <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">加分條件</label>
              <input
                type="text"
                value={conditions.optional}
                onChange={(e) => setConditions(prev => ({ ...prev, optional: e.target.value }))}
                      className="w-full p-2 border rounded-md"
                      placeholder="請輸入加分條件，用逗號分隔"
              />
            </div>
            <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">排除條件</label>
              <input
                type="text"
                value={conditions.excluded}
                onChange={(e) => setConditions(prev => ({ ...prev, excluded: e.target.value }))}
                      className="w-full p-2 border rounded-md"
                      placeholder="請輸入排除條件，用逗號分隔"
              />
                  </div>
            </div>

                <button 
                  className="mt-6 bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2"
                  disabled={isAnalyzing || selectedResumes.length === 0}
                  onClick={handleAnalyze}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>分析中...</span>
                    </>
                  ) : (
                    <span>開始分析</span>
                  )}
                </button>
              </div>

              {/* 只顯示分析進度 */}
              {isAnalyzing && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-gray-600">
                    正在分析履歷 ({analyzedCount}/{selectedResumes.length})
                  </p>
                  <div className="w-full max-w-md">
                    <Progress 
                      value={(analyzedCount / selectedResumes.length) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 新增：已分析履歷頁面 */}
          <TabsContent value="analyzed">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                  <h2 className="text-2xl font-semibold text-gray-800">已分析履歷清單</h2>
                  <span className="text-sm text-gray-600">
                    顯示 {analysisResults
                      .filter(result => !hideSelected || !result.is_selected)
                      .filter(result => (result.score || 0) >= scoreFilter)
                      .length} / {analysisResults.length} 筆資料
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                      checked={hideSelected}
                      onChange={(e) => setHideSelected(e.target.checked)}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-600">隱藏已選擇人選</span>
                </label>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">最低分數：</label>
                    <select
                      value={scoreFilter}
                      onChange={(e) => setScoreFilter(Number(e.target.value))}
                      className="border rounded-md px-2 py-1"
                    >
                      <option value={0}>全部</option>
                      <option value={60}>60 分以上</option>
                      <option value={70}>70 分以上</option>
                      <option value={80}>80 分以上</option>
                      <option value={90}>90 分以上</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleClearAllAnalysis}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  清除所有評分結果
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        序號
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleAnalyzedSort('resume_name')}
                      >
                        姓名
                        {analyzedSortField === 'resume_name' && (
                          <span className="ml-1">{analyzedSortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleAnalyzedSort('score')}
                      >
                        分數
                        {analyzedSortField === 'score' && (
                          <span className="ml-1">{analyzedSortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">技能</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">經驗</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">教育背景</th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleAnalyzedSort('created_at')}
                      >
                        分析時間
                        {analyzedSortField === 'created_at' && (
                          <span className="ml-1">{analyzedSortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">備註</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analysisResults
                      // 先過濾已選擇的人選
                      .filter(result => !hideSelected || !result.is_selected)
                      // 再過濾分數
                      .filter(result => (result.score || 0) >= scoreFilter)
                      // 然後排序
                      .sort((a, b) => {
                        if (analyzedSortField === 'resume_name') {
                          return analyzedSortDirection === 'asc'
                            ? a.resume_name.localeCompare(b.resume_name)
                            : b.resume_name.localeCompare(a.resume_name);
                        } else if (analyzedSortField === 'score') {
                          const scoreA = a.score || 0;
                          const scoreB = b.score || 0;
                          return analyzedSortDirection === 'asc'
                            ? scoreA - scoreB
                            : scoreB - scoreA;
                        } else {
                          // 使用 analyzed_at 替代 created_at
                          const timeA = a.analyzed_at ? new Date(a.analyzed_at).getTime() : 0;
                          const timeB = b.analyzed_at ? new Date(b.analyzed_at).getTime() : 0;
                          return analyzedSortDirection === 'asc'
                            ? timeA - timeB
                            : timeB - timeA;
                        }
                      })
                      .map((result, index) => (
                        <tr key={result.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                              checked={selectedCandidates.includes(result.id)}
                              onChange={() => handleCandidateSelect(result.id)}
                              className="mr-2"
                            />
                            {result.display_name || result.resume_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">
                            {result.score ? (
                              <span className={`${
                                result.score >= 80 ? 'text-green-600' : 
                                result.score >= 60 ? 'text-yellow-600' : 
                                'text-red-600'
                              }`}>
                                {result.score}分
                              </span>
                            ) : '無分數'}
                          </td>
                          <td className="px-6 py-4">{result.resume_tech_skills || '無資料'}</td>
                          <td className="px-6 py-4">{result.resume_experience || '無資料'}</td>
                          <td className="px-6 py-4">{result.resume_education || '無資料'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {result.analyzed_at 
                              ? new Date(result.analyzed_at).toLocaleString('zh-TW')
                              : '尚未分析'}
                          </td>
                          <td className="px-6 py-4">
                            {editingNote === result.id ? (
                  <input
                                type="text"
                                value={editingNoteContent}
                                onChange={(e) => setEditingNoteContent(e.target.value)}
                                onKeyDown={(e) => handleNoteKeyDown(e, result.id)}
                                onBlur={() => handleSaveNote(result.id)}
                                className="w-full p-2 border rounded-md"
                                autoFocus
                              />
                            ) : (
                              <div 
                                className="flex items-center group cursor-pointer"
                                onClick={() => {
                                  setEditingNote(result.id);
                                  setEditingNoteContent(result.selected_note || '');
                                }}
                              >
                                <span className="flex-1">
                                  {result.selected_note || '無備註'}
                                </span>
                                <button
                                  className="opacity-0 group-hover:opacity-100 ml-2 text-blue-600 hover:text-blue-800"
                                >
                                  編輯
                                </button>
              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap space-x-2">
                            <button
                              onClick={() => handleDownloadResume(result.file_path)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              下載履歷
                            </button>
                            <button
                              onClick={() => handleRemoveCandidate(result.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              移除
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
            </div>

              {/* 添加確認按鈕區域 */}
              {selectedCandidates.length > 0 && (
                <div className="mt-4 space-y-4">
                  <div className="flex items-start space-x-4">
                    <textarea
                      value={selectedNote}
                      onChange={(e) => setSelectedNote(e.target.value)}
                      placeholder="添加備註（選填）"
                      className="flex-1 p-2 border rounded-md min-h-[80px]"
                    />
                  </div>
                  <div className="flex justify-end items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      已選擇 {selectedCandidates.length} 份履歷
                    </span>
            <button 
                      onClick={handleConfirmCandidates}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
                      加入已選擇人選清單
            </button>
          </div>
        </div>
              )}
            </div>
          </TabsContent>

          {/* 添加新的已選擇人選頁面 */}
          <TabsContent value="selected">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                  <h2 className="text-2xl font-semibold text-gray-800">已選擇人選清單</h2>
                  <span className="text-sm text-gray-600">
                    顯示 {finalCandidates
                      .filter(candidate => 
                        candidate.resume_name.toLowerCase().includes(selectedListSearchTerm.toLowerCase()) ||
                        (candidate.selected_note || '').toLowerCase().includes(selectedListSearchTerm.toLowerCase())
                      )
                      .length} / {finalCandidates.length} 筆資料
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    placeholder="搜尋姓名或備註..."
                    value={selectedListSearchTerm}
                    onChange={(e) => setSelectedListSearchTerm(e.target.value)}
                    className="border rounded-md px-3 py-1"
                  />
                </div>
              </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        序號
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSelectedListSort('resume_name')}
                      >
                        姓名
                        {selectedListSortField === 'resume_name' && (
                          <span className="ml-1">{selectedListSortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSelectedListSort('score')}
                      >
                        分數
                        {selectedListSortField === 'score' && (
                          <span className="ml-1">{selectedListSortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">技能</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">經驗</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">教育背景</th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSelectedListSort('selected_at')}
                      >
                        選擇時間
                        {selectedListSortField === 'selected_at' && (
                          <span className="ml-1">{selectedListSortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSelectedListSort('remark_length')}
                      >
                        備註
                        {selectedListSortField === 'remark_length' && (
                          <span className="ml-1">{selectedListSortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                    {finalCandidates
                      // 搜尋過濾（同時搜尋姓名和備註）
                      .filter(candidate => 
                        candidate.resume_name.toLowerCase().includes(selectedListSearchTerm.toLowerCase()) ||
                        (candidate.selected_note || '').toLowerCase().includes(selectedListSearchTerm.toLowerCase())
                      )
                      // 排序
                      .sort((a, b) => {
                        if (selectedListSortField === 'resume_name') {
                          return selectedListSortDirection === 'asc'
                            ? a.resume_name.localeCompare(b.resume_name)
                            : b.resume_name.localeCompare(a.resume_name);
                        } else if (selectedListSortField === 'score') {
                          const scoreA = a.score || 0;
                          const scoreB = b.score || 0;
                          return selectedListSortDirection === 'asc'
                            ? scoreA - scoreB
                            : scoreB - scoreA;
                        } else if (selectedListSortField === 'remark_length') {
                          // 特殊的備註排序邏輯
                          const remarkA = a.selected_note || '';
                          const remarkB = b.selected_note || '';
                          
                          // 檢查是否包含 'SCO'
                          const hasSCOA = remarkA.includes('SCO');
                          const hasSCOB = remarkB.includes('SCO');
                          
                          // 如果一個有 SCO 一個沒有，有 SCO 的排前面
                          if (hasSCOA && !hasSCOB) return selectedListSortDirection === 'asc' ? -1 : 1;
                          if (!hasSCOA && hasSCOB) return selectedListSortDirection === 'asc' ? 1 : -1;
                          
                          // 如果都有 SCO 或都沒有，則按照原來的邏輯排序
                          if (hasSCOA && hasSCOB) {
                            // 都有 SCO 的情況，按長度排序
                            return selectedListSortDirection === 'asc'
                              ? remarkA.length - remarkB.length
                              : remarkB.length - remarkA.length;
                          } else {
                            // 都沒有 SCO 的情況，保持在最後面，並按長度排序
                            return selectedListSortDirection === 'asc'
                              ? remarkA.length - remarkB.length
                              : remarkB.length - remarkA.length;
                          }
                        } else {
                          const timeA = a.selected_at ? new Date(a.selected_at).getTime() : 0;
                          const timeB = b.selected_at ? new Date(b.selected_at).getTime() : 0;
                          return selectedListSortDirection === 'asc'
                            ? timeA - timeB
                            : timeB - timeA;
                        }
                      })
                      .map((candidate, index) => (
                        <tr key={candidate.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {index + 1}
                      </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {candidate.display_name || candidate.resume_name}
                      </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium">
                            {candidate.score ? (
                              <span className={`${
                                candidate.score >= 80 ? 'text-green-600' : 
                                candidate.score >= 60 ? 'text-yellow-600' : 
                                'text-red-600'
                              }`}>
                                {candidate.score}分
                              </span>
                            ) : '無分數'}
                      </td>
                          <td className="px-6 py-4">
                            <ExpandableText 
                              text={candidate.resume_tech_skills || '無資料'} 
                              maxLength={50}
                            />
                      </td>
                          <td className="px-6 py-4">
                            <ExpandableText 
                              text={candidate.resume_experience || '無資料'} 
                              maxLength={100}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <ExpandableText 
                              text={candidate.resume_education || '無資料'} 
                              maxLength={50}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {candidate.selected_at ? new Date(candidate.selected_at).toLocaleString('zh-TW') : '無日期'}
                          </td>
                          <td className="px-6 py-4">
                            {editingNote === candidate.id ? (
                              <input
                                type="text"
                                value={editingNoteContent}
                                onChange={(e) => setEditingNoteContent(e.target.value)}
                                onKeyDown={(e) => handleNoteKeyDown(e, candidate.id)}
                                onBlur={() => handleSaveNote(candidate.id)}
                                className="w-full p-2 border rounded-md"
                                autoFocus
                              />
                            ) : (
                              <div 
                                className="flex items-center group cursor-pointer"
                                onClick={() => {
                                  setEditingNote(candidate.id);
                                  setEditingNoteContent(candidate.selected_note || '');
                                }}
                              >
                                <span className="flex-1">
                                  {candidate.selected_note || '無備註'}
                                </span>
                        <button
                                  className="opacity-0 group-hover:opacity-100 ml-2 text-blue-600 hover:text-blue-800"
                                >
                                  編輯
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap space-x-2">
                            <button
                              onClick={() => handleDownloadResume(candidate.file_path)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                              下載履歷
                            </button>
                            <button
                              onClick={() => handleRemoveCandidate(candidate.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              移除
                        </button>
                      </td>
                    </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* 添加新的 AI 智能推薦頁面 */}
          <TabsContent value="ai-recommend">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">AI智能推薦</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    職位需求描述
                  </label>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {recommendationTemplates.map((template, index) => (
                        <button
                          key={index}
                          onClick={() => setRequirements(template.text)}
                          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        >
                          {template.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      className="w-full p-3 border rounded-md min-h-[120px]"
                      placeholder="請輸入詳細的職位需求描述，例如：需要具備的技能、經驗要求、工作內容等..."
                    />
                  </div>
                </div>
                
                <button
                  onClick={handleGetRecommendations}
                  disabled={isAnalyzingRecommendations || finalCandidates.length === 0}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isAnalyzingRecommendations ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>分析中...</span>
                    </>
                  ) : (
                    <span>開始推薦分析</span>
                  )}
                </button>
              </div>

              {recommendations && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">推薦總結</h3>
                    <p className="text-gray-600">{recommendations.summary}</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-4">推薦候選人</h3>
                    <div className="space-y-4">
                      {recommendations.recommendations
                        // 根據推薦分數排序（從高到低）
                        .sort((a: Recommendation, b: Recommendation) => b.score - a.score)
                        .map((rec: Recommendation, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-lg font-medium">
                                  {finalCandidates.find(c => c.resume_name === rec.name)?.display_name || rec.name}
                                </h4>
                                <div className="text-sm text-gray-500">推薦分數: {rec.score}</div>
                              </div>
                            </div>
                            <p className="mt-2 text-gray-600">{rec.reason}</p>
                            <div className="mt-3">
                              <div className="text-sm font-medium text-green-600">符合點：</div>
                              <ul className="list-disc list-inside text-sm text-gray-600">
                                {rec.matching_points.map((point: string, i: number) => (
                                  <li key={i}>{point}</li>
                                ))}
                              </ul>
                            </div>
                            {rec.concerns.length > 0 && (
                              <div className="mt-2">
                                <div className="text-sm font-medium text-yellow-600">需注意：</div>
                                <ul className="list-disc list-inside text-sm text-gray-600">
                                  {rec.concerns.map((concern: string, i: number) => (
                                    <li key={i}>{concern}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* 在推薦候選人卡片中添加按鈕和問題顯示部分 */}
                            <div key={index} className="border rounded-lg p-4">
                              {/* ... 現有的候選人資訊 ... */}
                              
                              {/* 添加生成問題按鈕 */}
                              <div className="mt-4 flex justify-end">
                                <button
                                  onClick={() => {
                                    // 從 finalCandidates 中找到完整的候選人資料
                                    let cleanRecName = rec.name.replace(/\.pdf$/, ''); // 移除 .pdf 副檔名
                                    // 移除"候選人 "開頭的文字
                                    cleanRecName = cleanRecName.replace(/^候選人\s+/, '');
                                    console.log('cleanRecName:', cleanRecName);
                                    const fullCandidate = finalCandidates.find(c => {
                                      const cleanResumeName = c.resume_name.replace(/\.pdf$/, '');
                                      const cleanDisplayName = c.display_name?.replace(/\.pdf$/, '') || '';
                                      return cleanResumeName === cleanRecName || cleanDisplayName === cleanRecName;
                                    });

                                    if (!fullCandidate) {
                                      alert('找不到候選人完整資料');
                                      return;
                                    }

                                    // 使用完整的候選人資料
                                    const candidateData = {
                                      name: fullCandidate.display_name || fullCandidate.resume_name,
                                      resume_tech_skills: fullCandidate.resume_tech_skills || '',
                                      resume_experience: fullCandidate.resume_experience || '',
                                      resume_education: fullCandidate.resume_education || '',
                                      resume_projects: fullCandidate.resume_projects || ''
                                    };
                                    
                                    handleGenerateQuestions(candidateData);
                                  }}
                                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                                  disabled={isGeneratingQuestions}
                                >
                                  {isGeneratingQuestions ? (
                                    <div className="flex items-center space-x-2">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      <span>生成中...</span>
                                    </div>
                                  ) : (
                                    "生成面試問題"
                                  )}
                                </button>
                              </div>

                              {/* 顯示面試問題 */}
                              {showInterviewQuestions === rec.name.replace(/^候選人\s+/, '').replace(/\.pdf$/, '') && (
                                <div className="mt-4 bg-gray-50 p-4 rounded-md">
                                  <h4 className="text-lg font-medium mb-3">建議面試問題：</h4>
                                  
                                  {isGeneratingQuestions ? (
                                    <div className="flex flex-col items-center justify-center py-4">
                                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                                      <p className="text-gray-600">正在生成面試問題...</p>
                                    </div>
                                  ) : interviewQuestions?.questions ? (
                                    <div className="space-y-4">
                                      {interviewQuestions.questions.map((q: any, i: number) => (
                                        <div key={i} className="border-l-4 border-blue-500 pl-4">
                                          <p className="font-medium text-gray-800">Q{i + 1}: {q.question}</p>
                                          <p className="text-sm text-gray-600 mt-1">
                                            <span className="font-medium">目的：</span> {q.purpose}
                                          </p>
                                          <p className="text-sm text-gray-600 mt-1">
                                            <span className="font-medium">期望回答重點：</span> {q.expectedAnswer}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-gray-600">尚未生成面試問題</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* 新增：根據推薦排序的已選擇人員列表 */}
                  <div className="mt-8 border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">已選擇人員（依推薦排序）</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">序號</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI推薦分數</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">原始分數</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">推薦理由</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">符合點</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">需注意</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {finalCandidates
                            .map(candidate => {
                              // 尋找對應的推薦結果，使用 display_name 或 resume_name 來匹配
                              const recommendation = recommendations.recommendations.find(
                                (rec: Recommendation) => {
                                  const candidateName = candidate.display_name || candidate.resume_name;
                                  const cleanCandidateName = candidateName.replace(/\.[^/.]+$/, "");
                                  const cleanRecName = rec.name.replace(/\.[^/.]+$/, "");
                                  return cleanCandidateName === cleanRecName;
                                }
                              );
                              
                              return {
                                ...candidate,
                                recommendation: recommendation || null,
                                sortPriority: recommendation ? 1 : 0,
                                aiScore: recommendation?.score || -1
                              };
                            })
                            .sort((a: CandidateWithRecommendation, b: CandidateWithRecommendation) => {
                              // 首先按照是否有推薦排序
                              if (a.sortPriority !== b.sortPriority) {
                                return b.sortPriority - a.sortPriority;
                              }
                              // 然後按照推薦分數排序
                              return b.aiScore - a.aiScore;
                            })
                            .map((candidate, index) => (
                              <tr key={candidate.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {index + 1}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {candidate.display_name || candidate.resume_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-medium">
                                  {candidate.recommendation ? (
                                    <span className="text-blue-600">
                                      {candidate.recommendation.score}分
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">未推薦</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {candidate.score || '無分數'}
                                </td>
                                <td className="px-6 py-4">
                                  <ExpandableText 
                                    text={candidate.recommendation?.reason || '無推薦理由'} 
                                    maxLength={50}
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  {candidate.recommendation?.matching_points ? (
                                    <ul className="list-disc list-inside text-sm">
                                      {candidate.recommendation.matching_points.map((point: string, i: number) => (
                                        <li key={i}>{point}</li>
                                      ))}
                                    </ul>
                                  ) : '無資料'}
                                </td>
                                <td className="px-6 py-4">
                                  {candidate.recommendation?.concerns ? (
                                    <ul className="list-disc list-inside text-sm text-yellow-600">
                                      {candidate.recommendation.concerns.map((concern: string, i: number) => (
                                        <li key={i}>{concern}</li>
                                      ))}
                                    </ul>
                                  ) : '無資料'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <button
                                    onClick={() => handleDownloadResume(candidate.file_path)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    下載履歷
                                  </button>
                                </td>
                              </tr>
                            ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
              )}

              {/* 添加推薦歷史記錄 */}
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">推薦歷史記錄</h3>
                <div className="space-y-4">
                  {recommendationHistory.map((record, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">需求描述：</h4>
                          <p className="text-gray-600">{record.requirements}</p>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(record.created_at).toLocaleString('zh-TW')}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setRequirements(record.requirements);
                          setRecommendations(record.recommendations);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        重新使用此需求
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-12">
          <h2 className="text-xl text-gray-600">請選擇或創建一個專案以開始</h2>
        </div>
      )}
    </main>
  );
}
