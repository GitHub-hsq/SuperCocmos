/**
 * 小说相关类型定义
 */

export interface Novel {
  id: string
  title: string
  genre?: string // 玄幻、言情、科幻等
  theme?: string
  cover?: string // 封面图 URL
  introduction?: string // 简介
  status: string
  volumeCount: number
  chapterCount: number
  totalWordCount?: number
  createdAt: string
  updatedAt: string
}

export interface Volume {
  id: string
  novelId: string
  volumeNumber: number
  title?: string
  introduction?: string
  outline?: string // Markdown 格式大纲
  status: string
  locked: boolean
  chapterCount: number
  createdAt: string
}

export interface Chapter {
  id: string
  volumeId: string
  chapterNumber: number
  title: string
  content: string // Markdown 格式正文
  wordCount: number
  status: string
  createdAt: string
}

// 树形节点类型（用于左侧树形结构）
export interface NovelTreeNode {
  key: string
  label: string
  type: 'novel' | 'volume' | 'chapter' | 'add-volume' | 'add-chapter'
  data?: Novel | Volume | Chapter
  children?: NovelTreeNode[]
}
