import { NextResponse } from 'next/server';
import { openai } from '@/lib/openAIClient';

export async function POST(request: Request) {
  try {
    const { candidates, requirements } = await request.json();

    const prompt = `
      請分析以下候選人清單，並根據給定需求推薦最適合的人選。
      請使用繁體中文回覆。
      請務必以下列 JSON 格式回覆，不要加入任何其他文字：
      {
        "recommendations": [
          {
            "name": "候選人姓名（請使用與輸入相同的名稱）",
            "score": 評分（0-100的數字）,
            "reason": "推薦理由",
            "matching_points": ["符合點1", "符合點2", ...],
            "concerns": ["需注意點1", "需注意點2", ...]
          }
        ],
        "summary": "整體推薦總結"
      }

      需求：
      ${requirements}

      候選人資料：
      ${candidates.map((c: any) => `
      候選人 ${c.display_name || c.resume_name}：
      - 技能：${c.resume_tech_skills || '無'}
      - 經驗：${c.resume_experience || '無'}
      - 教育背景：${c.resume_education || '無'}
      - 分數：${c.score || '無'}
      - 備註：${c.selected_note || '無'}
      `).join('\n')}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "你是一個專業的人力資源顧問，專門分析履歷並提供推薦。請嚴格按照指定的 JSON 格式回覆，確保包含所有必要欄位。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    let result;
    try {
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('API 回應內容為空');
      }
      
      result = JSON.parse(content.trim());
      
      // 更詳細的格式驗證
      if (!result.recommendations || !Array.isArray(result.recommendations)) {
        throw new Error('回應缺少 recommendations 陣列');
      }
      
      if (!result.summary || typeof result.summary !== 'string') {
        throw new Error('回應缺少 summary 字串');
      }
      
      // 驗證每個推薦項目的格式
      result.recommendations.forEach((rec: any, index: number) => {
        if (!rec.name) throw new Error(`第 ${index + 1} 個推薦缺少 name`);
        if (typeof rec.score !== 'number') throw new Error(`第 ${index + 1} 個推薦缺少有效的 score`);
        if (!rec.reason) throw new Error(`第 ${index + 1} 個推薦缺少 reason`);
        if (!Array.isArray(rec.matching_points)) throw new Error(`第 ${index + 1} 個推薦缺少 matching_points 陣列`);
        if (!Array.isArray(rec.concerns)) throw new Error(`第 ${index + 1} 個推薦缺少 concerns 陣列`);
      });

    } catch (parseError: any) {
      console.error('解析回應失敗:', parseError);
      console.error('原始回應:', response.choices[0].message.content);
      return NextResponse.json(
        { 
          error: '無法解析 AI 回應', 
          details: parseError.message,
          rawResponse: response.choices[0].message.content 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI推薦分析失敗:', error);
    return NextResponse.json(
      { 
        error: '分析失敗', 
        message: error instanceof Error ? error.message : '未知錯誤',
      }, 
      { status: 500 }
    );
  }
} 