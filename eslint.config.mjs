import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  // 启用格式化功能
  formatters: {
    css: true,
    html: true,
  },
  // 忽略文件和目录
  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.output/**',
    '**/.nuxt/**',
    '**/.vitepress/cache/**',
    '**/.claude/**',
    '**/*.md',
  ],
  // 自定义规则
  rules: {
    // 关闭已弃用的规则
    'no-multi-spaces': 'off',
    // Node.js 环境中允许使用全局变量
    'node/prefer-global/process': 'off',
    'node/prefer-global/buffer': 'off',
    // 允许未使用的变量（用下划线开头）
    'unused-imports/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
})
