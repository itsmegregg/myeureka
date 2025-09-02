require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const apiUrl = require('../apiUrl');

// Configuration
const CONFIG = {
    sourceDir: 'D:\\RMS\\RECEIPT',
    uploadedDir: 'D:\\RMS\\RECEIPT\\UploadedFiles',
    apiUrl: apiUrl.apiUrl + '/receipt',
    filePattern: /.*\.TXT$/i,
    timeout: 30000
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
        const filenameWithoutExt = fileName.replace(/\.txt$/i, '');
        const parts = filenameWithoutExt.split(' - ').map(part => part.trim());
        
        // Extract date in YYYYMMDD format
        let dateStr = parts[1] || '';
        const branchName = parts[2] || '';
        
        // Use the date as-is if it's in YYYYMMDD format, otherwise use current date
        let formattedDate = /^\d{8}$/.test(dateStr) 
            ? dateStr // Keep as YYYYMMDD
            : new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 8); // Current date as YYYYMMDD
        
        // Prepare request data
        const requestData = {
            si_number: parts[0] || '',
            date: formattedDate,
            branch_name: branchName,
            type: parts[3] || 'SALES',
            file_content: fs.readFileSync(filePath, 'utf8'),
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

        log(`RECEIPT ${formattedDate}-${branchName} Successfully uploaded.`, 'green');
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
            // Only append timestamp if file exists
            if (fs.existsSync(targetPath)) {
                const timestamp = new Date().getTime();
                const parsed = path.parse(fileName);
                const newFileName = `${parsed.name}_${timestamp}${parsed.ext}`;
                fs.renameSync(filePath, path.join(CONFIG.uploadedDir, newFileName));
            } else {
                // Keep original filename if no conflict
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
    log('No receipt files found to process', 'yellow');
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