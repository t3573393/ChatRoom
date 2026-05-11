# 消息编辑与撤回功能实现计划

**版本**: v1.0
**日期**: 2026-05-11
**功能模块**: 消息编辑与撤回
**依赖文档**: 2026-05-11-chatroom-feature-optimization-design.md

---

## 概述

本计划详细描述消息编辑与撤回功能的具体实现步骤，包括数据库变更、后端 API、Socket 事件处理和前端 UI 实现。

### 功能需求

- 允许用户编辑自己发送的 5 分钟内的消息
- 允许用户撤回自己发送的 5 分钟内的消息
- 编辑/撤回操作实时同步给房间内所有用户
- 被撤回的消息显示撤回提示
- 被编辑的消息显示"已编辑"标识

---

## 阶段一：数据库变更

### 任务 1.1: 添加数据库字段和表

**文件路径**: `database/db.js`

**变更内容**:

```javascript
// 在 initDatabase 函数中添加以下迁移逻辑

async runMigrations() {
    const migrations = [
        {
            name: 'add_message_status',
            sql: 'ALTER TABLE messages ADD COLUMN status TEXT DEFAULT \'normal\''
        },
        {
            name: 'create_edit_history',
            sql: `CREATE TABLE IF NOT EXISTS message_edit_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL,
                old_content TEXT NOT NULL,
                edited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (message_id) REFERENCES messages(id)
            )`
        },
        {
            name: 'create_recalled_messages',
            sql: `CREATE TABLE IF NOT EXISTS recalled_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_message_id INTEGER NOT NULL,
                username TEXT NOT NULL,
                original_content TEXT NOT NULL,
                room_code TEXT,
                recalled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (original_message_id) REFERENCES messages(id)
            )`
        }
    ];

    for (const migration of migrations) {
        try {
            await db.run(migration.sql);
            console.log(`迁移 ${migration.name} 执行成功`);
        } catch (err) {
            // 忽略已存在的错误
            if (!err.message.includes('duplicate column') && 
                !err.message.includes('already exists')) {
                console.error(`迁移 ${migration.name} 失败:`, err.message);
            }
        }
    }
}
```

**预期产出**: 数据库迁移函数

---

### 任务 1.2: 添加编辑相关数据库方法

**文件路径**: `database/db.js`

**新增方法**:

```javascript
/**
 * 获取可编辑的消息
 * @param {number} messageId - 消息ID
 * @param {string} username - 用户名
 * @param {number} timeLimit - 时间限制（毫秒），默认5分钟
 * @returns {Promise<Object|null>} 消息对象或null
 */
async getEditableMessage(messageId, username, timeLimit = 5 * 60 * 1000) {
    const sql = `
        SELECT id, username, message_content, room_code, created_at, status
        FROM messages
        WHERE id = ? AND username = ? AND status = 'normal'
    `;
    
    const message = await db.get(sql, [messageId, username]);
    
    if (!message) {
        return null;
    }
    
    const createdAt = new Date(message.created_at);
    const now = new Date();
    const elapsed = now - createdAt;
    
    if (elapsed > timeLimit) {
        return { ...message, expired: true };
    }
    
    return { ...message, expired: false };
}

/**
 * 编辑消息
 * @param {number} messageId - 消息ID
 * @param {string} newContent - 新内容
 * @returns {Promise<boolean>} 是否成功
 */
async editMessage(messageId, newContent) {
    const sql = `
        UPDATE messages
        SET message_content = ?, status = 'edited'
        WHERE id = ?
    `;
    
    const result = await db.run(sql, [newContent, messageId]);
    return result.changes > 0;
}

/**
 * 保存编辑历史
 * @param {number} messageId - 消息ID
 * @param {string} oldContent - 旧内容
 * @returns {Promise<number>} 历史记录ID
 */
async saveEditHistory(messageId, oldContent) {
    const sql = `
        INSERT INTO message_edit_history (message_id, old_content)
        VALUES (?, ?)
    `;
    
    const result = await db.run(sql, [messageId, oldContent]);
    return result.lastInsertRowid;
}

/**
 * 撤回消息
 * @param {number} messageId - 消息ID
 * @param {string} username - 用户名
 * @returns {Promise<Object>} 撤回结果
 */
async recallMessage(messageId, username) {
    // 获取原消息
    const getSql = `
        SELECT id, username, message_content, room_code
        FROM messages
        WHERE id = ? AND username = ? AND status = 'normal'
    `;
    
    const message = await db.get(getSql, [messageId, username]);
    
    if (!message) {
        return { success: false, error: '消息不存在或无权撤回' };
    }
    
    const createdAt = new Date(message.created_at);
    const now = new Date();
    const elapsed = now - createdAt;
    const timeLimit = 5 * 60 * 1000; // 5分钟
    
    if (elapsed > timeLimit) {
        return { success: false, error: '消息已超过撤回时限' };
    }
    
    // 保存到已撤回消息表
    const saveRecallSql = `
        INSERT INTO recalled_messages (original_message_id, username, original_content, room_code)
        VALUES (?, ?, ?, ?)
    `;
    await db.run(saveRecallSql, [messageId, username, message.message_content, message.room_code]);
    
    // 更新消息状态
    const updateSql = `UPDATE messages SET status = 'recalled' WHERE id = ?`;
    await db.run(updateSql, [messageId]);
    
    return { 
        success: true, 
        message: message 
    };
}

/**
 * 获取撤回消息的历史内容
 * @param {number} originalMessageId - 原消息ID
 * @returns {Promise<string|null>} 原始内容
 */
async getRecalledMessageContent(originalMessageId) {
    const sql = `
        SELECT original_content FROM recalled_messages
        WHERE original_message_id = ?
    `;
    
    const result = await db.get(sql, [originalMessageId]);
    return result ? result.original_content : null;
}
```

**预期产出**: 消息编辑和撤回相关的数据库方法

---

## 阶段二：后端 API 实现

### 任务 2.1: 添加编辑 API

**文件路径**: `app.js`

**变更内容**:

```javascript
/**
 * 编辑消息 API
 * POST /api/edit-message
 */
app.post('/api/edit-message', async function(req, res) {
    try {
        const { messageId, newContent } = req.body;
        
        // 验证参数
        if (!messageId) {
            return res.status(400).json({
                success: false,
                error: '消息ID不能为空',
                errorCode: 2001
            });
        }
        
        if (!newContent || newContent.trim() === '') {
            return res.status(400).json({
                success: false,
                error: '消息内容不能为空',
                errorCode: 2001
            });
        }
        
        // 获取消息并验证
        const message = await db.getEditableMessage(messageId, null);
        
        if (!message) {
            return res.status(404).json({
                success: false,
                error: '消息不存在',
                errorCode: 2001
            });
        }
        
        if (message.username !== req.body.username && !req.body.username) {
            return res.status(403).json({
                success: false,
                error: '无权编辑此消息',
                errorCode: 2002
            });
        }
        
        if (message.expired) {
            return res.status(403).json({
                success: false,
                error: '消息已超过编辑时限（5分钟）',
                errorCode: 2003
            });
        }
        
        if (message.status !== 'normal') {
            return res.status(400).json({
                success: false,
                error: '消息已被处理，无法编辑',
                errorCode: 2004
            });
        }
        
        // 保存编辑历史
        await db.saveEditHistory(messageId, message.message_content);
        
        // 更新消息
        await db.editMessage(messageId, newContent.trim());
        
        const editedAt = new Date().toISOString();
        
        // 通过 Socket 广播给房间内用户
        io.to(message.room_code).emit('message-edited', {
            messageId: messageId,
            newContent: newContent.trim(),
            editedAt: editedAt,
            editor: message.username
        });
        
        logger.info('[Edit]', `用户 ${message.username} 编辑了消息 ${messageId}`);
        
        res.json({
            success: true,
            messageId: messageId,
            editedAt: editedAt
        });
        
    } catch (error) {
        logger.error('[Edit]', '编辑消息失败:', error);
        res.status(500).json({
            success: false,
            error: '编辑失败，请稍后重试'
        });
    }
});

/**
 * 撤回消息 API
 * POST /api/recall-message
 */
app.post('/api/recall-message', async function(req, res) {
    try {
        const { messageId, username } = req.body;
        
        // 验证参数
        if (!messageId) {
            return res.status(400).json({
                success: false,
                error: '消息ID不能为空',
                errorCode: 2005
            });
        }
        
        if (!username) {
            return res.status(400).json({
                success: false,
                error: '用户名不能为空',
                errorCode: 2005
            });
        }
        
        // 执行撤回
        const result = await db.recallMessage(messageId, username);
        
        if (!result.success) {
            const errorCode = result.error.includes('时限') ? 2006 : 2005;
            return res.status(400).json({
                success: false,
                error: result.error,
                errorCode: errorCode
            });
        }
        
        const recallTime = new Date().toISOString();
        
        // 通过 Socket 广播给房间内用户
        io.to(result.message.room_code).emit('message-recalled', {
            messageId: messageId,
            recaller: username,
            recallTime: recallTime,
            originalContent: result.message.message_content
        });
        
        logger.info('[Recall]', `用户 ${username} 撤回了消息 ${messageId}`);
        
        res.json({
            success: true,
            messageId: messageId,
            recallTime: recallTime
        });
        
    } catch (error) {
        logger.error('[Recall]', '撤回消息失败:', error);
        res.status(500).json({
            success: false,
            error: '撤回失败，请稍后重试'
        });
    }
});
```

**预期产出**: 编辑和撤回 API 路由处理

---

### 任务 2.2: 添加 Socket 事件处理

**文件路径**: `app.js`

**在现有 Socket 处理部分添加**:

```javascript
// 在 socket.on('connection') 内添加以下事件处理

// 编辑消息 Socket 事件
socket.on('edit-message', async function(data, callback) {
    try {
        const { messageId, newContent } = data;
        
        if (!socket.username || !socket.roomCode) {
            callback({ success: false, error: '参数错误' });
            return;
        }
        
        // 验证消息属于当前用户
        const message = await db.getEditableMessage(messageId, socket.username);
        
        if (!message) {
            callback({ success: false, error: '消息不存在或无权编辑' });
            return;
        }
        
        if (message.expired) {
            callback({ success: false, error: '消息已超过编辑时限（5分钟）' });
            return;
        }
        
        if (message.room_code !== socket.roomCode) {
            callback({ success: false, error: '消息不在当前房间' });
            return;
        }
        
        // 保存编辑历史
        await db.saveEditHistory(messageId, message.message_content);
        
        // 更新消息
        await db.editMessage(messageId, newContent);
        
        const editedAt = new Date().toISOString();
        
        // 广播给房间内所有用户（包括发送者）
        ios.sockets.in(socket.roomCode).emit('message-edited', {
            messageId: messageId,
            newContent: newContent,
            editedAt: editedAt,
            editor: socket.username
        });
        
        callback({ success: true, editedAt: editedAt });
        
    } catch (error) {
        logger.error('[Socket:edit-message]', '编辑消息失败:', error);
        callback({ success: false, error: '编辑失败' });
    }
});

// 撤回消息 Socket 事件
socket.on('recall-message', async function(data, callback) {
    try {
        const { messageId } = data;
        
        if (!socket.username || !socket.roomCode) {
            callback({ success: false, error: '参数错误' });
            return;
        }
        
        // 执行撤回
        const result = await db.recallMessage(messageId, socket.username);
        
        if (!result.success) {
            callback({ success: false, error: result.error });
            return;
        }
        
        if (result.message.room_code !== socket.roomCode) {
            callback({ success: false, error: '消息不在当前房间' });
            return;
        }
        
        const recallTime = new Date().toISOString();
        
        // 广播给房间内所有用户（包括发送者）
        ios.sockets.in(socket.roomCode).emit('message-recalled', {
            messageId: messageId,
            recaller: socket.username,
            recallTime: recallTime,
            originalContent: result.message.message_content
        });
        
        callback({ success: true, recallTime: recallTime });
        
    } catch (error) {
        logger.error('[Socket:recall-message]', '撤回消息失败:', error);
        callback({ success: false, error: '撤回失败' });
    }
});
```

**预期产出**: Socket 事件处理代码

---

## 阶段三：前端服务

### 任务 3.1: 创建消息编辑服务

**文件路径**: `public/app/services/messageEditService.js`

**代码模板**:

```javascript
/**
 * @fileoverview 消息编辑服务
 * @module services/messageEditService
 * @description 管理消息编辑和撤回功能
 */

angular.module('app')
.service('messageEditService', ['$http', '$rootScope', '$socket', function($http, $rootScope, $socket) {
    var EDIT_TIME_LIMIT = 5 * 60 * 1000; // 5分钟（毫秒）

    /**
     * 检查消息是否可编辑
     * @param {Object} message - 消息对象
     * @returns {boolean} 是否可编辑
     */
    this.canEdit = function(message) {
        if (!message) return false;
        
        // 检查是否是发送者
        var isOwner = message.username === $rootScope.username;
        if (!isOwner) return false;
        
        // 检查消息状态
        if (message.status && message.status !== 'normal') {
            return false;
        }
        
        // 检查时间限制
        var createdAt = new Date(message.createdAt || message.created_at);
        if (isNaN(createdAt.getTime())) return false;
        
        var elapsed = Date.now() - createdAt.getTime();
        return elapsed < EDIT_TIME_LIMIT;
    };

    /**
     * 检查消息是否可撤回
     * @param {Object} message - 消息对象
     * @returns {boolean} 是否可撤回
     */
    this.canRecall = function(message) {
        return this.canEdit(message);
    };

    /**
     * 获取剩余可编辑/撤回时间
     * @param {Object} message - 消息对象
     * @returns {Object} 时间信息 { remaining: 毫秒, text: 显示文本, expired: 是否超时 }
     */
    this.getTimeRemaining = function(message) {
        var createdAt = new Date(message.createdAt || message.created_at);
        var elapsed = Date.now() - createdAt.getTime();
        var remaining = EDIT_TIME_LIMIT - elapsed;
        
        if (remaining <= 0) {
            return { remaining: 0, text: '已超时', expired: true };
        }
        
        var minutes = Math.floor(remaining / 60000);
        var seconds = Math.floor((remaining % 60000) / 1000);
        
        return {
            remaining: remaining,
            text: minutes + '分' + seconds + '秒',
            expired: false
        };
    };

    /**
     * 通过 HTTP API 编辑消息
     * @param {number} messageId - 消息ID
     * @param {string} newContent - 新内容
     * @returns {Promise<Object>} 结果
     */
    this.editMessageApi = function(messageId, newContent) {
        return $http.post($rootScope.baseUrl + '/api/edit-message', {
            messageId: messageId,
            newContent: newContent
        }).then(function(response) {
            return response.data;
        }).catch(function(error) {
            console.error('编辑消息失败:', error);
            return {
                success: false,
                error: error.data?.error || '编辑失败'
            };
        });
    };

    /**
     * 通过 HTTP API 撤回消息
     * @param {number} messageId - 消息ID
     * @returns {Promise<Object>} 结果
     */
    this.recallMessageApi = function(messageId) {
        return $http.post($rootScope.baseUrl + '/api/recall-message', {
            messageId: messageId
        }).then(function(response) {
            return response.data;
        }).catch(function(error) {
            console.error('撤回消息失败:', error);
            return {
                success: false,
                error: error.data?.error || '撤回失败'
            };
        });
    };

    /**
     * 通过 Socket 编辑消息
     * @param {number} messageId - 消息ID
     * @param {string} newContent - 新内容
     * @returns {Promise<Object>} 结果
     */
    this.editMessageSocket = function(messageId, newContent) {
        return new Promise(function(resolve, reject) {
            $socket.emit('edit-message', {
                messageId: messageId,
                newContent: newContent
            }, function(response) {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(response);
                }
            });
        });
    };

    /**
     * 通过 Socket 撤回消息
     * @param {number} messageId - 消息ID
     * @returns {Promise<Object>} 结果
     */
    this.recallMessageSocket = function(messageId) {
        return new Promise(function(resolve, reject) {
            $socket.emit('recall-message', {
                messageId: messageId
            }, function(response) {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(response);
                }
            });
        });
    };

    /**
     * 注册 Socket 事件监听
     * @param {Object} $scope - Angular scope
     */
    this.registerEventListeners = function($scope) {
        // 监听消息被编辑事件
        $socket.on('message-edited', function(data) {
            $scope.$broadcast('message-edited', data);
        });

        // 监听消息被撤回事件
        $socket.on('message-recalled', function(data) {
            $scope.$broadcast('message-recalled', data);
        });
    };
}]);
```

**预期产出**: 消息编辑服务 JS 文件

---

## 阶段四：前端集成

### 任务 4.1: 修改 chatRoomController.js

**文件路径**: `public/app/controllers/chatRoomController.js`

**变更内容**:

1. 引入 messageEditService 依赖
2. 添加编辑/撤回相关变量和函数

**需要添加的代码段**:

```javascript
// 在控制器参数中添加 messageEditService
.controller('chatRoomCtrl', function ($scope, $rootScope, $socket, $location, $http, $window,
    Upload, $timeout, sendImageService, $translate, $sce, roomManagementService, gifService,
    burnAfterReadingService, chatExportService, chatHistoryCacheService, themeService, 
    searchService, messageEditService) {

    // ========== 消息编辑/撤回功能 ==========
    $scope.editingMessage = null;
    $scope.editingContent = '';
    $scope.editTimeRemaining = '';
    $scope.showEditModal = false;
    $scope.recallingMessageId = null;

    // 编辑模式切换
    $scope.showEditDialog = function(message) {
        if (!messageEditService.canEdit(message)) {
            alert('该消息已超过可编辑时限');
            return;
        }

        $scope.editingMessage = message;
        $scope.editingContent = message.msg || message.message_content;
        $scope.showEditModal = true;
        
        // 启动倒计时
        updateEditTimeRemaining(message);
    };

    // 更新编辑剩余时间
    function updateEditTimeRemaining(message) {
        var timeInfo = messageEditService.getTimeRemaining(message);
        $scope.editTimeRemaining = timeInfo.text;

        if (!timeInfo.expired && $scope.showEditModal) {
            $timeout(function() {
                updateEditTimeRemaining(message);
            }, 1000);
        }
    }

    // 关闭编辑对话框
    $scope.closeEditModal = function() {
        $scope.showEditModal = false;
        $scope.editingMessage = null;
        $scope.editingContent = '';
    };

    // 确认编辑
    $scope.confirmEdit = function() {
        if (!$scope.editingMessage) return;

        var messageId = $scope.editingMessage.id;
        var newContent = $scope.editingContent.trim();

        if (!newContent) {
            alert('消息内容不能为空');
            return;
        }

        messageEditService.editMessageSocket(messageId, newContent)
            .then(function(response) {
                $scope.closeEditModal();
                console.log('消息编辑成功:', response);
            })
            .catch(function(error) {
                alert('编辑失败: ' + (error.error || '未知错误'));
            });
    };

    // 撤回消息
    $scope.recallMessage = function(message) {
        if (!confirm('确定要撤回这条消息吗？撤回后将无法恢复。')) {
            return;
        }

        if (!messageEditService.canRecall(message)) {
            alert('该消息已超过可撤回时限');
            return;
        }

        var messageId = message.id;

        messageEditService.recallMessageSocket(messageId)
            .then(function(response) {
                console.log('消息撤回成功:', response);
            })
            .catch(function(error) {
                alert('撤回失败: ' + (error.error || '未知错误'));
            });
    };

    // 检查消息是否可编辑
    $scope.canEditMessage = function(message) {
        return messageEditService.canEdit(message);
    };

    // 检查消息是否可撤回
    $scope.canRecallMessage = function(message) {
        return messageEditService.canRecall(message);
    };

    // 获取消息操作按钮可见性
    $scope.showMessageActions = function(message) {
        return message.username === $rootScope.username && 
               (messageEditService.canEdit(message) || messageEditService.canRecall(message));
    };

    // 注册编辑/撤回事件监听
    messageEditService.registerEventListeners($scope);

    // 监听消息被编辑
    $scope.$on('message-edited', function(event, data) {
        var messageId = data.messageId;
        
        for (var i = 0; i < $scope.messeges.length; i++) {
            if ($scope.messeges[i].id == messageId) {
                $scope.messeges[i].msg = data.newContent;
                $scope.messeges[i].status = 'edited';
                $scope.messeges[i].editedAt = data.editedAt;
                $scope.$apply();
                break;
            }
        }
    });

    // 监听消息被撤回
    $scope.$on('message-recalled', function(event, data) {
        var messageId = data.messageId;
        
        for (var i = 0; i < $scope.messeges.length; i++) {
            if ($scope.messeges[i].id == messageId) {
                // 将消息标记为已撤回
                $scope.messeges[i].status = 'recalled';
                $scope.messeges[i].recaller = data.recaller;
                $scope.messeges[i].recallTime = data.recallTime;
                $scope.$apply();
                break;
            }
        }
    });
});
```

### 任务 4.2: 修改 chatRoom.html

**文件路径**: `public/app/views/chatRoom.html`

**变更内容**:

1. 添加消息操作按钮（编辑/撤回）
2. 添加编辑对话框
3. 添加撤回消息显示

**1. 添加消息操作按钮（在消息气泡内）**:

找到消息显示的部分，在适当位置添加操作按钮：

```html
<!-- 在消息气泡内添加操作按钮 -->
<div class="direct-chat-text" 
     ng-class="{ 'own-msg': message.ownMsg }"
     data-message-id="{{message.id}}">
    
    <!-- 撤回消息显示 -->
    <div class="message-recalled" ng-if="message.status === 'recalled'">
        <i class="fa fa-undo"></i>
        <span>此消息已被撤回</span>
    </div>
    
    <!-- 普通消息内容 -->
    <div ng-if="message.status !== 'recalled'">
        <!-- 显示消息内容 -->
        <div class="message-content" ng-bind-html="renderMessageContent(message)"></div>
        
        <!-- 编辑标识 -->
        <div class="message-edited-indicator" ng-if="message.status === 'edited'">
            <small>(已编辑)</small>
        </div>
        
        <!-- 操作按钮（仅对发送者显示） -->
        <div class="message-actions" 
             ng-if="message.username === username && (canEditMessage(message) || canRecallMessage(message))">
            <button class="btn-action" 
                    ng-click="showEditDialog(message)"
                    ng-if="canEditMessage(message)"
                    title="编辑消息">
                <i class="fa fa-edit"></i>
            </button>
            <button class="btn-action" 
                    ng-click="recallMessage(message)"
                    ng-if="canRecallMessage(message)"
                    title="撤回消息">
                <i class="fa fa-undo"></i>
            </button>
        </div>
    </div>
    
    <!-- 消息时间 -->
    <div class="message-time">
        {{message.msgTime}}
    </div>
</div>
```

**2. 添加编辑对话框**:

在页面底部添加编辑模态框：

```html
<!-- 编辑消息对话框 -->
<div class="modal fade" id="editMessageModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" ng-click="closeEditModal()">
                    <span>&times;</span>
                </button>
                <h4 class="modal-title">
                    <i class="fa fa-edit"></i> 编辑消息
                </h4>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <textarea class="form-control" 
                              ng-model="editingContent" 
                              rows="4"
                              placeholder="输入新消息内容..."></textarea>
                </div>
                <div class="edit-tips">
                    <i class="fa fa-clock-o"></i>
                    剩余可编辑时间: <strong>{{editTimeRemaining}}</strong>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" ng-click="closeEditModal()">
                    取消
                </button>
                <button type="button" class="btn btn-primary" ng-click="confirmEdit()">
                    <i class="fa fa-save"></i> 保存
                </button>
            </div>
        </div>
    </div>
</div>
```

### 任务 4.3: 添加编辑/撤回样式

**文件路径**: `public/app/css/style.css`

**添加样式**:

```css
/* ========================================
   消息编辑/撤回样式
   ======================================== */

/* 消息操作按钮 */
.message-actions {
    display: flex;
    gap: 5px;
    margin-top: 5px;
    opacity: 0;
    transition: opacity 0.2s;
}

.message-content:hover .message-actions {
    opacity: 1;
}

.btn-action {
    background: rgba(0, 0, 0, 0.1);
    border: none;
    border-radius: 4px;
    padding: 3px 8px;
    font-size: 12px;
    cursor: pointer;
    color: #666;
    transition: all 0.2s;
}

.btn-action:hover {
    background: rgba(0, 0, 0, 0.2);
    color: #333;
}

[data-theme="dark"] .btn-action {
    background: rgba(255, 255, 255, 0.1);
    color: #a0a0a0;
}

[data-theme="dark"] .btn-action:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
}

/* 编辑标识 */
.message-edited-indicator {
    font-size: 11px;
    color: #999;
    margin-top: 2px;
}

[data-theme="dark"] .message-edited-indicator {
    color: #777;
}

/* 撤回消息显示 */
.message-recalled {
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 6px;
    color: #999;
    font-style: italic;
    font-size: 13px;
}

[data-theme="dark"] .message-recalled {
    background: rgba(255, 255, 255, 0.05);
    color: #777;
}

.message-recalled i {
    margin-right: 5px;
}

/* 编辑对话框 */
#editMessageModal .modal-header {
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
}

[data-theme="dark"] #editMessageModal .modal-header {
    background: #16213e;
    border-bottom-color: #2a2a4a;
}

#editMessageModal .modal-title {
    font-size: 16px;
    font-weight: 600;
}

#editMessageModal .modal-title i {
    margin-right: 8px;
    color: #3a5a8a;
}

#editMessageModal .modal-body {
    padding: 20px;
}

#editMessageModal textarea {
    resize: vertical;
    min-height: 100px;
}

.edit-tips {
    margin-top: 10px;
    font-size: 13px;
    color: #666;
}

[data-theme="dark"] .edit-tips {
    color: #a0a0a0;
}

.edit-tips i {
    margin-right: 5px;
}

/* 消息被编辑时的动画效果 */
@keyframes message-edited-flash {
    0% {
        background-color: rgba(255, 215, 0, 0.3);
    }
    100% {
        background-color: transparent;
    }
}

.message-edited-animation {
    animation: message-edited-flash 1s ease-out;
}

/* 消息被撤回时的动画效果 */
@keyframes message-recalled-fade {
    0% {
        opacity: 1;
        transform: scale(1);
    }
    100% {
        opacity: 0;
        transform: scale(0.95);
    }
}

.message-recalling {
    animation: message-recalled-fade 0.5s ease-out forwards;
}

/* 发送者消息样式 */
.direct-chat-msg.right .message-actions .btn-action {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
}

.direct-chat-msg.right .message-actions .btn-action:hover {
    background: rgba(255, 255, 255, 0.3);
}

/* 确认撤回对话框 */
.confirm-recall-dialog {
    text-align: center;
}

.confirm-recall-dialog .warning-icon {
    font-size: 48px;
    color: #f39c12;
    margin-bottom: 15px;
}

.confirm-recall-dialog p {
    font-size: 15px;
    color: #333;
    margin-bottom: 10px;
}

[data-theme="dark"] .confirm-recall-dialog p {
    color: #e4e4e4;
}

.confirm-recall-dialog .warning-text {
    font-size: 13px;
    color: #999;
}
```

**预期产出**: 完整的编辑/撤回 UI 和样式

---

## 阶段五：测试验证

### 任务 5.1: API 测试

| 测试项 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 正常编辑 | POST /api/edit-message | 消息内容更新，返回成功 |
| 越权编辑 | 用其他用户身份编辑 | 返回 403 错误 |
| 超时编辑 | 编辑 5 分钟前的消息 | 返回超时错误 |
| 正常撤回 | POST /api/recall-message | 消息状态更新，显示撤回提示 |
| 越权撤回 | 用其他用户身份撤回 | 返回 403 错误 |
| 超时撤回 | 撤回 5 分钟前的消息 | 返回超时错误 |

### 任务 5.2: Socket 测试

| 测试项 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 实时编辑 | 编辑消息 | 房间内所有用户看到更新 |
| 实时撤回 | 撤回消息 | 房间内所有用户看到撤回提示 |
| 自己编辑 | 编辑自己的消息 | 本地立即更新 |

### 任务 5.3: UI 测试

| 测试项 | 测试步骤 | 预期结果 |
|--------|----------|----------|
| 显示操作按钮 | 鼠标悬停在发送者的消息上 | 显示编辑/撤回按钮 |
| 打开编辑框 | 点击编辑按钮 | 弹出编辑对话框 |
| 显示倒计时 | 编辑框打开后 | 显示剩余可编辑时间 |
| 保存编辑 | 输入新内容，点击保存 | 消息更新，显示"已编辑" |
| 取消编辑 | 点击取消按钮 | 关闭对话框，内容不变 |
| 撤回确认 | 点击撤回按钮 | 弹出确认对话框 |
| 撤回成功 | 确认撤回 | 消息变为撤回提示 |

---

## 依赖关系

```
消息编辑与撤回功能实现
├── 数据库变更
│   ├── 添加字段和表 (db.js)
│   └── 添加编辑/撤回方法 (db.js)
├── 后端 API
│   ├── 添加编辑 API (app.js)
│   ├── 添加撤回 API (app.js)
│   └── 添加 Socket 事件处理 (app.js)
├── 前端服务
│   └── 创建消息编辑服务 (messageEditService.js)
├── 前端集成
│   ├── 修改控制器 (chatRoomController.js)
│   ├── 修改视图 (chatRoom.html)
│   └── 添加样式 (style.css)
└── 测试验证
    ├── API 测试
    ├── Socket 测试
    └── UI 测试
```

---

## 风险和注意事项

1. **时间同步**: 前后端时间计算可能存在偏差，考虑在服务器端进行时间验证
2. **并发编辑**: 同一消息被多人同时编辑的情况（理论上不会发生，因为只有发送者能编辑）
3. **撤回后内容**: 被撤回消息的内容是否应该保留用于显示
4. **编辑历史**: 是否需要支持查看消息的编辑历史
5. **通知**: 是否需要向其他用户发送"XX编辑了一条消息"的通知
6. **数据库事务**: 编辑和保存历史应该在事务中执行

---

**计划结束**
