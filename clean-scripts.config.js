const { Service, checkGitStatus } = require('clean-scripts')

const tsFiles = `"src/**/*.ts" "spec/**/*.ts" "html/**/*.ts" "screenshots/**/*.ts"`
const jsFiles = `"*.config.js" "html/*.config.js"`

module.exports = {
  build: [
    'rimraf dist/',
    'tsc -p src/',
    {
      js: [
        `file2variable-cli --config html/file2variable.config.js`,
        'tsc -p html',
        'webpack --config html/webpack.config.js'
      ],
      css: [
        'cleancss -o html/vendor.bundle.css ./node_modules/tree-component/dist/tree.min.css ./node_modules/github-fork-ribbon-css/gh-fork-ribbon.css ./node_modules/highlight.js/styles/routeros.css'
      ]
    },
    `node dist/index.js src/*.ts -o demo/result.html --exclude src/*.d.ts`
  ],
  lint: {
    ts: `tslint ${tsFiles}`,
    js: `standard ${jsFiles}`,
    export: `no-unused-export ${tsFiles}`,
    commit: `commitlint --from=HEAD~1`
  },
  test: [
    'tsc -p spec',
    'jasmine',
    () => checkGitStatus()
  ],
  fix: {
    ts: `tslint --fix ${tsFiles}`,
    js: `standard --fix ${jsFiles}`
  },
  screenshot: [
    new Service(`http-server -p 8000`),
    `tsc -p screenshots`,
    `node screenshots/index.js`
  ]
}
