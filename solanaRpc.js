const web3 = require('@solana/web3.js');

class SolanaRPC {
    constructor(rpcUrl = 'https://api.mainnet-beta.solana.com') {
        this.connection = new web3.Connection(rpcUrl);
    }

    async getMemo(signature) {
        try {
            const tx = await this.connection.getParsedTransaction(signature, {
                maxSupportedTransactionVersion: 0
            });

            if (!tx) return null;

            // Look for memo instruction
            for (const instruction of tx.transaction.message.instructions) {
                if (instruction.program === 'spl-memo') {
                    return instruction.parsed;
                }
            }

            return null;
        } catch (error) {
            console.error(`Error fetching memo for ${signature}:`, error);
            return null;
        }
    }
}

module.exports = SolanaRPC;