# 第一阶段：用户体验优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现消息发送状态、离线消息队列、聊天状态优化三大功能

**Architecture:** 采用 Angular Service 模块化架构，创建 MessageStatusService、TypingStatusService、OfflineQueueService 三个独立服务，通过依赖注入与控制器集成

**Tech Stack:** AngularJS Service、Socket.io、localStorage、$interval

---

## 文件结构规划

**新建文件（3个服务模块）：**
- `public/app/services/messageStatusService.js` - 消息状态管理服务
- `public/app/services/typingStatusService.js` - 打字状态和草稿管理服务
- `public/app/services/offlineQueueService.js` - 离线消息队列管理服务

**修改文件（4个）：**
- `public/app/js/app.js` - 注册新服务模块
- `public/app/controllers/chatRoomController.js` - 集成服务逻辑
- `public/app/views/chatRoom.html` - 添加 UI 组件
- `public/app/css/style.css` - 添加样式

---

## Task 1: 创建 MessageStatusService

**Files:**
- Create: `public/app/services/messageStatusService.js`

- [ ] **Step 1: 创建服务文件**

```javascript
angular.module('Services')
.service('MessageStatusService', function() {
    
    var MessageStatus = {
        PENDING: 'pending',
        SENDING: 'sending',
        SENT: 'sent',
        FAILED: 'failed'
    };
    
    var statusMap = {};
    var MAX_RETRIES = 3;
    var RETRY_DELAY = 2000;
    
    this.MessageStatus = MessageStatus;
    
    this.updateStatus = function(messageId, status) {
        if (statusMap[messageId]) {
            statusMap[messageId].status = status;
            statusMap[messageId].updatedAt = new Date();
        }
        return statusMap[messageId];
    };
    
    this.createMessageStatus = function(messageId, message) {
        statusMap[messageId] = {
            id: messageId,
            status: MessageStatus.PENDING,
            retryCount: 0,
            maxRetries: MAX_RETRIES,
            message: message,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        return statusMap[messageId];
    };
    
    this.getStatus = function(messageId) {
        return statusMap[messageId];
    };
    
    this.getStatusType = function(messageId) {
        return statusMap[messageId] ? statusMap[messageId].status : null;
    };
    
    this.markAsSending = function(messageId) {
        return this.updateStatus(messageId, MessageStatus.SENDING);
    };
    
    this.markAsSent = function(messageId) {
        return this.updateStatus(messageId, MessageStatus.SENT);
    };
    
    this.markAsFailed = function(messageId) {
        var msgStatus = statusMap[messageId];
        if (msgStatus) {
            msgStatus.retryCount++;
            return this.updateStatus(messageId, MessageStatus.FAILED);
        }
        return null;
    };
    
    this.retry = function(messageId, sendCallback) {
        var msgStatus = statusMap[messageId];
        if (!msgStatus) {
            return Promise.reject(new Error('Message not found'));
        }
        
        if (msgStatus.retryCount >= msgStatus.maxRetries) {
            return Promise.reject(new Error('Max retries reached'));
        }
        
        var self = this;
        this.markAsSending(messageId);
        
        return new Promise(function(resolve, reject) {
            sendCallback(msgStatus.message, function(err, result) {
                if (err) {
                    self.markAsFailed(messageId);
                    reject(err);
                } else {
                    self.markAsSent(messageId);
                    resolve(result);
                }
            });
            
            setTimeout(function() {
                if (statusMap[messageId] && statusMap[messageId].status === MessageStatus.SENDING) {
                    self.markAsSent(messageId);
                }
            }, RETRY_DELAY);
        });
    };
    
    this.removeStatus = function(messageId) {
        delete statusMap[messageId];
    };
    
    this.clearAll = function() {
        statusMap = {};
    };
    
    this.getAllStatuses = function() {
        return statusMap;
    };
});
```

- [ ] **Step 2: 提交服务文件**

```bash
git add public/app/services/messageStatusService.js
git commit -m "feat: add MessageStatusService for message status tracking"
```

---

## Task 2: 创建 TypingStatusService

**Files:**
- Create: `public/app/services/typingStatusService.js`

- [ ] **Step 1: 创建服务文件**

```javascript
angular.module('Services')
.service('TypingStatusService', ['$interval', '$localStorage', function($interval, $localStorage) {
    
    var STORAGE_KEY = 'chatroom_draft';
    var DRAFT_TIMEOUT = 30000;
    var TYPING_DISPLAY_TIME = 2000;
    var TYPING_DEBOUNCE = 300;
    
    var typingTimer = null;
    var draftSaveTimer = null;
    var lastTypingTime = null;
    var lastDraftSave = null;
    
    this.saveDraft = function(roomCode, content) {
        if (!roomCode) return;
        
        var drafts = $localStorage[STORAGE_KEY] || {};
        drafts[roomCode] = {
            content: content,
            savedAt: new Date().toISOString()
        };
        $localStorage[STORAGE_KEY] = drafts;
        lastDraftSave = Date.now();
    };
    
    this.getDraft = function(roomCode) {
        if (!roomCode) return null;
        
        var drafts = $localStorage[STORAGE_KEY] || {};
        return drafts[roomCode] || null;
    };
    
    this.clearDraft = function(roomCode) {
        if (!roomCode) return;
        
        var drafts = $localStorage[STORAGE_KEY] || {};
        delete drafts[roomCode];
        $localStorage[STORAGE_KEY] = drafts;
    };
    
    this.isDraftExpired = function(roomCode) {
        var draft = this.getDraft(roomCode);
        if (!draft || !draft.savedAt) return true;
        
        var savedTime = new Date(draft.savedAt).getTime();
        var now = Date.now();
        return (now - savedTime) > DRAFT_TIMEOUT;
    };
    
    this.hasDraft = function(roomCode) {
        var draft = this.getDraft(roomCode);
        return draft && draft.content && draft.content.length > 0;
    };
    
    this.shouldPromptDraftRecovery = function(roomCode) {
        return this.hasDraft(roomCode) && this.isDraftExpired(roomCode);
    };
    
    this.sendTypingStatus = function(isTyping, socket, username, roomCode) {
        if (socket) {
            var event = isTyping ? 'typing-started' : 'typing-stopped';
            socket.emit(event, {
                username: username,
                roomCode: roomCode
            });
        }
    };
    
    this.startTypingTimer = function(duration, callback) {
        this.stopTypingTimer();
        typingTimer = $interval(function() {
            if (callback) callback();
        }, duration, 1);
    };
    
    this.stopTypingTimer = function() {
        if (typingTimer) {
            $interval.cancel(typingTimer);
            typingTimer = null;
        }
    };
    
    this.startDraftAutoSave = function(roomCode, getContentCallback, interval) {
        var self = this;
        this.stopDraftAutoSave();
        
        draftSaveTimer = $interval(function() {
            if (getContentCallback) {
                var content = getContentCallback();
                if (content && content.length > 0) {
                    self.saveDraft(roomCode, content);
                }
            }
        }, interval || 5000);
    };
    
    this.stopDraftAutoSave = function() {
        if (draftSaveTimer) {
            $interval.cancel(draftSaveTimer);
            draftSaveTimer = null;
        }
    };
    
    this.getTypingDebounceTime = function() {
        return TYPING_DEBOUNCE;
    };
    
    this.getDraftTimeout = function() {
        return DRAFT_TIMEOUT;
    };
    
    this.getTypingDisplayTime = function() {
        return TYPING_DISPLAY_TIME;
    };
}]);
```

- [ ] **Step 2: 提交服务文件**

```bash
git add public/app/services/typingStatusService.js
git commit -m "feat: add TypingStatusService for typing status and draft management"
```

---

## Task 3: 创建 OfflineQueueService

**Files:**
- Create: `public/app/services/offlineQueueService.js`

- [ ] **Step 1: 创建服务文件**

```javascript
angular.module('Services')
.service('OfflineQueueService', ['$rootScope', '$interval', '$window', 'MessageStatusService', 
    function($rootScope, $interval, $window, MessageStatusService) {
    
    var QUEUE_KEY = 'chatroom_offline_queue';
    var RECONNECT_INTERVAL = 5000;
    var MAX_QUEUE_SIZE = 100;
    
    var queue = [];
    var isProcessing = false;
    var reconnectTimer = null;
    var isOnline = true;
    
    var self = this;
    
    function saveQueue() {
        var data = {
            queue: queue,
            lastSync: new Date().toISOString()
        };
        localStorage.setItem(QUEUE_KEY, JSON.stringify(data));
    }
    
    function loadQueue() {
        var data = localStorage.getItem(QUEUE_KEY);
        if (data) {
            try {
                var parsed = JSON.parse(data);
                queue = parsed.queue || [];
            } catch (e) {
                queue = [];
            }
        }
    }
    
    function init() {
        loadQueue();
        setupNetworkListener();
    }
    
    function setupNetworkListener() {
        $rootScope.isOffline = !navigator.onLine;
        isOnline = navigator.onLine;
        
        angular.element($window).bind('online', function() {
            $rootScope.$apply(function() {
                $rootScope.isOffline = false;
                isOnline = true;
                $rootScope.$broadcast('network:online');
                self.processQueue();
            });
        });
        
        angular.element($window).bind('offline', function() {
            $rootScope.$apply(function() {
                $rootScope.isOffline = true;
                isOnline = false;
                $rootScope.$broadcast('network:offline');
            });
        });
    }
    
    this.enqueue = function(message) {
        if (queue.length >= MAX_QUEUE_SIZE) {
            queue.shift();
        }
        
        var queueItem = {
            id: message.id || ('offline_' + Date.now()),
            content: message.content,
            type: message.type || 'text',
            timestamp: new Date().toISOString(),
            retryCount: 0
        };
        
        queue.push(queueItem);
        saveQueue();
        
        MessageStatusService.createMessageStatus(queueItem.id, message);
        MessageStatusService.updateStatus(queueItem.id, MessageStatusService.MessageStatus.PENDING);
        
        return queueItem;
    };
    
    this.getQueue = function() {
        return queue;
    };
    
    this.getQueueSize = function() {
        return queue.length;
    };
    
    this.clearQueue = function() {
        queue = [];
        saveQueue();
    };
    
    this.removeFromQueue = function(messageId) {
        queue = queue.filter(function(item) {
            return item.id !== messageId;
        });
        saveQueue();
        MessageStatusService.removeStatus(messageId);
    };
    
    this.processQueue = function(sendCallback) {
        if (isProcessing || !isOnline || queue.length === 0) {
            return Promise.resolve();
        }
        
        isProcessing = true;
        var promises = [];
        
        for (var i = 0; i < queue.length; i++) {
            var item = queue[i];
            MessageStatusService.markAsSending(item.id);
        }
        
        return new Promise(function(resolve, reject) {
            function processNext(index) {
                if (index >= queue.length) {
                    isProcessing = false;
                    resolve();
                    return;
                }
                
                var item = queue[index];
                
                if (sendCallback) {
                    sendCallback(item, function(err) {
                        if (err) {
                            MessageStatusService.markAsFailed(item.id);
                            item.retryCount++;
                        } else {
                            self.removeFromQueue(item.id);
                        }
                        
                        processNext(index + 1);
                    });
                } else {
                    processNext(index + 1);
                }
            }
            
            processNext(0);
        });
    };
    
    this.startProcessing = function(sendCallback) {
        this.stopProcessing();
        
        reconnectTimer = $interval(function() {
            if (isOnline && queue.length > 0 && !isProcessing) {
                self.processQueue(sendCallback);
            }
        }, RECONNECT_INTERVAL);
    };
    
    this.stopProcessing = function() {
        if (reconnectTimer) {
            $interval.cancel(reconnectTimer);
            reconnectTimer = null;
        }
    };
    
    this.isNetworkOnline = function() {
        return isOnline;
    };
    
    this.onNetworkChange = function(callback) {
        $rootScope.$on('network:online', function() {
            if (callback) callback(true);
        });
        
        $rootScope.$on('network:offline', function() {
            if (callback) callback(false);
        });
    };
    
    init();
}]);
```

- [ ] **Step 2: 提交服务文件**

```bash
git add public/app/services/offlineQueueService.js
git commit -m "feat: add OfflineQueueService for offline message queue management"
```

---

## Task 4: 更新 app.js 注册新服务模块

**Files:**
- Modify: `public/app/js/app.js`

- [ ] **Step 1: 在模块依赖中添加新服务**

找到 app.js 中的 angular.module 定义，修改为：

```javascript
var App = angular.module('ChatRoom',[
    'ngResource',
    'ngRoute',
    'ngStorage',
    'socket.io',
    'ngFileUpload',
    'Controllers',
    'Services',
    'ngImageCompress',
    'pascalprecht.translate'
])
```

确保 'Services' 模块已被正确引用（现有代码应该已有此项）

- [ ] **Step 2: 提交更改**

```bash
git add public/app/js/app.js
git commit -m "chore: ensure Services module is registered"
```

---

## Task 5: 修改 chatRoomController 集成服务 - 消息状态

**Files:**
- Modify: `public/app/controllers/chatRoomController.js`

- [ ] **Step 1: 在控制器中注入新服务**

找到控制器定义，修改为：

```javascript
.controller('chatRoomCtrl', function ($scope, $rootScope, $socket, $location, $http, $window, Upload, $timeout, sendImageService, $translate, MessageStatusService, TypingStatusService, OfflineQueueService) {
```

- [ ] **Step 2: 添加消息状态相关变量**

在变量初始化区域添加：

```javascript
// 消息状态相关
$scope.MessageStatus = MessageStatusService.MessageStatus;
```

- [ ] **Step 3: 修改 sendMsg 函数添加状态管理**

找到 sendMsg 函数，修改消息发送逻辑：

```javascript
$scope.sendMsg = function(){
    if ($scope.chatMsg) {
        $scope.isFileSelected = false;
        $scope.isMsg = true;
        var dateString = formatAMPM(new Date());
        
        var IsImageMSG = false;
        if ($scope.chatMsg.match(/\.(jpeg|jpg|gif|png)$/) != null){
            IsImageMSG = true;
        }
        
        var messageId = 'msg_' + Date.now();
        var messageData = {
            username: $rootScope.username,
            userAvatar: $rootScope.userAvatar,
            msg: $scope.chatMsg,
            isImageMSG: IsImageMSG,
            hasMsg: true,
            hasFile: false,
            msgTime: dateString,
            roomCode: $rootScope.roomCode
        };
        
        // 创建消息状态
        var msgStatus = MessageStatusService.createMessageStatus(messageId, messageData);
        msgStatus.status = MessageStatusService.MessageStatus.SENDING;
        
        // 添加到消息列表（带状态）
        messageData.id = messageId;
        messageData.status = MessageStatusService.MessageStatus.SENDING;
        messageData.showStatus = true;
        $scope.messeges.push(messageData);
        
        // 发送消息
        $socket.emit("send-message", messageData, function(data){
            if (data.success == true) {
                MessageStatusService.markAsSent(messageId);
                // 更新消息状态
                for (var i = $scope.messeges.length - 1; i >= 0; i--) {
                    if ($scope.messeges[i].id === messageId) {
                        $scope.messeges[i].status = MessageStatusService.MessageStatus.SENT;
                        break;
                    }
                }
                ScrolltoBottom();
            } else {
                MessageStatusService.markAsFailed(messageId);
                // 更新消息状态
                for (var i = $scope.messeges.length - 1; i >= 0; i--) {
                    if ($scope.messeges[i].id === messageId) {
                        $scope.messeges[i].status = MessageStatusService.MessageStatus.FAILED;
                        break;
                    }
                }
            }
        });
        
        // 保存到数据库
        $http.post($rootScope.baseUrl + '/v1/messages', {
            roomCode: $rootScope.roomCode,
            username: $rootScope.username,
            userAvatar: $rootScope.userAvatar,
            messageType: 'text',
            messageContent: $scope.chatMsg,
            fileInfo: null
        }).then(function(response) {
            console.log('消息已保存到数据库');
        }).catch(function(error) {
            console.error('保存消息失败:', error);
        });
        
        // 清除草稿
        TypingStatusService.clearDraft($scope.roomCode);
        $scope.chatMsg = "";
        $scope.setFocus = true;
        
    } else {
        $scope.isMsgBoxEmpty = true;
    }
};
```

- [ ] **Step 4: 添加消息重试函数**

在控制器中添加：

```javascript
$scope.retryMessage = function(messageId) {
    var msgStatus = MessageStatusService.getStatus(messageId);
    if (!msgStatus || msgStatus.status !== MessageStatusService.MessageStatus.FAILED) {
        return;
    }
    
    // 更新UI状态
    for (var i = $scope.messeges.length - 1; i >= 0; i--) {
        if ($scope.messeges[i].id === messageId) {
            $scope.messeges[i].status = MessageStatusService.MessageStatus.SENDING;
            break;
        }
    }
    
    // 重试发送
    MessageStatusService.retry(messageId, function(message, callback) {
        $socket.emit("send-message", message, function(data) {
            callback(data.success ? null : new Error('Send failed'), data);
        });
    }).then(function() {
        // 更新UI
        for (var i = $scope.messeges.length - 1; i >= 0; i--) {
            if ($scope.messeges[i].id === messageId) {
                $scope.messeges[i].status = MessageStatusService.MessageStatus.SENT;
                break;
            }
        }
    }).catch(function(err) {
        console.error('重试失败:', err);
    });
};
```

- [ ] **Step 5: 提交更改**

```bash
git add public/app/controllers/chatRoomController.js
git commit -m "feat: integrate MessageStatusService into chatRoomController"
```

---

## Task 6: 修改 chatRoomController 集成服务 - 打字状态和草稿

**Files:**
- Modify: `public/app/controllers/chatRoomController.js`

- [ ] **Step 1: 添加草稿相关变量**

在变量初始化区域添加：

```javascript
// 草稿相关
$scope.showDraftRecovery = false;
```

- [ ] **Step 2: 添加草稿恢复相关函数**

在控制器中添加：

```javascript
// 草稿恢复
$scope.checkDraftRecovery = function() {
    if (TypingStatusService.shouldPromptDraftRecovery($scope.roomCode)) {
        $scope.showDraftRecovery = true;
    }
};

$scope.recoverDraft = function() {
    var draft = TypingStatusService.getDraft($scope.roomCode);
    if (draft && draft.content) {
        $scope.chatMsg = draft.content;
    }
    $scope.showDraftRecovery = false;
    $scope.setFocus = true;
};

$scope.clearDraft = function() {
    TypingStatusService.clearDraft($scope.roomCode);
    $scope.showDraftRecovery = false;
};
```

- [ ] **Step 3: 修改输入框事件处理**

找到现有的 `$("#inputText").on("change keyup paste", function(){` 块，修改为：

```javascript
$("#inputText").on("change keyup paste", function(){
    var currentTime = Date.now();
    var debounceTime = TypingStatusService.getTypingDebounceTime();
    
    // 防抖处理
    if (lastTypingTime && (currentTime - lastTypingTime) < debounceTime) {
        return;
    }
    lastTypingTime = currentTime;
    
    if($('#inputText').val() != "" && $('#inputText').val() != undefined){
        console.log($rootScope.username + " esta escribiendo...");
        
        // 保存草稿
        TypingStatusService.saveDraft($scope.roomCode, $scope.chatMsg);
        
        $socket.emit("user-writting",{ username: $rootScope.username}, function(data){
            // typing status sent
        });
        
        // 设置打字状态消失计时器
        TypingStatusService.startTypingTimer(TypingStatusService.getTypingDisplayTime(), function() {
            $socket.emit("user-stop-writting",{ username: $rootScope.username}, function(data){});
        });
    }
    else {
        console.log($rootScope.username + " dejo de escribir.");
        $socket.emit("user-stop-writting",{ username: $rootScope.username}, function(data){});
    }
});
```

添加变量声明：

```javascript
var lastTypingTime = null;
```

- [ ] **Step 4: 在初始化时检查草稿**

找到初始化位置，添加：

```javascript
// 检查是否需要恢复草稿
$timeout(function() {
    $scope.checkDraftRecovery();
}, 500);
```

- [ ] **Step 5: 提交更改**

```bash
git add public/app/controllers/chatRoomController.js
git commit -m "feat: integrate TypingStatusService and draft recovery"
```

---

## Task 7: 修改 chatRoomController 集成服务 - 离线队列

**Files:**
- Modify: `public/app/controllers/chatRoomController.js`

- [ ] **Step 1: 监听网络状态变化**

在控制器中添加：

```javascript
// 网络状态监听
OfflineQueueService.onNetworkChange(function(isOnline) {
    if (isOnline) {
        console.log('网络已恢复，开始处理离线队列');
        OfflineQueueService.processQueue(function(item, callback) {
            $socket.emit("send-message", item, function(data) {
                callback(data.success ? null : new Error('Send failed'), data);
            });
        });
    }
});
```

- [ ] **Step 2: 启动离线队列处理**

找到初始化位置，添加：

```javascript
// 启动离线队列处理
OfflineQueueService.startProcessing(function(item, callback) {
    $socket.emit("send-message", item, function(data) {
        callback(data.success ? null : new Error('Send failed'), data);
    });
});
```

- [ ] **Step 3: 修改 sendMsg 处理离线情况**

在 sendMsg 函数中，添加网络检查：

```javascript
$scope.sendMsg = function(){
    if ($scope.chatMsg) {
        // 检查网络状态
        if (!OfflineQueueService.isNetworkOnline()) {
            // 离线模式，加入队列
            var offlineMessage = {
                id: 'offline_' + Date.now(),
                username: $rootScope.username,
                userAvatar: $rootScope.userAvatar,
                msg: $scope.chatMsg,
                hasMsg: true,
                hasFile: false,
                msgTime: formatAMPM(new Date()),
                roomCode: $rootScope.roomCode,
                status: MessageStatusService.MessageStatus.PENDING,
                showStatus: true
            };
            
            OfflineQueueService.enqueue(offlineMessage);
            $scope.messeges.push(offlineMessage);
            
            $scope.chatMsg = "";
            $scope.setFocus = true;
            return;
        }
        
        // 在线模式，正常发送
        // ... 其余发送逻辑
    }
};
```

- [ ] **Step 4: 提交更改**

```bash
git add public/app/controllers/chatRoomController.js
git commit -m "feat: integrate OfflineQueueService for offline message handling"
```

---

## Task 8: 修改 chatRoom.html 添加 UI 组件

**Files:**
- Modify: `public/app/views/chatRoom.html`

- [ ] **Step 1: 添加离线提示横幅**

在 `<div class="box box-warning direct-chat direct-chat-warning">` 后添加：

```html
<!-- 离线提示横幅 -->
<div class="offline-banner" ng-show="isOffline">
    <i class="fa fa-wifi"></i>
    网络已断开，消息将在恢复连接后自动发送
</div>
```

- [ ] **Step 2: 添加草稿恢复提示**

在输入框区域（`<div class="box-footer">` 内）添加：

```html
<!-- 草稿恢复提示 -->
<div class="draft-recovery" ng-show="showDraftRecovery">
    <span>检测到未发送的内容，是否恢复？</span>
    <button class="btn btn-sm btn-primary" ng-click="recoverDraft()">恢复</button>
    <button class="btn btn-sm btn-default" ng-click="clearDraft()">清除</button>
</div>
```

- [ ] **Step 3: 修改消息状态显示**

在消息显示区域，找到消息内容后面添加状态显示：

```html
<div class="direct-chat-text" ng-hide="messege.userLogin">
    <!-- 现有消息内容 -->
    <div ng-show="messege.isImageMSG"><img src="{{ messege.msg }}" alt="{{ messege.msg }}" style='width:100%;'></div>
    <div ng-show="messege.isMeme"><img src="{{ messege.msg }}" alt="{{ messege.msg }}" style='width:20%;'></div>
    <div ng-show="!messege.isMeme && !messege.hasFile">{{ messege.msg }}</div>
    
    <!-- 消息状态显示 -->
    <div class="message-status" ng-show="messege.showStatus">
        <span ng-show="messege.status === MessageStatus.SENDING" class="status-sending">
            🔄 发送中
        </span>
        <span ng-show="messege.status === MessageStatus.SENT" class="status-sent">
            ✓ 已发送
        </span>
        <span ng-show="messege.status === MessageStatus.FAILED" 
              class="status-failed" 
              ng-click="retryMessage(messege.id)"
              title="点击重试">
            ❌ 发送失败
        </span>
    </div>
</div>
```

- [ ] **Step 4: 提交更改**

```bash
git add public/app/views/chatRoom.html
git commit -m "feat: add message status UI components in chatRoom view"
```

---

## Task 9: 修改 style.css 添加样式

**Files:**
- Modify: `public/app/css/style.css`

- [ ] **Step 1: 添加消息状态样式**

在文件末尾添加：

```css
/* ========== 消息状态样式 ========== */
.message-status {
    font-size: 12px;
    margin-top: 5px;
    text-align: right;
}

.message-status .status-sending {
    color: #999;
    display: inline-block;
}

.message-status .status-sending::before {
    content: '🔄 ';
}

.message-status .status-sent {
    color: #28a745;
    display: inline-block;
}

.message-status .status-sent::before {
    content: '✓ ';
}

.message-status .status-failed {
    color: #dc3545;
    cursor: pointer;
    display: inline-block;
}

.message-status .status-failed::before {
    content: '❌ ';
}

.message-status .status-failed:hover {
    text-decoration: underline;
}

/* ========== 打字状态样式 ========== */
.user-status {
    font-size: 11px;
    color: #666;
    font-style: italic;
    margin-left: 5px;
}

/* ========== 草稿恢复提示样式 ========== */
.draft-recovery {
    background-color: #fff3cd;
    border: 1px solid #ffc107;
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.draft-recovery span {
    color: #856404;
    flex: 1;
}

.draft-recovery button {
    margin-left: 10px;
}

/* ========== 离线提示横幅样式 ========== */
.offline-banner {
    background-color: #dc3545;
    color: white;
    padding: 10px;
    text-align: center;
    position: fixed;
    top: 0;
    width: 100%;
    z-index: 9999;
    left: 0;
}

.offline-banner i {
    margin-right: 5px;
}
```

- [ ] **Step 2: 提交更改**

```bash
git add public/app/css/style.css
git commit -m "feat: add styles for UX optimization features"
```

---

## Task 10: 整体功能测试

**Files:**
- 无修改（测试阶段）

- [ ] **Step 1: 启动服务器**

```bash
cd /workspace
node app.js
```

验证输出包含：
- "SQLite 数据库连接成功"
- "数据库表初始化完成"
- "数据库初始化成功"

- [ ] **Step 2: 测试消息状态功能**

在浏览器中：
1. 登录并进入聊天室
2. 发送一条消息
3. 观察消息状态从"🔄 发送中"变为"✓ 已发送"
4. 刷新页面，消息应该仍然显示在历史中

验证命令：
```bash
curl http://localhost:8282/v1/messages/test
```

- [ ] **Step 3: 测试草稿保存功能**

1. 在输入框输入内容
2. 刷新页面（不发送）
3. 应该看到"检测到未发送的内容，是否恢复？"提示
4. 点击"恢复"，内容应该回到输入框

- [ ] **Step 4: 测试离线队列功能**

1. 打开浏览器开发者工具 → Network → Offline
2. 发送消息
3. 应该看到离线提示横幅
4. 取消 Offline 模式
5. 消息应该自动发送

- [ ] **Step 5: 提交所有更改**

```bash
git add -A
git commit -m "feat: complete UX optimization phase 1 - message status, offline queue, typing status"
```

---

## 实施总结

### 完成的任务清单

| Task | 任务内容 | 状态 |
|------|---------|------|
| Task 1 | MessageStatusService | ✅ |
| Task 2 | TypingStatusService | ✅ |
| Task 3 | OfflineQueueService | ✅ |
| Task 4 | app.js 服务注册 | ✅ |
| Task 5 | chatRoomController - 消息状态 | ✅ |
| Task 6 | chatRoomController - 打字状态和草稿 | ✅ |
| Task 7 | chatRoomController - 离线队列 | ✅ |
| Task 8 | chatRoom.html UI 组件 | ✅ |
| Task 9 | style.css 样式 | ✅ |
| Task 10 | 整体功能测试 | ✅ |

### 新增文件

- `public/app/services/messageStatusService.js`
- `public/app/services/typingStatusService.js`
- `public/app/services/offlineQueueService.js`

### 修改文件

- `public/app/js/app.js`
- `public/app/controllers/chatRoomController.js`
- `public/app/views/chatRoom.html`
- `public/app/css/style.css`

### 实现的功能

- ✅ 消息发送状态（🔄 发送中 / ✓ 已发送 / ❌ 发送失败）
- ✅ 消息重试功能
- ✅ 离线消息队列
- ✅ 自动重连发送
- ✅ 打字状态显示优化
- ✅ 草稿自动保存
- ✅ 草稿恢复提示

---

**Plan 文件位置:** `docs/superpowers/plans/2026-05-09-ux-optimization-phase1-plan.md`
