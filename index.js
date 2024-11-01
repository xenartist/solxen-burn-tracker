// Suppress deprecation warnings
process.removeAllListeners('warning');
// Or specifically for punycode
process.env.NODE_NO_WARNINGS = 1;

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const cron = require('node-cron');
const Database = require('./database');
const CsvProcessor = require('./csvProcessor');
const MemoProcessor = require('./memoProcessor');

puppeteer.use(StealthPlugin());

const DOWNLOAD_DIR = path.resolve('./downloads');

async function downloadCSV() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });

    try {
        const page = await browser.newPage();
        
        const client = await page.createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: DOWNLOAD_DIR
        });

        await page.goto('https://solscan.io/token/6f8deE148nynnSiWshA9vLydEbJGpDeKh5G4PRgjmzG7?activity_type=ACTIVITY_SPL_BURN', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        await new Promise(resolve => setTimeout(resolve, 30000));

        await page.waitForSelector('.gap-4 > button .lucide');
        await page.click('.gap-4 > button .lucide');

        await page.waitForSelector('.h-auto:nth-child(2)');
        await page.click('.h-auto:nth-child(2)');

        console.log('Download button clicked');
        await new Promise(resolve => setTimeout(resolve, 10000));

    } catch (error) {
        console.error('Error occurred:', error);
        await page.screenshot({ path: 'error-screenshot.png' });
    } finally {
        await browser.close();
    }
}

async function main() {
    // Initialize database
    const db = new Database();
    await db.init();

    // Initialize CSV processor
    const csvProcessor = new CsvProcessor(DOWNLOAD_DIR);
    const memoProcessor = new MemoProcessor(db, 'https://api.mainnet-beta.solana.com');

    // Schedule the task to run every hour
    cron.schedule('0 * * * *', async () => {
        console.log('Starting scheduled task:', new Date().toISOString());
        
        try {
            // Download new CSV files
            await downloadCSV();
            
            // Process downloaded files
            await csvProcessor.processNewFiles(db);
            
            console.log('Task completed successfully');
        } catch (error) {
            console.error('Task failed:', error);
        }
    });

    // Schedule memo processing (every 10 minutes)
    cron.schedule('*/10 * * * *', async () => {
        console.log('Starting memo processing task:', new Date().toISOString());
        try {
            await memoProcessor.processPendingMemos(10);
            console.log('Memo processing completed successfully');
        } catch (error) {
            console.error('Memo processing failed:', error);
        }
    });

    // Run immediately on start
    console.log('Running initial task...');
    await downloadCSV();
    await csvProcessor.processNewFiles(db);
    await memoProcessor.processPendingMemos(10);
}

// Start the application
main().catch(console.error);