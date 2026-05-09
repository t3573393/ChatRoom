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

## 十、测试与验证计划

### 10.1 功能测试用例

#### A1 - 消息发送状态测试

**测试用例 1.1：消息发送成功流程**
```
前置条件：用户已登录并进入聊天室
操作步骤：
  1. 在输入框输入"测试消息123"
  2. 点击发送按钮
预期结果：
  - 消息立即显示，状态为"🔄 发送中"
  - Socket 确认后状态变为"✓ 已发送"
  - 消息正确显示在聊天列表中
验证命令：
  curl -s http://localhost:8282/v1/messages/{roomCode} | jq '.messages | length'
```

**测试用例 1.2：消息发送失败重试**
```
前置条件：服务器正常运行
操作步骤：
  1. 发送消息"测试失败消息"
  2. 模拟网络错误（断开网络 2 秒后恢复）
预期结果：
  - 消息显示"❌ 发送失败"状态
  - 点击失败状态，显示重试选项
  - 重试成功后状态变为"✓ 已发送"
```

**测试用例 1.3：连续发送多条消息**
```
前置条件：用户已登录
操作步骤：
  1. 快速连续发送 5 条消息
预期结果：
  - 每条消息状态独立
  - 状态更新互不影响
  - 消息按发送顺序显示
```

#### A2 - 离线消息队列测试

**测试用例 2.1：离线期间消息存储**
```
前置条件：用户已登录，网络正常
操作步骤：
  1. 断开网络连接
  2. 发送消息"离线消息1"
  3. 发送消息"离线消息2"
预期结果：
  - 页面显示离线提示横幅
  - 消息显示"🔄 发送中"状态
  - 消息不消失，等待发送
验证命令：
  localStorage.getItem('chatroom_offline_queue')
  // 应返回包含2条消息的队列
```

**测试用例 2.2：重连后自动发送**
```
前置条件：离线队列中有待发送消息
操作步骤：
  1. 恢复网络连接
预期结果：
  - 离线提示横幅消失
  - 队列中的消息自动按序发送
  - 每条消息状态从"🔄 发送中"变为"✓ 已发送"
  - 队列清空
验证命令：
  localStorage.getItem('chatroom_offline_queue')
  // 应返回空队列或 null
```

**测试用例 2.3：重连后仍有离线消息**
```
前置条件：离线队列中有消息，网络不稳定
操作步骤：
  1. 网络恢复后立即断开
  2. 等待 3 秒后重新连接
预期结果：
  - 系统自动重试发送未成功的消息
  - 最终所有消息成功发送
```

#### A3 - 打字状态优化测试

**测试用例 3.1：打字状态显示**
```
前置条件：用户A和用户B同时在线
操作步骤：
  1. 用户A开始输入
预期结果：
  - 用户B看到"A 正在输入..."
  - 2秒无输入后状态消失
  - 300ms 防抖处理正确
```

**测试用例 3.2：草稿自动保存**
```
前置条件：用户在输入框中输入内容
操作步骤：
  1. 输入"草稿测试内容"
  2. 不发送，刷新页面
预期结果：
  - 刷新后显示草稿恢复提示
  - 点击"恢复"后内容回到输入框
验证命令：
  localStorage.getItem('chatroom_draft')
  // 应返回 {content: "草稿测试内容", savedAt: "..."}
```

**测试用例 3.3：草稿过期提示**
```
前置条件：用户输入后停止 30 秒
操作步骤：
  1. 输入内容
  2. 停止输入 35 秒
预期结果：
  - 显示"检测到未发送的内容，是否恢复？"
  - 提供"恢复"和"清除"两个选项
```

### 10.2 集成测试流程

#### 测试脚本：test-ux-optimization.sh

```bash
#!/bin/bash
# 第一阶段 UX 优化集成测试脚本

BASE_URL="http://localhost:8282"
ROOM_CODE="test_room_$(date +%s)"

echo "========================================"
echo "UX 优化功能集成测试"
echo "========================================"
echo "测试房间：$ROOM_CODE"
echo ""

# 启动服务器
echo "[1/5] 启动服务器..."
node app.js &
SERVER_PID=$!
sleep 3

# 测试 API 连通性
echo "[2/5] 测试 API 连通性..."
curl -s "$BASE_URL/" | grep -q "Chat" && echo "✓ API 正常" || echo "✗ API 异常"

# 测试消息状态
echo "[3/5] 测试消息发送状态..."
RESPONSE=$(curl -s -X POST "$BASE_URL/v1/messages" \
  -H "Content-Type: application/json" \
  -d "{\"roomCode\":\"$ROOM_CODE\",\"username\":\"tester\",\"messageType\":\"text\",\"messageContent\":\"状态测试\"}")
echo "$RESPONSE" | grep -q '"success":true' && echo "✓ 消息状态 API 正常" || echo "✗ 消息状态 API 异常"

# 测试消息查询
echo "[4/5] 测试历史消息查询..."
MESSAGES=$(curl -s "$BASE_URL/v1/messages/$ROOM_CODE")
echo "$MESSAGES" | grep -q '"success":true' && echo "✓ 消息查询 API 正常" || echo "✗ 消息查询 API 异常"

# 清理
echo "[5/5] 清理测试数据..."
kill $SERVER_PID 2>/dev/null
rm -f database/chat_history.db

echo ""
echo "========================================"
echo "测试完成"
echo "========================================"
```

### 10.3 验收标准

#### 功能验收清单

| 编号 | 功能点 | 验收标准 | 测试方法 |
|------|--------|----------|----------|
| VA1.1 | 消息发送状态显示 | 发送中/已发送/失败状态正确显示 | 手动测试 + 日志验证 |
| VA1.2 | 状态重试功能 | 失败消息可点击重试 | 手动测试 |
| VA1.3 | 多消息状态独立 | 连续发送不混乱 | 手动测试 |
| VA2.1 | 离线消息存储 | 断网后消息存入队列 | localStorage 检查 |
| VA2.2 | 自动重连发送 | 重连后自动发送队列消息 | 手动测试 + 日志验证 |
| VA2.3 | 队列状态同步 | 发送后队列正确清空 | localStorage 检查 |
| VA3.1 | 打字状态显示 | 输入时正确显示状态 | 多用户测试 |
| VA3.2 | 草稿自动保存 | 刷新后草稿可恢复 | localStorage 检查 |
| VA3.3 | 草稿过期提示 | 30秒后正确提示 | 手动测试 + 计时器验证 |

#### 性能验收标准

| 指标 | 标准 | 测试方法 |
|------|------|----------|
| 消息发送响应时间 | < 500ms | 网络请求计时 |
| 状态更新延迟 | < 200ms | 日志时间戳对比 |
| 草稿保存延迟 | < 50ms | localStorage 操作计时 |
| 离线队列大小 | 支持至少 100 条消息 | 批量测试 |
| UI 渲染性能 | 无明显卡顿 | 手动体验 |

### 10.4 回归测试

每次代码更新后，必须执行以下回归测试：

**基础功能回归：**
1. 用户登录/登出正常
2. 消息发送/接收正常
3. 历史消息加载正常
4. 文件上传/下载正常

**新功能回归：**
1. 消息状态显示正常
2. 离线队列工作正常
3. 打字状态正常
4. 草稿功能正常

**浏览器兼容性回归：**
- Chrome（最新版本）
- Firefox（最新版本）
- Safari（最新版本）
- Edge（最新版本）

### 10.5 监控指标

上线后需要监控的指标：

```javascript
// 性能监控指标
var METRICS = {
    // 消息发送性能
    messageSendTime: [],      // 发送耗时数组
    messageSendSuccess: 0,    // 成功次数
    messageSendFailed: 0,    // 失败次数
    
    // 离线队列
    offlineQueueSize: 0,     // 当前队列大小
    offlineQueueProcessed: 0, // 已处理消息数
    
    // 打字状态
    typingEvents: 0,        // 打字事件数
    draftRecoveries: 0,      // 草稿恢复次数
    
    // 网络状态
    disconnections: 0,       // 断连次数
    reconnections: 0         // 重连次数
};
```

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
