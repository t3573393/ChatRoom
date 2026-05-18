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
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        is_burn_after_reading INTEGER DEFAULT 0,
                        burn_duration INTEGER DEFAULT 10,
                        status TEXT DEFAULT 'normal'
                    )
                `);

                db.run(`
                    CREATE INDEX IF NOT EXISTS idx_room_created
                    ON chat_messages(room_code, created_at DESC)
                `);

                db.run('CREATE INDEX IF NOT EXISTS idx_messages_content ON chat_messages(message_content)');

                db.run('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON chat_messages(created_at)');

                db.run('SELECT is_burn_after_reading FROM chat_messages LIMIT 1', function(err, row) {
                    if (err && err.message.includes('no such column')) {
                        db.run('ALTER TABLE chat_messages ADD COLUMN is_burn_after_reading INTEGER DEFAULT 0');
                        db.run('ALTER TABLE chat_messages ADD COLUMN burn_duration INTEGER DEFAULT 10');
                        logger.info('Database', '已添加阅后即焚相关字段');
                    }
                });

                db.run('SELECT status FROM chat_messages LIMIT 1', function(err) {
                    if (err && err.message.includes('no such column: status')) {
                        db.run('ALTER TABLE chat_messages ADD COLUMN status TEXT DEFAULT \'normal\'', function() {
                            logger.info('Database', '已添加消息状态字段');
                        });
                    }
                });

                db.run(`
                    CREATE TABLE IF NOT EXISTS message_edit_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        message_id INTEGER NOT NULL,
                        old_content TEXT,
                        edited_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, function() {
                    logger.info('Database', '消息编辑历史表已创建');
                });

                db.run(`
                    CREATE TABLE IF NOT EXISTS message_delivery_status (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        message_id INTEGER NOT NULL,
                        username TEXT NOT NULL,
                        status TEXT DEFAULT 'delivered',
                        delivered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        read_at DATETIME,
                        UNIQUE(message_id, username)
                    )
                `, function() {
                    logger.info('Database', '消息送达状态表已创建');
                });

                db.run(`
                    CREATE TABLE IF NOT EXISTS room_states (
                        room_code TEXT PRIMARY KEY,
                        creator TEXT NOT NULL,
                        members TEXT,
                        mutes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, function() {
                    logger.info('Database', '房间状态表已创建');
                    logger.info('Database', '数据库表初始化完成');
                    resolve(db);
                });
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
        var cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - messageRetentionDays);
        var cutoffStr = cutoffDate.toISOString();

        db.serialize(function() {
            db.run('BEGIN TRANSACTION');

            db.all('SELECT id FROM chat_messages WHERE created_at < ?', [cutoffStr], function(err, rows) {
                if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                    return;
                }

                var messageIds = rows.map(function(row) { return row.id; });

                if (messageIds.length === 0) {
                    db.run('COMMIT');
                    resolve(0);
                    return;
                }

                var placeholders = messageIds.map(function() { return '?'; }).join(',');

                db.run('DELETE FROM message_delivery_status WHERE message_id IN (' + placeholders + ')', messageIds, function(err) {
                    if (err) {
                        console.error('清理消息送达状态失败:', err.message);
                    }
                });

                db.run('DELETE FROM message_edit_history WHERE message_id IN (' + placeholders + ')', messageIds, function(err) {
                    if (err) {
                        console.error('清理消息编辑历史失败:', err.message);
                    }
                });

                db.run('DELETE FROM chat_messages WHERE created_at < ?', [cutoffStr], function(err) {
                    if (err) {
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                    }
                    console.log('清理了 ' + this.changes + ' 条过期消息');
                    db.run('COMMIT');
                    resolve(this.changes);
                });
            });
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

function getMessagesForExport(options) {
    return new Promise((resolve, reject) => {
        var sql = 'SELECT * FROM chat_messages WHERE 1=1';
        var params = [];

        if (options.roomCode) {
            sql += ' AND room_code = ?';
            params.push(options.roomCode);
        }

        if (options.startDate) {
            sql += ' AND created_at >= ?';
            params.push(options.startDate);
        }

        if (options.endDate) {
            sql += ' AND created_at <= ?';
            params.push(options.endDate);
        }

        sql += ' ORDER BY created_at ASC';

        db.all(sql, params, function(err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function deleteBurnAfterReadingMessage(messageId) {
    return new Promise((resolve, reject) => {
        var sql = 'DELETE FROM chat_messages WHERE id = ? AND is_burn_after_reading = 1';
        db.run(sql, [messageId], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

function getBurnAfterReadingMessage(messageId) {
    return new Promise((resolve, reject) => {
        var sql = 'SELECT * FROM chat_messages WHERE id = ? AND is_burn_after_reading = 1';
        db.get(sql, [messageId], function(err, row) {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function saveMessageWithBurn(roomCode, username, userAvatar, messageType, messageContent, fileInfo, isBurnAfterReading, burnDuration) {
    return new Promise((resolve, reject) => {
        var sql = `
            INSERT INTO chat_messages
            (room_code, username, user_avatar, message_type, message_content, file_info, is_burn_after_reading, burn_duration)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(sql, [roomCode, username, userAvatar, messageType, messageContent, fileInfo, isBurnAfterReading ? 1 : 0, burnDuration || 10], function(err) {
            if (err) {
                console.error('保存消息失败:', err);
                reject(err);
                return;
            }
            resolve(this.lastID);
        });
    });
}

function getEditableMessage(messageId, username, timeLimit) {
    return new Promise((resolve, reject) => {
        var sql = `
            SELECT * FROM chat_messages 
            WHERE id = ? AND username = ? AND status = 'normal'
        `;

        db.get(sql, [messageId, username], function(err, row) {
            if (err) {
                reject(err);
                return;
            }

            if (!row) {
                resolve(null);
                return;
            }

            var createdAt = new Date(row.created_at).getTime();
            var now = Date.now();
            var elapsed = now - createdAt;

            if (elapsed > timeLimit) {
                resolve({ message: row, editable: false, timeRemaining: 0 });
            } else {
                resolve({ message: row, editable: true, timeRemaining: timeLimit - elapsed });
            }
        });
    });
}

function editMessage(messageId, newContent) {
    return new Promise((resolve, reject) => {
        var sql = `
            UPDATE chat_messages 
            SET message_content = ?, status = 'edited'
            WHERE id = ? AND status = 'normal'
        `;

        db.run(sql, [newContent, messageId], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.changes > 0);
        });
    });
}

function saveEditHistory(messageId, oldContent) {
    return new Promise((resolve, reject) => {
        var sql = `
            INSERT INTO message_edit_history (message_id, old_content, edited_at)
            VALUES (?, ?, datetime('now'))
        `;

        db.run(sql, [messageId, oldContent], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.lastID);
        });
    });
}

function recallMessage(messageId, username) {
    return new Promise((resolve, reject) => {
        var sql = `
            UPDATE chat_messages 
            SET status = 'recalled'
            WHERE id = ? AND username = ? AND status = 'normal'
        `;

        db.run(sql, [messageId, username], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.changes > 0);
        });
    });
}

function searchMessages(options) {
    return new Promise((resolve, reject) => {
        var keyword = options.keyword || '';
        var roomCode = options.roomCode || null;
        var startDate = options.startDate || null;
        var endDate = options.endDate || null;
        var page = parseInt(options.page) || 1;
        var pageSize = Math.min(parseInt(options.pageSize) || 20, 50);

        var sql = 'SELECT * FROM chat_messages WHERE 1=1';
        var countSql = 'SELECT COUNT(*) as total FROM chat_messages WHERE 1=1';
        var params = [];
        var countParams = [];

        if (keyword) {
            sql += ' AND message_content LIKE ?';
            countSql += ' AND message_content LIKE ?';
            params.push('%' + keyword + '%');
            countParams.push('%' + keyword + '%');
        }

        if (roomCode) {
            sql += ' AND room_code = ?';
            countSql += ' AND room_code = ?';
            params.push(roomCode);
            countParams.push(roomCode);
        }

        if (startDate) {
            sql += ' AND created_at >= ?';
            countSql += ' AND created_at >= ?';
            params.push(startDate);
            countParams.push(startDate);
        }

        if (endDate) {
            sql += ' AND created_at <= ?';
            countSql += ' AND created_at <= ?';
            params.push(endDate);
            countParams.push(endDate);
        }

        sql += ' ORDER BY created_at DESC';

        var offset = (page - 1) * pageSize;
        sql += ' LIMIT ? OFFSET ?';
        params.push(pageSize, offset);

        db.get(countSql, countParams, function(err, countRow) {
            if (err) {
                reject(err);
                return;
            }

            var total = countRow ? countRow.total : 0;

            db.all(sql, params, function(err, rows) {
                if (err) {
                    reject(err);
                    return;
                }

                var messages = rows.map(function(msg) {
                    var highlightedContent = msg.message_content;
                    if (keyword) {
                        var regex = new RegExp('(' + keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
                        highlightedContent = msg.message_content.replace(regex, '<mark>$1</mark>');
                    }

                    return {
                        id: msg.id,
                        roomCode: msg.room_code,
                        username: msg.username,
                        userAvatar: msg.user_avatar,
                        messageType: msg.message_type,
                        messageContent: msg.message_content,
                        highlightedContent: highlightedContent,
                        fileInfo: msg.file_info ? JSON.parse(msg.file_info) : null,
                        createdAt: msg.created_at,
                        msgTime: formatTime(new Date(msg.created_at))
                    };
                });

                resolve({
                    messages: messages,
                    total: total,
                    page: page,
                    pageSize: pageSize,
                    hasMore: offset + rows.length < total
                });
            });
        });
    });
}

function markMessageDelivered(messageId) {
    return new Promise((resolve, reject) => {
        var sql = `
            INSERT OR REPLACE INTO message_delivery_status (message_id, username, status, delivered_at)
            SELECT ?, username, 'delivered', datetime('now')
            FROM chat_messages
            WHERE id = ? AND username != (
                SELECT username FROM chat_messages WHERE id = ?
            )
        `;
        db.run(sql, [messageId, messageId, messageId], function(err) {
            if (err) {
                console.error('标记消息已送达失败:', err);
                reject(err);
                return;
            }
            resolve(this.changes > 0);
        });
    });
}

function markMessageRead(messageId, username) {
    return new Promise((resolve, reject) => {
        var sql = `
            UPDATE message_delivery_status 
            SET status = 'read', read_at = datetime('now')
            WHERE message_id = ? AND username = ?
        `;
        db.run(sql, [messageId, username], function(err) {
            if (err) {
                console.error('标记消息已读失败:', err);
                reject(err);
                return;
            }
            if (this.changes === 0) {
                var insertSql = `
                    INSERT INTO message_delivery_status (message_id, username, status, delivered_at, read_at)
                    VALUES (?, ?, 'read', datetime('now'), datetime('now'))
                `;
                db.run(insertSql, [messageId, username], function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(true);
                });
            } else {
                resolve(true);
            }
        });
    });
}

function markMessagesRead(roomCode, username) {
    return new Promise((resolve, reject) => {
        var sql = `
            INSERT OR REPLACE INTO message_delivery_status (message_id, username, status, delivered_at, read_at)
            SELECT m.id, ?, 'read', datetime('now'), datetime('now')
            FROM chat_messages m
            LEFT JOIN message_delivery_status mds 
                ON m.id = mds.message_id AND mds.username = ? AND mds.status = 'read'
            WHERE m.room_code = ? 
                AND m.username != ?
                AND mds.id IS NULL
        `;
        db.run(sql, [username, username, roomCode, username], function(err) {
            if (err) {
                console.error('批量标记消息已读失败:', err);
                reject(err);
                return;
            }
            resolve(this.changes);
        });
    });
}

function getMessageStatus(messageId) {
    return new Promise((resolve, reject) => {
        var sql = `
            SELECT 
                mds.username,
                mds.status,
                mds.delivered_at,
                mds.read_at
            FROM message_delivery_status mds
            WHERE mds.message_id = ?
        `;
        db.all(sql, [messageId], function(err, rows) {
            if (err) {
                console.error('获取消息状态失败:', err);
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

function getMessageReadCount(messageId) {
    return new Promise((resolve, reject) => {
        var sql = `
            SELECT COUNT(*) as read_count 
            FROM message_delivery_status 
            WHERE message_id = ? AND status = 'read'
        `;
        db.get(sql, [messageId], function(err, row) {
            if (err) {
                reject(err);
                return;
            }
            resolve(row ? row.read_count : 0);
        });
    });
}

function getTotalUsersInRoom(roomCode) {
    return new Promise((resolve, reject) => {
        var sql = `
            SELECT COUNT(DISTINCT username) as total 
            FROM chat_messages 
            WHERE room_code = ?
        `;
        db.get(sql, [roomCode], function(err, row) {
            if (err) {
                reject(err);
                return;
            }
            resolve(row ? row.total : 0);
        });
    });
}

function saveRoomState(roomCode, creator, members, mutes) {
    return new Promise((resolve, reject) => {
        var sql = `
            INSERT OR REPLACE INTO room_states (room_code, creator, members, mutes, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `;
        db.run(sql, [roomCode, creator, JSON.stringify(members || []), JSON.stringify(mutes || [])], function(err) {
            if (err) {
                console.error('保存房间状态失败:', err);
                reject(err);
                return;
            }
            resolve(true);
        });
    });
}

function getRoomState(roomCode) {
    return new Promise((resolve, reject) => {
        var sql = 'SELECT * FROM room_states WHERE room_code = ?';
        db.get(sql, [roomCode], function(err, row) {
            if (err) {
                reject(err);
                return;
            }
            if (row) {
                row.members = row.members ? JSON.parse(row.members) : [];
                row.mutes = row.mutes ? JSON.parse(row.mutes) : [];
            }
            resolve(row);
        });
    });
}

function getAllRoomStates() {
    return new Promise((resolve, reject) => {
        var sql = 'SELECT * FROM room_states';
        db.all(sql, function(err, rows) {
            if (err) {
                reject(err);
                return;
            }
            rows.forEach(function(row) {
                row.members = row.members ? JSON.parse(row.members) : [];
                row.mutes = row.mutes ? JSON.parse(row.mutes) : [];
            });
            resolve(rows);
        });
    });
}

function deleteRoomState(roomCode) {
    return new Promise((resolve, reject) => {
        var sql = 'DELETE FROM room_states WHERE room_code = ?';
        db.run(sql, [roomCode], function(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve(this.changes > 0);
        });
    });
}

function formatTime(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
}

module.exports = {
    initDatabase: initDatabase,
    saveMessage: saveMessage,
    getMessages: getMessages,
    getMessageCount: getMessageCount,
    cleanupExpiredMessages: cleanupExpiredMessages,
    getConfig: getConfig,
    closeDatabase: closeDatabase,
    getMessagesForExport: getMessagesForExport,
    deleteBurnAfterReadingMessage: deleteBurnAfterReadingMessage,
    getBurnAfterReadingMessage: getBurnAfterReadingMessage,
    saveMessageWithBurn: saveMessageWithBurn,
    searchMessages: searchMessages,
    getEditableMessage: getEditableMessage,
    editMessage: editMessage,
    saveEditHistory: saveEditHistory,
    recallMessage: recallMessage,
    markMessageDelivered: markMessageDelivered,
    markMessageRead: markMessageRead,
    markMessagesRead: markMessagesRead,
    getMessageStatus: getMessageStatus,
    getMessageReadCount: getMessageReadCount,
    getTotalUsersInRoom: getTotalUsersInRoom,
    saveRoomState: saveRoomState,
    getRoomState: getRoomState,
    getAllRoomStates: getAllRoomStates,
    deleteRoomState: deleteRoomState
};
