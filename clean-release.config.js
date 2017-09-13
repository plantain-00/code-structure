module.exports = {
  include: [
    'bin/*',
    'dist/*.js',
    'html/index.bundle.js',
    'html/vendor.bundle.js',
    'html/vendor.bundle.css',
    'html/index.html',
    'LICENSE',
    'package.json',
    'README.md'
  ],
  exclude: [
  ],
  postScript: 'npm publish [dir] --access public'
}
