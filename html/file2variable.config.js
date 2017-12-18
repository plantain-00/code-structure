module.exports = {
  base: 'html',
  files: [
    'html/*.template.html'
  ],
  /**
   * @argument {string} file
   */
  handler: file => {
    if (file.endsWith('index.template.html')) {
      return {
        type: 'vue',
        name: 'App',
        path: './index'
      }
    }
    if (file.endsWith('node.template.html')) {
      return {
        type: 'vue',
        name: 'CustomNode',
        path: './index'
      }
    }
    return { type: 'text' }
  },
  out: 'html/variables.ts'
}
