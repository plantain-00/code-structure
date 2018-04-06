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
  askVersion: true,
  changesGitStaged: true,
  postScript: [
    'npm publish "[dir]" --access public',
    'git add package.json',
    'git commit -m "[version]"',
    'git tag v[version]',
    'git push',
    'git push origin v[version]'
  ]
}
