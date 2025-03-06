const fs = require('fs');
const path = require('path');

// Essential files that should exist
const essentialFiles = [
  'package.json',
  'next.config.js',
  'vercel.json',
  'app/layout.jsx',
  'app/page.jsx',
  'app/utils/supabase.js',
  'app/api/webhook/stripe/route.js',
  'app/utils/constants.js'
];

// Check if a file exists
function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

// Verify package.json has the correct build script
function verifyPackageJson() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (!packageJson.scripts || !packageJson.scripts.build) {
      console.error('❌ package.json is missing the "build" script');
      return false;
    }
    if (packageJson.scripts.build !== 'next build') {
      console.error(`❌ package.json has incorrect "build" script: "${packageJson.scripts.build}". Should be "next build"`);
      return false;
    }
    console.log('✅ package.json has correct "build" script');
    return true;
  } catch (error) {
    console.error('❌ Error reading package.json:', error.message);
    return false;
  }
}

// Verify vercel.json has the correct build command
function verifyVercelJson() {
  try {
    const vercelJson = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    if (!vercelJson.buildCommand) {
      console.error('❌ vercel.json is missing the "buildCommand" property');
      return false;
    }
    if (vercelJson.buildCommand !== 'npm run build') {
      console.error(`❌ vercel.json has incorrect "buildCommand": "${vercelJson.buildCommand}". Should be "npm run build"`);
      return false;
    }
    console.log('✅ vercel.json has correct "buildCommand"');
    return true;
  } catch (error) {
    console.error('❌ Error reading vercel.json:', error.message);
    return false;
  }
}

// Main verification function
function verifyProject() {
  console.log('Verifying project structure...');
  
  // Check essential files
  let allFilesExist = true;
  for (const file of essentialFiles) {
    if (checkFileExists(file)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.error(`❌ ${file} is missing`);
      allFilesExist = false;
    }
  }
  
  // Verify package.json
  const packageJsonValid = verifyPackageJson();
  
  // Verify vercel.json
  const vercelJsonValid = verifyVercelJson();
  
  // Final result
  if (allFilesExist && packageJsonValid && vercelJsonValid) {
    console.log('\n✅ Project structure is valid and ready for deployment');
  } else {
    console.error('\n❌ Project structure has issues that need to be fixed before deployment');
  }
}

// Run the verification
verifyProject(); 