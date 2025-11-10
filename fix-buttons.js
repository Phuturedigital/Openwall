#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const componentsDir = '/tmp/cc-agent/59940336/project/src/components';

function fixButtonsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Add cursor-pointer to buttons that don't have it
  const buttonClassRegex = /(<button[^>]*className=["'])((?:(?!cursor-pointer)[^"'])*)(["'][^>]*>)/g;
  let match;
  const matches = [];

  while ((match = buttonClassRegex.exec(content)) !== null) {
    if (!match[2].includes('cursor-pointer') && match[2].includes('transition')) {
      matches.push({
        index: match.index,
        original: match[0],
        replacement: match[1] + match[2] + ' cursor-pointer' + match[3]
      });
    }
  }

  // Apply replacements in reverse order to maintain indices
  matches.reverse().forEach(m => {
    content = content.substring(0, m.index) + m.replacement + content.substring(m.index + m.original.length);
    modified = true;
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ Fixed ${filePath}`);
    return true;
  }

  return false;
}

// Get all TSX files
const files = fs.readdirSync(componentsDir)
  .filter(f => f.endsWith('.tsx'))
  .map(f => path.join(componentsDir, f));

let fixedCount = 0;
files.forEach(file => {
  if (fixButtonsInFile(file)) {
    fixedCount++;
  }
});

console.log(`\nFixed ${fixedCount} files`);
