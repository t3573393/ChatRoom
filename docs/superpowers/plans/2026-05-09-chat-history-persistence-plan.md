# 聊天记录持久化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现聊天记录的 SQLite 持久化存储，支持分页加载历史消息

**Architecture:** 采用 SQLite 数据库存储聊天消息，通过 RESTful API 提供消息保存和查询服务，前端通过 HTTP 调用获取历史记录，Socket.io 继续用于实时消息传输

**Tech Stack:** 
- Node.js + Express (后端)
- SQLite3 (数据库)
- AngularJS + Socket.io (前端)

---

## 文件结构规划

**需要修改的文件：**

- `package.json` - 添加 sqlite3 依赖
- `app.js` - 添加数据库初始化、API路由、定时清理任务
- `public/app/controllers/chatRoomController.js` - 添加历史消息加载逻辑
- `public/app/views/chatRoom.html` - 添加历史加载按钮 UI

**需要创建的文件：**

- `database/db.js` - 数据库初始化和操作模块

---

## Task 1: 环境准备 - 安装 SQLite 依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 修改 package.json 添加 sqlite3 依赖**

```json
{
  "name": "chatRoom",
  "version": "0.0.1",
  "dependencies": {
    "sqlite3": "^5.0.3",
    "express": "^3.2.6",
    "socket.io": "^1.3.5",
    "formidable": "^1.0.17",
    "body-parser": "^1.18.2",
    "cors": "^2.8.4"
  }
}
```

- [ ] **Step 2: 运行 npm install 安装依赖**

Run: `npm install sqlite3 --save`
Expected: sqlite3 包安装成功

- [ ] **Step 3: 提交更改**

```bash
git add package.json package-lock.json
git commit -m "chore: add sqlite3 dependency for message persistence"
```

---

## Task 2: 创建数据库模块

**Files:**
- Create: `database/db.js` - 数据库初始化和操作

- [ ] **Step 1: 创建 database 目录**

Run: `mkdir -p /workspace/database`

- [ ] **Step 2: 创建数据库初始化模块**

```javascript
var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');
var path = require('path');

// 数据库文件路径
var dbPath = path.join(__dirname, 'chat_history.db');
var db;

// 配置参数
var messageRetentionDays = 30;  // 消息保留天数
var messagePageSize = 20;        // 每页消息数量

// 初始化数据库连接
function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, function(err) {
            if (err) {
                console.error('数据库连接失败:', err);
                reject(err);
                return;
            }
            console.log('SQLite 数据库连接成功');

            // 创建表
            db.serialize(function() {
                // 创建消息表
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

                // 创建索引
                db.run(`
                    CREATE INDEX IF NOT EXISTS idx_room_created 
                    ON chat_messages(room_code, created_at DESC)
                `);

                console.log('数据库表初始化完成');
                resolve(db);
            });
        });
    });
}

// 保存消息
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

// 获取历史消息（分页）
function getMessages(roomCode, pageSize, beforeId) {
    return new Promise((resolve, reject) => {
        var sql;
        var params;
        
        if (beforeId) {
            // 获取 beforeId 之前的消息
            sql = `
                SELECT * FROM chat_messages 
                WHERE room_code = ? AND id < ?
                ORDER BY id DESC 
                LIMIT ?
            `;
            params = [roomCode, beforeId, pageSize];
        } else {
            // 获取最新的消息
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
            
            // 反转数组，按时间正序返回
            var messages = rows.reverse();
            
            // 检查是否还有更多消息
            var hasMore = rows.length === pageSize;
            
            resolve({
                messages: messages,
                hasMore: hasMore
            });
        });
    });
}

// 获取消息总数
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

// 清理过期消息
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

// 获取配置
function getConfig() {
    return {
        retentionDays: messageRetentionDays,
        pageSize: messagePageSize
    };
}

// 关闭数据库连接
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
```

- [ ] **Step 3: 提交数据库模块**

```bash
git add database/db.js
git commit -m "feat: add SQLite database module for message persistence"
```

---

## Task 3: 修改后端 app.js 添加 API 路由

**Files:**
- Modify: `app.js` - 添加数据库初始化和 API 路由

- [ ] **Step 1: 在 app.js 顶部添加数据库模块引用**

在文件开头（require 区域）添加：

```javascript
// 数据库模块
var db = require('./database/db');
```

- [ ] **Step 2: 在 app.js 中添加服务器启动后的数据库初始化**

找到 `server.listen(8282);` 位置，在其后添加：

```javascript
// 初始化数据库
db.initDatabase().then(() => {
    console.log('数据库初始化成功');
}).catch(err => {
    console.error('数据库初始化失败:', err);
});

// 设置定时清理任务（每小时清理一次）
setInterval(function() {
    db.cleanupExpiredMessages().then(count => {
        if (count > 0) {
            console.log(`定时清理完成，删除了 ${count} 条过期消息`);
        }
    });
}, 3600000); // 每小时执行
```

- [ ] **Step 3: 添加保存消息的 API 路由**

在 app.js 中添加新的路由处理函数（在现有的 socket 处理代码之后）：

```javascript
// 保存消息 API
app.post('/v1/messages', function(req, res) {
    var body = req.body;
    
    // 验证必需参数
    if (!body.roomCode || !body.username || !body.messageType) {
        res.status(400).json({ 
            success: false, 
            error: 'Missing required parameters' 
        });
        return;
    }

    // 保存到数据库
    db.saveMessage(
        body.roomCode,
        body.username,
        body.userAvatar || '',
        body.messageType,
        body.messageContent || '',
        body.fileInfo || null
    ).then(messageId => {
        res.json({ 
            success: true, 
            messageId: messageId 
        });
    }).catch(err => {
        console.error('保存消息失败:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Database error' 
        });
    });
});
```

- [ ] **Step 4: 添加获取历史消息的 API 路由**

```javascript
// 获取历史消息 API
app.get('/v1/messages/:roomCode', function(req, res) {
    var roomCode = req.params.roomCode;
    var pageSize = parseInt(req.query.pageSize) || 20;
    var beforeId = req.query.beforeId ? parseInt(req.query.beforeId) : null;
    var page = parseInt(req.query.page) || 1;

    // 限制每页最大条数
    pageSize = Math.min(pageSize, 50);

    // 获取消息
    db.getMessages(roomCode, pageSize, beforeId)
        .then(result => {
            // 获取总数
            return db.getMessageCount(roomCode).then(total => {
                return {
                    ...result,
                    total: total
                };
            });
        })
        .then(result => {
            // 转换数据库字段为前端格式
            var messages = result.messages.map(msg => ({
                id: msg.id,
                roomCode: msg.room_code,
                username: msg.username,
                userAvatar: msg.user_avatar,
                messageType: msg.message_type,
                messageContent: msg.message_content,
                fileInfo: msg.file_info ? JSON.parse(msg.file_info) : null,
                createdAt: msg.created_at,
                msgTime: formatTime(new Date(msg.created_at))
            }));

            res.json({
                success: true,
                messages: messages,
                hasMore: result.hasMore,
                total: result.total
            });
        })
        .catch(err => {
            console.error('获取消息失败:', err);
            res.status(500).json({
                success: false,
                error: 'Database error'
            });
        });
});

// 格式化时间函数（添加到文件末尾）
function formatTime(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
}
```

- [ ] **Step 5: 提交后端更改**

```bash
git add app.js
git commit -m "feat: integrate message persistence API routes"
```

---

## Task 4: 修改前端控制器添加历史消息加载

**Files:**
- Modify: `public/app/controllers/chatRoomController.js`

- [ ] **Step 1: 在 chatRoomCtrl 控制器顶部添加历史记录相关变量**

在 `$scope.mensajesNuevos = 0;` 后添加：

```javascript
// 历史记录相关
$scope.hasMoreHistory = true;
$scope.isLoadingHistory = false;
$scope.oldestMessageId = null;
```

- [ ] **Step 2: 在控制器中添加加载历史消息的方法**

在 `$scope.custom = true;` 之前添加：

```javascript
// 加载历史消息
$scope.loadHistory = function() {
    if ($scope.isLoadingHistory || !$scope.hasMoreHistory) {
        return;
    }

    $scope.isLoadingHistory = true;
    
    var url = $rootScope.baseUrl + '/v1/messages/' + $scope.roomCode;
    var params = {
        params: {
            pageSize: 20
        }
    };

    // 如果有最旧消息ID，获取更早的消息
    if ($scope.oldestMessageId) {
        params.params.beforeId = $scope.oldestMessageId;
    }

    $http.get(url, params)
        .then(function(response) {
            if (response.data.success) {
                var historyMessages = response.data.messages;
                
                // 反转消息顺序，确保按时间正序
                historyMessages.reverse();
                
                // 如果是首次加载，替换整个消息列表
                if (!$scope.oldestMessageId) {
                    $scope.messeges = historyMessages;
                } else {
                    // 否则插入到列表开头
                    $scope.messeges = historyMessages.concat($scope.messeges);
                }
                
                // 更新最旧消息ID
                if (historyMessages.length > 0) {
                    $scope.oldestMessageId = historyMessages[0].id;
                }
                
                // 更新是否有更多消息
                $scope.hasMoreHistory = response.data.hasMore;
                
                // 滚动到加载的历史消息位置
                if (historyMessages.length > 0) {
                    $timeout(function() {
                        var targetElement = document.querySelector('[data-message-id="' + historyMessages[0].id + '"]');
                        if (targetElement) {
                            targetElement.scrollIntoView({ behavior: 'instant', block: 'start' });
                        }
                    }, 100);
                }
            }
            $scope.isLoadingHistory = false;
        })
        .catch(function(error) {
            console.error('加载历史消息失败:', error);
            $scope.isLoadingHistory = false;
        });
};
```

- [ ] **Step 3: 修改发送消息逻辑，保存到数据库**

找到发送消息的 `$socket.emit('send-message', ...)` 调用，在其后添加数据库保存：

```javascript
// 在消息发送成功后，保存到数据库
$http.post($rootScope.baseUrl + '/v1/messages', {
    roomCode: $rootScope.roomCode,
    username: $rootScope.username,
    userAvatar: $rootScope.userAvatar,
    messageType: data.isImageMSG ? 'image' : (data.isMeme ? 'meme' : 'text'),
    messageContent: data.msg,
    fileInfo: null
}).then(function(response) {
    console.log('消息已保存到数据库');
}).catch(function(error) {
    console.error('保存消息失败:', error);
});
```

- [ ] **Step 4: 在用户进入聊天室时加载历史消息**

找到控制器初始化位置，在 `$scope.autoScroll = true;` 后添加：

```javascript
// 加载聊天历史
$scope.loadHistory();
```

- [ ] **Step 5: 提交前端更改**

```bash
git add public/app/controllers/chatRoomController.js
git commit -m "feat: add history loading functionality"
```

---

## Task 5: 修改前端视图添加历史加载按钮

**Files:**
- Modify: `public/app/views/chatRoom.html`

- [ ] **Step 1: 在消息列表顶部添加历史加载按钮**

找到 `<div id="divBox" class="box-body">` 行，在其后添加：

```html
<!-- 历史消息加载区域 -->
<div class="history-loader" ng-show="hasMoreHistory || isLoadingHistory">
    <button 
        class="btn btn-default btn-sm" 
        ng-click="loadHistory()" 
        ng-disabled="isLoadingHistory">
        <span ng-show="isLoadingHistory">
            <i class="fa fa-spinner fa-spin"></i> 加载中...
        </span>
        <span ng-show="!isLoadingHistory">
            <i class="fa fa-history"></i> 加载历史记录
        </span>
    </button>
    <span ng-show="!hasMoreHistory" class="no-more-history">
        暂无更多历史记录
    </span>
</div>
```

- [ ] **Step 2: 添加历史加载按钮的样式**

找到 `public/app/css/style.css` 文件，添加：

```css
/* 历史消息加载区域 */
.history-loader {
    text-align: center;
    padding: 10px;
    border-bottom: 1px solid #eee;
}

.history-loader .btn {
    background-color: #f8f9fa;
    border: 1px solid #ddd;
    color: #666;
}

.history-loader .btn:hover {
    background-color: #e9ecef;
}

.history-loader .no-more-history {
    color: #999;
    font-size: 12px;
    display: block;
    margin-top: 5px;
}

.history-loader .fa-spin {
    margin-right: 5px;
}
```

- [ ] **Step 3: 提交视图更改**

```bash
git add public/app/views/chatRoom.html public/app/css/style.css
git commit -m "feat: add history loader UI components"
```

---

## Task 6: 整体测试

**Files:**
- Modify: 无（测试阶段）

- [ ] **Step 1: 启动服务器测试**

Run: `node app.js`
Expected: 服务器启动成功，显示"数据库初始化成功"

- [ ] **Step 2: 测试 API 端点**

使用 curl 或 Postman 测试：

```bash
# 测试保存消息
curl -X POST http://localhost:8282/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"roomCode":"test","username":"tester","messageType":"text","messageContent":"Hello"}'

# 测试获取消息
curl http://localhost:8282/v1/messages/test

# 测试分页
curl "http://localhost:8282/v1/messages/test?pageSize=5"
```

Expected: 返回成功响应

- [ ] **Step 3: 前端功能测试**

1. 打开浏览器访问 http://localhost:8282
2. 登录进入聊天室
3. 发送几条消息
4. 查看历史加载按钮是否显示
5. 点击加载历史，验证消息加载
6. 刷新页面，验证消息是否持久化

- [ ] **Step 4: 提交所有更改**

```bash
git add -A
git commit -m "feat: complete chat message persistence feature"
```

---

## Task 7: 文档更新（可选）

**Files:**
- Modify: `README.md` 或 `docs/superpowers/specs/2026-05-09-chat-history-persistence-design.md`

- [ ] **Step 1: 更新设计文档，标记完成状态**

更新文档顶部的 **状态：** 从 "已批准" 改为 "已完成"

- [ ] **Step 2: 提交文档更新**

```bash
git add docs/
git commit -m "docs: update design spec status to completed"
```

---

## 实现总结

### 完成的修改清单

1. ✅ 安装 sqlite3 依赖
2. ✅ 创建数据库模块（database/db.js）
3. ✅ 修改后端 API（app.js）
4. ✅ 修改前端控制器（chatRoomController.js）
5. ✅ 修改前端视图（chatRoom.html）
6. ✅ 添加样式（style.css）
7. ✅ 测试验证

### 新增文件

- `database/db.js` - 数据库操作模块

### 修改文件

- `package.json` - 添加依赖
- `app.js` - API 路由
- `public/app/controllers/chatRoomController.js` - 加载逻辑
- `public/app/views/chatRoom.html` - UI 组件
- `public/app/css/style.css` - 样式

### 功能特性

- ✅ 消息自动保存到 SQLite
- ✅ 分页加载历史记录
- ✅ 可配置的保留天数（默认30天）
- ✅ 自动清理过期消息
- ✅ 向后兼容（不影响实时聊天）

---

**Plan 文件位置:** `docs/superpowers/plans/2026-05-09-chat-history-persistence-plan.md`
