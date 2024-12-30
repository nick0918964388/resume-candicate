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
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('PDF 文本提取失敗:', error);
    throw new Error('無法從 PDF 中提取文本: ' + (error instanceof Error ? error.message : String(error)));
  }
}

export async function analyzeAllResumes(conditions: AnalysisConditions) {
  try {
    // 獲取選中的簡歷
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
        // 使用保存的文本進行分析
        const resumeText = resume.resume_text;
        if (!resumeText) {
          throw new Error('簡歷文本不存在');
        }
        
        // 分析簡歷
        const analysis = await analyzeResume(resumeText, conditions);
        
        // 根據選項更新數據庫
        const updateData: any = {
          iscandidate: true,
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
        results.push({
          id: resume.id,
          name: resume.resume_name,
          error: error instanceof Error ? error.message : '分析失敗'
        });
      }
    }

    return results;
  } catch (error) {
    console.error('批量分析簡歷失敗:', error);
    throw error;
  }
}

export async function getAnalysisResults() {
  try {
    const { data, error } = await supabase
      .from('resume')
      .select('*')
      .eq('iscandidate', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('獲取分析結果失敗:', error);
    throw error;
  }
} 