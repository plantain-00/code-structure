import { Configuration } from 'file2variable-cli'

const config: Configuration = {
  base: 'html',
  files: [
    'html/*.template.html'
  ],
  handler: (file: string) => {
    if (file.endsWith('.template.html')) {
      return {
        type: 'vue3',
      }
    }
    return { type: 'text' }
  },
  out: 'html/variables.ts'
}
export default config
