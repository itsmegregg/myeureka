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

        // Create FormData for file upload
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        form.append('date', date.replace(/-/g, '')); // Format date as YYYYMMDD
        form.append('branch_name', branchName);
        form.append('type', 'zread');

        const response = await axios.post(CONFIG.apiUrl, form, {
            timeout: CONFIG.timeout,
            headers: {
                ...form.getHeaders(),
                'Accept': 'application/json'
            },
            validateStatus: false // Don't throw on HTTP error status
        });
        
        if (response.status >= 200 && response.status < 300) {
            log(`ZREAD ${date}-${branchName} Successfully uploaded.`, 'green');
            success = true;
        } else {
            throw new Error(JSON.stringify({
                status: response.status,
                data: response.data,
                requestData: {
                    ...requestData,
                    file_content: requestData.file_content.substring(0, 100) + '...' // Truncate content for logging
                }
            }));
        }
    } catch (error) {
        log(`Failed to process ${fileName}`, 'red');
        try {
            const errorData = JSON.parse(error.message);
            log(`Status: ${errorData.status}`, 'red');
            if (errorData.data?.errors) {
                log('Validation Errors:', 'red');
                console.error(JSON.stringify(errorData.data.errors, null, 2));
            } else if (errorData.data?.message) {
                log(`Error: ${errorData.data.message}`, 'red');
            }
            log('Request Data:', 'yellow');
            console.error(JSON.stringify(errorData.requestData, null, 2));
        } catch (e) {
            log(`Error: ${error.message}`, 'red');
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
    log('Fatal error:', 'red');
    console.error(error);
    process.exit(1);
});