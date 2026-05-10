/**
 * @fileoverview 日志系统模块
 * @module utils/logger
 * @description 提供文件日志、日志轮转、日志清理功能
 */

var fs = require('fs');
var path = require('path');

// 配置常量
var LOG_DIR = path.join(__dirname, '../logs');
var MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
var MAX_LOG_FILES = 7;
var LOG_LEVEL = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
};

// 模块状态
var logStream = null;
var currentFileSize = 0;

/**
 * 初始化日志系统
 * @returns {void}
 */
function init() {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    var logFile = path.join(LOG_DIR, 'app.log');
    logStream = fs.createWriteStream(logFile, { flags: 'a' });

    try {
        var stats = fs.statSync(logFile);
        currentFileSize = stats.size;
    } catch (e) {
        currentFileSize = 0;
    }

    cleanOldLogs();
    log('INFO', 'Logger', '日志系统初始化完成');
}

/**
 * 写入日志
 * @param {string} level - 日志级别
 * @param {string} module - 模块名称
 * @param {string} message - 日志消息
 * @returns {void}
 */
function log(level, module, message) {
    if (currentFileSize >= MAX_FILE_SIZE) {
        rotateLog();
    }

    var timestamp = new Date().toISOString();
    var logLine = '[' + timestamp + '] [' + level + '] [' + module + '] ' + message + '\n';

    if (logStream) {
        logStream.write(logLine);
        currentFileSize += Buffer.byteLength(logLine);
    }

    console.log(logLine.trim());
}

/**
 * 信息日志
 * @param {string} module - 模块名称
 * @param {string} message - 日志消息
 * @returns {void}
 */
function info(module, message) {
    log(LOG_LEVEL.INFO, module, message);
}

/**
 * 警告日志
 * @param {string} module - 模块名称
 * @param {string} message - 日志消息
 * @returns {void}
 */
function warn(module, message) {
    log(LOG_LEVEL.WARN, module, message);
}

/**
 * 错误日志
 * @param {string} module - 模块名称
 * @param {string} message - 日志消息
 * @returns {void}
 */
function error(module, message) {
    log(LOG_LEVEL.ERROR, module, message);
}

/**
 * 日志轮转
 * @returns {void}
 */
function rotateLog() {
    if (!logStream) return;

    logStream.end();

    for (var i = MAX_LOG_FILES - 1; i >= 1; i--) {
        var oldFile = path.join(LOG_DIR, 'app.log.' + i);
        var newFile = path.join(LOG_DIR, 'app.log.' + (i + 1));

        if (fs.existsSync(oldFile)) {
            if (i === MAX_LOG_FILES - 1) {
                fs.unlinkSync(oldFile);
            } else {
                fs.renameSync(oldFile, newFile);
            }
        }
    }

    var currentFile = path.join(LOG_DIR, 'app.log');
    var backupFile = path.join(LOG_DIR, 'app.log.1');
    if (fs.existsSync(currentFile)) {
        fs.renameSync(currentFile, backupFile);
    }

    logStream = fs.createWriteStream(currentFile, { flags: 'a' });
    currentFileSize = 0;
    log('INFO', 'Logger', '日志已轮转');
}

/**
 * 清理过期日志
 * @returns {void}
 */
function cleanOldLogs() {
    var files = fs.readdirSync(LOG_DIR);
    var now = Date.now();
    var maxAge = 7 * 24 * 60 * 60 * 1000;

    files.forEach(function(file) {
        if (file.startsWith('app.log')) {
            var filePath = path.join(LOG_DIR, file);
            var stats = fs.statSync(filePath);

            if (now - stats.mtime.getTime() > maxAge) {
                fs.unlinkSync(filePath);
                log('INFO', 'Logger', '已删除过期日志: ' + file);
            }
        }
    });
}

module.exports = {
    init: init,
    log: log,
    info: info,
    warn: warn,
    error: error,
    rotateLog: rotateLog
};
