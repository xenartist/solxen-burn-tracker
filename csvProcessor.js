const csv = require('csv-parser');
const fs = require('fs-extra');
const path = require('path');

class CsvProcessor {
    constructor(downloadDir) {
        this.downloadDir = downloadDir;
    }

    async processNewFiles(db) {
        try {
            // Get all CSV files in the downloads directory
            const files = await fs.readdir(this.downloadDir);
            const csvFiles = files.filter(file => file.endsWith('.csv'));

            // If no CSV files found, log and return early
            if (csvFiles.length === 0) {
                console.log('No CSV files found for processing, skipping...');
                return;
            }

            console.log(`Found ${csvFiles.length} CSV files to process`);
            
            for (const file of csvFiles) {
                const filePath = path.join(this.downloadDir, file);
                try {
                    // Check if file exists and is accessible
                    await fs.access(filePath);
                    
                    // Check if file size is greater than 0
                    const stats = await fs.stat(filePath);
                    if (stats.size === 0) {
                        console.log(`Skipping empty file: ${file}`);
                        await this.archiveFile(filePath);
                        continue;
                    }

                    console.log(`Processing file: ${file}`);
                    await this.processCsvFile(filePath, db);
                    // Move processed file to archive folder
                    await this.archiveFile(filePath);
                    console.log(`Successfully processed and archived: ${file}`);
                } catch (error) {
                    console.error(`Error processing file ${file}:`, error);
                    // Try to archive the problematic file
                    try {
                        await this.archiveFile(filePath, true);
                    } catch (archiveError) {
                        console.error(`Failed to archive problematic file ${file}:`, archiveError);
                    }
                }
            }
        } catch (error) {
            console.error('Error accessing CSV directory:', error);
        }
    }

    async processCsvFile(filePath, db) {
        return new Promise((resolve, reject) => {
            const records = [];
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    records.push({
                        signature: row.Signature,
                        block_timestamp: row['Block Timestamp'],
                        slot: row.Slot,
                        signer: row.Signer,
                        amount: parseFloat(row.Amount)
                    });
                })
                .on('end', async () => {
                    try {
                        // Process all records
                        for (const record of records) {
                            await db.insertBurn(record);
                        }
                        console.log(`Processed ${records.length} records from file`);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', reject);
        });
    }

    async archiveFile(filePath, isError = false) {
        try {
            const archiveDir = path.join(this.downloadDir, isError ? 'error' : 'archived');
            await fs.ensureDir(archiveDir);
            
            const fileName = path.basename(filePath);
            const archivePath = path.join(
                archiveDir, 
                `${fileName}.${Date.now()}${isError ? '.error' : ''}`
            );
            
            await fs.move(filePath, archivePath);
            console.log(`File archived to: ${archivePath}`);
        } catch (error) {
            console.error(`Error archiving file ${filePath}:`, error);
            throw error;
        }
    }
}

module.exports = CsvProcessor;