const tsFiles = `"src/**/*.ts" "html/**/*.ts"`

export default {
  build: [
    'rimraf dist/',
    'tsc -p src/',
    {
      js: [
        `file2variable-cli --config html/file2variable.config.ts`,
        'webpack --config html/webpack.config.ts'
      ],
      css: [
        'cleancss -o html/vendor.bundle.css ./node_modules/tree-component/dist/tree.min.css ./node_modules/github-fork-ribbon-css/gh-fork-ribbon.css ./node_modules/highlight.js/styles/routeros.css'
      ]
    },
    `node dist/index.js src/*.ts -o demo/result.html --exclude src/*.d.ts`
  ],
  lint: {
    ts: `eslint --ext .js,.ts ${tsFiles}`,
    export: `no-unused-export ${tsFiles}`,
    markdown: `markdownlint README.md`,
    typeCoverage: 'type-coverage -p src --strict',
    typeCoverageHtml: 'type-coverage -p html --strict --ignore-files html/variables.ts'
  },
  test: [
    'clean-release --config clean-run.config.ts'
  ],
  fix: `eslint --ext .js,.ts ${tsFiles} --fix`
}
