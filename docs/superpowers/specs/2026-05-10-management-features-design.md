# 第三阶段：管理功能设计方案

**项目：** ChatRoom - NodeJS 实时聊天室

**阶段：** 第三阶段 - 管理功能（C）

**功能模块：**
- C1. 房间管理（房间创建者即管理员）
- C2. 用户踢出/禁言功能
- C3. 敏感词过滤

**作者：** Systenics Development Team

**创建日期：** 2026-05-10

**状态：** 待审核

---

## 一、需求概述

### 1.1 功能目标

**C1. 房间管理**
- 识别房间创建者（第一个进入房间的用户自动成为管理员）
- 管理员可查看房间成员列表
- 管理员可管理房间成员

**C2. 用户踢出/禁言**
- 踢出功能：将用户从当前房间移除
- 禁言功能：禁止用户发送消息
- 解禁功能：恢复用户发言权限

**C3. 敏感词过滤**
- 预设敏感词列表（在 app.js 配置）
- 包含敏感词的消息自动被拦截
- 显示友好提示信息

### 1.2 非功能目标

- 简单易用，无需复杂的权限系统
- 性能好，不影响实时聊天体验
- 易于扩展，未来可增加更多管理功能

---

## 二、技术架构

### 2.1 整体架构

采用**独立管理模块**的架构：

```
后端管理模块
  ├── roomManager.js (新建)
  │     ├── 房间状态管理
  │     ├── 踢出/禁言逻辑
  │     └── 敏感词过滤
  │
  └── app.js (修改)
        └── 集成 roomManager 模块

前端管理模块
  ├── roomManagementService.js (新建)
  │     ├── 管理服务封装
  │     └── Socket.io 事件封装
  │
  ├── chatRoomController.js (修改)
  │     └── 管理 UI 逻辑
  │
  └── chatRoom.html (修改)
        └── 管理面板 UI
```

### 2.2 技术选择

| 组件 | 技术 | 说明 |
|------|------|------|
| 后端管理 | Node.js 模块 | 独立的 roomManager.js |
| 数据存储 | 内存存储 | 房间状态、禁言列表存内存 |
| 通信 | Socket.io | 管理事件通过 Socket 传输 |
| 前端服务 | AngularJS Service | 独立的 roomManagementService |
| UI | Bootstrap/AdminLTE | 现有 UI 框架 |

---

## 三、后端模块详细设计

### 3.1 roomManager.js (新建)

**文件位置：** `/workspace/database/roomManager.js`

**功能模块：**

#### 3.1.1 房间状态管理

```javascript
// 房间状态
var roomStates = {};
/*
roomStates 结构示例：
{
  "room123": {
    creator: "user1",
    mutes: ["user2", "user3"],
    members: ["user1", "user2", "user3"]
  },
  "room456": {
    creator: "admin",
    mutes: [],
    members: ["admin", "user4"]
  }
}
*/

// 添加房间创建者
function addRoomCreator(roomCode, username) {
  if (!roomStates[roomCode]) {
    roomStates[roomCode] = {
      creator: username,
      mutes: [],
      members: [username]
    };
    return true; // 是新房间，当前用户是创建者
  } else {
    // 添加到成员列表（如果不存在）
    if (!roomStates[roomCode].members.includes(username)) {
      roomStates[roomCode].members.push(username);
    }
    return false; // 房间已存在
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
```

#### 3.1.2 踢出/禁言功能

```javascript
// 踢出用户
function kickUser(roomCode, targetUsername) {
  if (!roomStates[roomCode]) return false;
  
  removeRoomMember(roomCode, targetUsername);
  
  // 如果被禁言也移除禁言
  var muteIdx = roomStates[roomCode].mutes.indexOf(targetUsername);
  if (muteIdx !== -1) {
    roomStates[roomCode].mutes.splice(muteIdx, 1);
  }
  
  return true;
}

// 禁言用户
function muteUser(roomCode, targetUsername) {
  if (!roomStates[roomCode]) return false;
  
  if (!roomStates[roomCode].mutes.includes(targetUsername)) {
    roomStates[roomCode].mutes.push(targetUsername);
  }
  
  return true;
}

// 解禁用户
function unmuteUser(roomCode, targetUsername) {
  if (!roomStates[roomCode]) return false;
  
  var idx = roomStates[roomCode].mutes.indexOf(targetUsername);
  if (idx !== -1) {
    roomStates[roomCode].mutes.splice(idx, 1);
  }
  
  return true;
}

// 判断用户是否被禁言
function isMuted(roomCode, username) {
  return roomStates[roomCode] && 
         roomStates[roomCode].mutes.includes(username);
}
```

#### 3.1.3 敏感词过滤

```javascript
// 敏感词列表
var sensitiveWords = [
  '敏感词1',
  '敏感词2',
  '广告',
  '垃圾',
  '测试敏感词',
  // 可以继续添加
];

// 检查是否包含敏感词
function containsSensitiveWords(text) {
  if (!text) return false;
  
  for (var i = 0; i < sensitiveWords.length; i++) {
    if (text.toLowerCase().indexOf(sensitiveWords[i].toLowerCase()) !== -1) {
      return true;
    }
  }
  
  return false;
}

// 过滤敏感词（可选，这里只检测不替换）
function filterSensitiveWords(text) {
  return {
    contains: containsSensitiveWords(text),
    original: text
  };
}

// 添加敏感词
function addSensitiveWord(word) {
  if (!sensitiveWords.includes(word)) {
    sensitiveWords.push(word);
  }
}

// 获取敏感词列表
function getSensitiveWords() {
  return sensitiveWords.slice(); // 返回副本防止修改
}
```

#### 3.1.4 模块导出

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

---

### 3.2 app.js (修改)

**文件位置：** `/workspace/app.js`

#### 3.2.1 引入 roomManager 模块

```javascript
// 在文件顶部添加
var roomManager = require('./database/roomManager');
```

#### 3.2.2 修改 'new user' 事件处理

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
        
        // 【新增】记录房间创建者
        var isCreator = roomManager.addRoomCreator(data.roomCode, data.username);
        socket.isRoomCreator = isCreator;
    }
});
```

#### 3.2.3 添加管理事件处理

```javascript
// 踢出用户
socket.on('kick-user', function(data, callback) {
    if (!socket.username || !socket.roomCode) {
        callback({success: false, message: '参数错误'});
        return;
    }
    
    // 验证是否是房间创建者
    if (!roomManager.isRoomCreator(socket.roomCode, socket.username)) {
        callback({success: false, message: '您没有权限执行此操作'});
        return;
    }
    
    // 不能踢出自己
    if (data.targetUsername === socket.username) {
        callback({success: false, message: '不能踢出自己'});
        return;
    }
    
    // 执行踢出
    var success = roomManager.kickUser(socket.roomCode, data.targetUsername);
    
    if (success) {
        // 找到目标用户的 socket 并断开连接
        if (nickname[data.targetUsername]) {
            var targetSocket = nickname[data.targetUsername];
            
            // 通知被踢用户
            targetSocket.emit('you-have-been-kicked', {
                roomCode: socket.roomCode,
                message: '您已被管理员踢出房间'
            });
            
            // 断开连接
            targetSocket.disconnect(true);
            
            // 从 nickname 列表移除
            delete nickname[data.targetUsername];
        }
        
        // 通知房间其他用户
        ios.sockets.in(socket.roomCode).emit('user-kicked', {
            kickedUsername: data.targetUsername,
            operator: socket.username
        });
        
        callback({success: true});
    } else {
        callback({success: false, message: '操作失败'});
    }
});

// 禁言用户
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
        // 通知房间其他用户
        ios.sockets.in(socket.roomCode).emit('user-muted', {
            mutedUsername: data.targetUsername,
            operator: socket.username
        });
        
        callback({success: true});
    } else {
        callback({success: false, message: '操作失败'});
    }
});

// 解禁用户
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
        // 通知房间其他用户
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

#### 3.2.4 修改消息发送，添加敏感词过滤和禁言检查

```javascript
socket.on('send-message', function(data, callback) {
    if (!socket.username || !socket.roomCode) {
        callback({success: false, message: '参数错误'});
        return;
    }
    
    // 【新增】检查是否被禁言
    if (roomManager.isMuted(socket.roomCode, socket.username)) {
        callback({success: false, message: '您已被管理员禁言，无法发送消息'});
        return;
    }
    
    // 【新增】敏感词过滤
    var filterResult = roomManager.filterSensitiveWords(data.msg);
    if (filterResult.contains) {
        callback({success: false, message: '消息包含敏感词，请修改后重试'});
        return;
    }
    
    // 原有消息发送逻辑
    // ...
});
```

#### 3.2.5 添加断开连接处理

```javascript
socket.on('disconnect', function() {
    if (socket.username && socket.roomCode) {
        // 从房间成员中移除
        roomManager.removeRoomMember(socket.roomCode, socket.username);
        
        // 从 nickname 列表移除
        if (nickname[socket.username]) {
            delete nickname[socket.username];
        }
    }
});
```

---

## 四、前端模块详细设计

### 4.1 roomManagementService.js (新建)

**文件位置：** `/workspace/public/app/services/roomManagementService.js`

```javascript
'use strict';

app.factory('roomManagementService', ['$rootScope', 'socket', function($rootScope, socket) {
    var service = {};
    
    // 踢出用户
    service.kickUser = function(targetUsername, callback) {
        socket.emit('kick-user', {
            targetUsername: targetUsername
        }, function(response) {
            if (callback) {
                callback(response);
            }
        });
    };
    
    // 禁言用户
    service.muteUser = function(targetUsername, callback) {
        socket.emit('mute-user', {
            targetUsername: targetUsername
        }, function(response) {
            if (callback) {
                callback(response);
            }
        });
    };
    
    // 解禁用户
    service.unmuteUser = function(targetUsername, callback) {
        socket.emit('unmute-user', {
            targetUsername: targetUsername
        }, function(response) {
            if (callback) {
                callback(response);
            }
        });
    };
    
    // 判断当前用户是否是房间创建者
    service.isRoomCreator = function() {
        return $rootScope.isRoomCreator || false;
    };
    
    // 判断用户是否被禁言
    service.isMuted = function(username, mutedUsers) {
        return mutedUsers && mutedUsers.includes(username);
    };
    
    // 注册事件监听
    service.registerEventListeners = function($scope) {
        // 监听被踢出事件
        socket.on('you-have-been-kicked', function(data) {
            $scope.$emit('you-have-been-kicked', data);
        });
        
        // 监听用户被踢出事件
        socket.on('user-kicked', function(data) {
            $scope.$emit('user-kicked', data);
        });
        
        // 监听用户被禁言事件
        socket.on('user-muted', function(data) {
            $scope.$emit('user-muted', data);
        });
        
        // 监听用户被解禁事件
        socket.on('user-unmuted', function(data) {
            $scope.$emit('user-unmuted', data);
        });
    };
    
    return service;
}]);
```

---

### 4.2 chatRoomController.js (修改)

**文件位置：** `/workspace/public/app/controllers/chatRoomController.js`

#### 4.2.1 引入服务并初始化

```javascript
// 在 controller 依赖中添加 roomManagementService
app.controller('chatRoomController', ['$scope', '$rootScope', '$window', 
    '$filter', '$location', 'socket', 'sendImageService', 
    'messageStatusService', 'typingStatusService', 'offlineQueueService',
    'roomManagementService', 
    function($scope, $rootScope, $window, $filter, $location, socket, 
        sendImageService, messageStatusService, typingStatusService, 
        offlineQueueService, roomManagementService) {
    
    // 初始化管理相关变量
    $scope.mutedUsers = [];  // 被禁言用户列表
    $rootScope.isRoomCreator = false;  // 是否是房间创建者
    
    // 注册管理事件监听
    roomManagementService.registerEventListeners($scope);
    
    // ...
}]);
```

#### 4.2.2 管理功能函数

```javascript
// 踢出用户
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

// 禁言用户
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

// 解禁用户
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

// 判断是否是房间创建者
$scope.isRoomCreator = function() {
    return roomManagementService.isRoomCreator();
};

// 判断用户是否被禁言
$scope.isUserMuted = function(username) {
    return roomManagementService.isMuted(username, $scope.mutedUsers);
};
```

#### 4.2.3 事件处理

```javascript
// 监听自己被踢出事件
$scope.$on('you-have-been-kicked', function(event, data) {
    alert(data.message);
    // 跳转到登录页面
    $location.path('/login');
    $scope.$apply();
});

// 监听其他用户被踢出事件
$scope.$on('user-kicked', function(event, data) {
    // 从用户列表中移除被踢用户
    var idx = $scope.usersRoom.findIndex(u => u.username === data.kickedUsername);
    if (idx !== -1) {
        $scope.usersRoom.splice(idx, 1);
    }
    
    // 添加系统消息
    $scope.messages.push({
        username: '系统',
        msg: '用户 ' + data.kickedUsername + ' 已被管理员踢出房间',
        msgTime: new Date().toLocaleTimeString(),
        isSystemMessage: true
    });
});

// 监听用户被禁言事件
$scope.$on('user-muted', function(event, data) {
    if (!$scope.mutedUsers.includes(data.mutedUsername)) {
        $scope.mutedUsers.push(data.mutedUsername);
    }
    
    // 添加系统消息
    $scope.messages.push({
        username: '系统',
        msg: '用户 ' + data.mutedUsername + ' 已被管理员禁言',
        msgTime: new Date().toLocaleTimeString(),
        isSystemMessage: true
    });
});

// 监听用户被解禁事件
$scope.$on('user-unmuted', function(event, data) {
    var idx = $scope.mutedUsers.indexOf(data.unmutedUsername);
    if (idx !== -1) {
        $scope.mutedUsers.splice(idx, 1);
    }
    
    // 添加系统消息
    $scope.messages.push({
        username: '系统',
        msg: '用户 ' + data.unmutedUsername + ' 已被管理员解禁',
        msgTime: new Date().toLocaleTimeString(),
        isSystemMessage: true
    });
});

// 接收新用户连接时，判断是否是房间创建者
socket.on('new user', function(data) {
    // ... 原有代码
    
    // 【新增】保存是否是房间创建者
    if (data.username === $rootScope.username && data.isRoomCreator) {
        $rootScope.isRoomCreator = true;
    }
});
```

---

### 4.3 chatRoom.html (修改)

**文件位置：** `/workspace/public/app/views/chatRoom.html`

#### 4.3.1 用户列表添加管理按钮

```html
<!-- 在用户列表项中添加管理按钮 -->
<div class="direct-chat-msg" ng-repeat="(i,user) in usersRoom">
  <div class="direct-chat-info clearfix">
    <span class="direct-chat-name pull-left">{{user.username}}</span>
    <span class="direct-chat-timestamp pull-right" ng-if="user.activo">
      <i class="fa fa-circle text-success"></i> Online
    </span>
    <span class="direct-chat-timestamp pull-right" ng-if="!user.activo">
      <i class="fa fa-circle text-muted"></i> Away
    </span>
    
    <!-- 【新增】管理按钮（仅管理员可见） -->
    <span class="direct-chat-timestamp pull-right" 
          ng-if="isRoomCreator() && user.username !== rootScope.username">
      <!-- 踢出按钮 -->
      <button class="btn btn-xs btn-danger" 
              ng-click="kickUser(user.username)" 
              title="踢出用户">
        <i class="fa fa-ban"></i>
      </button>
      <!-- 禁言/解禁按钮 -->
      <button class="btn btn-xs" 
              ng-class="isUserMuted(user.username) ? 'btn-warning' : 'btn-default'"
              ng-click="isUserMuted(user.username) ? unmuteUser(user.username) : muteUser(user.username)" 
              title="{{isUserMuted(user.username) ? '解禁用户' : '禁言用户'}}">
        <i class="fa {{isUserMuted(user.username) ? 'fa-volume-up' : 'fa-volume-off'}}"></i>
      </button>
    </span>
    
    <!-- 【新增】被禁言标记 -->
    <span class="direct-chat-timestamp pull-right" 
          ng-if="isUserMuted(user.username)">
      <span class="label label-warning">已禁言</span>
    </span>
  </div>
</div>
```

#### 4.3.2 添加敏感词错误提示

```html
<!-- 在输入框下方添加错误提示 -->
<div class="alert alert-danger" ng-show="messageError" style="margin-bottom: 10px;">
  <strong>错误：</strong> {{messageError}}
  <button type="button" class="close" ng-click="messageError = ''">&times;</button>
</div>
```

---

### 4.4 style.css (修改)

**文件位置：** `/workspace/public/app/css/style.css`

```css
/* 管理按钮样式 */
.message-actions .btn {
  margin-left: 5px;
}

/* 系统消息样式 */
.direct-chat-msg .system-message {
  text-align: center;
  color: var(--text-muted);
  font-style: italic;
  padding: 5px 0;
}

/* 禁言标记样式 */
.label-warning {
  background-color: var(--warning-color);
}

/* 敏感词提示动画 */
.alert-danger {
  animation: shake 0.3s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
```

---

## 五、功能流程设计

### 5.1 房间创建流程

```
第一个用户进入房间
  ↓
后端判断房间不存在
  ↓
将用户设为房间创建者
  ↓
保存到 roomStates
  ↓
通知前端该用户是管理员
```

### 5.2 踢出用户流程

```
管理员点击踢出按钮
  ↓
前端显示确认对话框
  ↓
用户确认后发送 kick-user 事件
  ↓
后端验证权限
  ↓
验证通过 → 执行踢出
  ↓
断开目标用户连接
  ↓
通知所有用户
```

### 5.3 禁言用户流程

```
管理员点击禁言按钮
  ↓
前端确认后发送 mute-user 事件
  ↓
后端验证权限
  ↓
验证通过 → 将用户加入 mutes 列表
  ↓
通知所有用户
```

### 5.4 敏感词过滤流程

```
用户发送消息
  ↓
后端检查消息内容
  ↓
如果包含敏感词 → 返回错误
  ↓
如果不包含 → 正常发送
  ↓
前端显示错误提示
```

---

## 六、错误处理

### 6.1 权限错误

| 场景 | 错误处理 |
|------|----------|
| 非管理员尝试踢出用户 | 显示「您没有权限执行此操作」 |
| 管理员尝试踢出自己 | 显示「不能踢出自己」 |
| 管理员尝试禁言自己 | 显示「不能禁言自己」 |

### 6.2 参数错误

| 场景 | 错误处理 |
|------|----------|
| 缺少 username 或 roomCode | 显示「参数错误」 |
| 目标用户不存在 | 显示「操作失败」 |

### 6.3 禁言用户发送消息

| 场景 | 错误处理 |
|------|----------|
| 被禁言用户尝试发送消息 | 显示「您已被管理员禁言，无法发送消息」 |

### 6.4 敏感词

| 场景 | 错误处理 |
|------|----------|
| 消息包含敏感词 | 显示「消息包含敏感词，请修改后重试」 |

---

## 七、测试计划

### 7.1 房间管理测试

| 测试项 | 测试内容 |
|--------|----------|
| 第一个用户进入房间 | 应该是管理员 |
| 后续用户进入房间 | 不应该是管理员 |
| 管理员看到管理按钮 | 应该显示踢出/禁言按钮 |
| 非管理员不看到管理按钮 | 不应该显示管理按钮 |

### 7.2 踢出功能测试

| 测试项 | 测试内容 |
|--------|----------|
| 管理员踢出用户 | 用户应该被断开连接 |
| 非管理员尝试踢出 | 应该显示权限错误 |
| 管理员尝试踢出自己 | 应该显示错误 |
| 其他用户看到踢出通知 | 应该显示系统消息 |

### 7.3 禁言功能测试

| 测试项 | 测试内容 |
|--------|----------|
| 管理员禁言用户 | 用户应该被标记为禁言 |
| 被禁言用户发送消息 | 应该显示禁言提示 |
| 管理员解禁用户 | 用户应该恢复发言 |
| 其他用户看到禁言通知 | 应该显示系统消息 |

### 7.4 敏感词过滤测试

| 测试项 | 测试内容 |
|--------|----------|
| 包含敏感词的消息 | 应该被拦截 |
| 不包含敏感词的消息 | 应该正常发送 |
| 大小写敏感词 | 应该都能识别 |

---

## 八、后续阶段预告

- **第四阶段（D）：** 技术优化
  - 代码质量改善
  - 日志系统
  - 错误监控

---

## 附录

### A. Socket 事件列表

| 事件名 | 方向 | 说明 |
|--------|------|------|
| kick-user | 客户端 → 服务器 | 踢出用户 |
| mute-user | 客户端 → 服务器 | 禁言用户 |
| unmute-user | 客户端 → 服务器 | 解禁用户 |
| you-have-been-kicked | 服务器 → 客户端 | 通知被踢用户 |
| user-kicked | 服务器 → 客户端 | 广播用户被踢 |
| user-muted | 服务器 → 客户端 | 广播用户被禁言 |
| user-unmuted | 服务器 → 客户端 | 广播用户被解禁 |

### B. 数据结构参考

```javascript
// 房间状态
roomStates = {
  "room123": {
    creator: "user1",
    mutes: ["user2", "user3"],
    members: ["user1", "user4"]
  }
};

// 敏感词列表
sensitiveWords = [
  "敏感词1",
  "敏感词2",
  "广告",
  "垃圾"
];
```
