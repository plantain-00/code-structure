const childProcess = require('child_process')
const util = require('util')

const execAsync = util.promisify(childProcess.exec)

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
    `node dist/index.js src/*.ts -o demo/result.html --exclude src/*.d.ts`,
    async () => {
      const { createServer } = require('http-server')
      const puppeteer = require('puppeteer')
      const fs = require('fs')
      const beautify = require('js-beautify').html
      const server = createServer()
      server.listen(8000)
      const browser = await puppeteer.launch()
      const page = await browser.newPage()
      await page.emulate({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36' })
      await page.goto(`http://localhost:8000/demo/result.html`)
      await page.screenshot({ path: `demo/screenshot.png`, fullPage: true })
      const content = await page.content()
      fs.writeFileSync(`demo/screenshot-src.html`, beautify(content))
      server.close()
      browser.close()
    }
  ],
  lint: {
    ts: `tslint "src/**/*.ts" "html/**/*.ts"`,
    js: `standard "**/*.config.js"`,
    export: `no-unused-export "src/**/*.ts" "html/**/*.ts" "spec/*.ts"`
  },
  test: [
    'tsc -p spec',
    'jasmine',
    'git checkout demo/screenshot.png',
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
