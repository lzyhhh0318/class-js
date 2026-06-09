import express, { type Request, type Response } from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  const getMockData = (text: string) => {
    return {
      tasks: [
        {
          title: "处理刚才输入的任务: " + text.slice(0, 10) + "...",
          estimatedTime: 15,
          priority: 3
        }
      ]
    };
  };

  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!apiKey || apiKey === 'your_api_key_here') {
    console.warn("⚠️ DASHSCOPE_API_KEY is missing, returning mock parsed tasks.");
    return res.json(getMockData(text));
  }

  try {
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });

    const systemPrompt = `你是一个智能任务解析助手。用户会输入一段自然语言（可能是语音转写或连续段落）。
请从中提取并拆解出所有独立的任务。

要求：
1. 必须返回纯 JSON 格式的数据，不要包含任何 markdown 代码块标记 (如 \`\`\`json) 或其他多余文本。
2. JSON 结构如下：
{
  "tasks": [
    {
      "title": "任务名称（简短清晰）",
      "estimatedTime": 预计耗时分钟数（整数，根据常识推测，如果无法推测默认填 15）,
      "priority": 优先级（数字 1 到 5。1为最高优先级，5为最低。根据语气中的“紧急”、“马上”等词判断，默认填 3）
    }
  ]
}`;

    const userPrompt = `请解析以下文本，并拆解为任务列表：\n"${text}"`;

    const completion = await client.chat.completions.create({
      model: "qwen-plus", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.5,
    });

    const responseContent = completion.choices[0]?.message?.content?.trim();

    if (!responseContent) {
      throw new Error("Empty response from LLM");
    }

    const jsonStr = responseContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const result = JSON.parse(jsonStr);

    if (!result.tasks || !Array.isArray(result.tasks)) {
      throw new Error("Invalid format returned from LLM");
    }

    return res.json(result);

  } catch (error) {
    console.error("Parse Task API Call failed:", error);
    return res.json(getMockData(text));
  }
});

export default router;