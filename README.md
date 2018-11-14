# code-structure

[![Dependency Status](https://david-dm.org/plantain-00/code-structure.svg)](https://david-dm.org/plantain-00/code-structure)
[![devDependency Status](https://david-dm.org/plantain-00/code-structure/dev-status.svg)](https://david-dm.org/plantain-00/code-structure#info=devDependencies)
[![Build Status: Linux](https://travis-ci.org/plantain-00/code-structure.svg?branch=master)](https://travis-ci.org/plantain-00/code-structure)
[![Build Status: Windows](https://ci.appveyor.com/api/projects/status/github/plantain-00/code-structure?branch=master&svg=true)](https://ci.appveyor.com/project/plantain-00/code-structure/branch/master)
[![npm version](https://badge.fury.io/js/code-structure.svg)](https://badge.fury.io/js/code-structure)
[![Downloads](https://img.shields.io/npm/dm/code-structure.svg)](https://www.npmjs.com/package/code-structure)
[![type-coverage](https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Fplantain-00%2Fcode-structure%2Fmaster%2Fpackage.json)](https://github.com/plantain-00/code-structure)

A CLI tool to generate code structure for typescript.

## install

`yarn global add code-structure`

## usage

run `code-structure "*.ts" foo.html`

or `code-structure "*.ts" -o foo.html --exclude bar.ts`

then open the generated html files in the browser.
