const fs = require('fs');
const path = require('path');

// Function to recursively list all files in a directory
function listFilesRecursively(dir, fileList = [], ignoreDirs = []) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory does not exist: ${dir}`);
    return fileList;
  }

  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(process.cwd(), filePath);
    const stat = fs.statSync(filePath);
    
    // Skip node_modules, .git, .next directories
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.git' || file === '.next' || ignoreDirs.includes(file)) {
        return;
      }
      // Recursively list files in subdirectories
      listFilesRecursively(filePath, fileList, ignoreDirs);
    } else {
      // Add file to the list
      fileList.push(relativePath);
    }
  });
  
  return fileList;
}

// Function to check for temporary or unnecessary files
function checkForUnnecessaryFiles(files) {
  const potentialUnnecessaryPatterns = [
    /\.tmp$/,
    /\.bak$/,
    /\.log$/,
    /\.DS_Store$/,
    /Thumbs\.db$/,
    /\.swp$/,
    /\.swo$/,
    /~$/,
    /check_.*\.js$/,
    /test_.*\.js$/,
    /cleanup.*\.js$/,
    /move_.*\.js$/,
    /reference_.*\.js$/
  ];
  
  const unnecessaryFiles = files.filter(file => {
    return potentialUnnecessaryPatterns.some(pattern => pattern.test(file));
  });
  
  return unnecessaryFiles;
}

// Function to check for duplicate files
function checkForDuplicateFiles(files) {
  const filesByName = {};
  
  files.forEach(file => {
    const fileName = path.basename(file);
    if (!filesByName[fileName]) {
      filesByName[fileName] = [];
    }
    filesByName[fileName].push(file);
  });
  
  const duplicates = Object.entries(filesByName)
    .filter(([name, paths]) => paths.length > 1)
    .map(([name, paths]) => ({ name, paths }));
  
  return duplicates;
}

// Main function to check project structure
async function checkProjectStructure() {
  console.log('Checking project structure...');
  
  // List all files in the project
  const allFiles = listFilesRecursively('.', [], []);
  
  // Check for unnecessary files
  const unnecessaryFiles = checkForUnnecessaryFiles(allFiles);
  
  // Check for duplicate files
  const duplicateFiles = checkForDuplicateFiles(allFiles);
  
  // Print results
  console.log('\n--- Project Structure Analysis ---');
  console.log(`Total files: ${allFiles.length}`);
  
  console.log('\n--- Potentially Unnecessary Files ---');
  if (unnecessaryFiles.length === 0) {
    console.log('No potentially unnecessary files found.');
  } else {
    console.log(`Found ${unnecessaryFiles.length} potentially unnecessary files:`);
    unnecessaryFiles.forEach(file => {
      console.log(`- ${file}`);
    });
  }
  
  console.log('\n--- Potential Duplicate Files ---');
  if (duplicateFiles.length === 0) {
    console.log('No duplicate files found.');
  } else {
    console.log(`Found ${duplicateFiles.length} potential duplicate files:`);
    duplicateFiles.forEach(({ name, paths }) => {
      console.log(`- ${name}:`);
      paths.forEach(path => {
        console.log(`  - ${path}`);
      });
    });
  }
  
  console.log('\nProject structure check completed!');
}

// Run the check
checkProjectStructure(); 