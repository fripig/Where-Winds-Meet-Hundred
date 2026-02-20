#!/usr/bin/env node
/**
 * Build script: 將 index.html + Alpine.js + app JS 合併為單一 dist/index.html
 * 使用 alpine:init + Alpine.data() 模式，所有 JS 皆可 inline
 * 用法: node build.js
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const outDir = path.join(root, 'dist');

// Read source files
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf-8');
const alpineJs = fs.readFileSync(path.join(root, 'alpine.min.js'), 'utf-8');
const appJs = fs.readFileSync(path.join(root, 'src', 'alpine-app.js'), 'utf-8');

// Strip CJS export block from app JS (not needed in browser)
const appJsBrowser = appJs.replace(
    /\/\/ Export for testing[\s\S]*$/,
    ''
).trimEnd();

// 1. Inline CSS (replace <link> with <style>)
html = html.replace(
    '    <link rel="stylesheet" href="styles.css">',
    () => '    <style>\n' + css + '\n    </style>'
);

// 2. Remove Alpine.js <script defer> from <head> (defer is ignored on inline scripts)
html = html.replace(
    '    <script defer src="alpine.min.js"></script>\n',
    () => ''
);

// 3. Replace app JS with: app JS inline + Alpine.js inline (order matters!)
//    - App JS first: registers document.addEventListener('alpine:init', ...) listener
//    - Alpine.js second: starts up, fires 'alpine:init', our listener calls Alpine.data()
//    NOTE: use function replacement to avoid $$ special patterns in String.replace()
html = html.replace(
    '<script src="src/alpine-app.js"></script>',
    () => '<script>\n' + appJsBrowser + '\n    </script>\n    <script>\n' + alpineJs + '\n    </script>'
);

// Write output
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
}
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');

// Copy PWA assets to dist/
fs.copyFileSync(path.join(root, 'manifest.json'), path.join(outDir, 'manifest.json'));
fs.copyFileSync(path.join(root, 'sw.js'), path.join(outDir, 'sw.js'));
const iconsDir = path.join(outDir, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir);
}
fs.copyFileSync(path.join(root, 'icons', 'icon.svg'), path.join(iconsDir, 'icon.svg'));

const size = (fs.statSync(path.join(outDir, 'index.html')).size / 1024).toFixed(1);
console.log(`Built dist/index.html (${size} KB) — single file, all JS inlined`);
console.log('Copied PWA assets: manifest.json, sw.js, icons/icon.svg');
