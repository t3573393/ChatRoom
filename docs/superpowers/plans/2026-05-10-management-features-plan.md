# 第三阶段：管理功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement room management, kick/mute functionality, and sensitive word filtering with an independent management module architecture.

**Architecture:** Create an independent management module with backend (roomManager.js) and frontend (roomManagementService.js) components, integrated with existing app.js and chatRoomController.js.

**Tech Stack:** Node.js backend, SQLite database (existing), AngularJS frontend, Socket.io realtime communication.

---

## 文件结构规划

**新建文件（2个）：**
- `/workspace/database/roomManager.js` - 后端房间管理模块
- `/workspace/public/app/services/roomManagementService.js` - 前端管理服务

**修改文件（3个）：**
- `/workspace/app.js` - 集成后端管理模块
- `/workspace/public/app/controllers/chatRoomController.js` - 集成前端管理逻辑
- `/workspace/public/app/views/chatRoom.html` - 添加管理 UI

---

## Task 1: 创建后端 roomManager.js 模块

**Files:**
- Create: `/workspace/database/roomManager.js`

- [ ] **Step 1: 创建基础结构和房间状态管理**

```javascript
// roomManager.js
// 房间状态
var roomStates = {};

// 添加房间创建者
function addRoomCreator(roomCode, username) {
  if (!roomStates[roomCode]) {
    roomStates[roomCode] = {
      creator: username,
      mutes: [],
      members: [username]
    };
    return true;
  } else {
    if (!roomStates[roomCode].members.includes(username)) {
      roomStates[roomCode].members.push(username);
    }
    return false;
  }
}

// 判断是否是房间创建者
function isRoomCreator(roomCode, username) {
  return roomStates[roomCode] && 
         roomStates[roomCode].creator === username;
}

// 获取房间成员
function getRoomMembers(roomCode) {
  return roomStates[roomCode] ? roomStates[roomCode].members : [];
}

// 移除房间成员
function removeRoomMember(roomCode, username) {
  if (roomStates[roomCode]) {
    var idx = roomStates[roomCode].members.indexOf(username);
    if (idx !== -1) {
      roomStates[roomCode].members.splice(idx, 1);
    }
  }
}

module.exports = {
  addRoomCreator: addRoomCreator,
  isRoomCreator: isRoomCreator,
  getRoomMembers: getRoomMembers,
  removeRoomMember: removeRoomMember
};
```

- [ ] **Step 2: 添加踢出/禁言功能**

```javascript
// 在 roomManager.js 中添加
function kickUser(roomCode, targetUsername) {
  if (!roomStates[roomCode]) return false;
  
  removeRoomMember(roomCode, targetUsername);
  
  var muteIdx = roomStates[roomCode].mutes.indexOf(targetUsername);
  if (muteIdx !== -1) {
    roomStates[roomCode].mutes.splice(muteIdx, 1);
  }
  
  return true;
}

function muteUser(roomCode, targetUsername) {
  if (!roomStates[roomCode]) return false;
  
  if (!roomStates[roomCode].mutes.includes(targetUsername)) {
    roomStates[roomCode].mutes.push(targetUsername);
  }
  
  return true;
}

function unmuteUser(roomCode, targetUsername) {
  if (!roomStates[roomCode]) return false;
  
  var idx = roomStates[roomCode].mutes.indexOf(targetUsername);
  if (idx !== -1) {
    roomStates[roomCode].mutes.splice(idx, 1);
  }
  
  return true;
}

function isMuted(roomCode, username) {
  return roomStates[roomCode] && 
         roomStates[roomCode].mutes.includes(username);
}
```

- [ ] **Step 3: 添加敏感词过滤功能**

```javascript
// 在 roomManager.js 中添加
var sensitiveWords = [
  '敏感词1',
  '敏感词2',
  '广告',
  '垃圾',
  '测试敏感词'
];

function containsSensitiveWords(text) {
  if (!text) return false;
  
  for (var i = 0; i < sensitiveWords.length; i++) {
    if (text.toLowerCase().indexOf(sensitiveWords[i].toLowerCase()) !== -1) {
      return true;
    }
  }
  
  return false;
}

function filterSensitiveWords(text) {
  return {
    contains: containsSensitiveWords(text),
    original: text
  };
}

function addSensitiveWord(word) {
  if (!sensitiveWords.includes(word)) {
    sensitiveWords.push(word);
  }
}

function getSensitiveWords() {
  return sensitiveWords.slice();
}
```

- [ ] **Step 4: 更新模块导出**

```javascript
module.exports = {
  addRoomCreator: addRoomCreator,
  isRoomCreator: isRoomCreator,
  getRoomMembers: getRoomMembers,
  removeRoomMember: removeRoomMember,
  kickUser: kickUser,
  muteUser: muteUser,
  unmuteUser: unmuteUser,
  isMuted: isMuted,
  filterSensitiveWords: filterSensitiveWords,
  containsSensitiveWords: containsSensitiveWords,
  addSensitiveWord: addSensitiveWord,
  getSensitiveWords: getSensitiveWords
};
```

- [ ] **Step 5: Commit**

```bash
cd /workspace
git add database/roomManager.js
git commit -m "feat: add roomManager.js module for management features"
```

---

## Task 2: 修改 app.js 集成后端管理模块

**Files:**
- Modify: `/workspace/app.js`

- [ ] **Step 1: 引入 roomManager 模块**

在文件顶部添加：

```javascript
var roomManager = require('./database/roomManager');
```

- [ ] **Step 2: 修改 'new user' 事件处理**

找到 `socket.on('new user'` 部分，修改为：

```javascript
socket.on('new user', function(data, callback){
    if(nickname[data.username])
    {
        callback({success:false});
    }else{
        callback({success:true});
        socket.username = data.username;
        socket.userAvatar = data.userAvatar;
        socket.roomCode = data.roomCode;
        socket.isWritting = false;
        socket.activo = true;
        nickname[data.username] = socket;
        
        var isCreator = roomManager.addRoomCreator(data.roomCode, data.username);
        socket.isRoomCreator = isCreator;
    }
});
```

- [ ] **Step 3: 添加踢出用户事件处理**

在 Socket.io 处理部分添加：

```javascript
socket.on('kick-user', function(data, callback) {
    if (!socket.username || !socket.roomCode) {
        callback({success: false, message: '参数错误'});
        return;
    }
    
    if (!roomManager.isRoomCreator(socket.roomCode, socket.username)) {
        callback({success: false, message: '您没有权限执行此操作'});
        return;
    }
    
    if (data.targetUsername === socket.username) {
        callback({success: false, message: '不能踢出自己'});
        return;
    }
    
    var success = roomManager.kickUser(socket.roomCode, data.targetUsername);
    
    if (success) {
        if (nickname[data.targetUsername]) {
            var targetSocket = nickname[data.targetUsername];
            
            targetSocket.emit('you-have-been-kicked', {
                roomCode: socket.roomCode,
                message: '您已被管理员踢出房间'
            });
            
            targetSocket.disconnect(true);
            
            delete nickname[data.targetUsername];
        }
        
        ios.sockets.in(socket.roomCode).emit('user-kicked', {
            kickedUsername: data.targetUsername,
            operator: socket.username
        });
        
        callback({success: true});
    } else {
        callback({success: false, message: '操作失败'});
    }
});
```

- [ ] **Step 4: 添加禁言/解禁事件处理**

继续添加：

```javascript
socket.on('mute-user', function(data, callback) {
    if (!socket.username || !socket.roomCode) {
        callback({success: false, message: '参数错误'});
        return;
    }
    
    if (!roomManager.isRoomCreator(socket.roomCode, socket.username)) {
        callback({success: false, message: '您没有权限执行此操作'});
        return;
    }
    
    if (data.targetUsername === socket.username) {
        callback({success: false, message: '不能禁言自己'});
        return;
    }
    
    var success = roomManager.muteUser(socket.roomCode, data.targetUsername);
    
    if (success) {
        ios.sockets.in(socket.roomCode).emit('user-muted', {
            mutedUsername: data.targetUsername,
            operator: socket.username
        });
        
        callback({success: true});
    } else {
        callback({success: false, message: '操作失败'});
    }
});

socket.on('unmute-user', function(data, callback) {
    if (!socket.username || !socket.roomCode) {
        callback({success: false, message: '参数错误'});
        return;
    }
    
    if (!roomManager.isRoomCreator(socket.roomCode, socket.username)) {
        callback({success: false, message: '您没有权限执行此操作'});
        return;
    }
    
    var success = roomManager.unmuteUser(socket.roomCode, data.targetUsername);
    
    if (success) {
        ios.sockets.in(socket.roomCode).emit('user-unmuted', {
            unmutedUsername: data.targetUsername,
            operator: socket.username
        });
        
        callback({success: true});
    } else {
        callback({success: false, message: '操作失败'});
    }
});
```

- [ ] **Step 5: 修改消息发送，添加禁言和敏感词检查**

找到 `socket.on('send-message'` 部分，在开头添加：

```javascript
socket.on('send-message', function(data, callback) {
    if (!socket.username || !socket.roomCode) {
        callback({success: false, message: '参数错误'});
        return;
    }
    
    if (roomManager.isMuted(socket.roomCode, socket.username)) {
        callback({success: false, message: '您已被管理员禁言，无法发送消息'});
        return;
    }
    
    var filterResult = roomManager.filterSensitiveWords(data.msg);
    if (filterResult.contains) {
        callback({success: false, message: '消息包含敏感词，请修改后重试'});
        return;
    }
    
    // 原有消息发送逻辑继续...
});
```

- [ ] **Step 6: 添加断开连接处理**

在 Socket.io 部分最后添加：

```javascript
socket.on('disconnect', function() {
    if (socket.username && socket.roomCode) {
        roomManager.removeRoomMember(socket.roomCode, socket.username);
        if (nickname[socket.username]) {
            delete nickname[socket.username];
        }
    }
});
```

- [ ] **Step 7: Commit**

```bash
cd /workspace
git add app.js
git commit -m "feat: integrate roomManager module in app.js"
```

---

## Task 3: 创建前端 roomManagementService.js

**Files:**
- Create: `/workspace/public/app/services/roomManagementService.js`

- [ ] **Step 1: 创建服务文件**

```javascript
'use strict';

app.factory('roomManagementService', ['$rootScope', 'socket', function($rootScope, socket) {
    var service = {};
    
    service.kickUser = function(targetUsername, callback) {
        socket.emit('kick-user', {
            targetUsername: targetUsername
        }, function(response) {
            if (callback) {
                callback(response);
            }
        });
    };
    
    service.muteUser = function(targetUsername, callback) {
        socket.emit('mute-user', {
            targetUsername: targetUsername
        }, function(response) {
            if (callback) {
                callback(response);
            }
        });
    };
    
    service.unmuteUser = function(targetUsername, callback) {
        socket.emit('unmute-user', {
            targetUsername: targetUsername
        }, function(response) {
            if (callback) {
                callback(response);
            }
        });
    };
    
    service.isRoomCreator = function() {
        return $rootScope.isRoomCreator || false;
    };
    
    service.isMuted = function(username, mutedUsers) {
        return mutedUsers && mutedUsers.includes(username);
    };
    
    service.registerEventListeners = function($scope) {
        socket.on('you-have-been-kicked', function(data) {
            $scope.$emit('you-have-been-kicked', data);
        });
        
        socket.on('user-kicked', function(data) {
            $scope.$emit('user-kicked', data);
        });
        
        socket.on('user-muted', function(data) {
            $scope.$emit('user-muted', data);
        });
        
        socket.on('user-unmuted', function(data) {
            $scope.$emit('user-unmuted', data);
        });
    };
    
    return service;
}]);
```

- [ ] **Step 2: Commit**

```bash
cd /workspace
git add public/app/services/roomManagementService.js
git commit -m "feat: add roomManagementService.js frontend service"
```

---

## Task 4: 修改 chatRoomController.js 集成管理功能

**Files:**
- Modify: `/workspace/public/app/controllers/chatRoomController.js`

- [ ] **Step 1: 引入服务并初始化变量**

修改 controller 依赖注入，添加 `roomManagementService`：

```javascript
app.controller('chatRoomController', ['$scope', '$rootScope', '$window', 
    '$filter', '$location', 'socket', 'sendImageService', 
    'messageStatusService', 'typingStatusService', 'offlineQueueService',
    'roomManagementService', 
    function($scope, $rootScope, $window, $filter, $location, socket, 
        sendImageService, messageStatusService, typingStatusService, 
        offlineQueueService, roomManagementService) {
    
    $scope.mutedUsers = [];
    $rootScope.isRoomCreator = false;
    $scope.messageError = '';
    
    roomManagementService.registerEventListeners($scope);
    
    // 原有初始化代码...
```

- [ ] **Step 2: 添加管理功能函数**

在 controller 中添加：

```javascript
$scope.kickUser = function(username) {
    if (!confirm('确定要踢出用户 ' + username + ' 吗？')) {
        return;
    }
    
    roomManagementService.kickUser(username, function(response) {
        if (response.success) {
            alert('已成功踢出用户 ' + username);
        } else {
            alert('踢出失败：' + response.message);
        }
    });
};

$scope.muteUser = function(username) {
    if (!confirm('确定要禁言用户 ' + username + ' 吗？')) {
        return;
    }
    
    roomManagementService.muteUser(username, function(response) {
        if (response.success) {
            alert('已成功禁言用户 ' + username);
            if (!$scope.mutedUsers.includes(username)) {
                $scope.mutedUsers.push(username);
            }
        } else {
            alert('禁言失败：' + response.message);
        }
    });
};

$scope.unmuteUser = function(username) {
    if (!confirm('确定要解禁用户 ' + username + ' 吗？')) {
        return;
    }
    
    roomManagementService.unmuteUser(username, function(response) {
        if (response.success) {
            alert('已成功解禁用户 ' + username);
            var idx = $scope.mutedUsers.indexOf(username);
            if (idx !== -1) {
                $scope.mutedUsers.splice(idx, 1);
            }
        } else {
            alert('解禁失败：' + response.message);
        }
    });
};

$scope.isRoomCreator = function() {
    return roomManagementService.isRoomCreator();
};

$scope.isUserMuted = function(username) {
    return roomManagementService.isMuted(username, $scope.mutedUsers);
};
```

- [ ] **Step 3: 添加事件处理**

添加：

```javascript
$scope.$on('you-have-been-kicked', function(event, data) {
    alert(data.message);
    $location.path('/login');
    $scope.$apply();
});

$scope.$on('user-kicked', function(event, data) {
    var idx = $scope.usersRoom.findIndex(u => u.username === data.kickedUsername);
    if (idx !== -1) {
        $scope.usersRoom.splice(idx, 1);
    }
    
    $scope.messages.push({
        username: '系统',
        msg: '用户 ' + data.kickedUsername + ' 已被管理员踢出房间',
        msgTime: new Date().toLocaleTimeString(),
        isSystemMessage: true
    });
});

$scope.$on('user-muted', function(event, data) {
    if (!$scope.mutedUsers.includes(data.mutedUsername)) {
        $scope.mutedUsers.push(data.mutedUsername);
    }
    
    $scope.messages.push({
        username: '系统',
        msg: '用户 ' + data.mutedUsername + ' 已被管理员禁言',
        msgTime: new Date().toLocaleTimeString(),
        isSystemMessage: true
    });
});

$scope.$on('user-unmuted', function(event, data) {
    var idx = $scope.mutedUsers.indexOf(data.unmutedUsername);
    if (idx !== -1) {
        $scope.mutedUsers.splice(idx, 1);
    }
    
    $scope.messages.push({
        username: '系统',
        msg: '用户 ' + data.unmutedUsername + ' 已被管理员解禁',
        msgTime: new Date().toLocaleTimeString(),
        isSystemMessage: true
    });
});
```

- [ ] **Step 4: 修改消息错误处理**

在 sendMsg 函数的错误回调中添加：

```javascript
// 在发送消息的 error callback 中
$scope.messageError = response.message;
// 5秒后自动清除
setTimeout(function() {
    $scope.messageError = '';
    $scope.$apply();
}, 5000);
```

- [ ] **Step 5: Commit**

```bash
cd /workspace
git add public/app/controllers/chatRoomController.js
git commit -m "feat: integrate management features in chatRoomController"
```

---

## Task 5: 修改 chatRoom.html 添加管理 UI

**Files:**
- Modify: `/workspace/public/app/views/chatRoom.html`

- [ ] **Step 1: 添加敏感词错误提示**

在输入框区域上方添加：

```html
<div class="alert alert-danger" ng-show="messageError" style="margin-bottom: 10px;">
  <strong>错误：</strong> {{messageError}}
  <button type="button" class="close" ng-click="messageError = ''">&times;</button>
</div>
```

- [ ] **Step 2: 在用户列表添加管理按钮**

找到用户列表部分，修改为：

```html
<div class="direct-chat-msg" ng-repeat="(i,user) in usersRoom">
  <div class="direct-chat-info clearfix">
    <span class="direct-chat-name pull-left">{{user.username}}</span>
    <span class="direct-chat-timestamp pull-right" ng-if="user.activo">
      <i class="fa fa-circle text-success"></i> Online
    </span>
    <span class="direct-chat-timestamp pull-right" ng-if="!user.activo">
      <i class="fa fa-circle text-muted"></i> Away
    </span>
    
    <span class="direct-chat-timestamp pull-right" 
          ng-if="isRoomCreator() && user.username !== rootScope.username">
      <button class="btn btn-xs btn-danger" 
              ng-click="kickUser(user.username)" 
              title="踢出用户">
        <i class="fa fa-ban"></i>
      </button>
      <button class="btn btn-xs" 
              ng-class="isUserMuted(user.username) ? 'btn-warning' : 'btn-default'"
              ng-click="isUserMuted(user.username) ? unmuteUser(user.username) : muteUser(user.username)" 
              title="{{isUserMuted(user.username) ? '解禁用户' : '禁言用户'}}">
        <i class="fa {{isUserMuted(user.username) ? 'fa-volume-up' : 'fa-volume-off'}}"></i>
      </button>
    </span>
    
    <span class="direct-chat-timestamp pull-right" 
          ng-if="isUserMuted(user.username)">
      <span class="label label-warning">已禁言</span>
    </span>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
cd /workspace
git add public/app/views/chatRoom.html
git commit -m "feat: add management UI in chatRoom.html"
```

---

## Task 6: 添加样式并测试

**Files:**
- Modify: `/workspace/public/app/css/style.css`

- [ ] **Step 1: 添加管理相关样式**

在 style.css 末尾添加：

```css
/* 管理功能样式 */
.message-actions .btn {
  margin-left: 5px;
}

.direct-chat-msg .system-message {
  text-align: center;
  color: var(--text-muted);
  font-style: italic;
  padding: 5px 0;
}

.label-warning {
  background-color: var(--warning-color);
}

.alert-danger {
  animation: shake 0.3s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
```

- [ ] **Step 2: Commit 样式**

```bash
cd /workspace
git add public/app/css/style.css
git commit -m "feat: add styles for management features"
```

- [ ] **Step 3: 运行服务器并测试**

```bash
cd /workspace
npm install
node app.js
```

预期：
- 服务器启动成功，在 http://localhost:8282 可访问
- 无控制台错误

- [ ] **Step 4: 最终 Commit（如果有更改）**

```bash
cd /workspace
git status
git add -A
git commit -m "feat: complete phase 3 management features"
```

---

## 实施总结

### 已完成任务清单

| Task | 内容 | 状态 |
|------|------|------|
| Task 1 | 创建 roomManager.js 后端模块 | ☐ |
| Task 2 | 集成 app.js 后端管理功能 | ☐ |
| Task 3 | 创建 roomManagementService.js 前端服务 | ☐ |
| Task 4 | 集成 chatRoomController.js 管理逻辑 | ☐ |
| Task 5 | 添加 chatRoom.html 管理 UI | ☐ |
| Task 6 | 添加样式并测试 | ☐ |

### 文件变更总结

**新建文件：**
- `/workspace/database/roomManager.js`
- `/workspace/public/app/services/roomManagementService.js`

**修改文件：**
- `/workspace/app.js`
- `/workspace/public/app/controllers/chatRoomController.js`
- `/workspace/public/app/views/chatRoom.html`
- `/workspace/public/app/css/style.css`

### 功能实现清单

- ✅ 房间创建者识别
- ✅ 用户踢出功能
- ✅ 用户禁言/解禁功能
- ✅ 敏感词过滤功能
- ✅ 管理 UI 界面
- ✅ 系统通知消息
