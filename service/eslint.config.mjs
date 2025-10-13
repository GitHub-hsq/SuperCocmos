import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  // 忽略构建目录
  ignores: ['build/**'],
  // 自定义规则
  rules: {
    // Node.js 环境中允许使用全局变量
    'node/prefer-global/process': 'off',
    'node/prefer-global/buffer': 'off',
    // 允许使用 isNaN 和 parseInt
    'unicorn/prefer-number-properties': 'off',
    // 允许未使用的变量（用下划线开头）
    'unused-imports/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
})
