const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const projectRoot = process.cwd();
const jsonPath = path.join(projectRoot, "src", "content", "siteText.json");
const files = process.argv.slice(2);

const json = JSON.parse(fs.readFileSync(jsonPath, "utf8").replace(/^\uFEFF/, ""));
if (!json.raw) json.raw = {};

function hasHebrew(text) {
  return /[א-ת]/.test(text);
}

function normalizeJsxText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function shouldSkipStringLiteral(node) {
  const parent = node.parent;
  if (!parent) return true;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return true;
  if (ts.isLiteralTypeNode(parent)) return true;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
  if (ts.isPropertySignature(parent) && parent.name === node) return true;
  if (ts.isJsxAttribute(parent) && parent.name === node) return true;
  if (ts.isTypeAliasDeclaration(parent)) return true;
  if (ts.isInterfaceDeclaration(parent)) return true;
  return false;
}

function ensureKey(fileKey, text, used) {
  let index = used.count + 1;
  let key = `${fileKey}::${String(index).padStart(3, "0")}`;
  while (json.raw[key] && json.raw[key] !== text) {
    index += 1;
    key = `${fileKey}::${String(index).padStart(3, "0")}`;
  }
  used.count = index;
  json.raw[key] = text;
  return key;
}

function createTxtCall(factory, key, text) {
  return factory.createCallExpression(factory.createIdentifier("txt"), undefined, [
    factory.createStringLiteral(key),
    factory.createStringLiteral(text),
  ]);
}

for (const relativeFile of files) {
  const filePath = path.join(projectRoot, relativeFile);
  const original = fs.readFileSync(filePath, "utf8");
  const scriptKind = filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, original, ts.ScriptTarget.Latest, true, scriptKind);
  const fileKey = relativeFile.replace(/\\/g, "/");
  const used = { count: 0 };
  let changed = false;
  const hasImport = /from\s+["']@\/content\/siteText["']/.test(original);

  const transformer = (ctx) => {
    const { factory } = ctx;
    const visit = (node) => {
      if (ts.isJsxText(node)) {
        const text = normalizeJsxText(node.getText(sourceFile));
        if (text && hasHebrew(text)) {
          const key = ensureKey(fileKey, text, used);
          changed = true;
          return factory.createJsxExpression(undefined, createTxtCall(factory, key, text));
        }
      }

      if (ts.isStringLiteral(node) && hasHebrew(node.text) && !shouldSkipStringLiteral(node)) {
        const key = ensureKey(fileKey, node.text, used);
        changed = true;
        if (ts.isJsxAttribute(node.parent) && node.parent.initializer === node) {
          return factory.createJsxExpression(undefined, createTxtCall(factory, key, node.text));
        }
        return createTxtCall(factory, key, node.text);
      }

      if (ts.isNoSubstitutionTemplateLiteral(node) && hasHebrew(node.text)) {
        const key = ensureKey(fileKey, node.text, used);
        changed = true;
        return createTxtCall(factory, key, node.text);
      }

      return ts.visitEachChild(node, visit, ctx);
    };
    return (node) => ts.visitNode(node, visit);
  };

  let transformed = ts.transform(sourceFile, [transformer]).transformed[0];

  if (changed && !hasImport) {
    const importDecl = ts.factory.createImportDeclaration(
      undefined,
      ts.factory.createImportClause(false, undefined, ts.factory.createNamedImports([
        ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier("txt")),
      ])),
      ts.factory.createStringLiteral("@/content/siteText"),
      undefined,
    );

    transformed = ts.factory.updateSourceFile(
      transformed,
      ts.factory.createNodeArray([importDecl, ...transformed.statements]),
      transformed.isDeclarationFile,
      transformed.referencedFiles,
      transformed.typeReferenceDirectives,
      transformed.hasNoDefaultLib,
      transformed.libReferenceDirectives,
    );
  }

  if (changed) {
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    fs.writeFileSync(filePath, printer.printFile(transformed), "utf8");
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + "\n", "utf8");
