import { supabase } from '../supabase';

export interface Project {
  id: string;
  project_name: string;
  description: string;
  created_at: string;
  updated_at: string;
  status: string;
}

// 創建新專案
export async function createProject(projectName: string, description: string) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        project_name: projectName,
        description: description,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('創建專案失敗:', error);
    throw error;
  }
}

// 獲取所有專案
export async function getAllProjects() {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('獲取專案列表失敗:', error);
    throw error;
  }
}

// 獲取單個專案詳情
export async function getProjectById(projectId: string) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('獲取專案詳情失敗:', error);
    throw error;
  }
}

// 刪除專案
export async function deleteProject(projectId: string) {
  try {
    // 1. 刪除專案相關的所有履歷檔案
    const { data: resumes } = await supabase
      .from('resume')
      .select('file_path')
      .eq('project_id', projectId);

    if (resumes) {
      for (const resume of resumes) {
        await supabase.storage
          .from('resumes')
          .remove([resume.file_path]);
      }
    }

    // 2. 刪除專案相關的所有資料
    await supabase
      .from('ai_recommendations')
      .delete()
      .eq('project_id', projectId);

    await supabase
      .from('resume')
      .delete()
      .eq('project_id', projectId);

    // 3. 最後刪除專案本身
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('刪除專案失敗:', error);
    throw error;
  }
} 