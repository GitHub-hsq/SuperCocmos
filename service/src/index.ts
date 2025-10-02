// 引入 Node.js 内置模块：文件系统（fs）和路径（path）
import { existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

// 引入 Express 框架和 Multer（用于文件上传）
import express from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'

// 引入自定义类型和模块
import type { RequestProps } from './types' // 请求参数类型
import type { ChatMessage } from './chatgpt' // 聊天消息类型
import { chatConfig, chatReplyProcess, currentModel } from './chatgpt' // 聊天相关逻辑
import { auth } from './middleware/auth' // 身份认证中间件
import { limiter } from './middleware/limiter' // 请求频率限制中间件
import { isNotEmptyString } from './utils/is' // 工具函数：判断非空字符串
import { runWorkflow } from './quiz/workflow' // 生成测验题目的工作流
import { saveQuestions } from './quiz/storage' // 保存题目到数据库/文件
import type { SavePayload } from './quiz/types' // 保存题目的数据结构类型

const app = express()
const router = express.Router()

app.use(express.static('public'))
app.use(express.json())
// 全局 CORS 配置：允许所有来源跨域访问（开发环境常用，生产环境应限制）
app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})
// 流式返回 LLM 的回复内容
router.post('/chat-process', [auth, limiter], async (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream')

  try {
    const { prompt, options = {}, systemMessage, temperature, top_p, model } = req.body as RequestProps
    let firstChunk = true
    await chatReplyProcess({
      message: prompt,
      lastContext: options,
      process: (chat: ChatMessage) => {
        res.write(firstChunk ? JSON.stringify(chat) : `\n${JSON.stringify(chat)}`)
        firstChunk = false
      },
      systemMessage,
      temperature,
      top_p,
      model,
    })
  }
  catch (error) {
    res.write(JSON.stringify(error))
  }
  finally {
    res.end()
  }
})
//////////////////////////////////////////////////////////////////
// File upload config 设置上传目录：优先使用环境变量 UPLOAD_DIR，否则用项目根目录下的 uploads 文件夹
const uploadDir = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads')
if (!existsSync(uploadDir))
  mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    // 获取文件扩展名
    const ext = file.originalname.substring(file.originalname.lastIndexOf('.'))
    // 使用 UUID + 时间戳 + 扩展名，避免中文乱码问题
    const uniqueName = `${Date.now()}_${uuidv4()}${ext}`
    cb(null, uniqueName)
  },
})

// 配置 multer，限制文件大小
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
})

// Upload endpoint: returns saved filePath and starts classification
router.post('/upload', upload.single('file'), async (req, res) => {
  console.log('📤 [上传] 接收到文件上传请求')
  
  if (!req.file) {
    console.error('❌ [上传] 没有文件')
    return res.status(400).send({ status: 'Fail', message: '上传文件失败', data: null })
  }
  
  const filePath = req.file.path
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8') // 正确处理中文文件名
  
  console.log('📁 [上传] 文件信息:', {
    原始文件名: originalName,
    服务器文件名: req.file.filename,
    文件路径: filePath,
    文件大小: req.file.size,
  })
  
  try {
    // 检查是否配置了 OpenAI API Key
    const hasApiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')
    
    if (!hasApiKey) {
      console.warn('⚠️  [警告] 未配置 OPENAI_API_KEY，跳过文件分类')
      return res.send({ 
        status: 'Success', 
        message: '文件上传成功！（未配置 API Key，无法分类）', 
        data: { 
          filePath,
          originalName,
          fileName: req.file.filename,
          classification: 'note', // 默认为笔记
          error: '未配置 OPENAI_API_KEY'
        } 
      })
    }
    
    console.log('🔍 [分类] 开始分类文件...')
    // 立即启动分类工作流
    const { classifyFile } = await import('./quiz/workflow')
    const classificationResult = await classifyFile(filePath)
    
    console.log('✅ [分类] 分类完成:', classificationResult)
    
    return res.send({ 
      status: 'Success', 
      message: '文件上传成功！', 
      data: { 
        filePath,
        originalName,
        fileName: req.file.filename, // 服务器上的文件名
        classification: classificationResult.classification,
        error: classificationResult.error
      } 
    })
  } catch (error: any) {
    console.error('❌ [上传] 处理文件时出错:', error)
    console.error('错误详情:', {
      message: error?.message,
      stack: error?.stack,
      type: typeof error,
      error: error,
    })
    
    return res.send({ 
      status: 'Success', 
      message: '文件上传成功！', 
      data: { 
        filePath,
        originalName,
        fileName: req.file.filename,
        error: error?.message || String(error)
      } 
    })
  }
})

// Delete uploaded file
router.post('/upload/delete', async (req, res) => {
  try {
    const { filePath } = req.body as { filePath: string }
    if (!filePath)
      return res.status(400).send({ status: 'Fail', message: 'filePath is required', data: null })
    
    // 检查文件是否在 uploads 目录下（安全检查）
    if (!filePath.includes(uploadDir)) {
      return res.status(400).send({ status: 'Fail', message: '无效的文件路径', data: null })
    }
    
    // 检查文件是否存在
    if (!existsSync(filePath)) {
      return res.status(404).send({ status: 'Fail', message: '文件不存在', data: null })
    }
    
    // 删除文件
    unlinkSync(filePath)
    return res.send({ status: 'Success', message: '文件删除成功！', data: null })
  }
  catch (error) {
    return res.status(500).send({ status: 'Fail', message: error.message || '删除文件失败', data: null })
  }
})

// Quiz workflow: run
router.post('/quiz/run', [auth, limiter], async (req, res) => {
  try {
    const { filePath, numQuestions, workflowConfig: customConfig } = req.body as { 
      filePath: string
      numQuestions?: number
      workflowConfig?: import('./quiz/types').WorkflowNodeConfig[]
    }
    if (!filePath)
      return res.status(400).send({ status: 'Fail', message: 'filePath is required', data: null })
    
    // 使用自定义配置或全局配置
    const config = customConfig || workflowConfig
    const result = await runWorkflow(filePath, numQuestions, config.length > 0 ? config : undefined)
    res.send({ status: 'Success', message: '', data: result })
  }
  catch (error) {
    res.status(500).send({ status: 'Fail', message: error.message || String(error), data: null })
  }
})

// Quiz generate: generate questions from note with specific types
router.post('/quiz/generate', [auth, limiter], async (req, res) => {
  try {
    const { filePath, questionTypes } = req.body as { 
      filePath: string
      questionTypes: { 
        single_choice: number
        multiple_choice: number
        true_false: number
      }
    }
    if (!filePath)
      return res.status(400).send({ status: 'Fail', message: 'filePath is required', data: null })
    
    const { generateQuestionsFromNote } = await import('./quiz/workflow')
    const result = await generateQuestionsFromNote(filePath, questionTypes)
    
    res.send({ status: 'Success', message: '题目生成成功', data: result })
  }
  catch (error) {
    res.status(500).send({ status: 'Fail', message: error.message || String(error), data: null })
  }
})

// Quiz feedback: submit user feedback
router.post('/quiz/feedback', [auth, limiter], async (req, res) => {
  try {
    const { workflowId, feedback, revision_note } = req.body as {
      workflowId: string
      feedback: 'Accept' | 'Reject' | 'Revise'
      revision_note?: string
    }
    
    if (!workflowId || !feedback)
      return res.status(400).send({ status: 'Fail', message: 'workflowId and feedback are required', data: null })
    
    const { submitFeedback } = await import('./quiz/workflow')
    submitFeedback(workflowId, { feedback, revision_note })
    
    res.send({ status: 'Success', message: '反馈提交成功', data: null })
  }
  catch (error) {
    res.status(500).send({ status: 'Fail', message: error.message || String(error), data: null })
  }
})

// Quiz save: after user confirmation
router.post('/quiz/save', [auth, limiter], async (req, res) => {
  try {
    const payload = req.body as SavePayload
    if (!payload || !Array.isArray(payload.questions))
      return res.status(400).send({ status: 'Fail', message: 'questions is required', data: null })
    const saved = saveQuestions(payload)
    res.send({ status: 'Success', message: '', data: saved })
  }
  catch (error) {
    res.status(500).send({ status: 'Fail', message: error.message || String(error), data: null })
  }
})

// Test LLM connection: simple test to verify API key and model
router.post('/quiz/test-llm', async (req, res) => {
  try {
    console.log('🧪 [API] 收到 LLM 测试请求')
    const { testLLMConnection } = await import('./quiz/workflow')
    const result = await testLLMConnection()
    
    if (result.success) {
      console.log('✅ [API] LLM 测试成功')
      res.send({ 
        status: 'Success', 
        message: result.message,
        data: {
          model: result.model,
          response: result.response,
        }
      })
    } else {
      console.error('❌ [API] LLM 测试失败')
      res.status(500).send({ 
        status: 'Fail', 
        message: result.message,
        data: null
      })
    }
  }
  catch (error: any) {
    console.error('❌ [API] LLM 测试异常:', error)
    res.status(500).send({ 
      status: 'Fail', 
      message: error?.message || String(error),
      data: null
    })
  }
})

// 获取可用模型列表
router.post('/models/list', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const baseURL = process.env.OPENAI_API_BASE_URL || 'https://api.juheai.top'
    
    if (!apiKey) {
      return res.status(400).send({ 
        status: 'Fail', 
        message: 'API Key 未配置',
        data: null
      })
    }

    // 调用模型列表 API
    const modelsURL = `${baseURL}/v1/models`
    console.log('🔍 [API] 调用模型列表:', modelsURL)
    
    const response = await fetch(modelsURL, {
      headers: {
        'User-Agent': 'ChatGPT-Web/1.0.0',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': '*/*',
        'Connection': 'keep-alive',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: any = await response.json()
    console.log('✅ [API] 获取模型列表成功，数量:', data.data?.length || 0)
    
    res.send({ 
      status: 'Success', 
      message: '获取模型列表成功',
      data: data.data || []
    })
  }
  catch (error: any) {
    console.error('❌ [API] 获取模型列表失败:', error)
    res.status(500).send({ 
      status: 'Fail', 
      message: error?.message || String(error),
      data: null
    })
  }
})

// 获取 API 使用量
router.post('/usage', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const baseURL = process.env.OPENAI_API_BASE_URL || 'https://api.juheai.top'
    
    if (!apiKey) {
      return res.status(400).send({ 
        status: 'Fail', 
        message: 'API Key 未配置',
        data: null
      })
    }

    // 调用使用量 API
    const usageURL = `${baseURL}/api/usage/token`
    console.log('🔍 [API] 调用使用量查询:', usageURL)
    
    const response = await fetch(usageURL, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'ChatGPT-Web/1.0.0',
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Connection': 'keep-alive',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: any = await response.json()
    console.log('✅ [API] 获取使用量成功:', data)
    
    res.send({ 
      status: 'Success', 
      message: '获取使用量成功',
      data
    })
  }
  catch (error: any) {
    console.error('❌ [API] 获取使用量失败:', error)
    res.status(500).send({ 
      status: 'Fail', 
      message: error?.message || String(error),
      data: null
    })
  }
})

// Model management APIs
// 注意：这些配置在实际应用中应该保存到数据库或配置文件
// 这里简单起见，使用内存存储（重启后会丢失）
interface ModelInfo {
  id: string
  provider: string
  displayName: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

let modelsData: ModelInfo[] = [
  // 默认模型
  {
    id: 'gpt-4o',
    provider: 'OpenAI',
    displayName: 'GPT-4o',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gpt-4o-mini',
    provider: 'OpenAI',
    displayName: 'GPT-4o Mini',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// 获取所有模型
router.get('/models', async (req, res) => {
  try {
    res.send({ 
      status: 'Success', 
      message: '获取模型列表成功',
      data: modelsData
    })
  }
  catch (error: any) {
    res.status(500).send({ 
      status: 'Fail', 
      message: error?.message || String(error),
      data: null
    })
  }
})

// 添加模型（临时移除认证以便测试）
router.post('/models/add', async (req, res) => {
  try {
    const { id, provider, displayName, enabled = true } = req.body as {
      id: string
      provider: string
      displayName: string
      enabled?: boolean
    }
    
    if (!id || !provider || !displayName) {
      return res.status(400).send({ 
        status: 'Fail', 
        message: '参数不完整：需要 id、provider、displayName',
        data: null
      })
    }
    
    // 检查模型ID是否已存在
    const existingModel = modelsData.find(m => m.id === id)
    if (existingModel) {
      return res.status(400).send({ 
        status: 'Fail', 
        message: '模型ID已存在',
        data: null
      })
    }
    
    const newModel: ModelInfo = {
      id,
      provider,
      displayName,
      enabled,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    modelsData.push(newModel)
    
    res.send({ 
      status: 'Success', 
      message: '模型添加成功',
      data: newModel
    })
  }
  catch (error: any) {
    res.status(500).send({ 
      status: 'Fail', 
      message: error?.message || String(error),
      data: null
    })
  }
})

// 更新模型（临时移除认证以便测试）
router.post('/models/update', async (req, res) => {
  try {
    const { id, provider, displayName, enabled } = req.body as {
      id: string
      provider?: string
      displayName?: string
      enabled?: boolean
    }
    
    if (!id) {
      return res.status(400).send({ 
        status: 'Fail', 
        message: '缺少模型ID',
        data: null
      })
    }
    
    const modelIndex = modelsData.findIndex(m => m.id === id)
    if (modelIndex === -1) {
      return res.status(404).send({ 
        status: 'Fail', 
        message: '模型不存在',
        data: null
      })
    }
    
    const model = modelsData[modelIndex]
    if (provider !== undefined) model.provider = provider
    if (displayName !== undefined) model.displayName = displayName
    if (enabled !== undefined) model.enabled = enabled
    model.updatedAt = new Date().toISOString()
    
    res.send({ 
      status: 'Success', 
      message: '模型更新成功',
      data: model
    })
  }
  catch (error: any) {
    res.status(500).send({ 
      status: 'Fail', 
      message: error?.message || String(error),
      data: null
    })
  }
})

// 删除模型（临时移除认证以便测试）
router.post('/models/delete', async (req, res) => {
  try {
    const { id } = req.body as { id: string }
    
    if (!id) {
      return res.status(400).send({ 
        status: 'Fail', 
        message: '缺少模型ID',
        data: null
      })
    }
    
    const modelIndex = modelsData.findIndex(m => m.id === id)
    if (modelIndex === -1) {
      return res.status(404).send({ 
        status: 'Fail', 
        message: '模型不存在',
        data: null
      })
    }
    
    modelsData.splice(modelIndex, 1)
    
    res.send({ 
      status: 'Success', 
      message: '模型删除成功',
      data: null
    })
  }
  catch (error: any) {
    res.status(500).send({ 
      status: 'Fail', 
      message: error?.message || String(error),
      data: null
    })
  }
})

// 测试模型是否可用
router.post('/models/test', async (req, res) => {
  try {
    const { modelId } = req.body as { modelId: string }
    
    if (!modelId) {
      return res.status(400).send({ 
        status: 'Fail', 
        message: '缺少模型ID',
        data: null
      })
    }
    
    console.log(`🧪 [测试] 测试模型: ${modelId}`)
    
    // 导入chatReplyProcess来测试模型
    const testMessage = 'Hi, please respond with "OK" if you receive this message.'
    
    try {
      // 使用简单的fetch测试模型
      const apiKey = process.env.OPENAI_API_KEY
      const baseURL = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com'
      
      if (!apiKey) {
        return res.send({ 
          status: 'Fail', 
          message: '未配置API Key',
          data: { 
            success: false, 
            error: '请先配置OPENAI_API_KEY环境变量'
          }
        })
      }
      
      const testURL = `${baseURL}/v1/chat/completions`
      
      const testResponse = await fetch(testURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: testMessage }],
          max_tokens: 50,
        }),
      })
      
      if (testResponse.ok) {
        const data: any = await testResponse.json()
        const responseText = data.choices?.[0]?.message?.content || ''
        
        console.log(`✅ [测试] 模型响应成功: ${responseText.substring(0, 50)}...`)
        
        res.send({ 
          status: 'Success', 
          message: '模型测试成功',
          data: { 
            success: true, 
            response: responseText,
            model: data.model,
            usage: data.usage
          }
        })
      } else {
        const errorData: any = await testResponse.json().catch(() => ({ error: { message: testResponse.statusText } }))
        const errorMessage = errorData.error?.message || '未知错误'
        
        console.error(`❌ [测试] 模型测试失败: ${errorMessage}`)
        
        res.send({ 
          status: 'Fail', 
          message: `模型测试失败: ${errorMessage}`,
          data: { 
            success: false, 
            error: errorMessage,
            statusCode: testResponse.status
          }
        })
      }
    } catch (testError: any) {
      console.error(`❌ [测试] 测试过程出错:`, testError)
      res.send({ 
        status: 'Fail', 
        message: `测试过程出错: ${testError.message}`,
        data: { 
          success: false, 
          error: testError.message
        }
      })
    }
  }
  catch (error: any) {
    console.error('❌ [测试] 接口错误:', error)
    res.status(500).send({ 
      status: 'Fail', 
      message: error?.message || String(error),
      data: null
    })
  }
})

// Workflow config APIs
// 注意：这些配置在实际应用中应该保存到数据库或配置文件
// 这里简单起见，使用内存存储（重启后会丢失）
let workflowConfig: import('./quiz/types').WorkflowNodeConfig[] = []

// 获取工作流配置
router.get('/workflow/config', async (req, res) => {
  try {
    res.send({ 
      status: 'Success', 
      message: '获取配置成功',
      data: workflowConfig
    })
  }
  catch (error: any) {
    res.status(500).send({ 
      status: 'Fail', 
      message: error?.message || String(error),
      data: null
    })
  }
})

// 更新工作流配置
router.post('/workflow/config', [auth], async (req, res) => {
  try {
    const config = req.body as import('./quiz/types').WorkflowNodeConfig[]
    if (!Array.isArray(config)) {
      return res.status(400).send({ 
        status: 'Fail', 
        message: '配置格式错误',
        data: null
      })
    }
    
    workflowConfig = config
    res.send({ 
      status: 'Success', 
      message: '配置更新成功',
      data: workflowConfig
    })
  }
  catch (error: any) {
    res.status(500).send({ 
      status: 'Fail', 
      message: error?.message || String(error),
      data: null
    })
  }
})

////////////////////////////////////////////////////////////////
router.post('/config', auth, async (req, res) => {
  try {
    const response = await chatConfig()
    res.send(response)
  }
  catch (error) {
    res.send(error)
  }
})

router.post('/session', async (req, res) => {
  try {
    const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
    const hasAuth = isNotEmptyString(AUTH_SECRET_KEY)
    res.send({ status: 'Success', message: '', data: { auth: hasAuth, model: currentModel() } })
  }
  catch (error: any) {
    res.send({ status: 'Fail', message: error?.message || String(error), data: null })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body as { token: string }
    if (!token)
      throw new Error('Secret key is empty')

    if (process.env.AUTH_SECRET_KEY !== token)
      throw new Error('密钥无效 | Secret key is invalid')

    res.send({ status: 'Success', message: 'Verify successfully', data: null })
  }
  catch (error: any) {
    res.send({ status: 'Fail', message: error?.message || String(error), data: null })
  }
})

app.use('', router)
app.use('/api', router)
app.set('trust proxy', 1)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))
