import { supabase } from '../supabase';
import { extractTextFromPDF } from './analysis';

export async function uploadResume(file: File) {
  try {
    console.log('開始上傳文件:', file.name);

    // 首先提取 PDF 文本
    console.log('提取 PDF 文本...');
    const fileUrl = URL.createObjectURL(file);
    const resumeText = await extractTextFromPDF(fileUrl);
    URL.revokeObjectURL(fileUrl);

    // 生成唯一的文件名
    const timestamp = new Date().getTime();
    const fileName = `${timestamp}-${file.name}`;
    console.log('生成的文件名:', fileName);

    // 上傳文件到 Supabase Storage
    console.log('正在上傳到 Storage...');
    const { data: storageData, error: storageError } = await supabase.storage
      .from('resumes')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (storageError) {
      console.error('Storage 上傳錯誤:', storageError);
      throw new Error(`Storage 上傳失敗: ${storageError.message}`);
    }

    console.log('Storage 上傳成功:', storageData);

    // 獲取文件的公共URL
    const { data: { publicUrl } } = supabase.storage
      .from('resumes')
      .getPublicUrl(fileName);

    console.log('文件公共URL:', publicUrl);

    // 將文件信息保存到數據庫
    console.log('正在保存到數據庫...');
    const { data: resumeData, error: dbError } = await supabase
      .from('resume')
      .insert([
        {
          resume_name: file.name,
          file_path: fileName,
          file_url: publicUrl,
          file_size: file.size,
          resume_text: resumeText, // 保存提取的文本
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error('數據庫保存錯誤:', dbError);
      // 如果數據庫保存失敗，刪除已上傳的文件
      await supabase.storage
        .from('resumes')
        .remove([fileName]);
      throw new Error(`數據庫保存失敗: ${dbError.message}`);
    }

    console.log('數據庫保存成功:', resumeData);
    return resumeData;
  } catch (error) {
    console.error('上傳過程中發生錯誤:', error);
    throw error;
  }
}

export async function deleteResume(filePath: string) {
  try {
    console.log('開始刪除文件:', filePath);

    // 從存儲中刪除文件
    const { error: storageError } = await supabase.storage
      .from('resumes')
      .remove([filePath]);

    if (storageError) {
      console.error('Storage 刪除錯誤:', storageError);
      throw new Error(`Storage 刪除失敗: ${storageError.message}`);
    }

    console.log('Storage 刪除成功');

    // 從數據庫中刪除記錄
    const { error: dbError } = await supabase
      .from('resume')
      .delete()
      .match({ file_path: filePath });

    if (dbError) {
      console.error('數據庫刪除錯誤:', dbError);
      throw new Error(`數據庫刪除失敗: ${dbError.message}`);
    }

    console.log('數據庫記錄刪除成功');
    return true;
  } catch (error) {
    console.error('刪除過程中發生錯誤:', error);
    throw error;
  }
} 