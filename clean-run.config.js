module.exports = {
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
    '[dir]/bin/code-structure src/*.ts -o demo/result.html --exclude src/*.d.ts'
  ]
}
