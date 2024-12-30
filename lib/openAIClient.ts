import OpenAI from 'openai';

// 定義回應格式的介面
interface ResumeAnalysis {
  score: number;
  skills: string[];
  experience: string;
  education: string;
  projects: string;
  meetsRequirements: boolean;
  matchedOptional: string[];
  hasExclusions: boolean;
  evaluation: string;
}

export const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function analyzeResume(
  resumeText: string,
  conditions: {
    mandatory: string[];
    optional: string[];
    excluded: string[];
  }
): Promise<ResumeAnalysis> {
  try {
    // 構建條件文本，只包含非空的條件
    const conditionsText = [
      conditions.mandatory.length > 0 ? `必要條件：${conditions.mandatory.join(', ')}` : '',
      conditions.optional.length > 0 ? `加分條件：${conditions.optional.join(', ')}` : '',
      conditions.excluded.length > 0 ? `排除條件：${conditions.excluded.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    const prompt = `
      請分析以下履歷，${conditionsText ? '並根據給定條件進行評估。' : '並進行基本評估。'}
      請使用繁體中文回覆。
      
      履歷內容：
      ${resumeText}
      
      ${conditionsText ? `
      評分標準：
      1. 基礎分數：100分
      2. 必要條件：缺少任一項必要條件扣40分
      3. 加分條件：缺少任一項加分條件扣20分
      4. 排除條件：符合任一項排除條件扣40分
      
      條件：
      ${conditionsText}
      ` : ''}
      
      請以下列 JSON 格式回覆（請確保是有效的 JSON）：
      {
        "score": (0-100的分數，請依照上述評分標準計算),
        "skills": ["技能1", "技能2", ...],
        "experience": "工作經驗摘要",
        "education": "教育背景摘要",
        "projects": "專案經驗摘要",
        "meetsRequirements": (是否符合所有必要條件，true/false),
        "matchedOptional": ["符合的加分條件1", "符合的加分條件2", ...],
        "hasExclusions": (是否有符合排除條件，true/false),
        "evaluation": "整體評估摘要"
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "你是一個專業的人力資源顧問，專門分析履歷並提供評估。請只回覆要求的 JSON 格式。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }, // 確保回應是 JSON 格式
      temperature: 0.5,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('API 回應內容為空');
    }

    const result = JSON.parse(content);
    
    // 驗證回應格式
    if (!result.score || !Array.isArray(result.skills)) {
      throw new Error('回應格式無效');
    }

    return result as ResumeAnalysis;
  } catch (error) {
    console.error('分析履歷時發生錯誤:', error);
    throw error;
  }
}

// 添加推薦函數
export async function getAIRecommendations(candidates: any[], requirements: string) {
  const prompt = `
    請分析以下候選人清單，並根據給定需求推薦最適合的人選。
    請使用繁體中文回覆。

    需求：
    ${requirements}

    候選人資料：
    ${candidates.map(c => `
    候選人 ${c.resume_name}：
    - 技能：${c.resume_tech_skills || '無'}
    - 經驗：${c.resume_experience || '無'}
    - 教育背景：${c.resume_education || '無'}
    - 分數：${c.score || '無'}
    - 備註：${c.selected_note || '無'}
    `).join('\n')}

    請根據以上資訊，列出最適合的前5名候選人，並說明選擇原因。
    回覆格式：
    {
      "recommendations": [
        {
          "name": "候選人姓名",
          "score": 推薦分數(0-100),
          "reason": "推薦原因",
          "matching_points": ["符合點1", "符合點2"...],
          "concerns": ["需注意點1", "需注意點2"...]
        }
      ],
      "summary": "整體推薦總結"
    }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('API 回應內容為空');
    }

    const result = JSON.parse(content);
    return result;
  } catch (error) {
    console.error('AI推薦分析失敗:', error);
    throw error;
  }
}

// 修改生成面試問題的函數
export async function generateInterviewQuestions(
  candidateInfo: {
    skills: string;
    experience: string;
    education: string;
    projects?: string;
  },
  onProgress?: (question: any) => void
) {
  try {
    // 檢查是否至少有一項資料不為空
    const hasData = Object.values(candidateInfo).some(value => 
      value && value.trim() !== '' && value !== '無'
    );

    if (!hasData) {
      throw new Error('候選人資料不完整，無法生成面試問題');
    }

    const prompt = `
      請根據以下候選人的資料，生成5個適合在面試時詢問的問題。
      這些問題應該要能夠深入了解候選人的技能、經驗和解決問題的能力。
      請使用繁體中文回覆。

      候選人資料：
      ${candidateInfo.skills ? `技能：${candidateInfo.skills}` : ''}
      ${candidateInfo.experience ? `工作經驗：${candidateInfo.experience}` : ''}
      ${candidateInfo.education ? `教育背景：${candidateInfo.education}` : ''}
      ${candidateInfo.projects ? `專案經驗：${candidateInfo.projects}` : ''}

      請以下列 JSON 格式回覆，需包含5個問題：
      {
        "questions": [
          {
            "question": "問題內容",
            "purpose": "問這個問題的目的",
            "expectedAnswer": "期望得到的回答重點"
          }
        ]
      }
    `;
    console.log('prompt:', prompt);
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "你是一位資深的技術面試官，擅長設計有深度的面試問題。請確保回覆是完整的 JSON 格式。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    console.log('response:', response);
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('API 回應內容為空');
    }

    const result = JSON.parse(content);
    
    // 驗證回應格式
    if (!result.questions || !Array.isArray(result.questions)) {
      throw new Error('回應格式無效');
    }

    // 回調進度
    if (onProgress) {
      onProgress(result);
    }

    return result;
  } catch (error) {
    console.error('生成面試問題時發生錯誤:', error);
    throw error;
  }
} 