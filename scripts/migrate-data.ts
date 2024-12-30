import { supabase } from '../lib/supabase';

async function migrateExistingData() {
  try {
    // 1. 創建初始專案
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        project_name: 'SCO 2024 人才招募',
        description: '2024年度 SCO 人才招募專案',
        status: 'active'
      })
      .select()
      .single();

    if (projectError) throw projectError;
    console.log('已創建初始專案:', project);

    // 2. 更新所有履歷記錄
    const { error: resumeError } = await supabase
      .from('resume')
      .update({ project_id: project.id })
      .is('project_id', null);

    if (resumeError) throw resumeError;
    console.log('已更新所有履歷記錄');

    // 3. 更新所有 AI 推薦記錄
    const { error: recommendationError } = await supabase
      .from('ai_recommendations')
      .update({ project_id: project.id })
      .is('project_id', null);

    if (recommendationError) throw recommendationError;
    console.log('已更新所有 AI 推薦記錄');

    console.log('資料遷移完成！');
    return project.id;

  } catch (error) {
    console.error('資料遷移失敗:', error);
    throw error;
  }
}

// 執行遷移
migrateExistingData()
  .then(projectId => {
    console.log('遷移成功，專案 ID:', projectId);
    process.exit(0);
  })
  .catch(error => {
    console.error('遷移失敗:', error);
    process.exit(1);
  }); 