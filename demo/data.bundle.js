var fullTexts = {
  "src/index.ts": "import * as minimist from \"minimist\";\nimport * as ts from \"typescript\";\nimport * as fs from \"fs\";\nimport * as glob from \"glob\";\nimport * as path from \"path\";\nimport * as mkdirp from \"mkdirp\";\nimport * as packageJson from \"../package.json\";\nimport { JsonResult, JsonDataResult, JsonResultType } from \"./types\";\n\nlet suppressError = false;\n\nfunction printInConsole(message: any) {\n    if (message instanceof Error) {\n        message = message.message;\n    }\n    // tslint:disable-next-line:no-console\n    console.log(message);\n}\n\nfunction showToolVersion() {\n    printInConsole(`Version: ${packageJson.version}`);\n}\n\nfunction globAsync(pattern: string, ignore?: string | string[]) {\n    return new Promise<string[]>((resolve, reject) => {\n        glob(pattern, { ignore }, (error, matches) => {\n            if (error) {\n                reject(error);\n            } else {\n                resolve(matches);\n            }\n        });\n    });\n}\n\nfunction showSyntaxKind(node: ts.Node) {\n    printInConsole(node.kind);\n}\n\nfunction pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {\n    if (tree) {\n        if (Array.isArray(tree)) {\n            trees.push(...tree);\n        } else {\n            trees.push(tree);\n        }\n    }\n}\n\ntype Context = {\n    program: ts.Program;\n    languageService: ts.LanguageService;\n    nodes: ts.Node[];\n};\n\nconst definitionsCache = new Map<ts.Node, Tree | Tree[] | undefined>();\n\nfunction getCodeStructureOfDefinition(node: ts.Node, context: Context, file: string): Tree | Tree[] | undefined {\n    const definitions = context.languageService.getDefinitionAtPosition(file, node.end);\n    if (definitions && definitions.length > 0) {\n        const definition = definitions[0];\n        const sourceFile = context.program.getSourceFile(definition.fileName);\n        if (sourceFile) {\n            const definitionNode = sourceFile.forEachChild(child => {\n                if (child.pos < definition.textSpan.start && child.end > definition.textSpan.start + definition.textSpan.length) {\n                    return child;\n                }\n                return undefined;\n            });\n\n            if (definitionNode) {\n                if (definitionsCache.has(definitionNode)) {\n                    return definitionsCache.get(definitionNode);\n                }\n                const nestedNode = context.nodes.find(n => n === definitionNode);\n                let tree: Tree | Tree[] | undefined;\n                if (nestedNode) {\n                    tree = {\n                        node: nestedNode,\n                        sourceFile,\n                        type: JsonResultType.nested,\n                        children: [],\n                        file: definition.fileName,\n                    };\n                } else {\n                    if (definitionNode.kind === ts.SyntaxKind.FunctionDeclaration) {\n                        const declaration = definitionNode as ts.FunctionDeclaration;\n                        if (!declaration.modifiers\n                            || declaration.modifiers.every(m => m.kind !== ts.SyntaxKind.DeclareKeyword)) {\n                            tree = {\n                                node: declaration,\n                                sourceFile,\n                                type: JsonResultType.definition,\n                                children: [],\n                                file: definition.fileName,\n                            };\n                            if (declaration.body) {\n                                context.nodes.push(definitionNode);\n                                for (const statement of declaration.body.statements) {\n                                    const statementTree = getCodeStructure(statement, context, sourceFile, definition.fileName);\n                                    pushIntoTrees(tree.children, statementTree);\n                                }\n                                context.nodes.pop();\n                            }\n                        }\n                    } else {\n                        context.nodes.push(definitionNode);\n                        tree = getCodeStructure(definitionNode, context, sourceFile, definition.fileName);\n                        context.nodes.pop();\n                    }\n                }\n                definitionsCache.set(definitionNode, tree);\n                return tree;\n            }\n        }\n    }\n    return undefined;\n}\n\nfunction getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {\n    if (node === undefined) {\n        return undefined;\n    }\n    if (node.kind === ts.SyntaxKind.CallExpression) {\n        const callExpression = node as ts.CallExpression;\n        const tree: Tree = {\n            node: callExpression,\n            sourceFile,\n            children: [],\n            type: JsonResultType.call,\n            file,\n        };\n        const trees: Tree[] = [];\n        let callTree: Tree | Tree[] | undefined;\n        if (callExpression.expression.kind === ts.SyntaxKind.Identifier) {\n            const identifier = callExpression.expression as ts.Identifier;\n            callTree = getCodeStructureOfDefinition(identifier, context, file);\n        } else if (callExpression.expression.kind === ts.SyntaxKind.PropertyAccessExpression) {\n            const propertyAccessExpression = callExpression.expression as ts.PropertyAccessExpression;\n            const propertyAccessTrees: Tree[] = [];\n            const expressionTree = getCodeStructure(propertyAccessExpression.expression, context, sourceFile, file);\n            pushIntoTrees(propertyAccessTrees, expressionTree);\n\n            const nameTree = getCodeStructureOfDefinition(propertyAccessExpression.name, context, file);\n            pushIntoTrees(propertyAccessTrees, nameTree);\n\n            callTree = propertyAccessTrees.length > 0 ? propertyAccessTrees : undefined;\n        } else if (callExpression.expression.kind === ts.SyntaxKind.NewExpression) {\n            const newExpression = callExpression.expression as ts.NewExpression;\n            callTree = getCodeStructureOfDefinition(newExpression.expression, context, file);\n        } else if (callExpression.expression.kind === ts.SyntaxKind.CallExpression\n            || callExpression.expression.kind === ts.SyntaxKind.ElementAccessExpression\n            || callExpression.expression.kind === ts.SyntaxKind.ParenthesizedExpression) {\n            callTree = getCodeStructure(callExpression.expression, context, sourceFile, file);\n        } else {\n            showSyntaxKind(callExpression.expression);\n        }\n        pushIntoTrees(tree.children, callTree);\n\n        if (tree.children.length > 0) {\n            trees.push(tree);\n        }\n\n        const parameters = callExpression.arguments;\n        if (parameters && parameters.length > 0) {\n            for (const parameter of parameters) {\n                const parameterTree = getCodeStructure(parameter, context, sourceFile, file);\n                pushIntoTrees(trees, parameterTree);\n            }\n        }\n\n        return trees.length > 0 ? trees : undefined;\n    } else if (node.kind === ts.SyntaxKind.ForOfStatement) {\n        const forOfStatement = node as ts.ForOfStatement;\n        return getCodeStructure(forOfStatement.statement, context, sourceFile, file);\n    } else if (node.kind === ts.SyntaxKind.ArrowFunction\n        || node.kind === ts.SyntaxKind.ModuleDeclaration) {\n        const declaration = node as ts.ArrowFunction | ts.ModuleDeclaration;\n        return declaration.body ? getCodeStructure(declaration.body, context, sourceFile, file) : undefined;\n    } else if (node.kind === ts.SyntaxKind.PropertyAssignment) {\n        const propertyAssignmentExpression = node as ts.PropertyAssignment;\n        return getCodeStructure(propertyAssignmentExpression.initializer, context, sourceFile, file);\n    } else if (node.kind === ts.SyntaxKind.PrefixUnaryExpression\n        || node.kind === ts.SyntaxKind.PostfixUnaryExpression) {\n        const prefixUnaryExpression = node as ts.PrefixUnaryExpression | ts.PostfixUnaryExpression;\n        return getCodeStructure(prefixUnaryExpression.operand, context, sourceFile, file);\n    } else if (node.kind === ts.SyntaxKind.PropertyAccessExpression\n        || node.kind === ts.SyntaxKind.ExportSpecifier\n        || node.kind === ts.SyntaxKind.VariableDeclaration) {\n        const expression = node as ts.PropertyAccessExpression | ts.ExportSpecifier | ts.VariableDeclaration;\n        return getCodeStructure(expression.name, context, sourceFile, file);\n    } else if (node.kind === ts.SyntaxKind.ExportDeclaration) {\n        const exportDeclaration = node as ts.ExportDeclaration;\n        return exportDeclaration.exportClause ? getCodeStructure(exportDeclaration.exportClause, context, sourceFile, file) : undefined;\n    } else if (node.kind === ts.SyntaxKind.TemplateSpan\n        || node.kind === ts.SyntaxKind.ReturnStatement\n        || node.kind === ts.SyntaxKind.AsExpression\n        || node.kind === ts.SyntaxKind.SpreadElement\n        || node.kind === ts.SyntaxKind.ExpressionStatement\n        || node.kind === ts.SyntaxKind.AwaitExpression\n        || node.kind === ts.SyntaxKind.NewExpression\n        || node.kind === ts.SyntaxKind.ParenthesizedExpression\n        || node.kind === ts.SyntaxKind.TypeOfExpression\n        || node.kind === ts.SyntaxKind.NonNullExpression\n        || node.kind === ts.SyntaxKind.ThrowStatement\n        || node.kind === ts.SyntaxKind.ExportAssignment\n        || node.kind === ts.SyntaxKind.DeleteExpression\n        || node.kind === ts.SyntaxKind.VoidExpression\n        || node.kind === ts.SyntaxKind.TypeAssertionExpression) {\n        const expression = node as ts.TemplateSpan\n            | ts.ReturnStatement\n            | ts.AsExpression\n            | ts.SpreadElement\n            | ts.ExpressionStatement\n            | ts.AwaitExpression\n            | ts.NewExpression\n            | ts.ParenthesizedExpression\n            | ts.TypeOfExpression\n            | ts.NonNullExpression\n            | ts.ThrowStatement\n            | ts.ExportAssignment\n            | ts.DeleteExpression\n            | ts.VoidExpression\n            | ts.TypeAssertion;\n        return expression.expression ? getCodeStructure(expression.expression, context, sourceFile, file) : undefined;\n    } else {\n        const trees: Tree[] = [];\n        if (node.kind === ts.SyntaxKind.Block\n            || node.kind === ts.SyntaxKind.CaseClause\n            || node.kind === ts.SyntaxKind.DefaultClause) {\n            const statements = (node as ts.Block | ts.CaseClause).statements;\n            for (const statement of statements) {\n                const childTree = getCodeStructure(statement, context, sourceFile, file);\n                pushIntoTrees(trees, childTree);\n            }\n        } else if (node.kind === ts.SyntaxKind.IfStatement) {\n            const ifStatement = node as ts.IfStatement;\n            const ifTree = getCodeStructure(ifStatement.expression, context, sourceFile, file);\n            pushIntoTrees(trees, ifTree);\n\n            const thenTree = getCodeStructure(ifStatement.thenStatement, context, sourceFile, file);\n            pushIntoTrees(trees, thenTree);\n\n            if (ifStatement.elseStatement) {\n                const elseTree = getCodeStructure(ifStatement.elseStatement, context, sourceFile, file);\n                pushIntoTrees(trees, elseTree);\n            }\n        } else if (node.kind === ts.SyntaxKind.BinaryExpression) {\n            const binaryExpression = node as ts.BinaryExpression;\n            const leftTree = getCodeStructure(binaryExpression.left, context, sourceFile, file);\n            pushIntoTrees(trees, leftTree);\n\n            const rightTree = getCodeStructure(binaryExpression.right, context, sourceFile, file);\n            pushIntoTrees(trees, rightTree);\n        } else if (node.kind === ts.SyntaxKind.VariableStatement) {\n            const variableStatement = node as ts.VariableStatement;\n            const declarationListTree = getCodeStructure(variableStatement.declarationList, context, sourceFile, file);\n            pushIntoTrees(trees, declarationListTree);\n        } else if (node.kind === ts.SyntaxKind.TemplateExpression) {\n            const templateExpression = node as ts.TemplateExpression;\n            for (const span of templateExpression.templateSpans) {\n                const spanTree = getCodeStructure(span, context, sourceFile, file);\n                pushIntoTrees(trees, spanTree);\n            }\n        } else if (node.kind === ts.SyntaxKind.ArrayLiteralExpression) {\n            const arrayLiteralExpression = node as ts.ArrayLiteralExpression;\n            for (const element of arrayLiteralExpression.elements) {\n                const elementTree = getCodeStructure(element, context, sourceFile, file);\n                pushIntoTrees(trees, elementTree);\n            }\n        } else if (node.kind === ts.SyntaxKind.ObjectLiteralExpression) {\n            const objectLiteralExpression = node as ts.ObjectLiteralExpression;\n            for (const property of objectLiteralExpression.properties) {\n                const propertyTree = getCodeStructure(property, context, sourceFile, file);\n                pushIntoTrees(trees, propertyTree);\n            }\n        } else if (node.kind === ts.SyntaxKind.NamedExports) {\n            const namedExports = node as ts.NamedExports;\n            for (const element of namedExports.elements) {\n                const elementTree = getCodeStructure(element, context, sourceFile, file);\n                pushIntoTrees(trees, elementTree);\n            }\n        } else if (node.kind === ts.SyntaxKind.ModuleBlock) {\n            const moduleBlock = node as ts.ModuleBlock;\n            for (const statement of moduleBlock.statements) {\n                const statementTree = getCodeStructure(statement, context, sourceFile, file);\n                pushIntoTrees(trees, statementTree);\n            }\n        } else if (node.kind === ts.SyntaxKind.SwitchStatement) {\n            const switchStatement = node as ts.SwitchStatement;\n            const switchTree = getCodeStructure(switchStatement.expression, context, sourceFile, file);\n            pushIntoTrees(trees, switchTree);\n\n            const caseTree = getCodeStructure(switchStatement.caseBlock, context, sourceFile, file);\n            pushIntoTrees(trees, caseTree);\n        } else if (node.kind === ts.SyntaxKind.ConditionalExpression) {\n            const conditionalExpression = node as ts.ConditionalExpression;\n            const trueTree = getCodeStructure(conditionalExpression.whenTrue, context, sourceFile, file);\n            pushIntoTrees(trees, trueTree);\n\n            const falseTree = getCodeStructure(conditionalExpression.whenFalse, context, sourceFile, file);\n            pushIntoTrees(trees, falseTree);\n        } else if (node.kind === ts.SyntaxKind.CaseBlock) {\n            const caseBlock = node as ts.CaseBlock;\n            for (const clause of caseBlock.clauses) {\n                const clauseTree = getCodeStructure(clause, context, sourceFile, file);\n                pushIntoTrees(trees, clauseTree);\n            }\n        } else if (node.kind === ts.SyntaxKind.ForStatement) {\n            const forStatement = node as ts.ForStatement;\n            if (forStatement.initializer) {\n                const initializerTree = getCodeStructure(forStatement.initializer, context, sourceFile, file);\n                pushIntoTrees(trees, initializerTree);\n            }\n\n            if (forStatement.condition) {\n                const conditionTree = getCodeStructure(forStatement.condition, context, sourceFile, file);\n                pushIntoTrees(trees, conditionTree);\n            }\n\n            if (forStatement.incrementor) {\n                const incrementorTree = getCodeStructure(forStatement.incrementor, context, sourceFile, file);\n                pushIntoTrees(trees, incrementorTree);\n            }\n\n            const statementTree = getCodeStructure(forStatement.statement, context, sourceFile, file);\n            pushIntoTrees(trees, statementTree);\n        } else if (node.kind === ts.SyntaxKind.TryStatement) {\n            const tryStatement = node as ts.TryStatement;\n            const tryBlockTree = getCodeStructure(tryStatement.tryBlock, context, sourceFile, file);\n            pushIntoTrees(trees, tryBlockTree);\n\n            if (tryStatement.catchClause) {\n                const catchClauseTree = getCodeStructure(tryStatement.catchClause, context, sourceFile, file);\n                pushIntoTrees(trees, catchClauseTree);\n            }\n\n            if (tryStatement.finallyBlock) {\n                const finallyBlockTree = getCodeStructure(tryStatement.finallyBlock, context, sourceFile, file);\n                pushIntoTrees(trees, finallyBlockTree);\n            }\n        } else if (node.kind === ts.SyntaxKind.VariableDeclarationList) {\n            const declarationList = node as ts.VariableDeclarationList;\n            for (const declaration of declarationList.declarations) {\n                if (declaration.initializer) {\n                    const childTree = getCodeStructure(declaration.initializer, context, sourceFile, file);\n                    pushIntoTrees(trees, childTree);\n                }\n            }\n        } else if (node.kind === ts.SyntaxKind.CatchClause) {\n            const catchClause = node as ts.CatchClause;\n            if (catchClause.variableDeclaration) {\n                const variableDeclarationTree = getCodeStructure(catchClause.variableDeclaration, context, sourceFile, file);\n                pushIntoTrees(trees, variableDeclarationTree);\n            }\n\n            const blockTree = getCodeStructure(catchClause.block, context, sourceFile, file);\n            pushIntoTrees(trees, blockTree);\n        } else if (node.kind === ts.SyntaxKind.ForInStatement) {\n            const forInStatement = node as ts.ForInStatement;\n            const initializerTree = getCodeStructure(forInStatement.initializer, context, sourceFile, file);\n            pushIntoTrees(trees, initializerTree);\n\n            const expressionTree = getCodeStructure(forInStatement.expression, context, sourceFile, file);\n            pushIntoTrees(trees, expressionTree);\n\n            const statementTree = getCodeStructure(forInStatement.statement, context, sourceFile, file);\n            pushIntoTrees(trees, statementTree);\n        } else if (node.kind === ts.SyntaxKind.WhileStatement) {\n            const whileStatement = node as ts.WhileStatement;\n            const statementTree = getCodeStructure(whileStatement.statement, context, sourceFile, file);\n            pushIntoTrees(trees, statementTree);\n\n            const expressionTree = getCodeStructure(whileStatement.expression, context, sourceFile, file);\n            pushIntoTrees(trees, expressionTree);\n        } else if (node.kind === ts.SyntaxKind.ElementAccessExpression) {\n            const elementAccessExpression = node as ts.ElementAccessExpression;\n            const statementTree = getCodeStructure(elementAccessExpression.expression, context, sourceFile, file);\n            pushIntoTrees(trees, statementTree);\n\n            if (elementAccessExpression.argumentExpression) {\n                const argumentExpressionTree = getCodeStructure(elementAccessExpression.argumentExpression, context, sourceFile, file);\n                pushIntoTrees(trees, argumentExpressionTree);\n            }\n        } else if (node.kind === ts.SyntaxKind.FunctionExpression) {\n            const functionExpression = node as ts.FunctionExpression;\n            const bodyTree = getCodeStructure(functionExpression.body, context, sourceFile, file);\n            pushIntoTrees(trees, bodyTree);\n\n            if (functionExpression.name) {\n                const nameTree = getCodeStructure(functionExpression.name, context, sourceFile, file);\n                pushIntoTrees(trees, nameTree);\n            }\n        } else if (node.kind === ts.SyntaxKind.EndOfFileToken\n            || node.kind === ts.SyntaxKind.NumericLiteral\n            || node.kind === ts.SyntaxKind.StringLiteral\n            || node.kind === ts.SyntaxKind.ImportDeclaration\n            || node.kind === ts.SyntaxKind.MethodDeclaration\n            || node.kind === ts.SyntaxKind.FunctionDeclaration\n            || node.kind === ts.SyntaxKind.InterfaceDeclaration\n            || node.kind === ts.SyntaxKind.ShorthandPropertyAssignment\n            || node.kind === ts.SyntaxKind.Identifier\n            || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral\n            || node.kind === ts.SyntaxKind.EnumDeclaration\n            || node.kind === ts.SyntaxKind.TypeAliasDeclaration\n            || node.kind === ts.SyntaxKind.ImportEqualsDeclaration\n            || node.kind === ts.SyntaxKind.ClassDeclaration\n            || node.kind === ts.SyntaxKind.NullKeyword\n            || node.kind === ts.SyntaxKind.TrueKeyword\n            || node.kind === ts.SyntaxKind.FalseKeyword\n            || node.kind === ts.SyntaxKind.ThisKeyword\n            || node.kind === ts.SyntaxKind.BreakStatement\n            || node.kind === ts.SyntaxKind.ContinueStatement\n            || node.kind === ts.SyntaxKind.RegularExpressionLiteral) {\n            return undefined;\n        } else {\n            showSyntaxKind(node);\n            return undefined;\n        }\n        return trees.length > 0 ? trees : undefined;\n    }\n}\n\nconst fullTexts: { [file: string]: string } = {};\n\nfunction getJsonResult(tree: Tree): JsonResult {\n    const startPosition = tree.node.getStart(tree.sourceFile);\n    const { line } = ts.getLineAndCharacterOfPosition(tree.sourceFile, startPosition);\n    const text = tree.sourceFile.text.substring(startPosition, tree.sourceFile.getLineEndOfPosition(startPosition)).trim();\n    const jsonResult: JsonResult = {\n        type: tree.type,\n        file: tree.file,\n        line: line + 1,\n        text,\n        children: [],\n    };\n    for (const child of tree.children) {\n        jsonResult.children.push(getJsonResult(child));\n    }\n    return jsonResult;\n}\n\ntype Tree = {\n    children: Tree[];\n    node: ts.Node;\n    sourceFile: ts.SourceFile;\n    type: JsonResultType;\n    file: string;\n};\n\ntype Result = {\n    file: string;\n    trees: Tree[];\n};\n\nasync function executeCommandLine() {\n    const argv = minimist(process.argv.slice(2), { \"--\": true });\n\n    const showVersion = argv.v || argv.version;\n    if (showVersion) {\n        showToolVersion();\n        return;\n    }\n\n    suppressError = argv.suppressError;\n\n    if (argv._.length === 0) {\n        throw new Error(\"Expect at least one pattern.\");\n    }\n    const pattern = argv._.length === 1 ? argv._[0] : `{${argv._.join(\",\")}}`;\n    const exclude: string | string[] | undefined = argv.exclude;\n    const uniqFiles = await globAsync(pattern, exclude);\n\n    for (const file of uniqFiles) {\n        printInConsole(file);\n    }\n    printInConsole(`Total: ${uniqFiles.length}`);\n\n    const out: string | string | undefined = argv.o;\n    let htmlOutput: string;\n    if (typeof out === \"string\") {\n        htmlOutput = out;\n    } else if (Array.isArray(out) && out.length > 0) {\n        htmlOutput = out[0];\n    } else {\n        throw new Error(\"Output file not found.\");\n    }\n\n    const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.ESNext, allowJs: true };\n    const languageService = ts.createLanguageService({\n        getCompilationSettings() {\n            return compilerOptions;\n        },\n        getScriptFileNames() {\n            return uniqFiles;\n        },\n        getScriptVersion(fileName: string) {\n            return \"\";\n        },\n        getScriptSnapshot(fileName: string) {\n            if (fileName === \".ts\") {\n                return ts.ScriptSnapshot.fromString(\"\");\n            }\n            return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, { encoding: \"utf8\" }));\n        },\n        getCurrentDirectory: () => \".\",\n        getDefaultLibFileName(options: ts.CompilerOptions) {\n            return ts.getDefaultLibFilePath(options);\n        },\n        fileExists: ts.sys.fileExists,\n        readFile: ts.sys.readFile,\n        readDirectory: ts.sys.readDirectory,\n    });\n\n    const program = ts.createProgram(uniqFiles, compilerOptions);\n\n    const results: Result[] = [];\n\n    const now = Date.now();\n\n    for (const file of uniqFiles) {\n        const sourceFile = program.getSourceFile(file);\n\n        if (sourceFile) {\n            const trees: Tree[] = [];\n            sourceFile.forEachChild(node => {\n                const tree = getCodeStructure(node, {\n                    nodes: [],\n                    program,\n                    languageService,\n                }, sourceFile, file);\n                pushIntoTrees(trees, tree);\n            });\n            if (trees.length > 0) {\n                fullTexts[file] = fs.readFileSync(file).toString();\n                results.push({ file, trees });\n            }\n        }\n    }\n\n    printInConsole(`${(Date.now() - now) / 1000.0} s`);\n\n    const jsonResult: JsonDataResult[] = results.map(result => ({\n        file: result.file,\n        results: result.trees.map(tree => getJsonResult(tree)),\n    }));\n    const dirname = path.dirname(htmlOutput);\n    mkdirp(dirname, error => {\n        if (error) {\n            printInConsole(error);\n        } else {\n            const dataStream = fs.createWriteStream(path.resolve(dirname, \"data.bundle.js\"));\n            dataStream.write(`var fullTexts = ${JSON.stringify(fullTexts, null, \"  \")};\\n`);\n            dataStream.write(`var data = ${JSON.stringify(jsonResult, null, \"  \")};`);\n            fs.createReadStream(path.resolve(__dirname, \"../html/index.html\")).pipe(fs.createWriteStream(htmlOutput));\n            for (const filename of [\"index.bundle.js\", \"vendor.bundle.js\", \"vendor.bundle.css\"]) {\n                fs.createReadStream(path.resolve(__dirname, `../html/${filename}`)).pipe(fs.createWriteStream(path.resolve(dirname, filename)));\n            }\n        }\n    });\n}\n\nexecuteCommandLine().then(() => {\n    printInConsole(\"code-structure success.\");\n}, error => {\n    printInConsole(error);\n    if (!suppressError) {\n        process.exit(1);\n    }\n});\n"
};
var data = [
  {
    "file": "src/index.ts",
    "results": [
      {
        "type": "call",
        "file": "src/index.ts",
        "line": 563,
        "text": "executeCommandLine().then(() => {",
        "children": [
          {
            "type": "call",
            "file": "src/index.ts",
            "line": 563,
            "text": "executeCommandLine().then(() => {",
            "children": [
              {
                "type": "definition",
                "file": "src/index.ts",
                "line": 456,
                "text": "async function executeCommandLine() {",
                "children": [
                  {
                    "type": "call",
                    "file": "src/index.ts",
                    "line": 461,
                    "text": "showToolVersion();",
                    "children": [
                      {
                        "type": "definition",
                        "file": "src/index.ts",
                        "line": 20,
                        "text": "function showToolVersion() {",
                        "children": [
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 21,
                            "text": "printInConsole(`Version: ${packageJson.version}`);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 12,
                                "text": "function printInConsole(message: any) {",
                                "children": []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "type": "call",
                    "file": "src/index.ts",
                    "line": 472,
                    "text": "globAsync(pattern, exclude);",
                    "children": [
                      {
                        "type": "definition",
                        "file": "src/index.ts",
                        "line": 24,
                        "text": "function globAsync(pattern: string, ignore?: string | string[]) {",
                        "children": []
                      }
                    ]
                  },
                  {
                    "type": "call",
                    "file": "src/index.ts",
                    "line": 475,
                    "text": "printInConsole(file);",
                    "children": [
                      {
                        "type": "definition",
                        "file": "src/index.ts",
                        "line": 12,
                        "text": "function printInConsole(message: any) {",
                        "children": []
                      }
                    ]
                  },
                  {
                    "type": "call",
                    "file": "src/index.ts",
                    "line": 477,
                    "text": "printInConsole(`Total: ${uniqFiles.length}`);",
                    "children": [
                      {
                        "type": "definition",
                        "file": "src/index.ts",
                        "line": 12,
                        "text": "function printInConsole(message: any) {",
                        "children": []
                      }
                    ]
                  },
                  {
                    "type": "call",
                    "file": "src/index.ts",
                    "line": 527,
                    "text": "getCodeStructure(node, {",
                    "children": [
                      {
                        "type": "definition",
                        "file": "src/index.ts",
                        "line": 120,
                        "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                        "children": [
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 137,
                            "text": "getCodeStructureOfDefinition(identifier, context, file);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 58,
                                "text": "function getCodeStructureOfDefinition(node: ts.Node, context: Context, file: string): Tree | Tree[] | undefined {",
                                "children": [
                                  {
                                    "type": "call",
                                    "file": "src/index.ts",
                                    "line": 100,
                                    "text": "getCodeStructure(statement, context, sourceFile, definition.fileName);",
                                    "children": [
                                      {
                                        "type": "nested",
                                        "file": "src/index.ts",
                                        "line": 120,
                                        "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "type": "call",
                                    "file": "src/index.ts",
                                    "line": 101,
                                    "text": "pushIntoTrees(tree.children, statementTree);",
                                    "children": [
                                      {
                                        "type": "definition",
                                        "file": "src/index.ts",
                                        "line": 40,
                                        "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "type": "call",
                                    "file": "src/index.ts",
                                    "line": 108,
                                    "text": "getCodeStructure(definitionNode, context, sourceFile, definition.fileName);",
                                    "children": [
                                      {
                                        "type": "nested",
                                        "file": "src/index.ts",
                                        "line": 120,
                                        "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 141,
                            "text": "getCodeStructure(propertyAccessExpression.expression, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 142,
                            "text": "pushIntoTrees(propertyAccessTrees, expressionTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 144,
                            "text": "getCodeStructureOfDefinition(propertyAccessExpression.name, context, file);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 58,
                                "text": "function getCodeStructureOfDefinition(node: ts.Node, context: Context, file: string): Tree | Tree[] | undefined {",
                                "children": [
                                  {
                                    "type": "call",
                                    "file": "src/index.ts",
                                    "line": 100,
                                    "text": "getCodeStructure(statement, context, sourceFile, definition.fileName);",
                                    "children": [
                                      {
                                        "type": "nested",
                                        "file": "src/index.ts",
                                        "line": 120,
                                        "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "type": "call",
                                    "file": "src/index.ts",
                                    "line": 101,
                                    "text": "pushIntoTrees(tree.children, statementTree);",
                                    "children": [
                                      {
                                        "type": "definition",
                                        "file": "src/index.ts",
                                        "line": 40,
                                        "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "type": "call",
                                    "file": "src/index.ts",
                                    "line": 108,
                                    "text": "getCodeStructure(definitionNode, context, sourceFile, definition.fileName);",
                                    "children": [
                                      {
                                        "type": "nested",
                                        "file": "src/index.ts",
                                        "line": 120,
                                        "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 145,
                            "text": "pushIntoTrees(propertyAccessTrees, nameTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 150,
                            "text": "getCodeStructureOfDefinition(newExpression.expression, context, file);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 58,
                                "text": "function getCodeStructureOfDefinition(node: ts.Node, context: Context, file: string): Tree | Tree[] | undefined {",
                                "children": [
                                  {
                                    "type": "call",
                                    "file": "src/index.ts",
                                    "line": 100,
                                    "text": "getCodeStructure(statement, context, sourceFile, definition.fileName);",
                                    "children": [
                                      {
                                        "type": "nested",
                                        "file": "src/index.ts",
                                        "line": 120,
                                        "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "type": "call",
                                    "file": "src/index.ts",
                                    "line": 101,
                                    "text": "pushIntoTrees(tree.children, statementTree);",
                                    "children": [
                                      {
                                        "type": "definition",
                                        "file": "src/index.ts",
                                        "line": 40,
                                        "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                        "children": []
                                      }
                                    ]
                                  },
                                  {
                                    "type": "call",
                                    "file": "src/index.ts",
                                    "line": 108,
                                    "text": "getCodeStructure(definitionNode, context, sourceFile, definition.fileName);",
                                    "children": [
                                      {
                                        "type": "nested",
                                        "file": "src/index.ts",
                                        "line": 120,
                                        "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 154,
                            "text": "getCodeStructure(callExpression.expression, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 156,
                            "text": "showSyntaxKind(callExpression.expression);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 36,
                                "text": "function showSyntaxKind(node: ts.Node) {",
                                "children": [
                                  {
                                    "type": "call",
                                    "file": "src/index.ts",
                                    "line": 37,
                                    "text": "printInConsole(node.kind);",
                                    "children": [
                                      {
                                        "type": "definition",
                                        "file": "src/index.ts",
                                        "line": 12,
                                        "text": "function printInConsole(message: any) {",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 158,
                            "text": "pushIntoTrees(tree.children, callTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 167,
                            "text": "getCodeStructure(parameter, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 168,
                            "text": "pushIntoTrees(trees, parameterTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 175,
                            "text": "getCodeStructure(forOfStatement.statement, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 179,
                            "text": "getCodeStructure(declaration.body, context, sourceFile, file) : undefined;",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 182,
                            "text": "getCodeStructure(propertyAssignmentExpression.initializer, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 186,
                            "text": "getCodeStructure(prefixUnaryExpression.operand, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 191,
                            "text": "getCodeStructure(expression.name, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 194,
                            "text": "getCodeStructure(exportDeclaration.exportClause, context, sourceFile, file) : undefined;",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 225,
                            "text": "getCodeStructure(expression.expression, context, sourceFile, file) : undefined;",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 233,
                            "text": "getCodeStructure(statement, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 234,
                            "text": "pushIntoTrees(trees, childTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 238,
                            "text": "getCodeStructure(ifStatement.expression, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 239,
                            "text": "pushIntoTrees(trees, ifTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 241,
                            "text": "getCodeStructure(ifStatement.thenStatement, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 242,
                            "text": "pushIntoTrees(trees, thenTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 245,
                            "text": "getCodeStructure(ifStatement.elseStatement, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 246,
                            "text": "pushIntoTrees(trees, elseTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 250,
                            "text": "getCodeStructure(binaryExpression.left, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 251,
                            "text": "pushIntoTrees(trees, leftTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 253,
                            "text": "getCodeStructure(binaryExpression.right, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 254,
                            "text": "pushIntoTrees(trees, rightTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 257,
                            "text": "getCodeStructure(variableStatement.declarationList, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 258,
                            "text": "pushIntoTrees(trees, declarationListTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 262,
                            "text": "getCodeStructure(span, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 263,
                            "text": "pushIntoTrees(trees, spanTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 268,
                            "text": "getCodeStructure(element, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 269,
                            "text": "pushIntoTrees(trees, elementTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 274,
                            "text": "getCodeStructure(property, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 275,
                            "text": "pushIntoTrees(trees, propertyTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 280,
                            "text": "getCodeStructure(element, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 281,
                            "text": "pushIntoTrees(trees, elementTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 286,
                            "text": "getCodeStructure(statement, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 287,
                            "text": "pushIntoTrees(trees, statementTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 291,
                            "text": "getCodeStructure(switchStatement.expression, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 292,
                            "text": "pushIntoTrees(trees, switchTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 294,
                            "text": "getCodeStructure(switchStatement.caseBlock, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 295,
                            "text": "pushIntoTrees(trees, caseTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 298,
                            "text": "getCodeStructure(conditionalExpression.whenTrue, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 299,
                            "text": "pushIntoTrees(trees, trueTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 301,
                            "text": "getCodeStructure(conditionalExpression.whenFalse, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 302,
                            "text": "pushIntoTrees(trees, falseTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 306,
                            "text": "getCodeStructure(clause, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 307,
                            "text": "pushIntoTrees(trees, clauseTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 312,
                            "text": "getCodeStructure(forStatement.initializer, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 313,
                            "text": "pushIntoTrees(trees, initializerTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 317,
                            "text": "getCodeStructure(forStatement.condition, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 318,
                            "text": "pushIntoTrees(trees, conditionTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 322,
                            "text": "getCodeStructure(forStatement.incrementor, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 323,
                            "text": "pushIntoTrees(trees, incrementorTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 326,
                            "text": "getCodeStructure(forStatement.statement, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 327,
                            "text": "pushIntoTrees(trees, statementTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 330,
                            "text": "getCodeStructure(tryStatement.tryBlock, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 331,
                            "text": "pushIntoTrees(trees, tryBlockTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 334,
                            "text": "getCodeStructure(tryStatement.catchClause, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 335,
                            "text": "pushIntoTrees(trees, catchClauseTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 339,
                            "text": "getCodeStructure(tryStatement.finallyBlock, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 340,
                            "text": "pushIntoTrees(trees, finallyBlockTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 346,
                            "text": "getCodeStructure(declaration.initializer, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 347,
                            "text": "pushIntoTrees(trees, childTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 353,
                            "text": "getCodeStructure(catchClause.variableDeclaration, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 354,
                            "text": "pushIntoTrees(trees, variableDeclarationTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 357,
                            "text": "getCodeStructure(catchClause.block, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 358,
                            "text": "pushIntoTrees(trees, blockTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 361,
                            "text": "getCodeStructure(forInStatement.initializer, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 362,
                            "text": "pushIntoTrees(trees, initializerTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 364,
                            "text": "getCodeStructure(forInStatement.expression, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 365,
                            "text": "pushIntoTrees(trees, expressionTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 367,
                            "text": "getCodeStructure(forInStatement.statement, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 368,
                            "text": "pushIntoTrees(trees, statementTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 371,
                            "text": "getCodeStructure(whileStatement.statement, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 372,
                            "text": "pushIntoTrees(trees, statementTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 374,
                            "text": "getCodeStructure(whileStatement.expression, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 375,
                            "text": "pushIntoTrees(trees, expressionTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 378,
                            "text": "getCodeStructure(elementAccessExpression.expression, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 379,
                            "text": "pushIntoTrees(trees, statementTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 382,
                            "text": "getCodeStructure(elementAccessExpression.argumentExpression, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 383,
                            "text": "pushIntoTrees(trees, argumentExpressionTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 387,
                            "text": "getCodeStructure(functionExpression.body, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 388,
                            "text": "pushIntoTrees(trees, bodyTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 391,
                            "text": "getCodeStructure(functionExpression.name, context, sourceFile, file);",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 120,
                                "text": "function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 392,
                            "text": "pushIntoTrees(trees, nameTree);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 40,
                                "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                                "children": []
                              }
                            ]
                          },
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 417,
                            "text": "showSyntaxKind(node);",
                            "children": [
                              {
                                "type": "definition",
                                "file": "src/index.ts",
                                "line": 36,
                                "text": "function showSyntaxKind(node: ts.Node) {",
                                "children": [
                                  {
                                    "type": "call",
                                    "file": "src/index.ts",
                                    "line": 37,
                                    "text": "printInConsole(node.kind);",
                                    "children": [
                                      {
                                        "type": "definition",
                                        "file": "src/index.ts",
                                        "line": 12,
                                        "text": "function printInConsole(message: any) {",
                                        "children": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "type": "call",
                    "file": "src/index.ts",
                    "line": 532,
                    "text": "pushIntoTrees(trees, tree);",
                    "children": [
                      {
                        "type": "definition",
                        "file": "src/index.ts",
                        "line": 40,
                        "text": "function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {",
                        "children": []
                      }
                    ]
                  },
                  {
                    "type": "call",
                    "file": "src/index.ts",
                    "line": 541,
                    "text": "printInConsole(`${(Date.now() - now) / 1000.0} s`);",
                    "children": [
                      {
                        "type": "definition",
                        "file": "src/index.ts",
                        "line": 12,
                        "text": "function printInConsole(message: any) {",
                        "children": []
                      }
                    ]
                  },
                  {
                    "type": "call",
                    "file": "src/index.ts",
                    "line": 545,
                    "text": "getJsonResult(tree)),",
                    "children": [
                      {
                        "type": "definition",
                        "file": "src/index.ts",
                        "line": 426,
                        "text": "function getJsonResult(tree: Tree): JsonResult {",
                        "children": [
                          {
                            "type": "call",
                            "file": "src/index.ts",
                            "line": 438,
                            "text": "getJsonResult(child));",
                            "children": [
                              {
                                "type": "nested",
                                "file": "src/index.ts",
                                "line": 426,
                                "text": "function getJsonResult(tree: Tree): JsonResult {",
                                "children": []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "type": "call",
                    "file": "src/index.ts",
                    "line": 550,
                    "text": "printInConsole(error);",
                    "children": [
                      {
                        "type": "definition",
                        "file": "src/index.ts",
                        "line": 12,
                        "text": "function printInConsole(message: any) {",
                        "children": []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "type": "call",
        "file": "src/index.ts",
        "line": 564,
        "text": "printInConsole(\"code-structure success.\");",
        "children": [
          {
            "type": "definition",
            "file": "src/index.ts",
            "line": 12,
            "text": "function printInConsole(message: any) {",
            "children": []
          }
        ]
      },
      {
        "type": "call",
        "file": "src/index.ts",
        "line": 566,
        "text": "printInConsole(error);",
        "children": [
          {
            "type": "definition",
            "file": "src/index.ts",
            "line": 12,
            "text": "function printInConsole(message: any) {",
            "children": []
          }
        ]
      }
    ]
  }
];