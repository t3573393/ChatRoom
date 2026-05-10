/**
 * @fileoverview 数据库操作模块
 * @module database/db
 * @description SQLite 数据库操作，提供消息存储、查询和清理功能
 */

var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');
var path = require('path');
var logger = require('../utils/logger');

/**
 * 数据库文件路径
 * @type {string}
 */
var dbPath = path.join(__dirname, 'chat_history.db');

/**
 * 数据库连接
 * @type {sqlite3.Database}
 */
var db;

/**
 * 消息保留天数
 * @type {number}
 */
var messageRetentionDays = 30;

/**
 * 每页消息数量
 * @type {number}
 */
var messagePageSize = 20;

/**
 * 初始化数据库
 * @returns {Promise<sqlite3.Database>} 数据库连接
 */
function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, function(err) {
            if (err) {
                logger.error('Database', '数据库连接失败: ' + err.message);
                reject(err);
                return;
            }
            logger.info('Database', 'SQLite 数据库连接成功');

            db.serialize(function() {
                db.run(`
                    CREATE TABLE IF NOT EXISTS chat_messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        room_code TEXT NOT NULL,
                        username TEXT NOT NULL,
                        user_avatar TEXT,
                        message_type TEXT NOT NULL,
                        message_content TEXT,
                        file_info TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                db.run(`
                    CREATE INDEX IF NOT EXISTS idx_room_created
                    ON chat_messages(room_code, created_at DESC)
                `);

                logger.info('Database', '数据库表初始化完成');
                resolve(db);
            });
        });
    });
}

function saveMessage(roomCode, username, userAvatar, messageType, messageContent, fileInfo) {
    return new Promise((resolve, reject) => {
        var sql = `
            INSERT INTO chat_messages
            (room_code, username, user_avatar, message_type, message_content, file_info)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.run(sql, [roomCode, username, userAvatar, messageType, messageContent, fileInfo], function(err) {
            if (err) {
                console.error('保存消息失败:', err);
                reject(err);
                return;
            }
            resolve(this.lastID);
        });
    });
}

function getMessages(roomCode, pageSize, beforeId) {
    return new Promise((resolve, reject) => {
        var sql;
        var params;

        if (beforeId) {
            sql = `
                SELECT * FROM chat_messages
                WHERE room_code = ? AND id < ?
                ORDER BY id DESC
                LIMIT ?
            `;
            params = [roomCode, beforeId, pageSize];
        } else {
            sql = `
                SELECT * FROM chat_messages
                WHERE room_code = ?
                ORDER BY id DESC
                LIMIT ?
            `;
            params = [roomCode, pageSize];
        }

        db.all(sql, params, function(err, rows) {
            if (err) {
                console.error('查询消息失败:', err);
                reject(err);
                return;
            }

            var messages = rows.reverse();

            var hasMore = rows.length === pageSize;

            resolve({
                messages: messages,
                hasMore: hasMore
            });
        });
    });
}

function getMessageCount(roomCode) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT COUNT(*) as count FROM chat_messages WHERE room_code = ?',
            [roomCode],
            function(err, row) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row.count);
            }
        );
    });
}

function cleanupExpiredMessages() {
    return new Promise((resolve, reject) => {
        var sql = `
            DELETE FROM chat_messages
            WHERE created_at < datetime('now', '-' || ? || ' days')
        `;

        db.run(sql, [messageRetentionDays], function(err) {
            if (err) {
                console.error('清理过期消息失败:', err);
                reject(err);
                return;
            }
            console.log(`清理了 ${this.changes} 条过期消息`);
            resolve(this.changes);
        });
    });
}

function getConfig() {
    return {
        retentionDays: messageRetentionDays,
        pageSize: messagePageSize
    };
}

function closeDatabase() {
    if (db) {
        db.close();
        console.log('数据库连接已关闭');
    }
}

module.exports = {
    initDatabase: initDatabase,
    saveMessage: saveMessage,
    getMessages: getMessages,
    getMessageCount: getMessageCount,
    cleanupExpiredMessages: cleanupExpiredMessages,
    getConfig: getConfig,
    closeDatabase: closeDatabase
};
