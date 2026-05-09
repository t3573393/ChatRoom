# 第一阶段：用户体验优化设计方案

**项目：** ChatRoom - NodeJS 实时聊天室

**阶段：** 第一阶段 - 用户体验优化（A）

**功能模块：**
- A1. 消息发送状态（发送中/已发送/发送失败）
- A2. 离线消息队列（断网后重连自动发送）
- A3. 打字状态优化（打字状态 + 草稿提示）

**作者：** Systenics Development Team

**创建日期：** 2026-05-09

**状态：** 待审核

---

## 一、需求概述

### 1.1 功能目标

**A1. 消息发送状态**
- 用户发送消息时显示实时状态
- 发送中：🔄 发送中
- 已发送：✓ 已发送
- 发送失败：❌ 发送失败（可点击重试）

**A2. 离线消息队列**
- 断网时消息暂存本地
- 重连后自动按顺序发送
- 发送后显示实时状态
- 失败时提供重试机制

**A3. 打字状态优化**
- 用户输入时显示"XXX 正在输入..."
- 停止输入 2 秒后自动消失
- 添加防抖处理
- 中断输入超过 30 秒提示"是否恢复草稿？"
- 自动保存输入草稿到本地存储

---

## 二、技术架构

### 2.1 模块化设计

采用 Angular Service 模式，将功能拆分为独立模块：

```
┌─────────────────────────────────────────────────────────┐
│                    Angular Application                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │ MessageStatus   │  │      TypingStatus           │ │
│  │    Service      │  │       Service               │ │
│  ├─────────────────┤  ├─────────────────────────────┤ │
│  │ • 消息状态追踪   │  │ • 打字状态广播             │ │
│  │ • 发送状态UI    │  │ • 草稿自动保存             │ │
│  │ • 重试机制      │  │ • 草稿恢复提示             │ │
│  └─────────────────┘  └─────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │              OfflineQueueService                   ││
│  ├─────────────────────────────────────────────────────┤│
│  │ • 离线消息队列管理                                 ││
│  │ • 自动重连检测                                     ││
│  │ • 队列消息自动发送                                 ││
│  │ • 发送状态同步                                     ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 技术依赖

**前端：**
- AngularJS Service（现有架构）
- Socket.io Client（现有）
- localStorage（草稿存储）
- $interval 服务（定时器）

**后端：**
- Socket.io Server（现有）
- Express（现有）

---

## 三、模块详细设计

### 3.1 MessageStatusService

**文件位置：** `public/app/services/messageStatusService.js`

**功能职责：**
- 管理消息的发送状态
- 提供状态更新接口
- 处理重试逻辑

**服务接口：**

```javascript
angular.module('Services')
.service('MessageStatusService', function() {
    
    // 消息状态枚举
    var MessageStatus = {
        PENDING: 'pending',      // 等待发送
        SENDING: 'sending',      // 发送中
        SENT: 'sent',           // 已发送
        FAILED: 'failed'        // 发送失败
    };
    
    // 消息状态映射表
    var statusMap = {};
    
    // 更新消息状态
    this.updateStatus = function(messageId, status) {};
    
    // 获取消息状态
    this.getStatus = function(messageId) {};
    
    // 标记消息发送成功
    this.markAsSent = function(messageId) {};
    
    // 标记消息发送失败
    this.markAsFailed = function(messageId) {};
    
    // 重试发送
    this.retry = function(messageId, sendCallback) {};
});
```

### 3.2 TypingStatusService

**文件位置：** `public/app/services/typingStatusService.js`

**功能职责：**
- 管理打字状态广播
- 自动保存草稿
- 草稿恢复提示

**服务接口：**

```javascript
angular.module('Services')
.service('TypingStatusService', function($interval, $localStorage) {
    
    var STORAGE_KEY = 'chatroom_draft';
    var DRAFT_TIMEOUT = 30000; // 30秒
    
    // 保存草稿
    this.saveDraft = function(roomCode, content) {};
    
    // 获取草稿
    this.getDraft = function(roomCode) {};
    
    // 清除草稿
    this.clearDraft = function(roomCode) {};
    
    // 检查草稿是否过期
    this.isDraftExpired = function(roomCode) {};
    
    // 发送打字状态
    this.sendTypingStatus = function(isTyping) {};
    
    // 停止打字计时器
    this.stopTypingTimer = function() {};
});
```

### 3.3 OfflineQueueService

**文件位置：** `public/app/services/offlineQueueService.js`

**功能职责：**
- 管理离线消息队列
- 检测网络状态
- 自动重连发送

**服务接口：**

```javascript
angular.module('Services')
.service('OfflineQueueService', function($rootScope, $interval, MessageStatusService) {
    
    var QUEUE_KEY = 'chatroom_offline_queue';
    var RECONNECT_INTERVAL = 5000; // 5秒检测一次
    
    // 添加消息到队列
    this.enqueue = function(message) {};
    
    // 获取队列消息
    this.getQueue = function() {};
    
    // 清空队列
    this.clearQueue = function() {};
    
    // 发送队列中的所有消息
    this.processQueue = function() {};
    
    // 网络状态变化处理
    this.onNetworkChange = function(isOnline) {};
    
    // 启动队列处理
    this.startProcessing = function() {};
    
    // 停止队列处理
    this.stopProcessing = function() {};
});
```

---

## 四、数据结构设计

### 4.1 消息状态对象

```javascript
{
    id: 'msg_1234567890',
    status: 'sending', // pending | sending | sent | failed
    retryCount: 0,
    maxRetries: 3,
    message: { /* 原始消息对象 */ },
    timestamp: '2026-05-09T10:30:00.000Z'
}
```

### 4.2 离线队列对象

```javascript
// localStorage 存储格式
{
    queue: [
        {
            id: 'msg_1234567890',
            content: 'Hello World',
            type: 'text',
            timestamp: '2026-05-09T10:30:00.000Z',
            retryCount: 0
        }
    ],
    lastSync: '2026-05-09T10:30:00.000Z'
}
```

### 4.3 草稿对象

```javascript
// localStorage 存储格式
{
    roomCode: {
        content: '输入的草稿内容',
        savedAt: '2026-05-09T10:30:00.000Z'
    }
}
```

---

## 五、前端交互设计

### 5.1 消息发送状态 UI

**位置：** 每条消息的右下角

**显示规则：**

| 状态 | 图标 | 文字 | 颜色 | 交互 |
|------|------|------|------|------|
| 发送中 | 🔄 | 发送中 | 灰色 | 无 |
| 已发送 | ✓ | 已发送 | 绿色 | 无 |
| 发送失败 | ❌ | 发送失败 | 红色 | 点击重试 |

**HTML 结构：**

```html
<div class="message-status" ng-show="message.showStatus">
    <span ng-show="message.status === 'sending'" class="status-sending">
        🔄 发送中
    </span>
    <span ng-show="message.status === 'sent'" class="status-sent">
        ✓ 已发送
    </span>
    <span ng-show="message.status === 'failed'" class="status-failed" 
          ng-click="retryMessage(message.id)">
        ❌ 发送失败
    </span>
</div>
```

### 5.2 打字状态显示

**位置：** 在线成员列表中每个用户旁边

**显示规则：**
- 用户开始输入时：显示"正在输入..."
- 用户停止输入 2 秒后：隐藏状态
- 防抖处理：输入间隔少于 300ms 不触发

**HTML 结构：**

```html
<div class="user-status" ng-show="user.isWritting">
    {{ user.username }} 正在输入...
</div>
```

### 5.3 草稿恢复提示

**位置：** 输入框上方

**触发条件：** 用户中断输入超过 30 秒且有未发送的草稿

**显示内容：** "检测到未发送的内容，是否恢复？[恢复] [清除]"

**HTML 结构：**

```html
<div class="draft-recovery" ng-show="showDraftRecovery">
    <span>检测到未发送的内容，是否恢复？</span>
    <button ng-click="recoverDraft()">恢复</button>
    <button ng-click="clearDraft()">清除</button>
</div>
```

### 5.4 离线队列提示

**位置：** 页面顶部

**显示内容：** "检测到网络已断开，消息将在恢复连接后自动发送"

**HTML 结构：**

```html
<div class="offline-banner" ng-show="isOffline">
    <i class="fa fa-wifi"></i>
    网络已断开，消息将在恢复连接后自动发送
</div>
```

---

## 六、样式设计

### 6.1 消息状态样式

```css
/* 消息状态 */
.message-status {
    font-size: 12px;
    margin-top: 5px;
    text-align: right;
}

.message-status .status-sending {
    color: #999;
}

.message-status .status-sent {
    color: #28a745;
}

.message-status .status-failed {
    color: #dc3545;
    cursor: pointer;
}

.message-status .status-failed:hover {
    text-decoration: underline;
}

/* 打字状态 */
.user-status {
    font-size: 11px;
    color: #666;
    font-style: italic;
}

/* 草稿恢复提示 */
.draft-recovery {
    background-color: #fff3cd;
    border: 1px solid #ffc107;
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 4px;
}

.draft-recovery button {
    margin-left: 10px;
    padding: 5px 15px;
}

/* 离线提示 */
.offline-banner {
    background-color: #dc3545;
    color: white;
    padding: 10px;
    text-align: center;
    position: fixed;
    top: 0;
    width: 100%;
    z-index: 9999;
}
```

---

## 七、后端 Socket 事件设计

### 7.1 新增事件

**client → server:**
- `typing-started` - 用户开始输入
- `typing-stopped` - 用户停止输入

**server → client:**
- `user-typing` - 通知其他用户某人在输入

### 7.2 事件数据结构

```javascript
// typing-started / typing-stopped
{
    username: 'user1',
    roomCode: 'room123'
}

// user-typing
{
    username: 'user1',
    isTyping: true,
    roomCode: 'room123'
}
```

---

## 八、错误处理

### 8.1 前端错误处理

| 场景 | 处理方式 |
|------|----------|
| 消息发送失败 | 显示失败状态，点击重试 |
| 重试 3 次仍失败 | 保留消息，提示用户手动处理 |
| 离线队列发送失败 | 保留在队列，等待重连 |
| 草稿保存失败 | 降级处理，不影响用户输入 |

### 8.2 重试机制

```javascript
var MAX_RETRIES = 3;
var RETRY_DELAY = 2000; // 2秒

function retryWithBackoff(message, callback) {
    var retries = 0;
    
    function attempt() {
        if (retries >= MAX_RETRIES) {
            callback(new Error('Max retries reached'));
            return;
        }
        
        sendMessage(message, function(err, result) {
            if (err) {
                retries++;
                setTimeout(attempt, RETRY_DELAY * retries);
            } else {
                callback(null, result);
            }
        });
    }
    
    attempt();
}
```

---

## 九、实施计划

### 9.1 第一阶段任务分解

| 任务 | 优先级 | 说明 |
|------|--------|------|
| T1 | 高 | 创建 MessageStatusService |
| T2 | 高 | 创建 TypingStatusService |
| T3 | 高 | 创建 OfflineQueueService |
| T4 | 高 | 修改 chatRoomController 集成服务 |
| T5 | 中 | 添加消息状态 UI |
| T6 | 中 | 添加打字状态优化 |
| T7 | 中 | 添加草稿恢复功能 |
| T8 | 中 | 添加离线队列 UI |
| T9 | 中 | 添加样式 |
| T10 | 低 | 测试和优化 |

### 9.2 文件修改清单

**新建文件：**
- `public/app/services/messageStatusService.js`
- `public/app/services/typingStatusService.js`
- `public/app/services/offlineQueueService.js`

**修改文件：**
- `public/app/js/app.js` - 添加 Socket 事件
- `app.js` - 无需修改（Socket 事件已支持）
- `public/app/controllers/chatRoomController.js` - 集成服务
- `public/app/views/chatRoom.html` - 添加 UI
- `public/app/css/style.css` - 添加样式

---

## 十、测试计划

### 10.1 功能测试

| 测试项 | 测试内容 |
|--------|----------|
| 消息状态 | 发送中/已发送/失败状态正确显示 |
| 状态重试 | 失败消息点击重试后重新发送 |
| 离线队列 | 断网后消息加入队列，重连后自动发送 |
| 打字状态 | 输入时正确显示"正在输入" |
| 草稿保存 | 刷新页面后草稿正确恢复 |
| 草稿过期 | 30秒后提示恢复草稿 |

### 10.2 边界测试

| 测试项 | 测试内容 |
|--------|----------|
| 网络波动 | 快速断连重连，队列处理正确 |
| 大量消息 | 连续发送多条消息，状态不混乱 |
| 并发发送 | 多用户同时发送，状态独立 |

---

## 十一、后续阶段预告

完成第一阶段后，将继续实施：

- **第二阶段（B）**：界面/交互优化
  - 深色模式支持
  - 消息引用/回复功能
  - @提及功能

- **第三阶段（C）**：管理功能
  - 聊天室管理
  - 用户踢出/禁言
  - 敏感词过滤

- **第四阶段（D）**：技术优化
  - 代码质量改善
  - 日志系统
  - 错误监控

---

## 附录

### A. 术语表

| 术语 | 说明 |
|------|------|
| MessageStatusService | 消息状态管理服务 |
| TypingStatusService | 打字状态和草稿管理服务 |
| OfflineQueueService | 离线消息队列管理服务 |
| 草稿 | 用户输入但未发送的内容 |
| 离线队列 | 断网期间暂存的消息列表 |

### B. 配置参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| MAX_RETRIES | 3 | 最大重试次数 |
| RETRY_DELAY | 2000 | 重试延迟（毫秒） |
| DRAFT_TIMEOUT | 30000 | 草稿过期时间（毫秒） |
| TYPING_DEBOUNCE | 300 | 打字状态防抖（毫秒） |
| TYPING_DISPLAY_TIME | 2000 | 打字状态显示时间（毫秒） |
