#!/usr/bin/env node
/**
 * Build script: 將 index.html + 外部 JS 合併為單檔 dist/index.html
 * 用法: node build.js
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const outDir = path.join(root, 'dist');

// Read source files
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
const alpineJs = fs.readFileSync(path.join(root, 'alpine.min.js'), 'utf-8');
const appJs = fs.readFileSync(path.join(root, 'src', 'alpine-app.js'), 'utf-8');

// Strip CJS export block from app JS (not needed in browser)
const appJsBrowser = appJs.replace(
    /\/\/ Export for testing[\s\S]*$/,
    ''
).trimEnd();

// 1. Remove Alpine external reference from <head>
//    (defer is ignored on inline scripts, so we must move it after teamApp)
html = html.replace(
    '    <script defer src="alpine.min.js"></script>\n',
    ''
);

// 2. Replace alpine-app.js with inline teamApp + Alpine.js (in correct order)
//    teamApp must be defined before Alpine.js starts, so Alpine can find it
html = html.replace(
    '<script src="src/alpine-app.js"></script>',
    '<script>\n' + appJsBrowser + '\n    </script>\n' +
    '    <script>\n' + alpineJs + '\n    </script>'
);

// Write output
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
}
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');

const size = (fs.statSync(path.join(outDir, 'index.html')).size / 1024).toFixed(1);
console.log(`Built dist/index.html (${size} KB)`);
