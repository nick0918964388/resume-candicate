import { supabase } from '../supabase';
import { extractTextFromPDF } from './analysis';

export async function uploadResume(file: File, projectId: string) {
  try {
    console.log('開始上傳文件:', file.name);

    // 檢查是否已存在相同檔名的履歷，並生成新檔名
    const { data: existingFiles } = await supabase
      .from('resume')
      .select('resume_name')
      .eq('resume_name', file.name);

    let finalFileName = file.name;
    if (existingFiles && existingFiles.length > 0) {
      // 如果檔名已存在，在檔名後加上序號
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const ext = file.name.split('.').pop();
      let counter = 1;
      
      // 持續檢查直到找到可用的檔名
      while (true) {
        const newFileName = `${nameWithoutExt} (${counter}).${ext}`;
        const { data: checkFiles } = await supabase
          .from('resume')
          .select('resume_name')
          .eq('resume_name', newFileName);
        
        if (!checkFiles || checkFiles.length === 0) {
          finalFileName = newFileName;
          break;
        }
        counter++;
      }
    }

    // 提取 PDF 文本
    console.log('提取 PDF 文本...');
    const fileUrl = URL.createObjectURL(file);
    let resumeText = '';
    try {
      resumeText = await extractTextFromPDF(fileUrl);
    } catch (error) {
      console.error('PDF 文本提取錯誤:', error);
      throw new Error('PDF 文本提取失敗，請確保文件內容可以正確讀取');
    } finally {
      URL.revokeObjectURL(fileUrl);
    }

    // 確保文本不為空
    if (!resumeText.trim()) {
      throw new Error('無法從 PDF 中提取有效文本，請確保文件包含可讀取的文字內容');
    }

    // 文本清理和驗證
    resumeText = resumeText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')  // 保留換行符
      .replace(/[\uFFFD\uFFFE\uFFFF]/g, '')
      .trim();

    // 添加基本文本驗證
    if (resumeText.length < 10) { // 假設有效的履歷至少應該有 10 個字符
      throw new Error('提取的文本內容過少，請確保 PDF 包含足夠的文字內容');
    }

    // 生成唯一的存儲文件名
    const timestamp = new Date().getTime();
    const displayFileName = finalFileName;  // 保持原始檔名用於顯示
    const storageFileName = `${projectId}/${timestamp}-${finalFileName}`;  // 實際儲存路徑

    // 上傳文件到 Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('resumes')
      .upload(storageFileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (storageError) throw storageError;

    // 獲取文件的公共URL
    const { data: { publicUrl } } = supabase.storage
      .from('resumes')
      .getPublicUrl(storageFileName);

    // 將文件信息保存到數據庫
    const { data: resumeData, error: insertError } = await supabase
      .from('resume')
      .insert({
        resume_name: displayFileName,  // 使用原始檔名
        file_path: storageFileName,    // 使用完整儲存路徑
        display_name: file.name,       // 新增：保存原始檔名
        file_url: publicUrl,
        project_id: projectId,
        file_size: file.size,
        resume_text: resumeText,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('數據庫錯誤:', insertError);
      throw new Error('保存履歷資料失敗: ' + insertError.message);
    }

    return resumeData;

  } catch (error) {
    console.error('上傳失敗:', error);
    if (error instanceof Error) {
      throw new Error(error.message);
    } else if (typeof error === 'object' && error !== null) {
      throw new Error(JSON.stringify(error));
    } else {
      throw new Error('上傳過程中發生未知錯誤');
    }
  }
}

export async function deleteResume(filePath: string) {
  try {
    // 從存儲中刪除文件
    const { error: storageError } = await supabase.storage
      .from('resumes')
      .remove([filePath]);

    if (storageError) {
      throw new Error(`無法刪除檔案: ${storageError.message}`);
    }

    // 從數據庫中刪除記錄
    const { error: dbError } = await supabase
      .from('resume')
      .delete()
      .eq('file_path', filePath);

    if (dbError) {
      throw new Error(`無法刪除資料: ${dbError.message}`);
    }

    return true;
  } catch (error) {
    console.error('刪除失敗:', error);
    throw error;
  }
}

export async function downloadResume(filePath: string) {
  try {
    const { data, error } = await supabase.storage
      .from('resumes')  // 使用存放履歷的 bucket 名稱
      .download(filePath)
    
    if (error) {
      throw error
    }

    // 建立下載連結
    const url = window.URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = filePath.split('/').pop() || 'resume.pdf' // 設定下載時的檔名
    document.body.appendChild(link)
    link.click()
    
    // 清理
    window.URL.revokeObjectURL(url)
    document.body.removeChild(link)

    return { success: true }
  } catch (error) {
    console.error('下載履歷失敗:', error)
    return { success: false, error }
  }
} 