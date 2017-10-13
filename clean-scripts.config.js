const childProcess = require('child_process')
const util = require('util')
const { Service } = require('clean-scripts')

const execAsync = util.promisify(childProcess.exec)

const tsFiles = `"src/**/*.ts" "spec/**/*.ts" "html/**/*.ts" "screenshots/**/*.ts"`
const jsFiles = `"*.config.js" "html/*.config.js"`

module.exports = {
  build: [
    'rimraf dist/',
    'tsc -p src/',
    {
      js: [
        `file2variable-cli html/index.template.html -o html/variables.ts --html-minify --base html`,
        'tsc -p html',
        'webpack --display-modules --config html/webpack.config.js'
      ],
      css: [
        'cleancss -o html/vendor.bundle.css ./node_modules/tree-component/tree.min.css ./node_modules/github-fork-ribbon-css/gh-fork-ribbon.css ./node_modules/highlight.js/styles/routeros.css'
      ]
    },
    `node dist/index.js src/*.ts -o demo/result.html --exclude src/*.d.ts`
  ],
  lint: {
    ts: `tslint ${tsFiles}`,
    js: `standard ${jsFiles}`,
    export: `no-unused-export ${tsFiles}`
  },
  test: [
    'tsc -p spec',
    'jasmine',
    async () => {
      const { stdout } = await execAsync('git status -s')
      if (stdout) {
        console.log(stdout)
        throw new Error(`generated files doesn't match.`)
      }
    }
  ],
  fix: {
    ts: `tslint --fix ${tsFiles}`,
    js: `standard --fix ${jsFiles}`
  },
  release: `clean-release`,
  screenshot: [
    new Service(`http-server -p 8000`),
    `tsc -p screenshots`,
    `node screenshots/index.js`
  ]
}
