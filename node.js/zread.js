require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const apiUrl = require('../apiUrl');

// Configuration
const CONFIG = {
    sourceDir: 'D:\\RMS\\ZREAD', // Directory for ZREAD files
    uploadedDir: 'D:\\RMS\\ZREAD\\UploadedFiles',
    apiUrl: apiUrl.apiUrl + '/zread',
    filePattern: /.*\.TXT$/i, // Pattern for all .TXT files
    timeout: 30000 // 30 seconds timeout
};

// Console colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m'
};

// Helper function for colored console output
function log(message, color = 'reset') {
    console.log(colors[color] + message + colors.reset);
}

// Create directories if they don't exist
[CONFIG.sourceDir, CONFIG.uploadedDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Process a single file
async function processFile(filePath) {
    const fileName = path.basename(filePath);
    let success = false;

    try {
        // Parse filename components
        // Format: YYYYMMDD - BRANCH_NAME_YYYY-MM-DD.TXT
        const baseName = fileName.replace(/\.TXT$/i, '');
        const [datePart, branchPart] = baseName.split(' - ');
        
        // Extract branch name by removing the _YYYY-MM-DD suffix
        const branchName = branchPart ? branchPart.replace(/\_\d{4}\-\d{2}\-\d{2}$/, '') : '';
        const date = datePart || '';

        // Read file content and prepare request data
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const requestData = {
            date: date.replace(/-/g, ''), // Format date as YYYYMMDD
            branch_name: branchName,
            file_content: fileContent,
            file_name: fileName,
            mime_type: 'text/plain'
        };

        await axios.post(CONFIG.apiUrl, requestData, {
            timeout: CONFIG.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        log(`ZREAD ${date}-${branchName} Successfully uploaded.`, 'green');
        success = true;
    } catch (error) {
        log(`Failed to process ${fileName}`, 'red');
        if (error.response?.data?.message) {
            log(`Error: ${error.response.data.message}`, 'red');
        }
    }
    
    // Move file if processed successfully
    if (success) {
        try {
            const targetPath = path.join(CONFIG.uploadedDir, fileName);
            // If file already exists, append a simple timestamp
            if (fs.existsSync(targetPath)) {
                const timestamp = new Date().getTime();
                const parsed = path.parse(fileName);
                const newFileName = `${parsed.name}_${timestamp}${parsed.ext}`;
                fs.renameSync(filePath, path.join(CONFIG.uploadedDir, newFileName));
            } else {
                fs.renameSync(filePath, targetPath);
            }
        } catch (error) {
            log(`Error moving file: ${error.message}`, 'yellow');
        }
    }
    return success;
}

// Main process
const filesInDir = fs.readdirSync(CONFIG.sourceDir);
const txtFiles = filesInDir.filter(entry => {
    const entryPath = path.join(CONFIG.sourceDir, entry);
    return fs.statSync(entryPath).isFile() && CONFIG.filePattern.test(entry);
});

if (txtFiles.length === 0) {
    log('No ZREAD files found to process', 'yellow');
    process.exit(0);
}

// Process files
(async () => {
    for (const file of txtFiles) {
        await processFile(path.join(CONFIG.sourceDir, file));
    }
})();

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    colorLog('Fatal error:', 'red');
    console.error(error);
    process.exit(1);
});