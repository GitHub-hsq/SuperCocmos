/**
 * 工作流 SSE 监听 Composable
 * 监听工作流执行进度并实时更新 UI
 */

import type { Ref } from 'vue'
import { ref } from 'vue'

export interface WorkflowProgressEvent {
  workflowId: string
  nodeType: string
  nodeStatus: 'pending' | 'running' | 'completed' | 'error'
  nodeMessage?: string
  progress?: number
  result?: any
  timestamp: number
}

export interface WorkflowNode {
  type: string
  label: string
  status: 'pending' | 'running' | 'completed' | 'error'
  message?: string
  startTime?: number
  endTime?: number
}

export function useWorkflowSSE(
  externalNodes?: Ref<WorkflowNode[]>,
  initialLogs?: Array<{ time: string, message: string, type: 'info' | 'success' | 'error' }>,
) {
  // 工作流节点列表（5个固定节点）
  // 🔥 如果传入了外部节点引用，使用外部的；否则创建新的
  const nodes = externalNodes || ref<WorkflowNode[]>([
    { type: 'classify', label: '内容分类', status: 'pending' },
    { type: 'question_types', label: '试卷题目分配', status: 'pending' },
    { type: 'generate', label: '试卷生成', status: 'pending' },
    { type: 'review', label: '专家审核', status: 'pending' },
    { type: 'preview', label: '预览', status: 'pending' },
  ])

  // 执行日志（使用初始日志或空数组）
  const logs = ref<Array<{ time: string, message: string, type: 'info' | 'success' | 'error' }>>(
    initialLogs ? [...initialLogs] : [],
  )

  // 当前进度
  const progress = ref(0)

  // 工作流状态
  const workflowStatus = ref<'idle' | 'running' | 'completed' | 'error'>('idle')

  // 错误信息
  const errorMessage = ref('')

  /**
   * 添加日志
   */
  function addLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    logs.value.push({ time, message, type })

    // 限制日志数量
    if (logs.value.length > 100) {
      logs.value.shift()
    }
  }

  /**
   * 添加节点分隔线
   */
  function addNodeSeparator(nodeLabel: string, icon: string = '📝') {
    const leftPad = '─'.repeat(10)
    const rightPad = '─'.repeat(10)
    addLog(`${leftPad} ${icon} ${nodeLabel} ${rightPad}`, 'info')
  }

  /**
   * 更新节点状态
   */
  function updateNodeStatus(
    nodeType: string,
    status: 'pending' | 'running' | 'completed' | 'error',
    message?: string,
  ) {
    const node = nodes.value.find(n => n.type === nodeType)
    if (!node)
      return

    const previousStatus = node.status

    node.status = status
    node.message = message

    // 节点图标映射
    const nodeIcons: Record<string, string> = {
      classify: '🔍',
      question_types: '⚙️',
      generate: '✨',
      review: '👨‍⚖️',
      preview: '👁️',
    }

    if (status === 'running') {
      // 🔥 只在节点状态从非 running 变为 running 时才添加分隔线和"开始"日志
      if (previousStatus !== 'running') {
        node.startTime = Date.now()
        // 添加节点分隔线
        addLog('', 'info') // 空行
        addNodeSeparator(node.label, nodeIcons[nodeType] || '📝')

        // 根据节点类型显示不同的文案
        const runningMessage = nodeType === 'generate'
          ? '正在生成试卷...'
          : `开始${node.label}...`
        addLog(runningMessage, 'info')
      }
    }
    else if (status === 'completed') {
      node.endTime = Date.now()
      const duration = node.startTime ? Math.round((node.endTime - node.startTime) / 1000) : 0
      addLog(`${node.label}完成 (耗时 ${duration}s)`, 'success')
    }
    else if (status === 'error') {
      node.endTime = Date.now()
      addLog(`${node.label}失败: ${message}`, 'error')
    }
  }

  /**
   * 映射后端节点类型到前端节点类型
   */
  function mapNodeType(backendNodeType: string): string {
    const mapping: Record<string, string> = {
      classify: 'classify',
      question_types: 'question_types',
      generate_questions: 'generate', // 后端节点 -> 前端节点
      review_and_score: 'review', // 后端节点 -> 前端节点
      preview: 'preview',
    }
    return mapping[backendNodeType] || backendNodeType
  }

  /**
   * 处理工作流进度事件
   */
  function handleWorkflowProgress(data: WorkflowProgressEvent) {
    const frontendNodeType = mapNodeType(data.nodeType)
    updateNodeStatus(frontendNodeType, data.nodeStatus, data.nodeMessage)

    // 🔥 显示节点完成后的详细信息
    if (data.nodeStatus === 'completed' && data.result) {
      displayNodeResult(data.nodeType, data.result)
    }

    workflowStatus.value = 'running'
  }

  /**
   * 显示节点结果的详细信息
   */
  function displayNodeResult(nodeType: string, result: any) {
    switch (nodeType) {
      case 'generate_questions':
        // 显示题目生成结果
        if (result.questions && Array.isArray(result.questions)) {
          addLog(`✅ 共生成 ${result.questions.length} 道题目`, 'success')

          // 统计题型
          const typeCount: Record<string, number> = {}
          result.questions.forEach((q: any) => {
            const type = q.type || 'unknown'
            typeCount[type] = (typeCount[type] || 0) + 1
          })

          // 显示题型分布
          addLog('', 'info')
          addLog('📊 题型分布:', 'info')
          Object.entries(typeCount).forEach(([type, count]) => {
            const typeLabel = {
              single_choice: '单选题',
              multiple_choice: '多选题',
              true_false: '判断题',
            }[type] || type
            addLog(`  📝 ${typeLabel}: ${count} 题`, 'info')
          })

          // 显示前3题预览
          addLog('', 'info')
          addLog('👁️ 题目预览:', 'info')
          result.questions.slice(0, 3).forEach((q: any, index: number) => {
            addLog(`  ${index + 1}. ${q.question}`, 'info')
          })
          if (result.questions.length > 3) {
            addLog(`  ... 还有 ${result.questions.length - 3} 题`, 'info')
          }
        }
        break

      case 'review_and_score':
        // 显示审核和分数分配结果
        if (result.questions && Array.isArray(result.questions)) {
          addLog('✅ 审核完成，已分配分数', 'success')

          // 显示分数统计
          const totalScore = result.questions.reduce((sum: number, q: any) => sum + (q.score || 0), 0)
          addLog('', 'info')
          addLog('📊 分数统计:', 'info')
          addLog(`  总分: ${totalScore} 分`, 'info')

          // 按题型统计分数
          const scoreByType: Record<string, { count: number, total: number }> = {}
          result.questions.forEach((q: any) => {
            const type = q.type || 'unknown'
            if (!scoreByType[type]) {
              scoreByType[type] = { count: 0, total: 0 }
            }
            scoreByType[type].count++
            scoreByType[type].total += q.score || 0
          })

          // 显示分数分布
          addLog('', 'info')
          addLog('📊 分数分布:', 'info')
          Object.entries(scoreByType).forEach(([type, stats]) => {
            const typeLabel = {
              single_choice: '单选题',
              multiple_choice: '多选题',
              true_false: '判断题',
            }[type] || type
            addLog(`  ${typeLabel}: ${stats.count} 题，共 ${stats.total} 分`, 'info')
          })
        }
        break
    }
  }

  /**
   * 处理工作流完成事件
   */
  function handleWorkflowCompleted(_data: any) {
    workflowStatus.value = 'completed'
    addLog('工作流执行完成！', 'success')
  }

  /**
   * 处理工作流错误事件
   */
  function handleWorkflowError(data: { error: string, nodeType?: string }) {
    workflowStatus.value = 'error'
    errorMessage.value = data.error

    if (data.nodeType) {
      const frontendNodeType = mapNodeType(data.nodeType)
      updateNodeStatus(frontendNodeType, 'error', data.error)
    }

    addLog(`工作流执行失败: ${data.error}`, 'error')
  }

  /**
   * 重置状态
   */
  function reset() {
    nodes.value.forEach((node) => {
      node.status = 'pending'
      node.message = undefined
      node.startTime = undefined
      node.endTime = undefined
    })

    logs.value = []
    progress.value = 0
    workflowStatus.value = 'idle'
    errorMessage.value = ''
  }

  return {
    // 状态
    nodes,
    logs,
    progress,
    workflowStatus,
    errorMessage,

    // 方法
    addLog,
    updateNodeStatus,
    handleWorkflowProgress,
    handleWorkflowCompleted,
    handleWorkflowError,
    reset,
  }
}
