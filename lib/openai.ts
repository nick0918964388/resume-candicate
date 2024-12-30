import OpenAI from 'openai';

if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_OPENAI_API_KEY');
}

export const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function analyzeResume(resumeText: string, conditions: {
  mandatory: string[];
  optional: string[];
  excluded: string[];
  options: {
    skills: boolean;
    experience: boolean;
    education: boolean;
    projects: boolean;
  };
}) {
  try {
    // 根據選項構建分析要求
    const analysisRequests = [];
    if (conditions.options.skills) {
      analysisRequests.push('1. 技能匹配度評分（0-100）');
      analysisRequests.push('2. 主要技能列表');
    }
    if (conditions.options.experience) {
      analysisRequests.push('3. 工作經驗摘要');
    }
    if (conditions.options.education) {
      analysisRequests.push('4. 教育背景');
    }
    if (conditions.options.projects) {
      analysisRequests.push('5. 項目經驗摘要');
    }
    analysisRequests.push('6. 是否符合所有必要條件');
    analysisRequests.push('7. 匹配的加分條件');
    analysisRequests.push('8. 是否觸及排除條件');
    analysisRequests.push('9. 整體評估和建議');

    const prompt = `
請以 JSON 格式分析以下簡歷內容，並根據給定條件進行評估。

分析要求：
${analysisRequests.join('\n')}

簡歷內容：
${resumeText}

條件：
必要條件：${conditions.mandatory.join(', ')}
加分條件：${conditions.optional.join(', ')}
排除條件：${conditions.excluded.join(', ')}

請確保返回的 JSON 格式包含以下字段（根據分析選項）：
{
  ${conditions.options.skills ? `"score": <number 0-100>,\n  "skills": [<技能列表>],` : ''}
  ${conditions.options.experience ? `"experience": "<工作經驗摘要>",` : ''}
  ${conditions.options.education ? `"education": "<教育背景>",` : ''}
  ${conditions.options.projects ? `"projects": "<項目經驗>",` : ''}
  "meetsRequirements": <true/false>,
  "matchedOptional": [<匹配的加分條件列表>],
  "hasExclusions": <true/false>,
  "evaluation": "<整體評估和建議>"
}

請確保返回的是有效的 JSON 格式，不要包含任何其他文本。`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "你是一個專業的人力資源分析專家，專門負責評估候選人簡歷。請基於提供的條件進行客觀分析，並提供詳細的評估結果。請確保返回的是有效的 JSON 格式。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5
    });

    if (!response.choices[0].message.content) {
      throw new Error('OpenAI 返回的響應內容為空');
    }

    try {
      const result = JSON.parse(response.choices[0].message.content.trim());
      return result;
    } catch (error) {
      console.error('JSON 解析失敗:', response.choices[0].message.content);
      throw new Error('OpenAI 返回的響應格式無效');
    }
  } catch (error) {
    console.error('簡歷分析失敗:', error);
    throw error;
  }
} 