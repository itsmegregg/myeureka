require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const apiUrl = require('../apiUrl');

// Configuration
const CONFIG = {
    sourceDir: 'D:\\RMS\\RECEIPT', // Directory for receipt files
    uploadedDir: 'D:\\RMS\\RECEIPT\\UploadedFiles',
    apiUrl: apiUrl.apiUrl + '/receipt',
    filePattern: /.*\.TXT$/i, // Pattern for all .TXT files
    timeout: 30000 // 30 seconds timeout
};

// Console colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m'
};

// Helper function for colored console output
function colorLog(message, color = 'reset') {
    console.log(colors[color] + message + colors.reset);
}

// Create directories if they don't exist
[CONFIG.sourceDir, CONFIG.uploadedDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        colorLog(`Created directory: ${dir}`, 'cyan');
    }
});

// Process a single file
async function processFile(filePath) {
    const fileName = path.basename(filePath);
    let success = false;

    try {
        // Parse filename components
        // Format: SI_NUMBER - DATE - BRANCH_NAME.TXT
        const filenameParts = fileName.replace('.TXT', '').split(' - ');
        const siNumber = filenameParts[0] || '';
        const date = filenameParts[1] || '';
        const branchName = filenameParts[2] || '';
        const type = filenameParts[3] || '';

        // Create FormData for file upload
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        form.append('si_number', siNumber);
        form.append('date', date);
        form.append('branch_name', branchName);
        form.append('type', type);

        const response = await axios.post(CONFIG.apiUrl, form, {
            timeout: CONFIG.timeout,
            headers: form.getHeaders()
        });

        if (response.status === 201 || response.status === 200) {
            colorLog(`✓ ${fileName} uploaded successfully`, 'green');
            success = true;
        } else {
            colorLog(`✗ ${fileName}: ${response.statusText}`, 'red');
        }
    } catch (error) {
        if (error.response) {
            colorLog(`✗ ${fileName}: ${error.response.status} - ${error.response.data.message || 'Server error'}`, 'red');
        } else {
            colorLog(`✗ ${fileName}: ${error.message}`, 'red');
        }
    }
    
    // Move file if processed successfully
    if (success) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const targetPath = path.join(CONFIG.uploadedDir, `${path.parse(fileName).name}_${timestamp}${path.parse(fileName).ext}`);

        try {
            fs.renameSync(filePath, targetPath);
            colorLog(`✓ Moved ${fileName} to ${CONFIG.uploadedDir}`, 'cyan');
        } catch (error) {
            colorLog(`✗ Error moving ${fileName}: ${error.message}`, 'red');
        }
    } else {
        colorLog(`✗ Failed to process ${fileName}`, 'yellow');
    }
    return success;
}

// Main process
colorLog(`Processing files in ${CONFIG.sourceDir}`, 'bright');
const filesInDir = fs.readdirSync(CONFIG.sourceDir);
console.log('Detected entries (files and directories):', filesInDir); // Updated log for clarity

const txtFiles = filesInDir.filter(entry => {
    const entryPath = path.join(CONFIG.sourceDir, entry);
    const isFile = fs.statSync(entryPath).isFile();
    const matches = isFile && CONFIG.filePattern.test(entry);
    console.log(`Checking file: ${entry}, isFile: ${isFile}, matches pattern: ${matches}`);
    return matches;
});
console.log('Filtered TXT files (only actual files matching pattern):', txtFiles); // Updated log for clarity

if (txtFiles.length === 0) {
    colorLog('No TXT files found to process', 'yellow');
    process.exit(0);
}

colorLog(`Found ${txtFiles.length} files to process`, 'cyan');

(async () => {
    for (const file of txtFiles) {
        const filePath = path.join(CONFIG.sourceDir, file);
        try {
            await processFile(filePath);
        } catch (error) {
            colorLog(`Failed to process ${file}: ${error.message}`, 'red');
        }
    }
    colorLog('Finished processing all files', 'bright');
})();

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    colorLog('Fatal error:', 'red');
    console.error(error);
    process.exit(1);
});