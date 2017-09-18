import * as minimist from "minimist";
import * as ts from "typescript";
import * as fs from "fs";
import flatten = require("lodash.flatten");
import uniq = require("lodash.uniq");
import * as glob from "glob";
import * as minimatch from "minimatch";
import * as path from "path";
import * as mkdirp from "mkdirp";
import * as packageJson from "../package.json";
import { JsonResult, JsonDataResult, JsonResultType } from "./types";

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

function showSyntaxKind(node: ts.Node) {
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

const definitionsCache = new Map<ts.Node, Tree | Tree[] | undefined>();

function getCodeStructureOfDefinition(node: ts.Node, context: Context, file: string): Tree | Tree[] | undefined {
    const definitions = context.languageService.getDefinitionAtPosition(file, node.end);
    if (definitions && definitions.length > 0) {
        const definition = definitions[0];
        const sourceFile = context.program.getSourceFile(definition.fileName);
        if (sourceFile) {
            const definitionNode = sourceFile.forEachChild(child => {
                if (child.pos < definition.textSpan.start && child.end > definition.textSpan.start + definition.textSpan.length) {
                    return child;
                }
                return undefined;
            });

            if (definitionNode) {
                if (definitionsCache.has(definitionNode)) {
                    return definitionsCache.get(definitionNode);
                }
                const nestedNode = context.nodes.find(n => n === definitionNode);
                let tree: Tree | Tree[] | undefined;
                if (nestedNode) {
                    tree = {
                        node: nestedNode,
                        sourceFile,
                        type: JsonResultType.nested,
                        children: [],
                        file: definition.fileName,
                    };
                } else {
                    if (definitionNode.kind === ts.SyntaxKind.FunctionDeclaration) {
                        const declaration = definitionNode as ts.FunctionDeclaration;
                        if (!declaration.modifiers
                            || declaration.modifiers.every(m => m.kind !== ts.SyntaxKind.DeclareKeyword)) {
                            tree = {
                                node: declaration,
                                sourceFile,
                                type: JsonResultType.definition,
                                children: [],
                                file: definition.fileName,
                            };
                            if (declaration.body) {
                                context.nodes.push(definitionNode);
                                for (const statement of declaration.body.statements) {
                                    const statementTree = getCodeStructure(statement, context, sourceFile, definition.fileName);
                                    pushIntoTrees(tree.children, statementTree);
                                }
                                context.nodes.pop();
                            }
                        }
                    } else {
                        context.nodes.push(definitionNode);
                        tree = getCodeStructure(definitionNode, context, sourceFile, definition.fileName);
                        context.nodes.pop();
                    }
                }
                definitionsCache.set(definitionNode, tree);
                return tree;
            }
        }
    }
    return undefined;
}

function getCodeStructure(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {
    if (node === undefined) {
        return undefined;
    }
    if (node.kind === ts.SyntaxKind.CallExpression) {
        const callExpression = node as ts.CallExpression;
        const tree: Tree = {
            node: callExpression,
            sourceFile,
            children: [],
            type: JsonResultType.call,
            file,
        };
        const trees: Tree[] = [];
        let callTree: Tree | Tree[] | undefined;
        if (callExpression.expression.kind === ts.SyntaxKind.Identifier) {
            const identifier = callExpression.expression as ts.Identifier;
            callTree = getCodeStructureOfDefinition(identifier, context, file);
        } else if (callExpression.expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
            const propertyAccessExpression = callExpression.expression as ts.PropertyAccessExpression;
            const propertyAccessTrees: Tree[] = [];
            const expressionTree = getCodeStructure(propertyAccessExpression.expression, context, sourceFile, file);
            pushIntoTrees(propertyAccessTrees, expressionTree);

            const nameTree = getCodeStructureOfDefinition(propertyAccessExpression.name, context, file);
            pushIntoTrees(propertyAccessTrees, nameTree);

            callTree = propertyAccessTrees.length > 0 ? propertyAccessTrees : undefined;
        } else if (callExpression.expression.kind === ts.SyntaxKind.NewExpression) {
            const newExpression = callExpression.expression as ts.NewExpression;
            callTree = getCodeStructureOfDefinition(newExpression.expression, context, file);
        } else if (callExpression.expression.kind === ts.SyntaxKind.CallExpression
            || callExpression.expression.kind === ts.SyntaxKind.ElementAccessExpression
            || callExpression.expression.kind === ts.SyntaxKind.ParenthesizedExpression) {
            callTree = getCodeStructure(callExpression.expression, context, sourceFile, file);
        } else {
            showSyntaxKind(callExpression.expression);
        }
        pushIntoTrees(tree.children, callTree);

        if (tree.children.length > 0) {
            trees.push(tree);
        }

        const parameters = callExpression.arguments;
        if (parameters && parameters.length > 0) {
            for (const parameter of parameters) {
                const parameterTree = getCodeStructure(parameter, context, sourceFile, file);
                pushIntoTrees(trees, parameterTree);
            }
        }

        return trees.length > 0 ? trees : undefined;
    } else if (node.kind === ts.SyntaxKind.ForOfStatement) {
        const forOfStatement = node as ts.ForOfStatement;
        return getCodeStructure(forOfStatement.statement, context, sourceFile, file);
    } else if (node.kind === ts.SyntaxKind.ArrowFunction
        || node.kind === ts.SyntaxKind.ModuleDeclaration) {
        const declaration = node as ts.ArrowFunction | ts.ModuleDeclaration;
        return declaration.body ? getCodeStructure(declaration.body, context, sourceFile, file) : undefined;
    } else if (node.kind === ts.SyntaxKind.PropertyAssignment) {
        const propertyAssignmentExpression = node as ts.PropertyAssignment;
        return getCodeStructure(propertyAssignmentExpression.initializer, context, sourceFile, file);
    } else if (node.kind === ts.SyntaxKind.PrefixUnaryExpression
        || node.kind === ts.SyntaxKind.PostfixUnaryExpression) {
        const prefixUnaryExpression = node as ts.PrefixUnaryExpression | ts.PostfixUnaryExpression;
        return getCodeStructure(prefixUnaryExpression.operand, context, sourceFile, file);
    } else if (node.kind === ts.SyntaxKind.PropertyAccessExpression
        || node.kind === ts.SyntaxKind.ExportSpecifier
        || node.kind === ts.SyntaxKind.VariableDeclaration) {
        const expression = node as ts.PropertyAccessExpression | ts.ExportSpecifier | ts.VariableDeclaration;
        return getCodeStructure(expression.name, context, sourceFile, file);
    } else if (node.kind === ts.SyntaxKind.ExportDeclaration) {
        const exportDeclaration = node as ts.ExportDeclaration;
        return exportDeclaration.exportClause ? getCodeStructure(exportDeclaration.exportClause, context, sourceFile, file) : undefined;
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
        || node.kind === ts.SyntaxKind.DeleteExpression
        || node.kind === ts.SyntaxKind.VoidExpression
        || node.kind === ts.SyntaxKind.TypeAssertionExpression) {
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
            | ts.DeleteExpression
            | ts.VoidExpression
            | ts.TypeAssertion;
        return expression.expression ? getCodeStructure(expression.expression, context, sourceFile, file) : undefined;
    } else {
        const trees: Tree[] = [];
        if (node.kind === ts.SyntaxKind.Block
            || node.kind === ts.SyntaxKind.CaseClause) {
            const statements = (node as ts.Block | ts.CaseClause).statements;
            for (const statement of statements) {
                const childTree = getCodeStructure(statement, context, sourceFile, file);
                pushIntoTrees(trees, childTree);
            }
        } else if (node.kind === ts.SyntaxKind.IfStatement) {
            const ifStatement = node as ts.IfStatement;
            const ifTree = getCodeStructure(ifStatement.expression, context, sourceFile, file);
            pushIntoTrees(trees, ifTree);

            const thenTree = getCodeStructure(ifStatement.thenStatement, context, sourceFile, file);
            pushIntoTrees(trees, thenTree);

            if (ifStatement.elseStatement) {
                const elseTree = getCodeStructure(ifStatement.elseStatement, context, sourceFile, file);
                pushIntoTrees(trees, elseTree);
            }
        } else if (node.kind === ts.SyntaxKind.BinaryExpression) {
            const binaryExpression = node as ts.BinaryExpression;
            const leftTree = getCodeStructure(binaryExpression.left, context, sourceFile, file);
            pushIntoTrees(trees, leftTree);

            const rightTree = getCodeStructure(binaryExpression.right, context, sourceFile, file);
            pushIntoTrees(trees, rightTree);
        } else if (node.kind === ts.SyntaxKind.VariableStatement) {
            const variableStatement = node as ts.VariableStatement;
            const declarationListTree = getCodeStructure(variableStatement.declarationList, context, sourceFile, file);
            pushIntoTrees(trees, declarationListTree);
        } else if (node.kind === ts.SyntaxKind.TemplateExpression) {
            const templateExpression = node as ts.TemplateExpression;
            for (const span of templateExpression.templateSpans) {
                const spanTree = getCodeStructure(span, context, sourceFile, file);
                pushIntoTrees(trees, spanTree);
            }
        } else if (node.kind === ts.SyntaxKind.ArrayLiteralExpression) {
            const arrayLiteralExpression = node as ts.ArrayLiteralExpression;
            for (const element of arrayLiteralExpression.elements) {
                const elementTree = getCodeStructure(element, context, sourceFile, file);
                pushIntoTrees(trees, elementTree);
            }
        } else if (node.kind === ts.SyntaxKind.ObjectLiteralExpression) {
            const objectLiteralExpression = node as ts.ObjectLiteralExpression;
            for (const property of objectLiteralExpression.properties) {
                const propertyTree = getCodeStructure(property, context, sourceFile, file);
                pushIntoTrees(trees, propertyTree);
            }
        } else if (node.kind === ts.SyntaxKind.NamedExports) {
            const namedExports = node as ts.NamedExports;
            for (const element of namedExports.elements) {
                const elementTree = getCodeStructure(element, context, sourceFile, file);
                pushIntoTrees(trees, elementTree);
            }
        } else if (node.kind === ts.SyntaxKind.ModuleBlock) {
            const moduleBlock = node as ts.ModuleBlock;
            for (const statement of moduleBlock.statements) {
                const statementTree = getCodeStructure(statement, context, sourceFile, file);
                pushIntoTrees(trees, statementTree);
            }
        } else if (node.kind === ts.SyntaxKind.SwitchStatement) {
            const switchStatement = node as ts.SwitchStatement;
            const switchTree = getCodeStructure(switchStatement.expression, context, sourceFile, file);
            pushIntoTrees(trees, switchTree);

            const caseTree = getCodeStructure(switchStatement.caseBlock, context, sourceFile, file);
            pushIntoTrees(trees, caseTree);
        } else if (node.kind === ts.SyntaxKind.ConditionalExpression) {
            const conditionalExpression = node as ts.ConditionalExpression;
            const trueTree = getCodeStructure(conditionalExpression.whenTrue, context, sourceFile, file);
            pushIntoTrees(trees, trueTree);

            const falseTree = getCodeStructure(conditionalExpression.whenFalse, context, sourceFile, file);
            pushIntoTrees(trees, falseTree);
        } else if (node.kind === ts.SyntaxKind.CaseBlock) {
            const caseBlock = node as ts.CaseBlock;
            for (const clause of caseBlock.clauses) {
                const clauseTree = getCodeStructure(clause, context, sourceFile, file);
                pushIntoTrees(trees, clauseTree);
            }
        } else if (node.kind === ts.SyntaxKind.ForStatement) {
            const forStatement = node as ts.ForStatement;
            if (forStatement.initializer) {
                const initializerTree = getCodeStructure(forStatement.initializer, context, sourceFile, file);
                pushIntoTrees(trees, initializerTree);
            }

            if (forStatement.condition) {
                const conditionTree = getCodeStructure(forStatement.condition, context, sourceFile, file);
                pushIntoTrees(trees, conditionTree);
            }

            if (forStatement.incrementor) {
                const incrementorTree = getCodeStructure(forStatement.incrementor, context, sourceFile, file);
                pushIntoTrees(trees, incrementorTree);
            }

            const statementTree = getCodeStructure(forStatement.statement, context, sourceFile, file);
            pushIntoTrees(trees, statementTree);
        } else if (node.kind === ts.SyntaxKind.TryStatement) {
            const tryStatement = node as ts.TryStatement;
            const tryBlockTree = getCodeStructure(tryStatement.tryBlock, context, sourceFile, file);
            pushIntoTrees(trees, tryBlockTree);

            if (tryStatement.catchClause) {
                const catchClauseTree = getCodeStructure(tryStatement.catchClause, context, sourceFile, file);
                pushIntoTrees(trees, catchClauseTree);
            }

            if (tryStatement.finallyBlock) {
                const finallyBlockTree = getCodeStructure(tryStatement.finallyBlock, context, sourceFile, file);
                pushIntoTrees(trees, finallyBlockTree);
            }
        } else if (node.kind === ts.SyntaxKind.VariableDeclarationList) {
            const declarationList = node as ts.VariableDeclarationList;
            for (const declaration of declarationList.declarations) {
                if (declaration.initializer) {
                    const childTree = getCodeStructure(declaration.initializer, context, sourceFile, file);
                    pushIntoTrees(trees, childTree);
                }
            }
        } else if (node.kind === ts.SyntaxKind.CatchClause) {
            const catchClause = node as ts.CatchClause;
            if (catchClause.variableDeclaration) {
                const variableDeclarationTree = getCodeStructure(catchClause.variableDeclaration, context, sourceFile, file);
                pushIntoTrees(trees, variableDeclarationTree);
            }

            const blockTree = getCodeStructure(catchClause.block, context, sourceFile, file);
            pushIntoTrees(trees, blockTree);
        } else if (node.kind === ts.SyntaxKind.ForInStatement) {
            const forInStatement = node as ts.ForInStatement;
            const initializerTree = getCodeStructure(forInStatement.initializer, context, sourceFile, file);
            pushIntoTrees(trees, initializerTree);

            const expressionTree = getCodeStructure(forInStatement.expression, context, sourceFile, file);
            pushIntoTrees(trees, expressionTree);

            const statementTree = getCodeStructure(forInStatement.statement, context, sourceFile, file);
            pushIntoTrees(trees, statementTree);
        } else if (node.kind === ts.SyntaxKind.WhileStatement) {
            const whileStatement = node as ts.WhileStatement;
            const statementTree = getCodeStructure(whileStatement.statement, context, sourceFile, file);
            pushIntoTrees(trees, statementTree);

            const expressionTree = getCodeStructure(whileStatement.expression, context, sourceFile, file);
            pushIntoTrees(trees, expressionTree);
        } else if (node.kind === ts.SyntaxKind.ElementAccessExpression) {
            const elementAccessExpression = node as ts.ElementAccessExpression;
            const statementTree = getCodeStructure(elementAccessExpression.expression, context, sourceFile, file);
            pushIntoTrees(trees, statementTree);

            if (elementAccessExpression.argumentExpression) {
                const argumentExpressionTree = getCodeStructure(elementAccessExpression.argumentExpression, context, sourceFile, file);
                pushIntoTrees(trees, argumentExpressionTree);
            }
        } else if (node.kind === ts.SyntaxKind.FunctionExpression) {
            const functionExpression = node as ts.FunctionExpression;
            const bodyTree = getCodeStructure(functionExpression.body, context, sourceFile, file);
            pushIntoTrees(trees, bodyTree);

            if (functionExpression.name) {
                const nameTree = getCodeStructure(functionExpression.name, context, sourceFile, file);
                pushIntoTrees(trees, nameTree);
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
            || node.kind === ts.SyntaxKind.ThisKeyword
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

const fullTexts: { [file: string]: string } = {};

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
    type: JsonResultType;
    file: string;
};

type Result = {
    file: string;
    trees: Tree[];
};

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

    for (const file of uniqFiles) {
        printInConsole(file);
    }

    const out: string | string | undefined = argv.o;
    let htmlOutput: string;
    if (typeof out === "string") {
        htmlOutput = out;
    } else if (Array.isArray(out) && out.length > 0) {
        htmlOutput = out[0];
    } else {
        throw new Error("Output file not found.");
    }

    const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.ESNext, allowJs: true };
    const languageService = ts.createLanguageService({
        getCompilationSettings() {
            return compilerOptions;
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

    const program = ts.createProgram(uniqFiles, compilerOptions);

    const results: Result[] = [];

    const now = Date.now();

    for (const file of uniqFiles) {
        const sourceFile = program.getSourceFile(file);

        if (sourceFile) {
            const trees: Tree[] = [];
            sourceFile.forEachChild(node => {
                const tree = getCodeStructure(node, {
                    nodes: [],
                    program,
                    languageService,
                }, sourceFile, file);
                pushIntoTrees(trees, tree);
            });
            if (trees.length > 0) {
                fullTexts[file] = fs.readFileSync(file).toString();
                results.push({ file, trees });
            }
        }
    }

    printInConsole(`${(Date.now() - now) / 1000.0} s`);

    const jsonResult: JsonDataResult[] = results.map(result => ({
        file: result.file,
        results: result.trees.map(tree => getJsonResult(tree)),
    }));
    const dirname = path.dirname(htmlOutput);
    mkdirp(dirname, error => {
        if (error) {
            printInConsole(error);
        } else {
            const dataStream = fs.createWriteStream(path.resolve(dirname, "data.bundle.js"));
            dataStream.write(`var fullTexts = ${JSON.stringify(fullTexts, null, "  ")};\n`);
            dataStream.write(`var data = ${JSON.stringify(jsonResult, null, "  ")};`);
            fs.createReadStream(path.resolve(__dirname, "../html/index.html")).pipe(fs.createWriteStream(htmlOutput));
            for (const filename of ["index.bundle.js", "vendor.bundle.js", "vendor.bundle.css"]) {
                fs.createReadStream(path.resolve(__dirname, `../html/${filename}`)).pipe(fs.createWriteStream(path.resolve(dirname, filename)));
            }
        }
    });
}

executeCommandLine().then(() => {
    printInConsole("code-structure success.");
}, error => {
    printInConsole(error);
    if (!suppressError) {
        process.exit(1);
    }
});
