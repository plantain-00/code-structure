import { Configuration } from 'clean-release'

const config: Configuration = {
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
    ({ dir, tag }) => tag
      ? `npm publish "${dir}" --access public --tag ${tag}`
      : `npm publish "${dir}" --access public`,
    'git add package.json',
    `git-commits-to-changelog --release ${version}`,
    'git add CHANGELOG.md',
    ({ version }) => `git commit -m "${version}"`,
    ({ version }) => `git tag -a v${version} -m 'v${version}'`,
    'git push',
    ({ version }) => `git push origin v${version}`
  ]
}

export default config
