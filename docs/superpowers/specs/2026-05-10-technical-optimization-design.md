# 第四阶段：技术优化设计方案

**项目：** ChatRoom - NodeJS 实时聊天室

**阶段：** 第四阶段 - 技术优化（D）

**功能模块：**
- D1. 日志系统（文件日志 + 日志轮转）
- D2. 错误监控（简单错误日志记录）
- D3. 代码质量改善（全面代码审查和重构）

**作者：** Systenics Development Team

**创建日期：** 2026-05-10

**状态：** 待审核

---

## 一、需求概述

### 1.1 功能目标

**D1. 日志系统**
- 将日志写入文件（logs/app.log）
- 记录用户登录、消息发送、管理操作等
- 支持日志轮转（单文件最大 10MB）
- 保留最近 7 天的日志

**D2. 错误监控**
- 捕获未处理的错误和异常
- 记录到专门的错误日志文件（logs/error.log）
- 提供错误摘要统计

**D3. 代码质量改善**
- 统一代码风格和命名规范
- 添加 JSDoc 注释
- 优化代码结构，减少重复代码
- 添加必要的错误处理

### 1.2 非功能目标

- 模块化设计，职责单一
- 易于维护和扩展
- 性能开销小
- 符合 Node.js 最佳实践

---

## 二、技术架构

### 2.1 整体架构

采用**模块化架构**：

```
utils/
  ├── logger.js      # 日志系统模块
  ├── errorHandler.js # 错误处理模块
  └── constants.js    # 常量定义

logs/                 # 日志文件目录
  ├── app.log        # 应用日志
  ├── app.log.1      # 轮转日志
  └── error.log      # 错误日志

app.js (修改)         # 集成日志和错误处理
```

### 2.2 技术选择

| 组件 | 技术 | 说明 |
|------|------|------|
| 日志系统 | Node.js fs 模块 | 自定义日志系统，无需外部依赖 |
| 日志轮转 | 自定义实现 | 基于文件大小判断，简单可靠 |
| 错误处理 | Node.js process 事件 | 全局异常捕获 |
| 代码质量 | JSDoc + ESLint | 代码文档和风格检查 |

---

## 三、日志系统详细设计

### 3.1 logger.js (新建)

**文件位置：** `/workspace/utils/logger.js`

#### 3.1.1 模块结构

```javascript
/**
 * 日志系统模块
 * @module utils/logger
 */

var fs = require('fs');
var path = require('path');

// 配置
var LOG_DIR = path.join(__dirname, '../logs');
var MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
var MAX_LOG_FILES = 7;
var LOG_LEVEL = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
};

// 日志状态
var logStream = null;
var currentFileSize = 0;
```

#### 3.1.2 初始化函数

```javascript
/**
 * 初始化日志系统
 * 确保日志目录存在，打开日志文件
 */
function init() {
    // 确保日志目录存在
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    
    // 打开日志文件
    var logFile = path.join(LOG_DIR, 'app.log');
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    // 获取当前文件大小
    try {
        var stats = fs.statSync(logFile);
        currentFileSize = stats.size;
    } catch (e) {
        currentFileSize = 0;
    }
    
    // 执行日志清理
    cleanOldLogs();
    
    log('INFO', 'Logger', '日志系统初始化完成');
}
```

#### 3.1.3 日志写入函数

```javascript
/**
 * 写入日志
 * @param {string} level - 日志级别
 * @param {string} module - 模块名称
 * @param {string} message - 日志消息
 */
function log(level, module, message) {
    // 检查是否需要轮转
    if (currentFileSize >= MAX_FILE_SIZE) {
        rotateLog();
    }
    
    // 格式化时间
    var timestamp = new Date().toISOString();
    
    // 格式化日志内容
    var logLine = `[${timestamp}] [${level}] [${module}] ${message}\n`;
    
    // 写入日志
    if (logStream) {
        logStream.write(logLine);
        currentFileSize += Buffer.byteLength(logLine);
    }
    
    // 同时输出到控制台
    console.log(logLine.trim());
}

/**
 * 快捷方法：信息日志
 */
function info(module, message) {
    log(LOG_LEVEL.INFO, module, message);
}

/**
 * 快捷方法：警告日志
 */
function warn(module, message) {
    log(LOG_LEVEL.WARN, module, message);
}

/**
 * 快捷方法：错误日志
 */
function error(module, message) {
    log(LOG_LEVEL.ERROR, module, message);
}
```

#### 3.1.4 日志轮转函数

```javascript
/**
 * 日志轮转
 * 将当前日志文件重命名为带序号的备份文件
 */
function rotateLog() {
    if (!logStream) return;
    
    // 关闭当前流
    logStream.end();
    
    // 移动现有备份文件
    for (var i = MAX_LOG_FILES - 1; i >= 1; i--) {
        var oldFile = path.join(LOG_DIR, `app.log.${i}`);
        var newFile = path.join(LOG_DIR, `app.log.${i + 1}`);
        
        if (fs.existsSync(oldFile)) {
            if (i === MAX_LOG_FILES - 1) {
                // 删除最旧的备份
                fs.unlinkSync(oldFile);
            } else {
                // 移动文件
                fs.renameSync(oldFile, newFile);
            }
        }
    }
    
    // 重命名当前文件为 app.log.1
    var currentFile = path.join(LOG_DIR, 'app.log');
    var backupFile = path.join(LOG_DIR, 'app.log.1');
    if (fs.existsSync(currentFile)) {
        fs.renameSync(currentFile, backupFile);
    }
    
    // 重新打开日志文件
    logStream = fs.createWriteStream(currentFile, { flags: 'a' });
    currentFileSize = 0;
    
    log('INFO', 'Logger', '日志已轮转');
}

/**
 * 清理过期日志
 */
function cleanOldLogs() {
    var files = fs.readdirSync(LOG_DIR);
    var now = Date.now();
    var maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
    
    files.forEach(function(file) {
        if (file.startsWith('app.log')) {
            var filePath = path.join(LOG_DIR, file);
            var stats = fs.statSync(filePath);
            
            if (now - stats.mtime.getTime() > maxAge) {
                fs.unlinkSync(filePath);
                log('INFO', 'Logger', `已删除过期日志: ${file}`);
            }
        }
    });
}
```

#### 3.1.5 模块导出

```javascript
module.exports = {
    init: init,
    log: log,
    info: info,
    warn: warn,
    error: error,
    rotateLog: rotateLog
};
```

---

### 3.2 app.js 集成日志

**修改位置：** `/workspace/app.js`

```javascript
// 引入日志模块
var logger = require('./utils/logger');

// 在服务器启动时初始化日志
logger.init();

// 使用日志记录重要事件
logger.info('Server', '服务器启动在端口 8282');
logger.info('Auth', `用户 ${username} 登录`);
logger.info('Message', `用户 ${username} 发送消息到房间 ${roomCode}`);
logger.warn('Security', `检测到敏感词消息: ${username}`);
logger.error('Database', '数据库连接失败');
```

---

## 四、错误处理详细设计

### 4.1 errorHandler.js (新建)

**文件位置：** `/workspace/utils/errorHandler.js`

#### 4.1.1 模块结构

```javascript
/**
 * 错误处理模块
 * @module utils/errorHandler
 */

var fs = require('fs');
var path = require('path');
var logger = require('./logger');

// 配置
var ERROR_LOG_DIR = path.join(__dirname, '../logs');
var ERROR_LOG_FILE = path.join(ERROR_LOG_DIR, 'error.log');
var errorCount = 0;
var errorCountResetTime = Date.now();
var ERROR_THRESHOLD = 10; // 1分钟内超过10个错误告警
```

#### 4.1.2 初始化函数

```javascript
/**
 * 初始化错误处理系统
 */
function init() {
    // 确保错误日志目录存在
    if (!fs.existsSync(ERROR_LOG_DIR)) {
        fs.mkdirSync(ERROR_LOG_DIR, { recursive: true });
    }
    
    // 设置全局未捕获异常处理
    process.on('uncaughtException', function(err) {
        handleError('UncaughtException', err);
    });
    
    // 设置全局 Promise 拒绝处理
    process.on('unhandledRejection', function(reason, promise) {
        handleError('UnhandledRejection', new Error(reason));
    });
    
    logger.info('ErrorHandler', '错误处理系统初始化完成');
}
```

#### 4.1.3 错误处理函数

```javascript
/**
 * 处理错误
 * @param {string} type - 错误类型
 * @param {Error} error - 错误对象
 */
function handleError(type, error) {
    // 格式化错误时间
    var timestamp = new Date().toISOString();
    
    // 格式化错误信息
    var errorInfo = [
        `[${timestamp}] [${type}]`,
        `消息: ${error.message || 'Unknown error'}`,
        `堆栈: ${error.stack || 'No stack trace'}`,
        '---'
    ].join('\n');
    
    // 写入错误日志文件
    try {
        fs.appendFileSync(ERROR_LOG_FILE, errorInfo + '\n');
    } catch (e) {
        console.error('写入错误日志失败:', e);
    }
    
    // 错误计数
    errorCount++;
    checkErrorThreshold();
    
    // 同时使用日志系统记录
    logger.error('ErrorHandler', `${type}: ${error.message}`);
}

/**
 * 检查错误阈值
 */
function checkErrorThreshold() {
    var now = Date.now();
    var oneMinute = 60 * 1000;
    
    // 每分钟重置计数
    if (now - errorCountResetTime > oneMinute) {
        errorCount = 1;
        errorCountResetTime = now;
        return;
    }
    
    // 超过阈值告警
    if (errorCount > ERROR_THRESHOLD) {
        logger.warn('ErrorHandler', `错误频率过高: ${errorCount} 个错误/分钟`);
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
```

#### 4.1.4 模块导出

```javascript
module.exports = {
    init: init,
    handleError: handleError,
    getStats: getStats
};
```

#### 4.1.5 使用示例

```javascript
// 在 app.js 中
var errorHandler = require('./utils/errorHandler');
errorHandler.init();

// 在代码中使用
try {
    // 可能出错的代码
} catch (e) {
    errorHandler.handleError('CustomError', e);
}
```

---

## 五、代码质量改善详细设计

### 5.1 目标文件清单

| 文件 | 改善内容 |
|------|----------|
| app.js | 添加 JSDoc、错误处理、日志集成 |
| database/db.js | 添加 JSDoc、优化查询语句 |
| database/roomManager.js | 添加 JSDoc、优化代码结构 |
| public/app/services/*.js | 添加 JSDoc、统一命名 |
| public/app/controllers/*.js | 添加 JSDoc、代码优化 |

### 5.2 JSDoc 注释规范

#### 5.2.1 文件级注释

```javascript
/**
 * @fileoverview 应用主入口
 * @module app
 * @author Systenics Development Team
 * @version 1.0.0
 */
```

#### 5.2.2 函数注释

```javascript
/**
 * 发送消息到聊天室
 * @param {Object} socket - Socket.io 连接对象
 * @param {Object} data - 消息数据
 * @param {string} data.username - 用户名
 * @param {string} data.msg - 消息内容
 * @param {string} data.roomCode - 房间代码
 * @param {Function} callback - 回调函数
 * @returns {void}
 * @example
 * sendMessage(socket, { username: 'user1', msg: 'Hello', roomCode: 'room1' }, callback);
 */
function sendMessage(socket, data, callback) {
    // ...
}
```

#### 5.2.3 变量注释

```javascript
/** @type {Object} 在线用户列表 */
var nickname = [];

/** @type {Array} 用户房间映射 */
var userRooms = [];
```

### 5.3 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 变量 | 小驼峰 | `userName`, `roomCode` |
| 常量 | 全大写+下划线 | `MAX_FILE_SIZE`, `LOG_LEVEL` |
| 函数 | 小驼峰 | `initLogger()`, `handleError()` |
| 模块 | 小写+下划线 | `room_manager.js` |
| 私有函数 | 下划线开头 | `_privateFunction()` |

### 5.4 app.js 改善示例

#### 5.4.1 添加文件级注释

```javascript
/**
 * @fileoverview ChatRoom 应用主入口
 * @module app
 * @description NodeJS 实时聊天室后端服务，提供文本、图片、音频、文档的实时传输功能
 * @author Systenics Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */
```

#### 5.4.2 添加 Socket 事件注释

```javascript
/**
 * 处理新用户连接
 * @event socket#new-user
 * @param {Object} data - 用户数据
 * @param {string} data.username - 用户名
 * @param {string} data.userAvatar - 用户头像
 * @param {string} data.roomCode - 房间代码
 * @param {Function} callback - 回调函数
 */
socket.on('new user', function(data, callback) {
    // ...
});
```

#### 5.4.3 添加错误处理

```javascript
/**
 * 安全地执行回调函数
 * @param {Function} callback - 回调函数
 * @param {Object} data - 传递给回调的数据
 * @param {Error} [error] - 错误对象
 */
function safeCallback(callback, data, error) {
    try {
        if (typeof callback === 'function') {
            callback(error, data);
        }
    } catch (e) {
        logger.error('App', `回调执行失败: ${e.message}`);
        errorHandler.handleError('CallbackError', e);
    }
}
```

### 5.5 database/db.js 改善示例

```javascript
/**
 * @fileoverview 数据库操作模块
 * @module database/db
 * @description SQLite 数据库操作，提供消息存储和查询功能
 */

var sqlite3 = require('sqlite3').verbose();

/** @type {string} 数据库文件路径 */
var DB_PATH = './data/chatroom.db';

/** @type {sqlite3.Database} 数据库连接 */
var db = null;

/**
 * 初始化数据库
 * @returns {Promise<void>} 初始化完成的 Promise
 * @example
 * initDatabase().then(() => console.log('DB ready'));
 */
function initDatabase() {
    return new Promise(function(resolve, reject) {
        // ...
    });
}

/**
 * 保存消息到数据库
 * @param {Object} message - 消息对象
 * @param {string} message.roomCode - 房间代码
 * @param {string} message.username - 用户名
 * @param {string} message.userAvatar - 用户头像
 * @param {string} message.messageType - 消息类型
 * @param {string} message.messageContent - 消息内容
 * @param {string} [message.fileInfo] - 文件信息
 * @returns {Promise<number>} 新插入消息的 ID
 */
function saveMessage(message) {
    // ...
}
```

---

## 六、实施计划

### 6.1 任务分解

| 任务 | 内容 | 优先级 |
|------|------|--------|
| T1 | 创建 utils/logger.js 日志模块 | 高 |
| T2 | 创建 utils/errorHandler.js 错误处理模块 | 高 |
| T3 | 集成日志和错误处理到 app.js | 高 |
| T4 | 改善 database/db.js 代码质量 | 中 |
| T5 | 改善 database/roomManager.js 代码质量 | 中 |
| T6 | 改善 public/app/services/*.js 代码质量 | 中 |
| T7 | 改善 public/app/controllers/*.js 代码质量 | 中 |
| T8 | 创建 logs 目录和测试 | 低 |

### 6.2 文件修改清单

**新建文件（2个）：**
- `utils/logger.js`
- `utils/errorHandler.js`

**修改文件（6个）：**
- `app.js`
- `database/db.js`
- `database/roomManager.js`
- `public/app/services/*.js`
- `public/app/controllers/*.js`

---

## 七、测试计划

### 7.1 日志系统测试

| 测试项 | 测试内容 |
|--------|----------|
| 日志初始化 | 检查 logs 目录和 app.log 文件创建 |
| INFO 日志 | 检查日志内容和格式 |
| 日志轮转 | 触发日志轮转，检查文件备份 |
| 日志清理 | 检查过期日志是否被删除 |

### 7.2 错误处理测试

| 测试项 | 测试内容 |
|--------|----------|
| 未捕获异常 | 触发未捕获异常，检查 error.log |
| Promise 拒绝 | 触发 unhandled rejection，检查 error.log |
| 错误统计 | 检查错误计数是否正确 |

### 7.3 代码质量测试

| 测试项 | 测试内容 |
|--------|----------|
| JSDoc 完整性 | 检查关键函数是否都有注释 |
| 代码风格 | 检查命名规范是否统一 |
| 功能完整性 | 确保重构后功能不受影响 |

---

## 八、后续维护

### 8.1 日志查看

```bash
# 查看最新应用日志
tail -f logs/app.log

# 查看最新错误日志
tail -f logs/error.log

# 查看指定日期的日志
grep "2026-05-10" logs/app.log
```

### 8.2 日志配置

可以在 `utils/logger.js` 中修改以下配置：

```javascript
var MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB - 单文件大小
var MAX_LOG_FILES = 7;                  // 7个 - 保留文件数
var LOG_LEVEL = {                       // 日志级别
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
};
```

---

## 附录

### A. 日志格式说明

```
[ISO时间] [级别] [模块] 消息内容

示例：
[2026-05-10T10:30:00.123Z] [INFO] [Server] 服务器启动在端口 8282
[2026-05-10T10:30:15.456Z] [WARN] [Security] 检测到敏感词消息
[2026-05-10T10:30:30.789Z] [ERROR] [Database] 数据库连接失败
```

### B. 错误日志格式说明

```
[ISO时间] [错误类型]
消息: 错误消息
堆栈: 错误堆栈
---

示例：
[2026-05-10T10:30:00.123Z] [UncaughtException]
消息: Cannot read property 'xxx' of undefined
堆栈: TypeError: Cannot read property 'xxx' of undefined
    at Object.<anonymous> (/workspace/app.js:123:45)
---
```

### C. Node.js 最佳实践参考

- 使用 JSDoc 注释关键函数
- 使用有意义的变量命名
- 添加适当的错误处理
- 使用模块化设计
- 定期记录日志
