const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const targets = [path.join(projectRoot, "src", "app"), path.join(projectRoot, "src", "components")];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

for (const root of targets) {
  for (const file of walk(root)) {
    let content = fs.readFileSync(file, "utf8");
    if (!content.includes('txt("')) continue;
    content = content.replace(/txt\("(?:[^"\\]|\\.)*",\s*"((?:[^"\\]|\\.)*)"\)/g, '"$1"');
    content = content.replace(/^import \{ txt \} from "@\/content\/siteText";\r?\n/m, "");
    fs.writeFileSync(file, content, "utf8");
  }
}
