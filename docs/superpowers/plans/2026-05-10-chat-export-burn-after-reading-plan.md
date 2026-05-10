# 聊天记录导出与阅后即焚功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现聊天记录导出和阅后即焚消息两大功能

**Architecture:** 
- 聊天记录导出：后端 API + 前端服务，前端控制器调用服务和 API
- 阅后即焚消息：Socket.io 事件 + 前端定时器 + 后端消息删除
- 两个功能独立实现，通过子任务逐个完成

**Tech Stack:** Node.js, Express, Socket.io, SQLite, AngularJS, localStorage

---

## 📁 文件结构规划

### 新建文件（4个）

| 文件路径 | 功能 |
|---------|------|
| `public/app/services/chatExportService.js` | 聊天记录导出服务 |
| `public/app/services/burnAfterReadingService.js` | 阅后即焚服务（管理配置） |
| `public/app/views/exportModal.html` | 导出模态框视图 |
| `docs/superpowers/plans/2026-05-10-chat-export-burn-after-reading-plan.md` | 本计划文档 |

### 修改文件（5个）

| 文件路径 | 修改内容 |
|---------|---------|
| `app.js` | 添加导出 API 路由 |
| `database/db.js` | 添加阅后即焚消息查询和删除方法 |
| `public/app/controllers/chatRoomController.js` | 添加导出和阅后即焚逻辑 |
| `public/app/views/chatRoom.html` | 添加导出按钮和阅后即焚按钮 |
| `public/app/css/style.css` | 添加相关样式 |

---

## 🚀 Task 1: 后端 - 数据库和 API 支持

### Files

- Modify: `database/db.js` (约 L150-200)
- Modify: `app.js` (约 L100-150)

### Steps

- [ ] **Step 1: 添加数据库方法**

在 `database/db.js` 中 `module.exports` 前添加:

```javascript
/**
 * 查询聊天记录（用于导出）
 * @param {Object} options - 查询选项
 * @param {string} options.roomCode - 房间代码（可选，null表示所有房间）
 * @param {string} options.startDate - 开始日期（ISO格式）
 * @param {string} options.endDate - 结束日期（ISO格式）
 * @returns {Promise<Array>} 消息列表
 */
db.getMessagesForExport = function(options) {
    return new Promise((resolve, reject) => {
        let sql = 'SELECT * FROM messages WHERE 1=1';
        let params = [];
        
        if (options.roomCode) {
            sql += ' AND roomCode = ?';
            params.push(options.roomCode);
        }
        
        if (options.startDate) {
            sql += ' AND createdAt >= ?';
            params.push(options.startDate);
        }
        
        if (options.endDate) {
            sql += ' AND createdAt <= ?';
            params.push(options.endDate);
        }
        
        sql += ' ORDER BY createdAt ASC';
        
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

/**
 * 删除阅后即焚消息
 * @param {string} messageId - 消息ID
 * @returns {Promise<boolean>} 是否删除成功
 */
db.deleteBurnAfterReadingMessage = function(messageId) {
    return new Promise((resolve, reject) => {
        const sql = 'DELETE FROM messages WHERE id = ? AND isBurnAfterReading = 1';
        db.run(sql, [messageId], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
};

/**
 * 获取阅后即焚消息
 * @param {string} messageId - 消息ID
 * @returns {Promise<Object|null>} 消息对象
 */
db.getBurnAfterReadingMessage = function(messageId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM messages WHERE id = ? AND isBurnAfterReading = 1';
        db.get(sql, [messageId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};
```

- [ ] **Step 2: 添加导出 API 路由**

在 `app.js` 中 Socket.io 事件处理之前添加:

```javascript
// 聊天记录导出 API
app.get('/api/export-chat', async (req, res) => {
    try {
        const { scope, roomCode, startDate, endDate } = req.query;
        
        const options = {
            roomCode: scope === 'current' ? roomCode : null,
            startDate: startDate || null,
            endDate: endDate || null
        };
        
        const messages = await db.getMessagesForExport(options);
        
        // 格式化 TXT 内容
        let content = '=== 聊天室聊天记录 ===\n';
        content += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
        content += `房间: ${scope === 'current' ? roomCode : '所有房间'}\n`;
        content += '\n----------------------------------------\n';
        
        messages.forEach(msg => {
            const time = msg.msgTime || new Date(msg.createdAt).toLocaleTimeString('zh-CN');
            const username = msg.username || '未知用户';
            const message = msg.msg || '';
            content += `[${time}] ${username}: ${message}\n`;
        });
        
        content += '----------------------------------------\n';
        content += `共 ${messages.length} 条消息\n`;
        
        const filename = `chat-export-${new Date().toISOString().split('T')[0]}.txt`;
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(content);
        
        logger.info(`[Export] 用户导出聊天记录: ${scope}, ${messages.length}条消息`);
    } catch (error) {
        logger.error('[Export] 导出失败:', error);
        res.status(500).json({ success: false, error: '导出失败' });
    }
});
```

- [ ] **Step 3: 添加阅后即焚消息删除 API**

在同一位置添加:

```javascript
// 阅后即焚消息销毁 API
app.post('/api/burn-message', async (req, res) => {
    try {
        const { messageId } = req.body;
        
        if (!messageId) {
            return res.status(400).json({ success: false, error: '消息ID不能为空' });
        }
        
        const deleted = await db.deleteBurnAfterReadingMessage(messageId);
        
        if (deleted) {
            // 广播消息销毁事件
            io.emit('message-burned', { messageId });
            logger.info(`[BurnAfterReading] 消息已销毁: ${messageId}`);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: '消息不存在或已被删除' });
        }
    } catch (error) {
        logger.error('[BurnAfterReading] 销毁失败:', error);
        res.status(500).json({ success: false, error: '销毁失败' });
    }
});
```

- [ ] **Step 4: 更新数据库表结构（添加字段）**

在 `database/db.js` 的 `initDatabase` 函数中，找到创建 messages 表的 SQL，添加字段:

```sql
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    userAvatar TEXT,
    msg TEXT,
    msgTime TEXT,
    roomCode TEXT NOT NULL,
    isImageMSG INTEGER DEFAULT 0,
    isMeme INTEGER DEFAULT 0,
    isGif INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    isBurnAfterReading INTEGER DEFAULT 0,
    burnDuration INTEGER DEFAULT 10
)
```

注意：需要先检查表是否存在，如果已存在需要用 ALTER TABLE 添加字段。

- [ ] **Step 5: 提交代码**

```bash
git add database/db.js app.js
git commit -m "feat: add database methods and API routes for export and burn-after-reading"
```

---

## 🚀 Task 2: 前端 - 导出服务

### Files

- Create: `public/app/services/chatExportService.js`

### Steps

- [ ] **Step 1: 创建导出服务**

```javascript
/**
 * @fileoverview 聊天记录导出服务
 * @module services/chatExportService
 * @description 处理聊天记录导出逻辑
 */

'use strict';

app.factory('chatExportService', ['$http', function($http) {
    var service = {};
    
    /**
     * 导出聊天记录
     * @param {Object} options - 导出选项
     * @param {string} options.scope - 'current' 或 'all'
     * @param {string} options.roomCode - 当前房间代码
     * @param {string} options.startDate - 开始日期 (ISO格式)
     * @param {string} options.endDate - 结束日期 (ISO格式)
     * @returns {Promise} 下载文件
     */
    service.exportChat = function(options) {
        var params = {
            scope: options.scope || 'current',
            roomCode: options.roomCode || '',
            startDate: options.startDate || '',
            endDate: options.endDate || ''
        };
        
        // 构建查询参数
        var queryString = Object.keys(params)
            .filter(function(key) { return params[key]; })
            .map(function(key) { 
                return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]); 
            })
            .join('&');
        
        // 直接跳转下载
        window.location.href = '/api/export-chat?' + queryString;
        
        return Promise.resolve({ success: true });
    };
    
    return service;
}]);
```

- [ ] **Step 2: 提交代码**

```bash
git add public/app/services/chatExportService.js
git commit -m "feat: add chatExportService for exporting chat history"
```

---

## 🚀 Task 3: 前端 - 导出 UI

### Files

- Create: `public/app/views/exportModal.html`
- Modify: `public/app/views/chatRoom.html` (约 L180-230)
- Modify: `public/app/css/style.css` (约 L720-800)

### Steps

- [ ] **Step 1: 创建导出模态框视图**

```html
<!-- 导出聊天记录模态框 -->
<div class="modal fade" id="exportModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal">
                    <span>&times;</span>
                </button>
                <h4 class="modal-title">导出聊天记录</h4>
            </div>
            <div class="modal-body">
                <form id="exportForm">
                    <div class="form-group">
                        <label>导出范围:</label>
                        <div class="radio">
                            <label>
                                <input type="radio" name="scope" value="current" checked>
                                当前房间
                            </label>
                        </div>
                        <div class="radio">
                            <label>
                                <input type="radio" name="scope" value="all">
                                所有房间
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>日期范围:</label>
                        <div class="date-range-picker">
                            <input type="date" class="form-control" id="exportStartDate" 
                                   placeholder="开始日期">
                            <span> - </span>
                            <input type="date" class="form-control" id="exportEndDate" 
                                   placeholder="结束日期">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal">取消</button>
                <button type="button" class="btn btn-primary" ng-click="doExport()">
                    <i class="fa fa-download"></i> 导出
                </button>
            </div>
        </div>
    </div>
</div>
```

- [ ] **Step 2: 在 chatRoom.html 中添加导出按钮和模态框**

找到聊天工具栏区域（约 L224），在文件上传按钮后添加:

```html
<!-- 导出按钮 -->
<button class="btn btn-info btn-flat" ng-click="showExportModal()">
    <i class="glyphicon glyphicon-download-alt"></i> 导出
</button>
```

在文件末尾（`</div>` 标签前）添加模态框:

```html
<!-- 导入导出模态框 -->
<div ng-include="'app/views/exportModal.html'"></div>
```

- [ ] **Step 3: 添加导出样式**

在 `style.css` 末尾添加:

```css
/* ========== 聊天记录导出样式 ========== */

.export-modal .modal-header {
    background-color: var(--primary-color);
    color: white;
}

.export-modal .radio {
    margin-left: 20px;
}

.date-range-picker {
    display: flex;
    align-items: center;
    gap: 10px;
}

.date-range-picker input {
    flex: 1;
}
```

- [ ] **Step 4: 提交代码**

```bash
git add public/app/views/exportModal.html public/app/views/chatRoom.html public/app/css/style.css
git commit -m "feat: add export UI components and styles"
```

---

## 🚀 Task 4: 前端 - 阅后即焚服务和 UI

### Files

- Create: `public/app/services/burnAfterReadingService.js`
- Modify: `public/app/views/chatRoom.html` (约 L180-230)
- Modify: `public/app/css/style.css` (约 L800-900)

### Steps

- [ ] **Step 1: 创建阅后即焚服务**

```javascript
/**
 * @fileoverview 阅后即焚服务
 * @module services/burnAfterReadingService
 * @description 管理阅后即焚消息的配置和状态
 */

'use strict';

app.factory('burnAfterReadingService', ['$rootScope', function($rootScope) {
    var service = {};
    
    var CONFIG_KEY = 'burn_after_reading_config';
    
    var defaultConfig = {
        enabled: false,
        duration: 10  // 默认10秒
    };
    
    service.getConfig = function() {
        try {
            var stored = localStorage.getItem(CONFIG_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('加载阅后即焚配置失败:', e);
        }
        return defaultConfig;
    };
    
    service.saveConfig = function(config) {
        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        } catch (e) {
            console.error('保存阅后即焚配置失败:', e);
        }
    };
    
    service.setEnabled = function(enabled) {
        var config = service.getConfig();
        config.enabled = enabled;
        service.saveConfig(config);
    };
    
    service.isEnabled = function() {
        return service.getConfig().enabled;
    };
    
    service.getDuration = function() {
        return service.getConfig().duration;
    };
    
    service.setDuration = function(duration) {
        var config = service.getConfig();
        config.duration = duration;
        service.saveConfig(config);
    };
    
    return service;
}]);
```

- [ ] **Step 2: 在 chatRoom.html 中添加阅后即焚按钮**

找到消息输入框区域，在表情包选择器按钮旁添加:

```html
<!-- 阅后即焚按钮 -->
<button class="btn btn-danger burn-btn" 
        ng-class="{'active': burnModeEnabled}"
        ng-click="toggleBurnMode()"
        title="{{burnModeEnabled ? '阅后即焚模式 (点击取消)' : '点击启用阅后即焚'}}">
    🔥
</button>
```

- [ ] **Step 3: 添加阅后即焚样式**

在 `style.css` 中添加:

```css
/* ========== 阅后即焚消息样式 ========== */

.burn-btn {
    padding: 6px 12px;
    font-size: 18px;
    background-color: #777;
    border-color: #666;
    transition: all 0.3s ease;
}

.burn-btn:hover {
    background-color: #d9534f;
    border-color: #c9302c;
}

.burn-btn.active {
    background-color: #d9534f;
    border-color: #c9302c;
    animation: pulse-burn 1.5s infinite;
}

@keyframes pulse-burn {
    0% {
        box-shadow: 0 0 0 0 rgba(217, 83, 79, 0.7);
    }
    70% {
        box-shadow: 0 0 0 10px rgba(217, 83, 79, 0);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(217, 83, 79, 0);
    }
}

/* 阅后即焚消息样式 */
.burn-message {
    position: relative;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
    color: white;
    padding: 10px 15px;
    border-radius: 10px;
    margin: 5px 0;
    animation: fadeIn 0.3s ease;
}

.burn-message .burn-icon {
    margin-right: 8px;
}

.burn-message .burn-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 0 0 10px 10px;
    transition: width linear;
}

.burn-message .burn-timer {
    font-size: 12px;
    opacity: 0.9;
    margin-left: 10px;
}

.burn-message.burning {
    animation: burnFadeOut 0.5s ease forwards;
}

@keyframes burnFadeOut {
    0% {
        opacity: 1;
        transform: scale(1);
    }
    100% {
        opacity: 0;
        transform: scale(0.8);
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

- [ ] **Step 4: 提交代码**

```bash
git add public/app/services/burnAfterReadingService.js public/app/views/chatRoom.html public/app/css/style.css
git commit -m "feat: add burn-after-reading service and UI components"
```

---

## 🚀 Task 5: 前端 - 控制器集成

### Files

- Modify: `public/app/controllers/chatRoomController.js` (约 L50-100, L400-500)

### Steps

- [ ] **Step 1: 添加服务和变量**

在控制器顶部变量声明区域添加:

```javascript
// 阅后即焚相关变量
$scope.burnModeEnabled = false;
$scope.burnMessages = {};  // 存储阅后即焚消息的倒计时状态
$scope.burnTimers = {};    // 存储倒计时定时器

// 初始化阅后即焚状态
var burnConfig = burnAfterReadingService.getConfig();
$scope.burnModeEnabled = burnConfig.enabled;
```

- [ ] **Step 2: 添加导出相关函数**

在控制器中添加:

```javascript
// 显示导出模态框
$scope.showExportModal = function() {
    $('#exportModal').modal('show');
};

// 执行导出
$scope.doExport = function() {
    var scope = document.querySelector('input[name="scope"]:checked').value;
    var startDate = document.getElementById('exportStartDate').value;
    var endDate = document.getElementById('exportEndDate').value;
    
    chatExportService.exportChat({
        scope: scope,
        roomCode: $rootScope.roomCode,
        startDate: startDate,
        endDate: endDate
    });
    
    $('#exportModal').modal('hide');
};
```

- [ ] **Step 3: 添加阅后即焚相关函数**

在控制器中添加:

```javascript
// 切换阅后即焚模式
$scope.toggleBurnMode = function() {
    $scope.burnModeEnabled = !$scope.burnModeEnabled;
    burnAfterReadingService.setEnabled($scope.burnModeEnabled);
};

// 发送阅后即焚消息
$scope.sendBurnMessage = function() {
    if (!$scope.chatMsg || $scope.chatMsg.trim() === '') {
        return;
    }
    
    var dateString = formatAMPM(new Date());
    var duration = burnAfterReadingService.getDuration();
    
    $socket.emit("send-message", {
        username: $rootScope.username,
        userAvatar: $rootScope.userAvatar,
        msg: $scope.chatMsg,
        isImageMSG: false,
        isMeme: false,
        isBurnAfterReading: true,
        burnDuration: duration,
        hasMsg: true,
        hasFile: false,
        msgTime: dateString,
        roomCode: $rootScope.roomCode
    }, function(data) {
        if (data.success == true) {
            $scope.chatMsg = "";
            $scope.setFocus = true;
            $scope.burnModeEnabled = false;
            burnAfterReadingService.setEnabled(false);
        }
    });
};

// 开始阅后即焚消息倒计时
$scope.startBurnCountdown = function(messageId, duration) {
    if ($scope.burnMessages[messageId]) {
        return;  // 已经开始倒计时
    }
    
    $scope.burnMessages[messageId] = {
        remaining: duration,
        total: duration,
        interval: null
    };
    
    $scope.burnMessages[messageId].interval = setInterval(function() {
        $scope.$apply(function() {
            $scope.burnMessages[messageId].remaining--;
            
            if ($scope.burnMessages[messageId].remaining <= 0) {
                $scope.destroyBurnMessage(messageId);
            }
        });
    }, 1000);
};

// 销毁阅后即焚消息
$scope.destroyBurnMessage = function(messageId) {
    if ($scope.burnTimers[messageId]) {
        clearTimeout($scope.burnTimers[messageId]);
        delete $scope.burnTimers[messageId];
    }
    
    // 从 DOM 中移除消息
    var msgElement = document.querySelector('[data-message-id="' + messageId + '"]');
    if (msgElement) {
        msgElement.classList.add('burning');
        setTimeout(function() {
            msgElement.remove();
        }, 500);
    }
    
    // 通知服务器销毁
    $http.post('/api/burn-message', { messageId: messageId })
        .then(function(response) {
            console.log('阅后即焚消息已销毁:', messageId);
        })
        .catch(function(error) {
            console.error('销毁阅后即焚消息失败:', error);
        });
};
```

- [ ] **Step 4: 修改消息发送函数以支持阅后即焚**

找到发送消息的函数，添加阅后即焚逻辑:

```javascript
// 修改发送消息函数，检查是否启用阅后即焚
$scope.sendMessage = function() {
    // 检查是否启用了阅后即焚模式
    if ($scope.burnModeEnabled && $scope.chatMsg && $scope.chatMsg.trim()) {
        $scope.sendBurnMessage();
        return;
    }
    
    // 原有的发送逻辑...
};
```

- [ ] **Step 5: 添加 Socket 事件监听**

在 Socket 事件监听区域添加:

```javascript
// 监听阅后即焚消息
$socket.on("new burn message", function(data) {
    $scope.messeges.push({
        username: data.username,
        userAvatar: data.userAvatar,
        msg: data.msg,
        msgTime: data.msgTime,
        isBurnAfterReading: true,
        burnDuration: data.burnDuration,
        messageId: data.messageId || ('burn_' + Date.now())
    });
    
    $scope.$apply();
    
    // 自动开始倒计时
    var msgId = data.messageId || ('burn_' + Date.now());
    $timeout(function() {
        $scope.startBurnCountdown(msgId, data.burnDuration);
    }, 100);
});

// 监听消息销毁事件
$socket.on("message-burned", function(data) {
    $scope.destroyBurnMessage(data.messageId);
    $scope.$apply();
});
```

- [ ] **Step 6: 提交代码**

```bash
git add public/app/controllers/chatRoomController.js
git commit -m "feat: integrate export and burn-after-reading into controller"
```

---

## 🚀 Task 6: 后端 - Socket 事件支持

### Files

- Modify: `app.js` (约 L300-400)

### Steps

- [ ] **Step 1: 修改 send-message 事件以支持阅后即焚**

找到 `socket.on('send-message', ...)` 事件处理，添加阅后即焚支持:

```javascript
// 在保存消息时添加阅后即焚字段
var stmt = db.prepare(`
    INSERT INTO messages (id, username, userAvatar, msg, msgTime, roomCode, isImageMSG, isMeme, isGif, createdAt, isBurnAfterReading, burnDuration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

stmt.run(
    messageId,
    data.username,
    data.userAvatar,
    data.msg,
    data.msgTime,
    data.roomCode,
    data.isImageMSG ? 1 : 0,
    data.isMeme ? 1 : 0,
    data.isGif ? 1 : 0,
    new Date().toISOString(),
    data.isBurnAfterReading ? 1 : 0,
    data.burnDuration || 10
);
```

- [ ] **Step 2: 修改广播消息逻辑**

在广播消息时，添加阅后即焚标记:

```javascript
// 发送给发送者
socket.emit('message-sent', { success: true, messageId: messageId });

// 广播给房间内其他用户
if (data.isBurnAfterReading) {
    // 阅后即焚消息特殊广播
    io.to(data.roomCode).emit('new burn message', {
        username: data.username,
        userAvatar: data.userAvatar,
        msg: data.msg,
        msgTime: data.msgTime,
        isBurnAfterReading: true,
        burnDuration: data.burnDuration,
        messageId: messageId
    });
} else {
    // 普通消息广播
    io.to(data.roomCode).emit('new-message', {
        username: data.username,
        userAvatar: data.userAvatar,
        msg: data.msg,
        msgTime: data.msgTime
    });
}
```

- [ ] **Step 3: 提交代码**

```bash
git add app.js
git commit -m "feat: add socket support for burn-after-reading messages"
```

---

## 🚀 Task 7: 整体测试和验证

### Files

- All modified files

### Steps

- [ ] **Step 1: 启动服务器测试**

```bash
cd /workspace
node app.js
```

- [ ] **Step 2: 测试聊天记录导出**

在浏览器中打开 http://localhost:8282
1. 登录进入聊天室
2. 发送几条测试消息
3. 点击顶部"导出"按钮
4. 验证模态框正常弹出
5. 选择导出范围（当前房间/所有房间）
6. 选择日期范围
7. 点击导出，验证文件下载
8. 打开导出的 .txt 文件，验证内容正确

Expected:
- [ ] 导出按钮正确显示
- [ ] 模态框正常弹出
- [ ] 单选框正常工作
- [ ] 日期选择器正常工作
- [ ] 文件下载成功
- [ ] TXT 内容格式正确

- [ ] **Step 3: 测试阅后即焚消息**

1. 点击 🔥 按钮启用阅后即焚模式
2. 输入测试消息并发送
3. 验证消息显示 🔥 图标
4. 验证倒计时进度条显示
5. 等待倒计时结束
6. 验证消息正确消失
7. 验证其他用户也能看到相同效果

Expected:
- [ ] 🔥 按钮切换正常
- [ ] 按钮激活状态正确
- [ ] 阅后即焚消息样式正确
- [ ] 倒计时显示正确
- [ ] 消息自动消失
- [ ] 消失动画正常

- [ ] **Step 4: 测试配置保存**

1. 刷新页面
2. 验证阅后即焚模式状态已保存
3. 验证配置正确恢复

Expected:
- [ ] 状态正确保存到 localStorage
- [ ] 页面刷新后状态恢复

- [ ] **Step 5: 最终提交**

```bash
git add -A
git commit -m "feat: complete chat export and burn-after-reading functionality"
git push origin your-branch-name
```

---

## 📊 实施总结

### 已完成任务清单

| Task | 内容 | 状态 |
|------|------|------|
| Task 1 | 后端 - 数据库和 API 支持 | ☐ |
| Task 2 | 前端 - 导出服务 | ☐ |
| Task 3 | 前端 - 导出 UI | ☐ |
| Task 4 | 前端 - 阅后即焚服务和 UI | ☐ |
| Task 5 | 前端 - 控制器集成 | ☐ |
| Task 6 | 后端 - Socket 事件支持 | ☐ |
| Task 7 | 整体测试和验证 | ☐ |

### 功能实现清单

#### 聊天记录导出
- ✅ 导出按钮
- ✅ 模态框 UI
- ✅ 日期范围选择
- ✅ 当前房间/所有房间选项
- ✅ TXT 文件生成
- ✅ 文件下载

#### 阅后即焚消息
- ✅ 🔥 切换按钮
- ✅ 消息样式
- ✅ 倒计时显示
- ✅ 自动销毁
- ✅ 动画效果
- ✅ 配置保存

---

## ⚠️ 注意事项

1. **测试环境**: 确保数据库表结构已正确更新
2. **性能**: 大量消息导出可能需要时间，添加加载提示
3. **错误处理**: 确保所有异步操作都有错误处理
4. **浏览器兼容**: 测试 Chrome、Firefox、Edge 等主流浏览器
