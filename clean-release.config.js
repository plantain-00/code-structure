const semver = require('semver')

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
    ({ version, dir }) => semver.prerelease(version)
      ? `npm publish "${dir}" --access public --tag next`
      : `npm publish "${dir}" --access public`,
    'git add package.json',
    ({ version }) => `git commit -m "${version}"`,
    ({ version }) => `git tag v${version}`,
    'git push',
    ({ version }) => `git push origin v${version}`
  ]
}
