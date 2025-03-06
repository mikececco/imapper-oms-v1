const fs = require('fs');
const path = require('path');

// Files and directories to remove
const toRemove = [
  // Duplicate files that have been moved from src to app
  'src',
  
  // Temporary scripts that are no longer needed
  'move_files.js',
  'check_src_files.js',
  'move_remaining_files.js',
  'update_package.js',
  
  // Any other temporary or unnecessary files
  'app/utils/check_schema.js',
  'app/reference_server.js',
  'app/api/auth/reference_authRoutes.js',
  'app/api/orders/reference_orderRoutes.js',
  'app/api/webhook/stripe/reference_routes.js',
  'app/api/debug/reference_debugRoutes.js'
];

// Function to safely remove a file or directory
function safeRemove(pathToRemove) {
  try {
    if (!fs.existsSync(pathToRemove)) {
      console.log(`Path does not exist: ${pathToRemove}`);
      return;
    }
    
    const stats = fs.statSync(pathToRemove);
    
    if (stats.isDirectory()) {
      // Remove directory recursively
      console.log(`Removing directory: ${pathToRemove}`);
      fs.rmSync(pathToRemove, { recursive: true, force: true });
    } else {
      // Remove file
      console.log(`Removing file: ${pathToRemove}`);
      fs.unlinkSync(pathToRemove);
    }
  } catch (error) {
    console.error(`Error removing ${pathToRemove}:`, error.message);
  }
}

// Main function to clean up the project
function cleanupProject() {
  console.log('Starting project cleanup...');
  
  // Remove each file/directory in the list
  toRemove.forEach(item => {
    safeRemove(item);
  });
  
  console.log('Project cleanup completed!');
}

// Run the cleanup
cleanupProject(); 