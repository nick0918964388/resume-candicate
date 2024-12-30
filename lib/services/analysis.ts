import { supabase } from '../supabase';
import { analyzeResume } from '../openai';
import * as pdfjs from 'pdfjs-dist';

// 設置 PDF.js worker
if (typeof window !== 'undefined') {
  const worker = new Worker(
    new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url)
  );
  pdfjs.GlobalWorkerOptions.workerPort = worker;
}

interface AnalysisConditions {
  mandatory: string[];
  optional: string[];
  excluded: string[];
  options: {
    skills: boolean;
    experience: boolean;
    education: boolean;
    projects: boolean;
  };
  resumeIds: string[];
}

export async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    // 確保在客戶端環境
    if (typeof window === 'undefined') {
      throw new Error('PDF 處理只能在瀏覽器中進行');
    }

    // 從 URL 加載 PDF
    const loadingTask = pdfjs.getDocument({
      url: pdfUrl,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.9.155/cmaps/',
      cMapPacked: true,
    });
    
    const pdf = await loadingTask.promise;
    let fullText = '';

    // 遍歷所有頁面並提取文本
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // 更寬鬆的文本處理
      let pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');

      // 基本的文本清理
      pageText = pageText
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // 保留換行符 \n
        .replace(/[\uFFFD\uFFFE\uFFFF]/g, '')
        .trim();

      if (pageText) {
        fullText += pageText + '\n';
      }
    }

    // 最終的文本處理
    let cleanedText = fullText
      .replace(/\s+/g, ' ')  // 將多個空白字符替換為單個空格
      .trim();

    // 如果清理後的文本完全為空，嘗試保留更多字符
    if (!cleanedText) {
      cleanedText = fullText
        .replace(/[^\x20-\x7E\u4E00-\u9FFF\s\n\r.,]/g, '') // 保留基本標點符號
        .trim();
    }

    // 確保至少有一些文本
    if (!cleanedText) {
      throw new Error('提取的文本為空');
    }

    return cleanedText;

  } catch (error) {
    console.error('PDF 文本提取失敗:', error);
    throw new Error('無法從 PDF 中提取文本: ' + (error instanceof Error ? error.message : String(error)));
  }
}

export async function analyzeAllResumes(conditions: AnalysisConditions) {
  try {
    const { data: resumes, error } = await supabase
      .from('resume')
      .select('*')
      .in('id', conditions.resumeIds);

    if (error) throw error;
    if (!resumes || resumes.length === 0) {
      return { message: '沒有找到需要分析的簡歷' };
    }

    const results = [];
    for (const resume of resumes) {
      try {
        const resumeText = resume.resume_text;
        if (!resumeText) {
          throw new Error('簡歷文本不存在');
        }
        
        // 分析簡歷
        const analysis = await analyzeResume(resumeText, conditions);
        
        // 更新數據庫，包含分析完成時間
        const updateData: any = {
          iscandidate: true,
          score: analysis.score,
          analyzed_at: new Date().toISOString(), // 添加分析完成時間
          updated_at: new Date().toISOString(),
        };

        if (conditions.options.skills) {
          updateData.resume_tech_skills = analysis.skills?.join(', ') || '';
        }
        if (conditions.options.experience) {
          updateData.resume_experience = analysis.experience || '';
        }
        if (conditions.options.education) {
          updateData.resume_education = analysis.education || '';
        }
        if (conditions.options.projects) {
          updateData.resume_projects = analysis.projects || '';
        }

        const { error: updateError } = await supabase
          .from('resume')
          .update(updateData)
          .eq('id', resume.id);

        if (updateError) throw updateError;

        results.push({
          id: resume.id,
          name: resume.resume_name,
          analysis
        });
      } catch (error) {
        console.error(`分析簡歷 ${resume.resume_name} 時發生錯誤:`, error);
        continue;
      }
    }

    return results;
  } catch (error) {
    console.error('分析失敗:', error);
    throw error;
  }
}

export async function getAnalysisResults(projectId: string) {
  try {
    const { data, error } = await supabase
      .from('resume')
      .select('*')
      .eq('project_id', projectId)
      .eq('iscandidate', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('獲取分析結果失敗:', error);
    throw error;
  }
}

// 添加清除評分的函數
export async function clearAllAnalysis() {
  try {
    const { error } = await supabase
      .from('resume')
      .update({
        iscandidate: false,
        score: null,
        resume_tech_skills: null,
        resume_experience: null,
        resume_education: null,
        resume_projects: null
      })
      .eq('iscandidate', true);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('清除評分失敗:', error);
    throw error;
  }
}

// 添加更新已選擇狀態的函數
export async function updateSelectedStatus(
  resumeId: string, 
  isSelected: boolean,
  note?: string
) {
  try {
    const { error } = await supabase
      .from('resume')
      .update({
        is_selected: isSelected,
        selected_at: isSelected ? new Date().toISOString() : null,
        selected_note: note || null
      })
      .eq('id', resumeId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('更新選擇狀態失敗:', error);
    throw error;
  }
}

// 修改獲取已選擇人選的函數
export async function getSelectedCandidates(projectId: string) {
  try {
    const { data, error } = await supabase
      .from('resume')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_selected', true)
      .order('selected_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('獲取已選擇人選失敗:', error);
    throw error;
  }
}

// 添加儲存 AI 推薦結果的函數
export async function saveAIRecommendation(
  requirements: string,
  recommendations: any,
  timestamp: string,
  projectId: string
) {
  try {
    const { data, error } = await supabase
      .from('ai_recommendations')
      .insert({
        requirements,
        recommendations,
        created_at: timestamp,
        project_id: projectId
      })
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('儲存 AI 推薦結果失敗:', error);
    throw error;
  }
}

// 修改獲取 AI 推薦歷史的函數
export async function getAIRecommendationHistory(projectId: string) {
  try {
    const { data, error } = await supabase
      .from('ai_recommendations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('獲取 AI 推薦歷史失敗:', error);
    throw error;
  }
} 