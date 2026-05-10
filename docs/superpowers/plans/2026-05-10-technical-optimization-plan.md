# 第四阶段：技术优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement logging system, error monitoring, and code quality improvements with modular architecture.

**Architecture:** Create independent utility modules (logger.js, errorHandler.js) and integrate them into the application, then improve code quality across all modules.

**Tech Stack:** Node.js fs module, process event handlers, JSDoc comments, custom logging rotation.

---

## 文件结构规划

**新建文件（2个）：**
- `/workspace/utils/logger.js` - 日志系统模块
- `/workspace/utils/errorHandler.js` - 错误处理模块

**修改文件（7个）：**
- `/workspace/app.js` - 集成日志和错误处理
- `/workspace/database/db.js` - 代码质量改善
- `/workspace/database/roomManager.js` - 代码质量改善
- `/workspace/public/app/services/*.js` - 代码质量改善
- `/workspace/public/app/controllers/*.js` - 代码质量改善

**新建目录：**
- `/workspace/logs/` - 日志文件目录

---

## Task 1: 创建日志系统模块

**Files:**
- Create: `/workspace/utils/logger.js`

- [ ] **Step 1: 创建基础结构和配置**

```javascript
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
```

- [ ] **Step 2: 添加初始化函数**

```javascript
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
```

- [ ] **Step 3: 添加日志写入函数**

```javascript
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
    var logLine = `[${timestamp}] [${level}] [${module}] ${message}\n`;
    
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
 */
function info(module, message) {
    log(LOG_LEVEL.INFO, module, message);
}

/**
 * 警告日志
 * @param {string} module - 模块名称
 * @param {string} message - 日志消息
 */
function warn(module, message) {
    log(LOG_LEVEL.WARN, module, message);
}

/**
 * 错误日志
 * @param {string} module - 模块名称
 * @param {string} message - 日志消息
 */
function error(module, message) {
    log(LOG_LEVEL.ERROR, module, message);
}
```

- [ ] **Step 4: 添加日志轮转和清理函数**

```javascript
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
```

- [ ] **Step 5: 添加模块导出并提交**

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

```bash
cd /workspace
git add utils/logger.js
git commit -m "feat: add logger.js module for file logging"
```

---

## Task 2: 创建错误处理模块

**Files:**
- Create: `/workspace/utils/errorHandler.js`

- [ ] **Step 1: 创建基础结构和配置**

```javascript
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
```

- [ ] **Step 2: 添加初始化函数**

```javascript
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
```

- [ ] **Step 3: 添加错误处理函数**

```javascript
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
```

- [ ] **Step 4: 添加统计函数和模块导出**

```javascript
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
```

- [ ] **Step 5: 提交**

```bash
cd /workspace
git add utils/errorHandler.js
git commit -m "feat: add errorHandler.js module for error monitoring"
```

---

## Task 3: 集成日志和错误处理到 app.js

**Files:**
- Modify: `/workspace/app.js`

- [ ] **Step 1: 添加文件级注释和模块引入**

在 app.js 顶部添加：

```javascript
/**
 * @fileoverview ChatRoom 应用主入口
 * @module app
 * @description NodeJS 实时聊天室后端服务
 * @author Systenics Development Team
 * @version 1.0.0
 */

var express = require('express');
var app = express();
var http = require('http');
http.globalAgent.maxSockets = 100;
var bodyParser = require('body-parser');
var fs = require('fs');
var server = http.createServer(app);
var io = require('socket.io');
var ios = io.listen(server);
var formidable = require('formidable');
var util = require('util');
var path = require('path');

// 引入日志和错误处理模块
var logger = require('./utils/logger');
var errorHandler = require('./utils/errorHandler');
var db = require('./database/db');
var roomManager = require('./database/roomManager');
```

- [ ] **Step 2: 在服务器启动时初始化日志和错误处理**

在 `server.listen(8282)` 之前添加：

```javascript
// 初始化日志和错误处理系统
logger.init();
errorHandler.init();

logger.info('Server', 'ChatRoom 服务器启动');
```

- [ ] **Step 3: 在关键位置添加日志记录**

在各个 socket 事件中添加日志：

```javascript
// new user 事件
socket.on('new user', function(data, callback) {
    // ... 原有代码 ...
    logger.info('Auth', '用户 ' + data.username + ' 加入房间 ' + data.roomCode);
});

// send-message 事件
socket.on('send-message', function(data, callback) {
    // ... 原有代码 ...
    logger.info('Message', '用户 ' + socket.username + ' 发送消息到房间 ' + socket.roomCode);
});

// disconnect 事件
socket.on('disconnect', function() {
    // ... 原有代码 ...
    logger.info('Auth', '用户 ' + socket.username + ' 离开');
});

// kick-user 事件
socket.on('kick-user', function(data, callback) {
    // ... 原有代码 ...
    logger.info('Admin', '用户 ' + socket.username + ' 踢出 ' + data.targetUsername);
});

// mute-user 事件
socket.on('mute-user', function(data, callback) {
    // ... 原有代码 ...
    logger.info('Admin', '用户 ' + socket.username + ' 禁言 ' + data.targetUsername);
});
```

- [ ] **Step 4: 添加错误处理包装函数**

在文件末尾添加：

```javascript
/**
 * 安全执行回调
 * @param {Function} callback - 回调函数
 * @param {Object} data - 数据
 * @param {Error} err - 错误
 */
function safeCallback(callback, data, err) {
    try {
        if (typeof callback === 'function') {
            callback(data, err);
        }
    } catch (e) {
        logger.error('App', '回调执行失败: ' + e.message);
    }
}
```

- [ ] **Step 5: 提交**

```bash
cd /workspace
git add app.js
git commit -m "feat: integrate logger and errorHandler in app.js"
```

---

## Task 4: 改善 database/db.js 代码质量

**Files:**
- Modify: `/workspace/database/db.js`

- [ ] **Step 1: 添加文件级注释**

在文件顶部添加：

```javascript
/**
 * @fileoverview 数据库操作模块
 * @module database/db
 * @description SQLite 数据库操作，提供消息存储、查询和清理功能
 */

var sqlite3 = require('sqlite3').verbose();
var logger = require('../utils/logger');
```

- [ ] **Step 2: 添加 JSDoc 注释**

为关键函数添加 JSDoc：

```javascript
/**
 * 数据库文件路径
 * @type {string}
 */
var DB_PATH = './data/chatroom.db';

/**
 * 数据库连接
 * @type {sqlite3.Database}
 */
var db = null;

/**
 * 初始化数据库
 * @returns {Promise<void>}
 */
function initDatabase() {
    // ...
}

/**
 * 保存消息到数据库
 * @param {Object} message - 消息对象
 * @param {string} message.roomCode - 房间代码
 * @param {string} message.username - 用户名
 * @param {string} message.messageType - 消息类型
 * @param {string} message.messageContent - 消息内容
 * @returns {Promise<number>}
 */
function saveMessage(message) {
    // ...
}
```

- [ ] **Step 3: 提交**

```bash
cd /workspace
git add database/db.js
git commit -m "refactor: add JSDoc comments to database/db.js"
```

---

## Task 5: 改善 database/roomManager.js 代码质量

**Files:**
- Modify: `/workspace/database/roomManager.js`

- [ ] **Step 1: 添加文件级注释**

在文件顶部添加：

```javascript
/**
 * @fileoverview 房间管理模块
 * @module database/roomManager
 * @description 提供房间状态管理、用户踢出、禁言、敏感词过滤功能
 */
```

- [ ] **Step 2: 添加 JSDoc 注释**

为关键函数添加 JSDoc：

```javascript
/**
 * 房间状态
 * @type {Object}
 */
var roomStates = {};

/**
 * 添加房间创建者
 * @param {string} roomCode - 房间代码
 * @param {string} username - 用户名
 * @returns {boolean} 是否是新房间的创建者
 */
function addRoomCreator(roomCode, username) {
    // ...
}

/**
 * 判断是否是房间创建者
 * @param {string} roomCode - 房间代码
 * @param {string} username - 用户名
 * @returns {boolean}
 */
function isRoomCreator(roomCode, username) {
    // ...
}
```

- [ ] **Step 3: 提交**

```bash
cd /workspace
git add database/roomManager.js
git commit -m "refactor: add JSDoc comments to database/roomManager.js"
```

---

## Task 6: 改善前端 services 代码质量

**Files:**
- Modify: `/workspace/public/app/services/*.js`

- [ ] **Step 1: 为每个 service 添加文件级注释**

示例 - messageStatusService.js:

```javascript
/**
 * @fileoverview 消息状态服务
 * @module services/messageStatusService
 * @description 管理消息发送状态（发送中/已发送/失败）和重试逻辑
 */
```

示例 - typingStatusService.js:

```javascript
/**
 * @fileoverview 打字状态服务
 * @module services/typingStatusService
 * @description 管理打字状态显示和草稿自动保存功能
 */
```

示例 - offlineQueueService.js:

```javascript
/**
 * @fileoverview 离线消息队列服务
 * @module services/offlineQueueService
 * @description 管理离线消息队列，断网自动存储，重连自动发送
 */
```

示例 - roomManagementService.js:

```javascript
/**
 * @fileoverview 房间管理服务
 * @module services/roomManagementService
 * @description 提供踢出用户、禁言/解禁等管理功能
 */
```

- [ ] **Step 2: 为关键函数添加 JSDoc 注释**

示例：

```javascript
/**
 * 发送消息并追踪状态
 * @param {Object} messageData - 消息数据
 * @param {string} messageData.msg - 消息内容
 * @param {string} messageData.username - 用户名
 * @param {string} messageData.roomCode - 房间代码
 * @returns {Promise<Object>} 发送结果
 */
service.sendMessage = function(messageData) {
    // ...
};
```

- [ ] **Step 3: 提交**

```bash
cd /workspace
git add public/app/services/*.js
git commit -m "refactor: add JSDoc comments to frontend services"
```

---

## Task 7: 改善前端 controllers 代码质量

**Files:**
- Modify: `/workspace/public/app/controllers/*.js`

- [ ] **Step 1: 为每个 controller 添加文件级注释**

chatRoomController.js:

```javascript
/**
 * @fileoverview 聊天室控制器
 * @module controllers/chatRoomController
 * @description 管理聊天室的主要逻辑，包括消息收发、用户管理、引用回复等功能
 */
```

loginController.js:

```javascript
/**
 * @fileoverview 登录控制器
 * @module controllers/loginController
 * @description 管理用户登录流程和界面逻辑
 */
```

- [ ] **Step 2: 为关键函数添加 JSDoc 注释**

```javascript
/**
 * 发送消息
 * @param {boolean} IsImageMSG - 是否是图片消息
 * @returns {void}
 */
$scope.sendMsg = function(IsImageMSG) {
    // ...
};

/**
 * 开始回复引用
 * @param {Object} message - 被引用的消息
 * @returns {void}
 */
$scope.startReply = function(message) {
    // ...
};

/**
 * 选择提及用户
 * @param {Object} user - 被选择提及的用户
 * @returns {void}
 */
$scope.selectMentionUser = function(user) {
    // ...
};
```

- [ ] **Step 3: 提交**

```bash
cd /workspace
git add public/app/controllers/*.js
git commit -m "refactor: add JSDoc comments to frontend controllers"
```

---

## Task 8: 创建 logs 目录和最终测试

**Files:**
- Create: `/workspace/logs/.gitkeep`

- [ ] **Step 1: 创建 logs 目录和 .gitkeep 文件**

```bash
mkdir -p /workspace/logs
touch /workspace/logs/.gitkeep
```

- [ ] **Step 2: 更新 .gitignore**

确保 logs 目录被正确忽略：

```bash
# 确保 .gitignore 包含 logs 目录
echo "logs/*.log" >> /workspace/.gitignore
echo "logs/*.log.[0-9]*" >> /workspace/.gitignore
```

- [ ] **Step 3: 测试服务器**

```bash
cd /workspace
npm install
node app.js
```

预期：
- 服务器启动成功
- 日志系统初始化完成
- 无错误

- [ ] **Step 4: 验证日志功能**

```bash
# 检查日志文件是否创建
ls -la logs/
cat logs/app.log
```

- [ ] **Step 5: 提交**

```bash
cd /workspace
git add logs/.gitkeep .gitignore
git commit -m "feat: add logs directory and gitignore entries"
git add -A
git commit -m "feat: complete phase 4 technical optimization"
```

---

## 实施总结

### 已完成任务清单

| Task | 内容 | 状态 |
|------|------|------|
| Task 1 | 创建 logger.js 日志模块 | ☐ |
| Task 2 | 创建 errorHandler.js 错误处理模块 | ☐ |
| Task 3 | 集成日志和错误处理到 app.js | ☐ |
| Task 4 | 改善 database/db.js 代码质量 | ☐ |
| Task 5 | 改善 database/roomManager.js 代码质量 | ☐ |
| Task 6 | 改善前端 services 代码质量 | ☐ |
| Task 7 | 改善前端 controllers 代码质量 | ☐ |
| Task 8 | 创建 logs 目录和测试 | ☐ |

### 文件变更总结

**新建文件：**
- `/workspace/utils/logger.js`
- `/workspace/utils/errorHandler.js`
- `/workspace/logs/.gitkeep`

**修改文件：**
- `/workspace/app.js`
- `/workspace/database/db.js`
- `/workspace/database/roomManager.js`
- `/workspace/public/app/services/*.js`
- `/workspace/public/app/controllers/*.js`
- `/workspace/.gitignore`

### 功能实现清单

- ✅ D1 日志系统 - 文件日志、日志轮转
- ✅ D2 错误监控 - 全局异常捕获、错误日志
- ✅ D3 代码质量 - JSDoc 注释、代码优化
