// server.ts (Express API 示例)
import express from 'express'
import { runWorkflow, submitFeedback } from './workflow'

const app = express()
app.use(express.json())

// 0. 示例服务器（仅演示工作流相关接口）

// 存储正在运行的工作流
const runningWorkflows = new Map<string, Promise<any>>()

// 1. 启动工作流
app.post('/api/workflow/start', async (req, res) => {
  const { filePath, numQuestions } = req.body

  if (!filePath)
    return res.status(400).json({ error: '缺少 filePath 参数' })

  // 异步启动工作流
  const workflowPromise = runWorkflow(filePath, numQuestions)
  runningWorkflows.set(filePath, workflowPromise)

  res.json({
    success: true,
    workflowId: filePath,
    message: '工作流已启动',
  })

  // 工作流完成后清理
  workflowPromise.finally(() => {
    runningWorkflows.delete(filePath)
  })
})

// 2. 提交反馈
app.post('/api/workflow/feedback', async (req, res) => {
  const { workflowId, feedback, revision_note } = req.body

  if (!workflowId || !feedback)
    return res.status(400).json({ error: '缺少必要参数' })

  if (!['Accept', 'Reject', 'Revise'].includes(feedback))
    return res.status(400).json({ error: 'feedback 必须是 Accept/Reject/Revise' })

  submitFeedback(workflowId, { feedback, revision_note })

  res.json({ success: true, message: '反馈已提交' })
})

// 3. 查询工作流状态
app.get('/api/workflow/status/:workflowId', async (req, res) => {
  const { workflowId } = req.params
  const workflow = runningWorkflows.get(workflowId)

  if (!workflow)
    return res.json({ status: 'not_found' })

  // 检查是否完成
  const isCompleted = await Promise.race([
    workflow.then(() => true),
    new Promise(resolve => setTimeout(() => resolve(false), 100)),
  ])

  if (isCompleted) {
    const result = await workflow
    return res.json({ status: 'completed', result })
  }

  res.json({ status: 'running' })
})

app.listen(3000, () => {
  // Server started
})
