import { Router, type Request, type Response } from 'express'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
import { db, type ParsedContent, type KnowledgePoint } from '../db.js'

dotenv.config()

const router = Router()

function getMockParsedContent(title: string): ParsedContent {
  return {
    materialId: '',
    rawText: `[模拟解析] ${title} 的文本内容已提取`,
    knowledgePoints: [
      { id: uuidv4(), title: '核心概念一', content: '这是从课件中提取的第一个核心知识点', importance: 'high' },
      { id: uuidv4(), title: '核心概念二', content: '这是从课件中提取的第二个核心知识点', importance: 'medium' },
      { id: uuidv4(), title: '辅助知识点', content: '这是从课件中提取的辅助性知识点', importance: 'low' },
    ],
    summary: `本课件${title}涵盖了以下核心内容：核心概念一、核心概念二等重要知识点。建议重点掌握核心概念的定义与应用。`,
    parsedAt: new Date().toISOString(),
  }
}

async function parseWithLLM(title: string, rawText: string): Promise<ParsedContent> {
  const apiKey = process.env.DASHSCOPE_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    return getMockParsedContent(title)
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    })

    const systemPrompt = `你是一个专业的课件内容解析助手。你的任务是从课件文本中提取知识点并生成结构化总结。

要求：
1. 必须返回纯JSON格式，不要包含markdown代码块标记
2. JSON结构如下：
{
  "knowledgePoints": [
    {
      "title": "知识点标题（简短清晰）",
      "content": "知识点详细描述",
      "importance": "high/medium/low"
    }
  ],
  "summary": "课件内容总结（200字以内）"
}
3. 知识点数量根据内容确定，一般3-8个
4. importance判断标准：high=核心必考概念，medium=重要理解内容，low=辅助扩展知识
5. summary要概括课件的核心内容和逻辑脉络`

    const userPrompt = `请解析以下课件内容，提取知识点并生成总结：\n\n课件标题：${title}\n\n课件内容：\n${rawText.slice(0, 8000)}`

    const completion = await client.chat.completions.create({
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
    })

    const responseContent = completion.choices[0]?.message?.content?.trim()
    if (!responseContent) throw new Error('Empty LLM response')

    const jsonStr = responseContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    const result = JSON.parse(jsonStr)

    return {
      materialId: '',
      rawText,
      knowledgePoints: (result.knowledgePoints || []).map((kp: any) => ({
        id: uuidv4(),
        title: kp.title,
        content: kp.content,
        importance: kp.importance || 'medium',
      })),
      summary: result.summary || '',
      parsedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('LLM parsing failed:', error)
    return getMockParsedContent(title)
  }
}

router.post('/materials/:id/parse', async (req: Request, res: Response) => {
  const material = db.materials.get(req.params.id)
  if (!material) {
    res.status(404).json({ success: false, error: '资料不存在' })
    return
  }

  if (material.type === 'video') {
    res.status(400).json({ success: false, error: '视频文件暂不支持文本解析' })
    return
  }

  const mockText = `[${material.title}] 这是模拟从${material.type.toUpperCase()}文件中提取的文本内容。实际生产环境中，将使用pdf-parse、mammoth、pptx2json等库提取真实文本。课件标题：${material.title}，描述：${material.description}`

  const parsed = await parseWithLLM(material.title, mockText)
  parsed.materialId = material.id
  material.parsedContent = parsed
  material.updatedAt = new Date().toISOString()
  db.materials.set(material.id, material)

  res.json({ success: true, data: parsed })
})

router.get('/materials/:id/knowledge', (req: Request, res: Response) => {
  const material = db.materials.get(req.params.id)
  if (!material) {
    res.status(404).json({ success: false, error: '资料不存在' })
    return
  }

  if (!material.parsedContent) {
    res.status(404).json({ success: false, error: '尚未解析，请先调用解析接口' })
    return
  }

  res.json({
    success: true,
    data: {
      materialId: material.id,
      title: material.title,
      knowledgePoints: material.parsedContent.knowledgePoints,
      summary: material.parsedContent.summary,
    },
  })
})

router.get('/courses/:courseId/knowledge', (req: Request, res: Response) => {
  const { courseId } = req.params
  const materials = Array.from(db.materials.values()).filter(m => m.courseId === courseId)

  const allKnowledge = materials
    .filter(m => m.parsedContent)
    .map(m => ({
      materialId: m.id,
      title: m.title,
      chapterId: m.chapterId,
      knowledgePoints: m.parsedContent!.knowledgePoints,
      summary: m.parsedContent!.summary,
    }))

  res.json({ success: true, data: allKnowledge })
})

router.post('/qa', async (req: Request, res: Response) => {
  const { question, courseId, materialId } = req.body

  if (!question) {
    res.status(400).json({ success: false, error: '请提供问题' })
    return
  }

  let context = ''
  if (materialId) {
    const material = db.materials.get(materialId)
    if (material?.parsedContent) {
      context = material.parsedContent.rawText
    }
  } else if (courseId) {
    const materials = Array.from(db.materials.values())
      .filter(m => m.courseId === courseId && m.parsedContent)
    context = materials.map(m => m.parsedContent!.rawText).join('\n\n')
  }

  const apiKey = process.env.DASHSCOPE_API_KEY
  if (!apiKey || apiKey === 'your_api_key_here') {
    res.json({
      success: true,
      data: {
        question,
        answer: `[模拟回答] 关于"${question}"，根据课件内容，这是一个重要的知识点。实际生产环境将调用大模型生成详细回答。`,
        sources: materialId ? [materialId] : [],
      },
    })
    return
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    })

    const systemPrompt = `你是一个课程AI答疑助手。根据提供的课件内容回答学生问题。
要求：
1. 回答要准确、清晰、有条理
2. 如果课件内容不足以回答问题，请诚实说明
3. 尽量引用课件中的具体概念和知识点
4. 返回纯JSON格式：{"answer": "回答内容", "sources": ["引用的资料ID"]}`

    const userPrompt = context
      ? `课件内容：\n${context.slice(0, 6000)}\n\n学生问题：${question}`
      : `学生问题：${question}\n（无课件上下文，请根据通用知识回答）`

    const completion = await client.chat.completions.create({
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
    })

    const responseContent = completion.choices[0]?.message?.content?.trim()
    if (!responseContent) throw new Error('Empty response')

    const jsonStr = responseContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    const result = JSON.parse(jsonStr)

    res.json({
      success: true,
      data: {
        question,
        answer: result.answer,
        sources: result.sources || (materialId ? [materialId] : []),
      },
    })
  } catch (error) {
    console.error('QA API failed:', error)
    res.json({
      success: true,
      data: {
        question,
        answer: '抱歉，AI答疑服务暂时不可用，请稍后再试。',
        sources: [],
      },
    })
  }
})

export default router