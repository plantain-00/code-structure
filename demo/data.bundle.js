var data = "[{"file":"src/index.ts","results":[{"type":"call","file":"src/index.ts","line":586,"text":"executeCommandLine().then(() => {","children":[{"type":"call","file":"src/index.ts","line":586,"text":"executeCommandLine().then(() => {","children":[{"type":"definition","file":"src/index.ts","line":454,"text":"async function executeCommandLine() {","children":[{"type":"call","file":"src/index.ts","line":455,"text":"minimist(process.argv.slice(2), { \"--\": true });","children":[{"type":"definition","file":"node_modules/@types/minimist/index.d.ts","line":11,"text":"declare function minimist(args?: string[], opts?: minimist.Opts): minimist.ParsedArgs;","children":[]}]},{"type":"call","file":"src/index.ts","line":459,"text":"showToolVersion();","children":[{"type":"definition","file":"src/index.ts","line":20,"text":"function showToolVersion() {","children":[{"type":"call","file":"src/index.ts","line":21,"text":"printInConsole(`Version: ${packageJson.version}`);","children":[{"type":"definition","file":"src/index.ts","line":12,"text":"function printInConsole(message: any) {","children":[]}]}]}]},{"type":"call","file":"src/index.ts","line":465,"text":"globAsync(file)))));","children":[{"type":"definition","file":"src/index.ts","line":24,"text":"function globAsync(pattern: string) {","children":[]}]},{"type":"call","file":"src/index.ts","line":470,"text":"minimatch(file, excludeFile)));","children":[{"type":"definition","file":"node_modules/@types/minimatch/index.d.ts","line":9,"text":"declare function M(target: string, pattern: string, options?: M.IOptions): boolean;","children":[]}]},{"type":"call","file":"src/index.ts","line":512,"text":"handle(node, {","children":[{"type":"definition","file":"src/index.ts","line":134,"text":"function handle(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {","children":[{"type":"call","file":"src/index.ts","line":148,"text":"handleCallExpression(callExpression.expression, context, sourceFile, file);","children":[{"type":"definition","file":"src/index.ts","line":107,"text":"function handleCallExpression(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | undefined | Tree[] {","children":[{"type":"call","file":"src/index.ts","line":110,"text":"handleDefinition(identifier, context, sourceFile, file);","children":[{"type":"definition","file":"src/index.ts","line":72,"text":"function handleDefinition(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | Tree[] | undefined {","children":[{"type":"call","file":"src/index.ts","line":76,"text":"findNodeAtDefinition(context.program, definition);","children":[{"type":"definition","file":"src/index.ts","line":36,"text":"function findNodeAtDefinition(program: ts.Program, definition: ts.DefinitionInfo) {","children":[]}]},{"type":"call","file":"src/index.ts","line":91,"text":"pushIntoTrees(tree.children, statementTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]}]}]},{"type":"call","file":"src/index.ts","line":115,"text":"pushIntoTrees(trees, expressionTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":117,"text":"handleDefinition(propertyAccessExpression.name, context, sourceFile, file);","children":[{"type":"definition","file":"src/index.ts","line":72,"text":"function handleDefinition(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | Tree[] | undefined {","children":[{"type":"call","file":"src/index.ts","line":76,"text":"findNodeAtDefinition(context.program, definition);","children":[{"type":"definition","file":"src/index.ts","line":36,"text":"function findNodeAtDefinition(program: ts.Program, definition: ts.DefinitionInfo) {","children":[]}]},{"type":"call","file":"src/index.ts","line":91,"text":"pushIntoTrees(tree.children, statementTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]}]}]},{"type":"call","file":"src/index.ts","line":118,"text":"pushIntoTrees(trees, nameTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":123,"text":"handleDefinition(newExpression.expression, context, sourceFile, file);","children":[{"type":"definition","file":"src/index.ts","line":72,"text":"function handleDefinition(node: ts.Node, context: Context, sourceFile: ts.SourceFile, file: string): Tree | Tree[] | undefined {","children":[{"type":"call","file":"src/index.ts","line":76,"text":"findNodeAtDefinition(context.program, definition);","children":[{"type":"definition","file":"src/index.ts","line":36,"text":"function findNodeAtDefinition(program: ts.Program, definition: ts.DefinitionInfo) {","children":[]}]},{"type":"call","file":"src/index.ts","line":91,"text":"pushIntoTrees(tree.children, statementTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]}]}]},{"type":"call","file":"src/index.ts","line":129,"text":"showSyntaxKind(node);","children":[{"type":"definition","file":"src/index.ts","line":49,"text":"function showSyntaxKind(node: ts.Node) {","children":[{"type":"call","file":"src/index.ts","line":53,"text":"printInConsole(node.kind);","children":[{"type":"definition","file":"src/index.ts","line":12,"text":"function printInConsole(message: any) {","children":[]}]}]}]}]}]},{"type":"call","file":"src/index.ts","line":149,"text":"pushIntoTrees(tree.children, functionTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":159,"text":"pushIntoTrees(trees, parameterTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":220,"text":"pushIntoTrees(trees, childTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":225,"text":"pushIntoTrees(trees, ifTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":228,"text":"pushIntoTrees(trees, thenTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":232,"text":"pushIntoTrees(trees, elseTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":237,"text":"pushIntoTrees(trees, leftTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":240,"text":"pushIntoTrees(trees, rightTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":244,"text":"pushIntoTrees(trees, declarationListTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":249,"text":"pushIntoTrees(trees, spanTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":255,"text":"pushIntoTrees(trees, elementTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":261,"text":"pushIntoTrees(trees, propertyTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":267,"text":"pushIntoTrees(trees, elementTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":273,"text":"pushIntoTrees(trees, statementTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":278,"text":"pushIntoTrees(trees, switchTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":281,"text":"pushIntoTrees(trees, caseTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":285,"text":"pushIntoTrees(trees, trueTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":288,"text":"pushIntoTrees(trees, falseTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":293,"text":"pushIntoTrees(trees, clauseTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":299,"text":"pushIntoTrees(trees, initializerTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":304,"text":"pushIntoTrees(trees, conditionTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":309,"text":"pushIntoTrees(trees, incrementorTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":313,"text":"pushIntoTrees(trees, statementTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":317,"text":"pushIntoTrees(trees, tryBlockTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":321,"text":"pushIntoTrees(trees, catchClauseTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":326,"text":"pushIntoTrees(trees, finallyBlockTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":333,"text":"pushIntoTrees(trees, childTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":340,"text":"pushIntoTrees(trees, variableDeclarationTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":344,"text":"pushIntoTrees(trees, blockTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":348,"text":"pushIntoTrees(trees, initializerTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":351,"text":"pushIntoTrees(trees, expressionTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":354,"text":"pushIntoTrees(trees, statementTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":358,"text":"pushIntoTrees(trees, statementTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":361,"text":"pushIntoTrees(trees, expressionTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":365,"text":"pushIntoTrees(trees, statementTree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":369,"text":"pushIntoTrees(trees, argumentExpression);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":393,"text":"showSyntaxKind(node);","children":[{"type":"definition","file":"src/index.ts","line":49,"text":"function showSyntaxKind(node: ts.Node) {","children":[{"type":"call","file":"src/index.ts","line":53,"text":"printInConsole(node.kind);","children":[{"type":"definition","file":"src/index.ts","line":12,"text":"function printInConsole(message: any) {","children":[]}]}]}]}]}]},{"type":"call","file":"src/index.ts","line":517,"text":"pushIntoTrees(trees, tree);","children":[{"type":"definition","file":"src/index.ts","line":56,"text":"function pushIntoTrees(trees: Tree[], tree: undefined | Tree | Tree[]) {","children":[]}]},{"type":"call","file":"src/index.ts","line":525,"text":"printInConsole(`${(Date.now() - now) / 1000.0} s`);","children":[{"type":"definition","file":"src/index.ts","line":12,"text":"function printInConsole(message: any) {","children":[]}]},{"type":"call","file":"src/index.ts","line":554,"text":"getJsonResult(tree)),","children":[{"type":"definition","file":"src/index.ts","line":424,"text":"function getJsonResult(tree: Tree): JsonResult {","children":[]}]},{"type":"call","file":"src/index.ts","line":577,"text":"getTextResult(tree, 1);","children":[{"type":"definition","file":"src/index.ts","line":400,"text":"function getTextResult(tree: Tree, intent: number) {","children":[]}]}]}]}]},{"type":"call","file":"src/index.ts","line":587,"text":"printInConsole(\"code-structure success.\");","children":[{"type":"definition","file":"src/index.ts","line":12,"text":"function printInConsole(message: any) {","children":[]}]},{"type":"call","file":"src/index.ts","line":589,"text":"printInConsole(error);","children":[{"type":"definition","file":"src/index.ts","line":12,"text":"function printInConsole(message: any) {","children":[]}]}]}]";