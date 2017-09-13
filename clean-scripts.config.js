const childProcess = require('child_process')
const util = require('util')

const execAsync = util.promisify(childProcess.exec)

module.exports = {
  build: [
    'rimraf dist/',
    'tsc -p src/'
  ],
  lint: {
    ts: `tslint "src/**/*.ts"`,
    js: `standard "**/*.config.js"`,
    export: `no-unused-export "src/**/*.ts" "spec/*.ts"`
  },
  html: {
    js: [
      `file2variable-cli html/index.template.html -o html/variables.ts --html-minify --base html`,
      'tsc -p html',
      'webpack --display-modules --config html/webpack.config.js'
    ],
    css: [
      'cleancss -o html/vendor.bundle.css ./node_modules/tree-component/tree.min.css ./node_modules/github-fork-ribbon-css/gh-fork-ribbon.css'
    ]
  },
  test: [
    'tsc -p spec',
    'jasmine',
    `node dist/index.js src/*.ts -o demo/result.txt -o demo/result.json -o demo/result.html --exclude src/*.d.ts`,
    async () => {
      const { stdout } = await execAsync('git status -s')
      if (stdout) {
        console.log(stdout)
        throw new Error(`generated files doesn't match.`)
      }
    }
  ],
  fix: {
    ts: `tslint --fix "src/**/*.ts"`,
    js: `standard --fix "**/*.config.js"`
  },
  release: `clean-release`
}
