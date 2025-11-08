<script setup lang="ts">
import { CheckmarkCircleOutline, CloseCircleOutline, HourglassOutline, RadioButtonOnOutline } from '@vicons/ionicons5'
/**
 * 工作流节点图可视化组件
 * 显示工作流的各个节点及其状态
 */
import { NIcon, NTooltip } from 'naive-ui'

interface WorkflowNode {
  type: string
  label: string
  status: 'pending' | 'running' | 'completed' | 'error'
  message?: string
  startTime?: number
  endTime?: number
}

interface Props {
  nodes: WorkflowNode[]
}

const props = defineProps<Props>()

// 获取节点图标
function getNodeIcon(status: WorkflowNode['status']) {
  switch (status) {
    case 'completed':
      return CheckmarkCircleOutline
    case 'error':
      return CloseCircleOutline
    case 'running':
      return HourglassOutline
    default:
      return RadioButtonOnOutline
  }
}

// 获取节点颜色
function getNodeColor(status: WorkflowNode['status']) {
  switch (status) {
    case 'completed':
      return '#18a058'
    case 'error':
      return '#d03050'
    case 'running':
      return '#2080f0'
    default:
      return '#999'
  }
}

// 计算是否显示连接线
function shouldShowConnector(index: number) {
  return index < props.nodes.length - 1
}

// 获取连接线状态
function getConnectorStatus(index: number) {
  if (index >= props.nodes.length - 1)
    return 'pending'

  const currentNode = props.nodes[index]
  const nextNode = props.nodes[index + 1]

  if (currentNode.status === 'completed' && nextNode.status !== 'pending')
    return 'active'

  if (currentNode.status === 'error')
    return 'error'

  return 'pending'
}

// 格式化耗时
function formatDuration(node: WorkflowNode): string {
  if (!node.startTime || !node.endTime)
    return ''

  const duration = Math.round((node.endTime - node.startTime) / 1000)
  return `${duration}s`
}
</script>

<template>
  <div class="workflow-diagram">
    <div class="diagram-title">
      工作流节点
    </div>

    <div class="nodes-container">
      <div
        v-for="(node, index) in nodes"
        :key="node.type"
        class="node-wrapper"
      >
        <!-- 节点本体 -->
        <div class="node-item" :class="[`status-${node.status}`]">
          <NTooltip trigger="hover" placement="left">
            <template #trigger>
              <div class="node-content">
                <!-- 图标 -->
                <div class="node-icon">
                  <NIcon
                    :size="28"
                    :color="getNodeColor(node.status)"
                    :component="getNodeIcon(node.status)"
                    :class="{ spinning: node.status === 'running' }"
                  />
                </div>

                <!-- 标签 -->
                <div class="node-label">
                  {{ node.label }}
                </div>

                <!-- 耗时 -->
                <div v-if="formatDuration(node)" class="node-duration">
                  {{ formatDuration(node) }}
                </div>
              </div>
            </template>

            <!-- Tooltip 内容 -->
            <div class="node-tooltip">
              <div class="tooltip-title">
                {{ node.label }}
              </div>
              <div v-if="node.message" class="tooltip-message">
                {{ node.message }}
              </div>
              <div v-if="formatDuration(node)" class="tooltip-duration">
                耗时: {{ formatDuration(node) }}
              </div>
            </div>
          </NTooltip>
        </div>

        <!-- 连接线 -->
        <div
          v-if="shouldShowConnector(index)"
          class="connector"
          :class="[`connector-${getConnectorStatus(index)}`]"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.workflow-diagram {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  background-color: #fff;
  border-radius: 8px;
}

.dark .workflow-diagram {
  background-color: #18181c;
}

.diagram-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
}

.dark .diagram-title {
  color: #ddd;
  border-bottom-color: #333;
}

.nodes-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.node-wrapper {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

/* 节点样式 */
.node-item {
  padding: 12px 16px;
  border-radius: 8px;
  background-color: #fafafa;
  border: 2px solid #e0e0e0;
  transition: all 0.3s ease;
}

.dark .node-item {
  background-color: #101014;
  border-color: #2c2c2c;
}

.node-item.status-running {
  background-color: #e6f4ff;
  border-color: #91caff;
}

.dark .node-item.status-running {
  background-color: #111d2c;
  border-color: #15395b;
}

.node-item.status-completed {
  background-color: #f0fdf4;
  border-color: #86efac;
}

.dark .node-item.status-completed {
  background-color: #0d1b12;
  border-color: #14532d;
}

.node-item.status-error {
  background-color: #fff1f0;
  border-color: #ffccc7;
}

.dark .node-item.status-error {
  background-color: #2c1618;
  border-color: #58181c;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.node-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinning {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.node-label {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.dark .node-label {
  color: #ddd;
}

.node-duration {
  flex-shrink: 0;
  font-size: 13px;
  color: #999;
  font-family: 'Consolas', 'Monaco', monospace;
}

/* 连接线样式 */
.connector {
  width: 3px;
  height: 24px;
  margin: 0 auto;
  background-color: #e0e0e0;
  transition: background-color 0.3s ease;
}

.dark .connector {
  background-color: #2c2c2c;
}

.connector.connector-active {
  background-color: #91caff;
}

.dark .connector.connector-active {
  background-color: #15395b;
}

.connector.connector-error {
  background-color: #ffccc7;
}

.dark .connector.connector-error {
  background-color: #58181c;
}

/* Tooltip 样式 */
.node-tooltip {
  max-width: 300px;
}

.tooltip-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.tooltip-message {
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
  line-height: 1.5;
}

.dark .tooltip-message {
  color: #aaa;
}

.tooltip-duration {
  font-size: 12px;
  color: #999;
  font-family: 'Consolas', 'Monaco', monospace;
}
</style>
