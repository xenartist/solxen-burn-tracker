const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'solxen-burns.db'));
    }

    async init() {
        return new Promise((resolve, reject) => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS burns (
                    signature TEXT PRIMARY KEY,
                    burner TEXT,
                    amount DECIMAL(20,9),
                    memo TEXT,
                    token TEXT,
                    timestamp DATETIME,
                    memo_checked CHAR(1),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async insertBurn(burn) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT OR IGNORE INTO burns (
                    signature, burner, amount, token, timestamp, memo_checked
                )
                VALUES (?, ?, ?, ?, ?, NULL)
            `;
            this.db.run(sql, [
                burn.signature,
                burn.burner,
                burn.amount,
                burn.token,
                burn.timestamp
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async getUncheckedTransactions(limit = 10) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT signature 
                FROM burns 
                WHERE memo_checked IS NULL 
                OR memo_checked = ''
                LIMIT ?
            `;
            this.db.all(sql, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async updateMemo(signature, memo) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE burns 
                SET memo = ?, memo_checked = 'Y'
                WHERE signature = ?
            `;
            this.db.run(sql, [memo, signature], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    async markChecked(signature) {
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE burns 
                SET memo_checked = 'Y'
                WHERE signature = ?
            `;
            this.db.run(sql, [signature], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;