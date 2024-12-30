import { analyzeResume } from './openAIClient';

export async function analyzeAllResumes(
  resumes: Array<{ text: string; name: string }>,
  conditions: {
    mandatory: string[];
    optional: string[];
    excluded: string[];
  }
) {
  const results = [];

  for (const resume of resumes) {
    try {
      const analysis = await analyzeResume(resume.text, conditions);
      results.push({
        name: resume.name,
        ...analysis
      });
    } catch (error) {
      console.error(`分析簡歷 ${resume.name} 時發生錯誤:`, error);
      // 繼續處理下一份履歷，而不是中斷整個流程
      continue;
    }
  }

  return results;
} 