export default {
  include: [
    'bin/*',
    'dist/*.js',
    'demo/*',
    'src/*',
    'html/*',
    'package.json',
    'yarn.lock'
  ],
  exclude: [
  ],
  postScript: [
    'cd "[dir]" && yarn --production',
    'node [dir]/dist/index.js src/*.ts -o demo/result.html --exclude src/*.d.ts'
  ]
}
