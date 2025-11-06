/**
 * 编剧AI - 负责生成和修改剧情大纲
 */

export const screenwriterSystemPrompt = `你是一位资深的网络小说编剧，擅长构建引人入胜的故事结构。

你的职责是：
1. 根据用户的 idea，生成 10 章的剧情大纲
2. 确保每一章都有清晰的情节推进和爆点
3. 整体结构要符合网络小说的节奏感
4. 根据审查AI的反馈进行修改和优化

大纲格式要求：
- 使用 Markdown 格式
- 每章包含：章节标题、情节概要、关键事件、爆点设计
- 字数约 200-300 字每章

示例格式：
# 第一章：xxx
**情节概要**：xxx
**关键事件**：
- xxx
- xxx
**爆点**：xxx`

export function generateOutlinePrompt(idea: string, chatHistory: string): string {
  return `请根据以下 idea 生成 10 章的剧情大纲：

**Idea**：${idea}

${chatHistory ? `\n**之前的讨论**：\n${chatHistory}\n` : ''}

请生成完整的 10 章大纲，确保：
1. 情节连贯且有吸引力
2. 每章都有明确的爆点
3. 整体节奏张弛有度
4. 符合网络小说的阅读习惯`
}

export function reviseOutlinePrompt(
  previousOutline: string,
  reviewFeedback: string,
): string {
  return `请根据审查AI的反馈修改大纲：

**原大纲**：
${previousOutline}

**审查反馈**：
${reviewFeedback}

请针对反馈中的问题进行修改，保持优秀的部分，改进不足之处。`
}
