const fs = require('fs');
const path = require('path');

// Directories to skip
const SKIP_DIRS = [
  'node_modules',
  '.git',
  'ios',
  'android',
  '.expo',
  'dist',
  'build'
];

// Function to update a file
function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace hardcoded URLs with getBaseUrl()
    const replacements = [
      [/'https:\/\/delta-back\.ahmedatri\.com\/api/g, '`${getBaseUrl()}/api'],
      [/"https:\/\/delta-back\.ahmedatri\.com\/api/g, '`${getBaseUrl()}/api'],
      [/'http:\/\/localhost:8000\/api/g, '`${getBaseUrl()}/api'],
      [/"http:\/\/localhost:8000\/api/g, '`${getBaseUrl()}/api']
    ];
    
    for (const [pattern, replacement] of replacements) {
      if (content.match(pattern)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }
    
    // Add import if needed
    if (modified && !content.includes('import { getBaseUrl }')) {
      const importStatement = "import { getBaseUrl } from '../utils/api';\n";
      const reactImport = content.match(/import.*from.*['"]react['"]/);
      if (reactImport) {
        content = content.replace(reactImport[0], importStatement + reactImport[0]);
      } else {
        // If no React import found, add at the top of the file
        content = importStatement + content;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Function to process a directory
function processDirectory(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          // Skip specified directories
          if (!SKIP_DIRS.includes(file)) {
            processDirectory(filePath);
          }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          updateFile(filePath);
        }
      } catch (error) {
        console.error(`Error accessing ${filePath}:`, error.message);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
}

// Start processing from the current directory
console.log('Starting API URL updates...');
processDirectory('.');
console.log('Finished processing files.'); 