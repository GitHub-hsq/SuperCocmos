// example-usage.ts
import { runWorkflow, submitFeedback } from './workflow'

async function main() {
  const filePath = './test-questions.txt'

  // 启动工作流（非阻塞）
  const workflowPromise = runWorkflow(filePath, 10)

  // 模拟3秒后提交反馈
  setTimeout(() => {
    submitFeedback(filePath, {
      feedback: 'Revise',
      revision_note: '请将第一题的答案解析写得更详细一些',
    })
  }, 3000)

  // 等待工作流完成
  const result = await workflowPromise
}

main().catch((error) => {
  // Error handling
  throw error
})
