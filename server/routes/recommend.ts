import express, { type Request, type Response } from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const GENERIC_SUGGESTIONS: Record<number, Record<string, Array<{ taskName: string; reason: string; steps: string[] }>>> = {
  5: {
    "通勤": [
      { taskName: "听一首歌放松心情", reason: "5分钟刚好听完一首歌，调整状态", steps: ["1. 戴上耳机", "2. 选一首喜欢的歌", "3. 闭眼沉浸享受"] },
      { taskName: "整理手机通知", reason: "5分钟快速清理通知栏，减少焦虑", steps: ["1. 下拉通知中心", "2. 逐条清理无用通知", "3. 只保留重要提醒"] },
    ],
    "等人": [
      { taskName: "闭目养神", reason: "5分钟不足以进入深度工作，不如让大脑重启", steps: ["1. 放下手机，闭上眼睛", "2. 深呼吸5次", "3. 感受身体的放松"] },
      { taskName: "活动颈椎和肩膀", reason: "等人时顺便放松身体，预防久坐劳损", steps: ["1. 缓慢转动脖子左右各5次", "2. 耸肩放松5次", "3. 扩胸伸展3次"] },
    ],
    "休息": [
      { taskName: "闭目养神", reason: "5分钟不足以进入深度工作，不如让大脑重启", steps: ["1. 放下手机，闭上眼睛", "2. 深呼吸5次", "3. 感受身体的放松"] },
      { taskName: "喝杯水走动一下", reason: "短暂休息最好的方式是离开座位活动", steps: ["1. 站起来伸个懒腰", "2. 去倒一杯温水", "3. 慢慢喝完走回座位"] },
    ],
  },
  10: {
    "通勤": [
      { taskName: "听一集短播客 / 新闻", reason: "无需紧盯屏幕，保护视力且能获取新知", steps: ["1. 戴上耳机", "2. 打开播客App播放「每日新闻」", "3. 沉浸收听"] },
      { taskName: "回复重要消息", reason: "通勤时处理消息，到站后就能专注工作", steps: ["1. 打开消息列表", "2. 优先回复标记星标的", "3. 其余标记为稍后处理"] },
    ],
    "等人": [
      { taskName: "处理微信/邮件未读", reason: "10分钟刚好够清空几个红点，减轻焦虑", steps: ["1. 打开微信或邮箱", "2. 快速回复关键信息", "3. 将长任务标记为待办"] },
      { taskName: "整理今天的工作思路", reason: "等人时头脑反而更清醒，适合做计划", steps: ["1. 回忆今天已完成的事", "2. 列出接下来要做的3件事", "3. 按优先级排序"] },
    ],
    "休息": [
      { taskName: "处理微信/邮件未读", reason: "10分钟刚好够清空几个红点，减轻焦虑", steps: ["1. 打开微信或邮箱", "2. 快速回复关键信息", "3. 将长任务标记为待办"] },
      { taskName: "做一组拉伸运动", reason: "10分钟拉伸可以缓解肌肉紧张，恢复精力", steps: ["1. 颈部拉伸左右各15秒", "2. 肩背拉伸30秒", "3. 腿部拉伸各15秒"] },
    ],
  },
  15: {
    "通勤": [
      { taskName: "阅读一篇文章或Newsletter", reason: "15分钟能完整消化一篇深度文章", steps: ["1. 打开稍后阅读列表", "2. 挑选一篇中等长度文章", "3. 读完并总结核心观点"] },
      { taskName: "学习5个新单词", reason: "通勤时背单词效率高，15分钟能记住5个", steps: ["1. 打开单词App", "2. 学习5个新词并跟读", "3. 做一个小测试巩固"] },
    ],
    "等人": [
      { taskName: "阅读一篇文章或Newsletter", reason: "15分钟能完整消化一篇深度文章", steps: ["1. 打开稍后阅读列表", "2. 挑选一篇中等长度文章", "3. 读完并总结核心观点"] },
      { taskName: "整理笔记和收藏夹", reason: "15分钟足够清理积攒的收藏内容", steps: ["1. 打开收藏夹", "2. 删除过时内容", "3. 给重要内容加标签"] },
    ],
    "休息": [
      { taskName: "冥想放松", reason: "15分钟冥想可以显著降低焦虑感", steps: ["1. 找一个安静的角落", "2. 设定15分钟计时器", "3. 跟随呼吸节奏放松"] },
      { taskName: "阅读一篇文章或Newsletter", reason: "15分钟能完整消化一篇深度文章", steps: ["1. 打开稍后阅读列表", "2. 挑选一篇中等长度文章", "3. 读完并总结核心观点"] },
    ],
  },
  30: {
    "通勤": [
      { taskName: "专注完成一个小模块工作", reason: "30分钟可以进入一次完整的心流状态", steps: ["1. 开启手机免打扰", "2. 选定一个明确的小目标", "3. 专注执行直到时间结束"] },
      { taskName: "听一集深度播客", reason: "30分钟刚好听完一集深度访谈", steps: ["1. 从播客列表选一集", "2. 戴上耳机沉浸收听", "3. 记录1个关键收获"] },
    ],
    "等人": [
      { taskName: "专注完成一个小模块工作", reason: "30分钟可以进入一次完整的心流状态", steps: ["1. 开启手机免打扰", "2. 选定一个明确的小目标", "3. 专注执行直到时间结束"] },
      { taskName: "写一段工作总结或日记", reason: "30分钟足够整理思路写出一篇短文", steps: ["1. 回顾今天的关键事件", "2. 写下3个要点", "3. 总结1个明日改进项"] },
    ],
    "休息": [
      { taskName: "小睡一觉 (Power Nap)", reason: "30分钟是绝佳的午睡时间，恢复下午精力", steps: ["1. 设一个25分钟的闹钟", "2. 找个舒服的姿势闭眼", "3. 醒来后喝杯水"] },
      { taskName: "出门散步一圈", reason: "30分钟散步既锻炼身体又清空大脑", steps: ["1. 换上舒适的鞋", "2. 选择一条安静的路线", "3. 保持轻松的步伐走20分钟"] },
    ],
  },
};

function pickGenericSuggestion(timeMinutes: number, scene: string, recentNames: string[]) {
  const roundedTime = timeMinutes <= 5 ? 5 : timeMinutes <= 10 ? 10 : timeMinutes <= 15 ? 15 : 30;
  const sceneKey = GENERIC_SUGGESTIONS[roundedTime]?.[scene] ? scene : "休息";
  const pool = GENERIC_SUGGESTIONS[roundedTime]?.[sceneKey] || GENERIC_SUGGESTIONS[10]["休息"];

  const fresh = pool.filter(s => !recentNames.includes(s.taskName));
  const source = fresh.length > 0 ? fresh : pool;
  return source[Math.floor(Math.random() * source.length)];
}

function splitTaskIntoChunks(taskTitle: string, taskDesc: string | undefined, estimatedTime: number, timeMinutes: number) {
  const chunkTime = Math.round(timeMinutes * 0.8);
  const totalChunks = Math.ceil(estimatedTime / chunkTime);
  const subtasks: Array<{ title: string; estimatedTime: number; completed: boolean }> = [];

  const phaseNames = getPhaseNames(taskTitle, taskDesc, totalChunks);

  for (let i = 0; i < totalChunks; i++) {
    const isLast = i === totalChunks - 1;
    const thisTime = isLast ? estimatedTime - chunkTime * (totalChunks - 1) : chunkTime;
    subtasks.push({
      title: phaseNames[i] || `第${i + 1}阶段`,
      estimatedTime: thisTime,
      completed: false,
    });
  }

  return subtasks;
}

function getPhaseNames(title: string, desc: string | undefined, total: number): string[] {
  const t = title.toLowerCase();
  const names: string[] = [];

  if (t.includes('报告') || t.includes('写') || t.includes('文档') || t.includes('文章')) {
    names.push('收集资料与大纲', '撰写初稿', '修改润色', '最终审校');
  } else if (t.includes('学习') || t.includes('课程') || t.includes('教程')) {
    names.push('了解概念与背景', '阅读核心内容', '做练习巩固', '总结与复习');
  } else if (t.includes('设计') || t.includes('原型') || t.includes('UI')) {
    names.push('参考与灵感收集', '草图与框架', '细节打磨', '评审与调整');
  } else if (t.includes('开发') || t.includes('编码') || t.includes('实现') || t.includes('功能')) {
    names.push('理解需求与方案', '编写核心逻辑', '测试与调试', '代码审查与优化');
  } else if (t.includes('整理') || t.includes('清理') || t.includes('归档')) {
    names.push('分类与筛选', '处理核心部分', '收尾与归档');
  } else if (t.includes('复习') || t.includes('备考') || t.includes('考试')) {
    names.push('回顾知识点', '做练习题', '查漏补缺', '模拟测试');
  } else {
    for (let i = 0; i < total; i++) {
      names.push(`第${i + 1}阶段`);
    }
  }

  return names.slice(0, total);
}

router.post('/', async (req: Request, res: Response) => {
  const { timeMinutes, scene, pendingTasks, preferences, lastRecommendedTaskIds } = req.body;

  if (!timeMinutes) {
    return res.status(400).json({ error: 'timeMinutes is required' });
  }

  const getMockData = (timeMinutes: number, scene: string, tasks: any[], lastIds: string[]) => {
    let taskName = "背英语单词";
    let reason = "时间短 + 高收益，随拿随放";
    let steps = ["1. 打开单词App", "2. 复习10个词", "3. 做一个小测试"];
    let sourceTaskId: string | undefined = undefined;
    let subTaskIndex: number | undefined = undefined;
    let newSubtasksToCache: any = undefined;

    if (tasks && tasks.length > 0) {
      const fittingTasks = tasks.filter((t: any) => t.estimatedTime <= timeMinutes);
      const recentSet = new Set(lastIds || []);

      if (fittingTasks.length > 0) {
        let bestTask = fittingTasks[0];
        let bestScore = -999;

        fittingTasks.forEach((t: any) => {
          let score = 0;
          score += t.progress;
          score += (6 - t.priority) * 10;
          const utilization = t.estimatedTime / timeMinutes;
          score += Math.round(utilization * 15);

          if (recentSet.has(t.id)) {
            score -= 30;
          }

          if (score > bestScore) {
            bestScore = score;
            bestTask = t;
          }
        });

        sourceTaskId = bestTask.id;
        taskName = bestTask.title;
        reason = `只需 ${bestTask.estimatedTime} 分钟，刚好在你的 ${timeMinutes} 分钟内完成`;
        steps = ["1. 专注准备", "2. 开始执行", "3. 标记完成"];
      } else {
        let bestTask = tasks[0];
        let bestScore = -999;

        tasks.forEach((t: any) => {
          let score = 0;
          score += (6 - t.priority) * 10;
          score += t.progress * 0.5;
          const timeDiff = t.estimatedTime - timeMinutes;
          score -= timeDiff * 0.5;

          if (recentSet.has(t.id)) {
            score -= 25;
          }

          if (score > bestScore) {
            bestScore = score;
            bestTask = t;
          }
        });

        if (bestTask.subtasks && bestTask.subtasks.length > 0) {
          const nextIdx = bestTask.subtasks.findIndex((st: any) => !st.completed);
          if (nextIdx !== -1) {
            const st = bestTask.subtasks[nextIdx];
            sourceTaskId = bestTask.id;
            taskName = `${bestTask.title} → ${st.title}`;
            reason = `长任务继续推进，当前步骤「${st.title}」约需 ${st.estimatedTime || timeMinutes} 分钟`;
            steps = ["1. 回顾上一步的进度", "2. 专注完成「" + st.title + "」", "3. 记录断点方便下次继续"];
            subTaskIndex = nextIdx;
          } else {
            sourceTaskId = bestTask.id;
            taskName = bestTask.title;
            reason = `所有子任务已完成，建议整体收尾`;
            steps = ["1. 检查整体质量", "2. 补充遗漏细节", "3. 标记任务完成"];
          }
        } else {
          sourceTaskId = bestTask.id;
          const chunks = splitTaskIntoChunks(bestTask.title, bestTask.description, bestTask.estimatedTime, timeMinutes);
          const currentChunk = chunks[0];
          taskName = `${bestTask.title} → ${currentChunk.title}`;
          reason = `完整任务需 ${bestTask.estimatedTime} 分钟，当前阶段「${currentChunk.title}」约 ${currentChunk.estimatedTime} 分钟`;
          steps = ["1. 回顾任务目标与上下文", `2. 专注完成「${currentChunk.title}」`, "3. 记录断点方便下次继续"];
          subTaskIndex = 0;
          newSubtasksToCache = chunks;
        }
      }
    }

    if (!sourceTaskId) {
      const suggestion = pickGenericSuggestion(timeMinutes, scene, []);
      taskName = suggestion.taskName;
      reason = suggestion.reason;
      steps = suggestion.steps;
    }
    
    return { taskName, reason, steps, sourceTaskId, subTaskIndex, newSubtasksToCache };
  };

  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!apiKey || apiKey === 'your_api_key_here') {
    console.warn("⚠️ DASHSCOPE_API_KEY is missing, returning mock data.");
    return res.json(getMockData(timeMinutes, scene, pendingTasks, lastRecommendedTaskIds));
  }

  try {
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    });

    const systemPrompt = `你是一个专门为移动端设计的"AI时间规划局"智能调度与任务拆分专家。
你的目标是根据用户提供的【空闲时间】、【当前场景】、【未完成任务列表】和【偏好设置】，推荐一个最合适在当前时间片内执行的最小可执行任务。

【核心原则】
1. 时间适配度 > 任务优先级：用户只有 X 分钟，推荐的任务必须能在 X 分钟内完成或有意义地推进。
2. 推荐多样性：避免反复推荐同一个任务。如果某个任务最近被推荐过，优先推荐其他任务。
3. 长任务必须拆分：如果任务的 estimatedTime > 可用时间，必须将其拆分为有意义的、可独立执行的子任务板块，而不是笼统的"第一阶段/第二阶段"。

【调度逻辑】
步骤1 - 时间过滤：
   - 从任务列表中筛选出 estimatedTime <= 当前可用时间的任务。
   - 如果有匹配的任务，进入步骤2。
   - 如果没有匹配的任务，进入步骤3（拆分）。

步骤2 - 在时间匹配的任务中排序（注意多样性）：
   - 优先级数字越小的（1为最高）越优先。
   - 进度越高的（接近完成）越优先。
   - 时间利用率：任务耗时越接近可用时间，说明越充实。
   - 【多样性】如果某个任务在 lastRecommendedTaskIds 中，降低其优先级，让其他任务有机会被推荐。

步骤3 - 长任务拆分（当没有时间匹配的任务时）：
   - 如果该任务已有 subtasks 缓存，直接推荐下一个未完成的子任务。
   - 如果没有 subtasks 缓存，必须将长任务拆分为多个有意义的子任务板块。
   - 【拆分要求】子任务名称必须体现具体工作内容，例如：
     * 写报告 → "收集资料与大纲"、"撰写初稿"、"修改润色"、"最终审校"
     * 学习课程 → "了解概念与背景"、"阅读核心内容"、"做练习巩固"、"总结与复习"
     * 开发功能 → "理解需求与方案"、"编写核心逻辑"、"测试与调试"、"代码审查与优化"
     * 设计原型 → "参考与灵感收集"、"草图与框架"、"细节打磨"、"评审与调整"
   - 绝对不要用"第一阶段"、"第二阶段"这种笼统命名！
   - 拆分目标耗时：当前可用时间的 80% 左右。
   - 在 newSubtasksToCache 中返回完整的子任务数组，subTaskIndex 填 0。

步骤4 - 通用建议（当任务列表为空时）：
   - 根据可用时间和场景，给出一个通用的、与时间匹配的行动建议。
   - 5分钟：闭目养神、深呼吸、拉伸、整理通知
   - 10分钟：处理消息、听播客、整理笔记、做计划
   - 15分钟：阅读文章、学习小技能、冥想、整理收藏
   - 30分钟：专注工作、小睡、散步、写日记
   - 此时 sourceTaskId 填 null。

输出格式要求：
1. 必须返回纯 JSON 格式的数据，不要包含任何 markdown 代码块标记。
2. 必须严格遵循以下 JSON 结构：
{
  "sourceTaskId": "如果推荐的是任务列表中的任务，请填入对应的 id；如果是通用建议，填 null",
  "subTaskIndex": "如果是子任务，填入它在子任务数组中的索引（数字），否则填 null",
  "taskName": "推荐任务名称 (如果是子任务需体现具体内容，如 '写季度报告 → 收集资料与大纲')",
  "reason": "推荐原因 (简短解释为什么适合现在做，必须体现与时间的关系)",
  "steps": [
    "1. 第一步具体操作",
    "2. 第二步具体操作",
    "3. 第三步具体操作"
  ],
  "newSubtasksToCache": [ // 仅在需要【全新拆分】长任务时提供，否则填 null
    { "title": "收集资料与大纲", "estimatedTime": 8, "completed": false },
    { "title": "撰写初稿", "estimatedTime": 15, "completed": false },
    { "title": "修改润色", "estimatedTime": 10, "completed": false }
  ]
}`;

    const userPrompt = `
【当前状态】
- 空闲时间：${timeMinutes} 分钟
- 所在场景：${scene}

【偏好设置】
- 优先短任务：${preferences?.preferShortTasks}
- 优先高优先级：${preferences?.preferHighPriority}
- 优先快完成的：${preferences?.preferNearCompletion}

【最近已推荐过的任务ID（请降低这些任务的优先级）】
${lastRecommendedTaskIds && lastRecommendedTaskIds.length > 0 ? JSON.stringify(lastRecommendedTaskIds) : "无"}

【未完成任务列表】
${pendingTasks && pendingTasks.length > 0 ? JSON.stringify(pendingTasks, null, 2) : "列表为空"}

请给我最优推荐结果：`;

    const completion = await client.chat.completions.create({
      model: "qwen-plus", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8,
    });

    const responseContent = completion.choices[0]?.message?.content?.trim();

    if (!responseContent) {
      throw new Error("Empty response from LLM");
    }

    const jsonStr = responseContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const result = JSON.parse(jsonStr);

    return res.json({
      sourceTaskId: result.sourceTaskId || undefined,
      subTaskIndex: result.subTaskIndex !== undefined ? result.subTaskIndex : undefined,
      taskName: result.taskName || "未知任务",
      reason: result.reason || "未知原因",
      steps: result.steps || ["1. -", "2. -", "3. -"],
      newSubtasksToCache: result.newSubtasksToCache || undefined
    });

  } catch (error) {
    console.error("LLM API Call failed:", error);
    return res.json(getMockData(timeMinutes, scene, pendingTasks, lastRecommendedTaskIds));
  }
});

export default router;