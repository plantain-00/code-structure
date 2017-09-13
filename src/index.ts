import * as minimist from "minimist";
import * as ts from "typescript";
import * as fs from "fs";
import flatten = require("lodash.flatten");
import uniq = require("lodash.uniq");
import * as glob from "glob";
import * as minimatch from "minimatch";
import * as packageJson from "../package.json";

let suppressError = false;

function printInConsole(message: any) {
    if (message instanceof Error) {
        message = message.message;
    }
    // tslint:disable-next-line:no-console
    console.log(message);
}

function showToolVersion() {
    printInConsole(`Version: ${packageJson.version}`);
}

function globAsync(pattern: string) {
    return new Promise<string[]>((resolve, reject) => {
        glob(pattern, (error, matches) => {
            if (error) {
                reject(error);
            } else {
                resolve(matches);
            }
        });
    });
}

function findNodeAtDefinition(program: ts.Program, definition: ts.DefinitionInfo) {
    const sourceFile = program.getSourceFile(definition.fileName);
    if (sourceFile) {
        return sourceFile.forEachChild(child => {
            if (child.pos < definition.textSpan.start && child.end > definition.textSpan.start + definition.textSpan.length) {
                return { sourceFile, node: child };
            }
            return undefined;
        });
    }
    return undefined;
}

function showSyntaxKind(node: ts.Node) {
    // if (node.kind === ts.SyntaxKind.ParenthesizedExpression) {
    //     printInConsole(node);
    // }
    printInConsole(node.kind);
}

function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {
    if (tree) {
        if (Array.isArray(tree)) {
            trees.push(...tree);
        } else {
            trees.push(tree);
        }
    }
}

type Context = {
    program: ts.Program;
    languageService: ts.LanguageService;
    nodes: ts.Node[];
};

function handleDefinition(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | Tree[] | undefined {
    const definitions = context.languageService.getDefinitionAtPosition(file, node.end);
    if (definitions && definitions.length > 0) {
        const definition = definitions[0];
        const definitionNode = findNodeAtDefinition(context.program, definition);
        if (definitionNode && context.nodes.indexOf(definitionNode.node) === -1) {
            if (definitionNode.node.kind === ts.SyntaxKind.FunctionDeclaration) {
                const declaration = definitionNode.node as ts.FunctionDeclaration;
                const tree: Tree = {
                    node: declaration,
                    sourceFile: definitionNode.sourceFile,
                    type: "definition",
                    children: [],
                    file: definition.fileName,
                };
                if (declaration.body) {
                    context.nodes.push(definitionNode.node);
                    for (const statement of declaration.body.statements) {
                        const statementTree = handle(statement, context, definitionNode.sourceFile, definition.fileName);
                        pushIntoTrees(tree.children, statementTree);
                    }
                    context.nodes.pop();
                }
                return tree;
            } else {
                context.nodes.push(definitionNode.node);
                const tree = handle(definitionNode.node, context, definitionNode.sourceFile, definition.fileName);
                context.nodes.pop();
                return tree;
            }
        }
    }
    return undefined;
}

function handleCallExpression(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {
    if (node.kind === ts.SyntaxKind.Identifier) {
        const identifier = node as ts.Identifier;
        return handleDefinition(identifier, context, sourceFile, file);
    } else if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
        const propertyAccessExpression = node as ts.PropertyAccessExpression;
        const trees: Tree[] = [];
        const expressionTree = handle(propertyAccessExpression.expression, context, sourceFile, file);
        pushIntoTrees(trees, expressionTree);

        const nameTree = handleDefinition(propertyAccessExpression.name, context, sourceFile, file);
        pushIntoTrees(trees, nameTree);

        return trees.length > 0 ? trees : undefined;
    } else if (node.kind === ts.SyntaxKind.NewExpression) {
        const newExpression = node as ts.NewExpression;
        return handleDefinition(newExpression.expression, context, sourceFile, file);
    } else if (node.kind === ts.SyntaxKind.CallExpression
        || node.kind === ts.SyntaxKind.ElementAccessExpression
        || node.kind === ts.SyntaxKind.ParenthesizedExpression) {
        return handle(node, context, sourceFile, file);
    } else {
        showSyntaxKind(node);
    }
    return undefined;
}

function handle(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {
    if (node === undefined) {
        return undefined;
    }
    if (node.kind === ts.SyntaxKind.CallExpression) {
        const callExpression = node as ts.CallExpression;
        const tree: Tree = {
            node: callExpression,
            sourceFile,
            children: [],
            type: "call",
            file,
        };
        const trees: Tree[] = [];
        const functionTree = handleCallExpression(callExpression.expression, context, sourceFile, file);
        pushIntoTrees(tree.children, functionTree);

        if (tree.children.length > 0) {
            trees.push(tree);
        }

        const parameters = callExpression.arguments;
        if (parameters && parameters.length > 0) {
            for (const parameter of parameters) {
                const parameterTree = handle(parameter, context, sourceFile, file);
                pushIntoTrees(trees, parameterTree);
            }
        }

        return trees.length > 0 ? trees : undefined;
    } else if (node.kind === ts.SyntaxKind.ForOfStatement) {
        const forOfStatement = node as ts.ForOfStatement;
        return handle(forOfStatement.statement, context, sourceFile, file);
    } else if (node.kind === ts.SyntaxKind.ArrowFunction
        || node.kind === ts.SyntaxKind.ModuleDeclaration) {
        const declaration = node as ts.ArrowFunction | ts.ModuleDeclaration;
        return declaration.body ? handle(declaration.body, context, sourceFile, file) : undefined;
    } else if (node.kind === ts.SyntaxKind.PropertyAssignment) {
        const propertyAssignmentExpression = node as ts.PropertyAssignment;
        return handle(propertyAssignmentExpression.initializer, context, sourceFile, file);
    } else if (node.kind === ts.SyntaxKind.PrefixUnaryExpression
        || node.kind === ts.SyntaxKind.PostfixUnaryExpression) {
        const prefixUnaryExpression = node as ts.PrefixUnaryExpression | ts.PostfixUnaryExpression;
        return handle(prefixUnaryExpression.operand, context, sourceFile, file);
    } else if (node.kind === ts.SyntaxKind.PropertyAccessExpression
        || node.kind === ts.SyntaxKind.ExportSpecifier
        || node.kind === ts.SyntaxKind.VariableDeclaration) {
        const expression = node as ts.PropertyAccessExpression | ts.ExportSpecifier | ts.VariableDeclaration;
        return handle(expression.name, context, sourceFile, file);
    } else if (node.kind === ts.SyntaxKind.ExportDeclaration) {
        const exportDeclaration = node as ts.ExportDeclaration;
        return exportDeclaration.exportClause ? handle(exportDeclaration.exportClause, context, sourceFile, file) : undefined;
    } else if (node.kind === ts.SyntaxKind.TemplateSpan
        || node.kind === ts.SyntaxKind.ReturnStatement
        || node.kind === ts.SyntaxKind.AsExpression
        || node.kind === ts.SyntaxKind.SpreadElement
        || node.kind === ts.SyntaxKind.ExpressionStatement
        || node.kind === ts.SyntaxKind.AwaitExpression
        || node.kind === ts.SyntaxKind.NewExpression
        || node.kind === ts.SyntaxKind.ParenthesizedExpression
        || node.kind === ts.SyntaxKind.TypeOfExpression
        || node.kind === ts.SyntaxKind.NonNullExpression
        || node.kind === ts.SyntaxKind.ThrowStatement
        || node.kind === ts.SyntaxKind.ExportAssignment
        || node.kind === ts.SyntaxKind.DeleteExpression) {
        const expression = node as ts.TemplateSpan
            | ts.ReturnStatement
            | ts.AsExpression
            | ts.SpreadElement
            | ts.ExpressionStatement
            | ts.AwaitExpression
            | ts.NewExpression
            | ts.ParenthesizedExpression
            | ts.TypeOfExpression
            | ts.NonNullExpression
            | ts.ThrowStatement
            | ts.ExportAssignment
            | ts.DeleteExpression;
        return expression.expression ? handle(expression.expression, context, sourceFile, file) : undefined;
    } else {
        const trees: Tree[] = [];
        if (node.kind === ts.SyntaxKind.Block
            || node.kind === ts.SyntaxKind.CaseClause) {
            const statements = (node as ts.Block | ts.CaseClause).statements;
            for (const statement of statements) {
                const childTree = handle(statement, context, sourceFile, file);
                pushIntoTrees(trees, childTree);
            }
        } else if (node.kind === ts.SyntaxKind.IfStatement) {
            const ifStatement = node as ts.IfStatement;
            const ifTree = handle(ifStatement.expression, context, sourceFile, file);
            pushIntoTrees(trees, ifTree);

            const thenTree = handle(ifStatement.thenStatement, context, sourceFile, file);
            pushIntoTrees(trees, thenTree);

            if (ifStatement.elseStatement) {
                const elseTree = handle(ifStatement.elseStatement, context, sourceFile, file);
                pushIntoTrees(trees, elseTree);
            }
        } else if (node.kind === ts.SyntaxKind.BinaryExpression) {
            const binaryExpression = node as ts.BinaryExpression;
            const leftTree = handle(binaryExpression.left, context, sourceFile, file);
            pushIntoTrees(trees, leftTree);

            const rightTree = handle(binaryExpression.right, context, sourceFile, file);
            pushIntoTrees(trees, rightTree);
        } else if (node.kind === ts.SyntaxKind.VariableStatement) {
            const variableStatement = node as ts.VariableStatement;
            const declarationListTree = handle(variableStatement.declarationList, context, sourceFile, file);
            pushIntoTrees(trees, declarationListTree);
        } else if (node.kind === ts.SyntaxKind.TemplateExpression) {
            const templateExpression = node as ts.TemplateExpression;
            for (const span of templateExpression.templateSpans) {
                const spanTree = handle(span, context, sourceFile, file);
                pushIntoTrees(trees, spanTree);
            }
        } else if (node.kind === ts.SyntaxKind.ArrayLiteralExpression) {
            const arrayLiteralExpression = node as ts.ArrayLiteralExpression;
            for (const element of arrayLiteralExpression.elements) {
                const elementTree = handle(element, context, sourceFile, file);
                pushIntoTrees(trees, elementTree);
            }
        } else if (node.kind === ts.SyntaxKind.ObjectLiteralExpression) {
            const objectLiteralExpression = node as ts.ObjectLiteralExpression;
            for (const property of objectLiteralExpression.properties) {
                const propertyTree = handle(property, context, sourceFile, file);
                pushIntoTrees(trees, propertyTree);
            }
        } else if (node.kind === ts.SyntaxKind.NamedExports) {
            const namedExports = node as ts.NamedExports;
            for (const element of namedExports.elements) {
                const elementTree = handle(element, context, sourceFile, file);
                pushIntoTrees(trees, elementTree);
            }
        } else if (node.kind === ts.SyntaxKind.ModuleBlock) {
            const moduleBlock = node as ts.ModuleBlock;
            for (const statement of moduleBlock.statements) {
                const statementTree = handle(statement, context, sourceFile, file);
                pushIntoTrees(trees, statementTree);
            }
        } else if (node.kind === ts.SyntaxKind.SwitchStatement) {
            const switchStatement = node as ts.SwitchStatement;
            const switchTree = handle(switchStatement.expression, context, sourceFile, file);
            pushIntoTrees(trees, switchTree);

            const caseTree = handle(switchStatement.caseBlock, context, sourceFile, file);
            pushIntoTrees(trees, caseTree);
        } else if (node.kind === ts.SyntaxKind.ConditionalExpression) {
            const conditionalExpression = node as ts.ConditionalExpression;
            const trueTree = handle(conditionalExpression.whenTrue, context, sourceFile, file);
            pushIntoTrees(trees, trueTree);

            const falseTree = handle(conditionalExpression.whenFalse, context, sourceFile, file);
            pushIntoTrees(trees, falseTree);
        } else if (node.kind === ts.SyntaxKind.CaseBlock) {
            const caseBlock = node as ts.CaseBlock;
            for (const clause of caseBlock.clauses) {
                const clauseTree = handle(clause, context, sourceFile, file);
                pushIntoTrees(trees, clauseTree);
            }
        } else if (node.kind === ts.SyntaxKind.ForStatement) {
            const forStatement = node as ts.ForStatement;
            if (forStatement.initializer) {
                const initializerTree = handle(forStatement.initializer, context, sourceFile, file);
                pushIntoTrees(trees, initializerTree);
            }

            if (forStatement.condition) {
                const conditionTree = handle(forStatement.condition, context, sourceFile, file);
                pushIntoTrees(trees, conditionTree);
            }

            if (forStatement.incrementor) {
                const incrementorTree = handle(forStatement.incrementor, context, sourceFile, file);
                pushIntoTrees(trees, incrementorTree);
            }

            const statementTree = handle(forStatement.statement, context, sourceFile, file);
            pushIntoTrees(trees, statementTree);
        } else if (node.kind === ts.SyntaxKind.TryStatement) {
            const tryStatement = node as ts.TryStatement;
            const tryBlockTree = handle(tryStatement.tryBlock, context, sourceFile, file);
            pushIntoTrees(trees, tryBlockTree);

            if (tryStatement.catchClause) {
                const catchClauseTree = handle(tryStatement.catchClause, context, sourceFile, file);
                pushIntoTrees(trees, catchClauseTree);
            }

            if (tryStatement.finallyBlock) {
                const finallyBlockTree = handle(tryStatement.finallyBlock, context, sourceFile, file);
                pushIntoTrees(trees, finallyBlockTree);
            }
        } else if (node.kind === ts.SyntaxKind.VariableDeclarationList) {
            const declarationList = node as ts.VariableDeclarationList;
            for (const declaration of declarationList.declarations) {
                if (declaration.initializer) {
                    const childTree = handle(declaration.initializer, context, sourceFile, file);
                    pushIntoTrees(trees, childTree);
                }
            }
        } else if (node.kind === ts.SyntaxKind.CatchClause) {
            const catchClause = node as ts.CatchClause;
            if (catchClause.variableDeclaration) {
                const variableDeclarationTree = handle(catchClause.variableDeclaration, context, sourceFile, file);
                pushIntoTrees(trees, variableDeclarationTree);
            }

            const blockTree = handle(catchClause.block, context, sourceFile, file);
            pushIntoTrees(trees, blockTree);
        } else if (node.kind === ts.SyntaxKind.ForInStatement) {
            const forInStatement = node as ts.ForInStatement;
            const initializerTree = handle(forInStatement.initializer, context, sourceFile, file);
            pushIntoTrees(trees, initializerTree);

            const expressionTree = handle(forInStatement.expression, context, sourceFile, file);
            pushIntoTrees(trees, expressionTree);

            const statementTree = handle(forInStatement.statement, context, sourceFile, file);
            pushIntoTrees(trees, statementTree);
        } else if (node.kind === ts.SyntaxKind.WhileStatement) {
            const whileStatement = node as ts.WhileStatement;
            const statementTree = handle(whileStatement.statement, context, sourceFile, file);
            pushIntoTrees(trees, statementTree);

            const expressionTree = handle(whileStatement.expression, context, sourceFile, file);
            pushIntoTrees(trees, expressionTree);
        } else if (node.kind === ts.SyntaxKind.ElementAccessExpression) {
            const elementAccessExpression = node as ts.ElementAccessExpression;
            const statementTree = handle(elementAccessExpression.expression, context, sourceFile, file);
            pushIntoTrees(trees, statementTree);

            if (elementAccessExpression.argumentExpression) {
                const argumentExpression = handle(elementAccessExpression.argumentExpression, context, sourceFile, file);
                pushIntoTrees(trees, argumentExpression);
            }
        } else if (node.kind === ts.SyntaxKind.EndOfFileToken
            || node.kind === ts.SyntaxKind.NumericLiteral
            || node.kind === ts.SyntaxKind.StringLiteral
            || node.kind === ts.SyntaxKind.ImportDeclaration
            || node.kind === ts.SyntaxKind.MethodDeclaration
            || node.kind === ts.SyntaxKind.FunctionDeclaration
            || node.kind === ts.SyntaxKind.InterfaceDeclaration
            || node.kind === ts.SyntaxKind.ShorthandPropertyAssignment
            || node.kind === ts.SyntaxKind.Identifier
            || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral
            || node.kind === ts.SyntaxKind.EnumDeclaration
            || node.kind === ts.SyntaxKind.TypeAliasDeclaration
            || node.kind === ts.SyntaxKind.ImportEqualsDeclaration
            || node.kind === ts.SyntaxKind.ClassDeclaration
            || node.kind === ts.SyntaxKind.NullKeyword
            || node.kind === ts.SyntaxKind.TrueKeyword
            || node.kind === ts.SyntaxKind.FalseKeyword
            || node.kind === ts.SyntaxKind.BreakStatement
            || node.kind === ts.SyntaxKind.ContinueStatement
            || node.kind === ts.SyntaxKind.RegularExpressionLiteral) {
            return undefined;
        } else {
            showSyntaxKind(node);
            return undefined;
        }
        return trees.length > 0 ? trees : undefined;
    }
}

function getTextResult(tree: Tree, intent: number) {
    const startPosition = tree.node.getStart(tree.sourceFile);
    const { line } = ts.getLineAndCharacterOfPosition(tree.sourceFile, startPosition);
    const text = tree.sourceFile.text.substring(startPosition, tree.sourceFile.getLineEndOfPosition(startPosition)).trim();
    let textResult = "";
    if (tree.type === "call") {
        textResult += `${"  ".repeat(intent)}${line + 1} ${text}\n`;
    } else {
        textResult += `${"  ".repeat(intent)}${text} ${tree.file} ${line + 1}\n`;
    }
    for (const child of tree.children) {
        textResult += getTextResult(child, intent + 1);
    }
    return textResult;
}

type JsonResult = {
    children: JsonResult[];
    type: "definition" | "call";
    file: string;
    line: number;
    text: string;
};

function getJsonResult(tree: Tree): JsonResult {
    const startPosition = tree.node.getStart(tree.sourceFile);
    const { line } = ts.getLineAndCharacterOfPosition(tree.sourceFile, startPosition);
    const text = tree.sourceFile.text.substring(startPosition, tree.sourceFile.getLineEndOfPosition(startPosition)).trim();
    const jsonResult: JsonResult = {
        type: tree.type,
        file: tree.file,
        line,
        text,
        children: [],
    };
    for (const child of tree.children) {
        jsonResult.children.push(getJsonResult(child));
    }
    return jsonResult;
}

type Tree = {
    children: Tree[];
    node: ts.Node;
    sourceFile: ts.SourceFile;
    type: "definition" | "call";
    file: string;
};

type Result = {
    file: string;
    trees: Tree[];
};

function saveResult(out: string, results: Result[]) {
    if (out.endsWith(".json")) {
        const jsonResult = results.map(result => ({
            file: result.file,
            results: result.trees.map(tree => getJsonResult(tree)),
        }));
        fs.writeFileSync(out, JSON.stringify(jsonResult, null, "  "));
    } else {
        let textResult = "";
        for (const result of results) {
            textResult += `${result.file}\n`;
            for (const tree of result.trees) {
                textResult += getTextResult(tree, 1);
            }
        }
        fs.writeFileSync(out, textResult);
    }
}

async function executeCommandLine() {
    const argv = minimist(process.argv.slice(2), { "--": true });

    const showVersion = argv.v || argv.version;
    if (showVersion) {
        showToolVersion();
        return;
    }

    suppressError = argv.suppressError;

    let uniqFiles = uniq(flatten(await Promise.all(argv._.map(file => globAsync(file)))));

    const exclude: string | string[] | undefined = argv.exclude;
    if (exclude) {
        const excludes = Array.isArray(exclude) ? exclude : [exclude];
        uniqFiles = uniqFiles.filter(file => excludes.every(excludeFile => !minimatch(file, excludeFile)));
    }

    const out = argv.o;

    const languageService = ts.createLanguageService({
        getCompilationSettings() {
            return {};
        },
        getScriptFileNames() {
            return uniqFiles;
        },
        getScriptVersion(fileName: string) {
            return "";
        },
        getScriptSnapshot(fileName: string) {
            if (fileName === ".ts") {
                return ts.ScriptSnapshot.fromString("");
            }
            return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, { encoding: "utf8" }));
        },
        getCurrentDirectory: () => ".",
        getDefaultLibFileName(options: ts.CompilerOptions) {
            return ts.getDefaultLibFilePath(options);
        },
        fileExists: ts.sys.fileExists,
        readFile: ts.sys.readFile,
        readDirectory: ts.sys.readDirectory,
    });

    const program = ts.createProgram(uniqFiles, { target: ts.ScriptTarget.ESNext });

    const results: Result[] = [];

    const now = Date.now();

    for (const file of uniqFiles) {
        const sourceFile = program.getSourceFile(file);

        if (sourceFile) {
            const trees: Tree[] = [];
            sourceFile.forEachChild(node => {
                const tree = handle(node, {
                    nodes: [],
                    program,
                    languageService,
                }, sourceFile, file);
                pushIntoTrees(trees, tree);
            });
            if (trees.length > 0) {
                results.push({ file, trees });
            }
        }
    }

    printInConsole(`${(Date.now() - now) / 1000.0} s`);

    if (typeof out === "string") {
        saveResult(out, results);
    } else if (Array.isArray(out)) {
        for (const outpath of out) {
            if (typeof outpath === "string") {
                saveResult(outpath, results);
            }
        }
    }
}

executeCommandLine().then(() => {
    printInConsole("code-structure success.");
}, error => {
    printInConsole(error);
    if (!suppressError) {
        process.exit(1);
    }
});
