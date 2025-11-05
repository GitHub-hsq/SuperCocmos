<script setup lang="ts">
import type { TreeOption } from 'naive-ui'
import { NButton, NTree } from 'naive-ui'
import { computed, h } from 'vue'
import { useNovelStore } from '@/store'

const novelStore = useNovelStore()

// 构建树形数据
const treeData = computed<TreeOption[]>(() => {
  if (!novelStore.currentNovel)
    return []

  const novelNode: TreeOption = {
    key: `novel-${novelStore.currentNovel.id}`,
    label: novelStore.currentNovel.title,
    isLeaf: false,
    children: [
      ...novelStore.volumes.map((volume) => {
        const volumeNode: TreeOption = {
          key: `volume-${volume.id}`,
          label: volume.title || `第${volume.volumeNumber}卷`,
          isLeaf: false,
          children: [
            ...novelStore.chapters
              .filter(chapter => chapter.volumeId === volume.id)
              .map(chapter => ({
                key: `chapter-${chapter.id}`,
                label: chapter.title,
                isLeaf: true,
                prefix: () => h('span', { class: 'tree-icon' }, '📄'),
              })),
            // 添加章节按钮
            {
              key: `add-chapter-${volume.id}`,
              label: '+ 新建章节',
              isLeaf: true,
              prefix: () => h('span', { class: 'tree-icon' }, '➕'),
            },
          ],
          prefix: () => h('span', { class: 'tree-icon' }, '📁'),
        }
        return volumeNode
      }),
      // 添加卷按钮
      {
        key: 'add-volume',
        label: '+ 新建卷',
        isLeaf: true,
        prefix: () => h('span', { class: 'tree-icon' }, '➕'),
      },
    ],
    prefix: () => h('span', { class: 'tree-icon' }, '📚'),
  }

  return [novelNode]
})

// 当前选中的节点
const selectedKeys = computed(() => {
  if (novelStore.selectedViewType === 'chapter' && novelStore.selectedChapterId)
    return [`chapter-${novelStore.selectedChapterId}`]

  if (novelStore.selectedViewType === 'volume' && novelStore.selectedVolumeId)
    return [`volume-${novelStore.selectedVolumeId}`]

  if (novelStore.selectedViewType === 'novel' && novelStore.currentNovel)
    return [`novel-${novelStore.currentNovel.id}`]

  return []
})

// 处理节点选择
function handleNodeClick(keys: Array<string | number>, _option: Array<TreeOption | null>) {
  const key = keys[0] as string
  if (!key)
    return

  // 解析节点类型和ID
  if (key.startsWith('novel-')) {
    novelStore.selectNovelRoot()
  }
  else if (key.startsWith('volume-')) {
    const volumeId = key.replace('volume-', '')
    novelStore.selectVolume(volumeId)
  }
  else if (key.startsWith('chapter-')) {
    const chapterId = key.replace('chapter-', '')
    novelStore.selectChapter(chapterId)
  }
  else if (key.startsWith('add-chapter-')) {
    const volumeId = key.replace('add-chapter-', '')
    handleAddChapter(volumeId)
  }
  else if (key === 'add-volume') {
    handleAddVolume()
  }
}

// 处理添加章节
function handleAddChapter(_volumeId: string) {
  // TODO: 实现添加章节逻辑
}

// 处理添加卷
function handleAddVolume() {
  // TODO: 实现添加卷逻辑
}

// 默认展开所有节点
const defaultExpandedKeys = computed(() => {
  const keys: string[] = []
  if (novelStore.currentNovel) {
    keys.push(`novel-${novelStore.currentNovel.id}`)
    novelStore.volumes.forEach((volume) => {
      keys.push(`volume-${volume.id}`)
    })
  }
  return keys
})
</script>

<template>
  <div class="novel-tree">
    <NTree
      :data="treeData"
      :selected-keys="selectedKeys"
      :default-expanded-keys="defaultExpandedKeys"
      block-line
      :render-suffix="({ option }) => {
        // 为卷和章节添加额外操作按钮
        if (option.key?.toString().startsWith('volume-') || option.key?.toString().startsWith('chapter-')) {
          return h('div', { class: 'tree-node-actions' }, [
            h(NButton, {
              text: true,
              size: 'tiny',
              onClick: (e: Event) => {
                e.stopPropagation()
                // TODO: 实现编辑功能
              },
            }, () => '✏️'),
          ])
        }
        return null
      }"
      @update:selected-keys="handleNodeClick"
    />
  </div>
</template>

<style scoped>
.novel-tree {
  padding: 16px 8px;
  height: 100%;
  overflow-y: auto;
}

:deep(.n-tree-node-content) {
  padding: 8px 4px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

:deep(.n-tree-node-content:hover) {
  background-color: var(--hover-color);
}

:deep(.n-tree-node--selected .n-tree-node-content) {
  background-color: var(--primary-color-hover);
}

.tree-icon {
  margin-right: 4px;
  font-size: 14px;
}

.tree-node-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

:deep(.n-tree-node-content:hover) .tree-node-actions {
  opacity: 1;
}
</style>
