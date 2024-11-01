const SolanaRPC = require('./solanaRpc');

const RATE_LIMIT_DELAY = 20000; // 20 seconds

class MemoProcessor {
    constructor(db, rpcUrl) {
        this.db = db;
        this.solanaRpc = new SolanaRPC(rpcUrl);
    }

    async processPendingMemos(batchSize = 10) {
        try {
            const transactions = await this.db.getUncheckedTransactions(batchSize);
            console.log(`Processing ${transactions.length} transactions for memos...`);

            // If no transactions to process, return early
            if (transactions.length === 0) {
                console.log('No pending transactions to process');
                return;
            }

            for (const tx of transactions) {
                try {
                    const memo = await this.solanaRpc.getMemo(tx.signature);
                    
                    if (memo) {
                        await this.db.updateMemo(tx.signature, memo);
                        console.log(`Updated memo for ${tx.signature}`);
                    } else {
                        await this.db.markChecked(tx.signature);
                        console.log(`No memo found for ${tx.signature}`);
                    }

                    if (transactions.indexOf(tx) < transactions.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
                    }
                } catch (error) {
                    console.error(`Error processing memo for ${tx.signature}:`, error);
                }
            }
            console.log(`Completed processing ${transactions.length} transactions`);
        } catch (error) {
            console.error('Error in memo processing:', error);
            throw error;
        }
    }
}

module.exports = MemoProcessor;