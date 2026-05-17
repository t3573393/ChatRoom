/**
 * @fileoverview 错误处理模块
 * @module utils/errorHandler
 * @description 提供全局错误捕获、错误日志记录、错误统计功能
 */

var fs = require('fs');
var path = require('path');
var logger = require('./logger');

// 配置
var ERROR_LOG_DIR = path.join(__dirname, '../logs');
var ERROR_LOG_FILE = path.join(ERROR_LOG_DIR, 'error.log');
var errorCount = 0;
var errorCountResetTime = Date.now();
var ERROR_THRESHOLD = 10;

/**
 * 初始化错误处理系统
 * @returns {void}
 */
function init() {
    if (!fs.existsSync(ERROR_LOG_DIR)) {
        fs.mkdirSync(ERROR_LOG_DIR, { recursive: true });
    }

    process.on('uncaughtException', function(err) {
        handleError('UncaughtException', err);
    });

    process.on('unhandledRejection', function(reason, promise) {
        handleError('UnhandledRejection', new Error(reason));
    });

    logger.info('ErrorHandler', '错误处理系统初始化完成');
}

/**
 * 处理错误
 * @param {string} type - 错误类型
 * @param {Error} error - 错误对象
 * @returns {void}
 */
function handleError(type, error) {
    var timestamp = new Date().toISOString();

    var errorInfo = [
        '[' + timestamp + '] [' + type + ']',
        '消息: ' + (error.message || 'Unknown error'),
        '堆栈: ' + (error.stack || 'No stack trace'),
        '错误对象: ' + JSON.stringify(error, Object.getOwnPropertyNames(error)),
        '---'
    ].join('\n');

    try {
        fs.appendFileSync(ERROR_LOG_FILE, errorInfo + '\n');
    } catch (e) {
        console.error('写入错误日志失败:', e);
    }

    errorCount++;
    checkErrorThreshold();
    logger.error('ErrorHandler', type + ': ' + error.message);
}

/**
 * 检查错误阈值
 * @returns {void}
 */
function checkErrorThreshold() {
    var now = Date.now();
    var oneMinute = 60 * 1000;

    if (now - errorCountResetTime > oneMinute) {
        errorCount = 1;
        errorCountResetTime = now;
        return;
    }

    if (errorCount > ERROR_THRESHOLD) {
        logger.warn('ErrorHandler', '错误频率过高: ' + errorCount + ' 个错误/分钟');
    }
}

/**
 * 获取错误统计
 * @returns {Object} 错误统计信息
 */
function getStats() {
    return {
        totalErrors: errorCount,
        lastReset: new Date(errorCountResetTime).toISOString(),
        logFile: ERROR_LOG_FILE
    };
}

module.exports = {
    init: init,
    handleError: handleError,
    getStats: getStats
};
