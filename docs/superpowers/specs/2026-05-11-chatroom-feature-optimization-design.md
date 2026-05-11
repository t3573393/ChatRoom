# 聊天室功能优化设计文档

**版本**: v1.0
**日期**: 2026-05-11
**作者**: Systenics Development Team
**状态**: 待评审

---

## 目录

1. [概述](#概述)
2. [功能模块一：深色模式](#功能模块一深色模式)
3. [功能模块二：消息搜索](#功能模块二消息搜索)
4. [功能模块三：消息编辑与撤回](#功能模块三消息编辑与撤回)
5. [数据库变更](#数据库变更)
6. [实现计划](#实现计划)

---

## 概述

### 背景

当前聊天室应用已完成核心聊天功能，包括文本、图片、音频、文档发送，以及阅后即焚、聊天记录导出等高级功能。为提升用户体验，计划新增以下功能：

1. **深色模式** - 支持浅色/深色主题切换，保护用户视力
2. **消息搜索** - 支持按关键词、日期范围、房间搜索历史消息
3. **消息编辑与撤回** - 允许用户编辑或撤回5分钟内发送的消息

### 设计原则

- **渐进式开发**: 按模块分阶段实现，降低风险
- **向后兼容**: 数据库变更采用 ALTER TABLE，确保现有数据不丢失
- **用户友好**: 提供清晰的交互反馈和状态提示
- **性能优先**: 搜索功能使用索引优化，避免全表扫描

---

## 功能模块一：深色模式

### 功能描述

提供深色/浅色主题切换功能，支持手动切换和自动跟随系统/时间两种模式。

### 用户场景

- **手动切换**: 用户点击切换按钮，在深色/浅色模式间切换
- **跟随系统**: 自动跟随操作系统的深色模式设置
- **跟随时间**: 白天(6:00-18:00)使用浅色，夜间自动切换深色

### 技术方案

#### 1. 主题样式文件

创建 `public/app/css/dark-theme.css`，覆盖以下样式：

| 样式类别 | 覆盖元素 |
|---------|---------|
| 背景色 | body, .content-wrapper, .main-sidebar, .direct-chat |
| 文字色 | .sidebar-menu li a, .direct-chat-text, .direct-chat-name |
| 边框色 | .box, .direct-chat-messages, .sidebar-menu |
| 输入框 | input, textarea, .form-control |
| 按钮 | .btn, .btn-primary, .btn-default |
| 消息气泡 | .direct-chat-msg.right .direct-chat-text, .direct-chat-msg.left .direct-chat-text |
| 模态框 | .modal-content, .modal-header, .modal-footer |

#### 2. 主题配置服务

```javascript
// public/app/services/themeService.js
angular.module('app')
.service('themeService', function($rootScope) {
    var THEME_KEY = 'user_theme_preference';

    this.getPreferences = function() {
        var saved = localStorage.getItem(THEME_KEY);
        return saved ? JSON.parse(saved) : {
            mode: 'manual',      // manual | system | time
            theme: 'light'       // light | dark
        };
    };

    this.setMode = function(mode) { /* ... */ };
    this.setTheme = function(theme) { /* ... */ };
    this.applyTheme = function(theme) { /* ... */ };
    this.initAutoTheme = function() { /* ... */ };
});
```

#### 3. 主题切换UI

在聊天室顶部导航栏添加主题切换按钮：

```html
<div class="theme-switch">
    <button class="btn btn-flat" ng-click="toggleThemePanel()">
        <i class="fa" ng-class="{'fa-moon-o': currentTheme === 'light', 'fa-sun-o': currentTheme === 'dark'}"></i>
    </button>
</div>
```

#### 4. 主题设置面板

点击按钮展开设置面板：

```html
<div class="theme-panel" ng-show="showThemePanel">
    <div class="form-group">
        <label>切换模式</label>
        <select ng-model="themeMode" ng-change="onThemeModeChange()">
            <option value="manual">手动切换</option>
            <option value="system">跟随系统</option>
            <option value="time">跟随时间</option>
        </select>
    </div>
    <div class="form-group" ng-show="themeMode === 'manual'">
        <label>选择主题</label>
        <div class="theme-options">
            <button ng-class="{'active': currentTheme === 'light'}" ng-click="setTheme('light')">浅色</button>
            <button ng-class="{'active': currentTheme === 'dark'}" ng-click="setTheme('dark')">深色</button>
        </div>
    </div>
</div>
```

### 文件变更

| 操作 | 文件路径 |
|------|---------|
| 新建 | public/app/css/dark-theme.css |
| 新建 | public/app/services/themeService.js |
| 修改 | public/app/views/chatRoom.html |
| 修改 | public/app/controllers/chatRoomController.js |
| 修改 | public/index.html |

---

## 功能模块二：消息搜索

### 功能描述

提供消息搜索功能，支持关键词搜索、日期范围筛选、房间筛选。

### 用户场景

- **快速搜索**: 输入关键词，实时显示匹配结果
- **日期筛选**: 选择开始和结束日期，缩小搜索范围
- **房间筛选**: 选择要搜索的房间（当前房间或所有房间）
- **结果展示**: 高亮显示匹配的关键词，支持点击跳转到消息位置

### 技术方案

#### 1. 后端API

**GET /api/search-messages**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| keyword | string | 是 | 搜索关键词 |
| roomCode | string | 否 | 房间代码，不传则搜索所有房间 |
| startDate | string | 否 | 开始日期 (YYYY-MM-DD) |
| endDate | string | 否 | 结束日期 (YYYY-MM-DD) |
| page | int | 否 | 页码，默认1 |
| pageSize | int | 否 | 每页条数，默认20，最大50 |

**响应示例:**

```json
{
    "success": true,
    "messages": [
        {
            "id": 12345,
            "username": "张三",
            "userAvatar": "Avatar1.jpg",
            "msg": "这是一条包含**关键词**的消息",
            "msgTime": "10:30 am",
            "createdAt": "2026-05-11T10:30:00Z",
            "roomCode": "ROOM001",
            "highlight": "这是一条包含<span class='highlight'>关键词</span>的消息"
        }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
}
```

#### 2. 数据库查询优化

```sql
-- 创建消息内容索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_messages_content
ON messages(message_content);

-- 搜索查询
SELECT id, username, user_avatar, message_content, msg_time, created_at, room_code
FROM messages
WHERE message_content LIKE '%' || ? || '%'
    AND (? IS NULL OR room_code = ?)
    AND (? IS NULL OR created_at >= ?)
    AND (? IS NULL OR created_at <= ?)
ORDER BY created_at DESC
LIMIT ? OFFSET ?;
```

#### 3. 搜索服务

```javascript
// public/app/services/searchService.js
angular.module('app')
.service('searchService', function($http, $rootScope) {
    this.searchMessages = function(params) {
        return $http.get($rootScope.baseUrl + '/api/search-messages', {
            params: params
        }).then(function(response) {
            return response.data;
        });
    };

    this.highlightKeyword = function(text, keyword) {
        if (!keyword || !text) return text;
        var regex = new RegExp('(' + keyword + ')', 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    };
});
```

#### 4. 搜索UI组件

**搜索触发按钮:**

```html
<button class="btn btn-flat" ng-click="showSearchPanel()">
    <i class="fa fa-search"></i>
</button>
```

**搜索面板:**

```html
<div class="search-panel" ng-show="showSearch">
    <div class="search-header">
        <input type="text"
               ng-model="searchKeyword"
               placeholder="搜索消息..."
               ng-enter="doSearch()"
               focus-me="showSearch">
        <button class="btn btn-primary" ng-click="doSearch()">搜索</button>
        <button class="btn btn-default" ng-click="closeSearch()">关闭</button>
    </div>

    <div class="search-filters">
        <div class="filter-group">
            <label>房间:</label>
            <select ng-model="searchRoom">
                <option value="current">当前房间</option>
                <option value="all">所有房间</option>
            </select>
        </div>
        <div class="filter-group">
            <label>日期:</label>
            <input type="date" ng-model="searchStartDate">
            <span>至</span>
            <input type="date" ng-model="searchEndDate">
        </div>
    </div>

    <div class="search-results" ng-show="searchResults.length > 0">
        <div class="search-result-item"
             ng-repeat="result in searchResults"
             ng-click="goToMessage(result)">
            <div class="result-header">
                <img ng-src="{{result.userAvatar}}" class="result-avatar">
                <span class="result-username">{{result.username}}</span>
                <span class="result-time">{{result.msgTime}}</span>
                <span class="result-room">[{{result.roomCode}}]</span>
            </div>
            <div class="result-content" ng-bind-html="result.highlight"></div>
        </div>
        <div class="search-pagination">
            <button ng-disabled="searchPage <= 1" ng-click="prevSearchPage()">上一页</button>
            <span>{{searchPage}} / {{searchTotalPages}}</span>
            <button ng-disabled="!searchHasMore" ng-click="nextSearchPage()">下一页</button>
        </div>
    </div>

    <div class="search-empty" ng-show="searchDone && searchResults.length === 0">
        未找到匹配的消息
    </div>
</div>
```

### 文件变更

| 操作 | 文件路径 |
|------|---------|
| 修改 | app.js (添加搜索API) |
| 修改 | database/db.js (添加搜索方法) |
| 新建 | public/app/services/searchService.js |
| 修改 | public/app/controllers/chatRoomController.js |
| 修改 | public/app/views/chatRoom.html |
| 修改 | public/app/css/style.css |

---

## 功能模块三：消息编辑与撤回

### 功能描述

允许用户编辑或撤回自己发送的5分钟内的消息。

### 用户场景

- **编辑消息**: 用户点击编辑按钮，修改消息内容
- **撤回消息**: 用户点击撤回按钮，删除消息并显示撤回提示
- **时间限制**: 超过5分钟的消息不允许编辑或撤回
- **实时同步**: 编辑/撤回操作实时同步给房间内其他用户

### 技术方案

#### 1. 数据库变更

```sql
-- 添加消息状态字段
ALTER TABLE messages ADD COLUMN status TEXT DEFAULT 'normal';
-- status: 'normal' | 'edited' | 'recalled'

-- 添加编辑历史表（可选，用于记录编辑历史）
CREATE TABLE IF NOT EXISTS message_edit_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    old_content TEXT NOT NULL,
    edited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- 添加消息编辑时间限制配置（秒）
ALTER TABLE messages ADD COLUMN edit_deadline DATETIME;
```

#### 2. 后端API

**POST /api/edit-message**

编辑消息API：

```json
// Request
{
    "messageId": 12345,
    "newContent": "修改后的消息内容"
}

// Response
{
    "success": true,
    "messageId": 12345,
    "editedAt": "2026-05-11T10:35:00Z"
}
```

**POST /api/recall-message**

撤回消息API：

```json
// Request
{
    "messageId": 12345
}

// Response
{
    "success": true,
    "messageId": 12345
}
```

#### 3. Socket事件

```javascript
// 消息被编辑
socket.on('message-edited', function(data) {
    // data: { messageId, newContent, editedAt, editor }
});

// 消息被撤回
socket.on('message-recalled', function(data) {
    // data: { messageId, recaller, recallTime }
});
```

#### 4. 后端Socket处理

```javascript
socket.on('edit-message', function(data, callback) {
    // 验证发送者是消息作者
    // 验证消息在5分钟可编辑时间内
    // 更新数据库
    // 广播给房间内其他用户
});

socket.on('recall-message', function(data, callback) {
    // 验证发送者是消息作者
    // 验证消息在5分钟可撤回时间内
    // 更新数据库状态
    // 广播给房间内其他用户
});
```

#### 5. 编辑/撤回服务

```javascript
// public/app/services/messageEditService.js
angular.module('app')
.service('messageEditService', function($http, $rootScope, $socket) {
    var EDIT_TIME_LIMIT = 5 * 60 * 1000; // 5分钟

    this.canEdit = function(message) {
        if (message.username !== $rootScope.username) return false;
        var createdAt = new Date(message.createdAt || message.created_at);
        return (Date.now() - createdAt.getTime()) < EDIT_TIME_LIMIT;
    };

    this.editMessage = function(messageId, newContent) {
        return $http.post($rootScope.baseUrl + '/api/edit-message', {
            messageId: messageId,
            newContent: newContent
        });
    };

    this.recallMessage = function(messageId) {
        return $http.post($rootScope.baseUrl + '/api/recall-message', {
            messageId: messageId
        });
    };

    // 注册Socket事件
    this.registerEventListeners = function($scope) {
        $socket.on('message-edited', function(data) {
            $scope.$broadcast('message-edited', data);
        });

        $socket.on('message-recalled', function(data) {
            $scope.$broadcast('message-recalled', data);
        });
    };
});
```

#### 6. 消息操作UI

**消息操作菜单:**

```html
<div class="message-actions" ng-if="message.username === username && canEditMessage(message)">
    <button class="btn-action" ng-click="showEditDialog(message)">
        <i class="fa fa-edit"></i> 编辑
    </button>
    <button class="btn-action" ng-click="recallMessage(message)">
        <i class="fa fa-undo"></i> 撤回
    </button>
</div>
```

**编辑对话框:**

```html
<div class="modal" ng-show="showEditModal">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h4>编辑消息</h4>
                <button class="close" ng-click="closeEditModal()">&times;</button>
            </div>
            <div class="modal-body">
                <textarea ng-model="editingContent"
                          rows="4"
                          class="form-control"></textarea>
                <div class="edit-tips">
                    <small>剩余可编辑时间: {{editTimeRemaining}}</small>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-default" ng-click="closeEditModal()">取消</button>
                <button class="btn btn-primary" ng-click="confirmEdit()">保存</button>
            </div>
        </div>
    </div>
</div>
```

**撤回后显示:**

```html
<!-- 原消息位置显示撤回提示 -->
<div class="message-recalled" ng-if="message.status === 'recalled'">
    <i class="fa fa-undo"></i>
    {{message.username}} 撤回了一条消息
    <span class="recalled-time">{{message.recalledAt}}</span>
</div>

<!-- 被编辑的消息显示 -->
<div class="message-edited" ng-if="message.status === 'edited' && message.isOriginal">
    <span class="edited-content">{{message.msg}}</span>
    <span class="edited-indicator">(已编辑)</span>
</div>
```

#### 7. 编辑/撤回时间提示

```javascript
$scope.getEditTimeRemaining = function(message) {
    var createdAt = new Date(message.createdAt || message.created_at);
    var elapsed = Date.now() - createdAt.getTime();
    var remaining = EDIT_TIME_LIMIT - elapsed;

    if (remaining <= 0) return '已超时';

    var minutes = Math.floor(remaining / 60000);
    var seconds = Math.floor((remaining % 60000) / 1000);

    return minutes + '分' + seconds + '秒';
};
```

### 文件变更

| 操作 | 文件路径 |
|------|---------|
| 修改 | app.js (添加编辑/撤回API和Socket处理) |
| 修改 | database/db.js (添加编辑/撤回方法) |
| 新建 | public/app/services/messageEditService.js |
| 修改 | public/app/controllers/chatRoomController.js |
| 修改 | public/app/views/chatRoom.html |
| 修改 | public/app/css/style.css |

---

## 数据库变更

### 统一数据库变更脚本

```sql
-- =============================================
-- 深色模式相关: 无需数据库变更
-- =============================================

-- =============================================
-- 消息搜索相关
-- =============================================

-- 创建消息内容索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_messages_content
ON messages(message_content);

-- 创建创建时间索引（用于日期范围搜索）
CREATE INDEX IF NOT EXISTS idx_messages_created_at
ON messages(created_at);

-- =============================================
-- 消息编辑与撤回相关
-- =============================================

-- 添加消息状态字段
ALTER TABLE messages ADD COLUMN status TEXT DEFAULT 'normal';

-- 添加编辑历史表
CREATE TABLE IF NOT EXISTS message_edit_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    old_content TEXT NOT NULL,
    edited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- 添加已撤回消息表（软删除，用于审计）
CREATE TABLE IF NOT EXISTS recalled_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_message_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    original_content TEXT NOT NULL,
    room_code TEXT,
    recalled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (original_message_id) REFERENCES messages(id)
);
```

---

## 实现计划

### 阶段一：深色模式（第1-2天）

| 任务 | 负责人 | 状态 |
|------|--------|------|
| 创建 dark-theme.css 样式文件 | - | 待开始 |
| 创建 themeService.js 服务 | - | 待开始 |
| 在 index.html 引入主题样式 | - | 待开始 |
| 修改 chatRoomController.js 集成主题服务 | - | 待开始 |
| 在 chatRoom.html 添加主题切换UI | - | 待开始 |
| 手动测试各主题模式 | - | 待开始 |

### 阶段二：消息搜索（第3-4天）

| 任务 | 负责人 | 状态 |
|------|--------|------|
| 创建数据库索引 | - | 待开始 |
| 修改 database/db.js 添加搜索方法 | - | 待开始 |
| 修改 app.js 添加搜索API | - | 待开始 |
| 创建 searchService.js 服务 | - | 待开始 |
| 修改 chatRoomController.js 集成搜索功能 | - | 待开始 |
| 在 chatRoom.html 添加搜索UI | - | 待开始 |
| 添加搜索结果高亮样式 | - | 待开始 |
| 手动测试搜索功能 | - | 待开始 |

### 阶段三：消息编辑与撤回（第5-7天）

| 任务 | 负责人 | 状态 |
|------|--------|------|
| 执行数据库变更脚本 | - | 待开始 |
| 修改 database/db.js 添加编辑/撤回方法 | - | 待开始 |
| 修改 app.js 添加编辑/撤回API和Socket | - | 待开始 |
| 创建 messageEditService.js 服务 | - | 待开始 |
| 修改 chatRoomController.js 集成编辑/撤回 | - | 待开始 |
| 在 chatRoom.html 添加编辑/撤回UI | - | 待开始 |
| 添加编辑/撤回提示样式 | - | 待开始 |
| 手动测试编辑/撤回功能 | - | 待开始 |

### 阶段四：集成测试（第8天）

| 任务 | 负责人 | 状态 |
|------|--------|------|
| 功能回归测试 | - | 待开始 |
| 浏览器兼容性测试 | - | 待开始 |
| 性能测试（搜索响应时间） | - | 待开始 |
| 代码审查 | - | 待开始 |
| 文档更新 | - | 待开始 |

---

## 附录

### A. 深色模式颜色规范

| 元素 | 浅色模式 | 深色模式 |
|------|---------|---------|
| 主背景 | #FFFFFF | #1a1a2e |
| 次背景 | #f4f6f9 | #16213e |
| 侧边栏 | #ffffff | #0f3460 |
| 主文字 | #333333 | #e4e4e4 |
| 次文字 | #777777 | #a0a0a0 |
| 边框 | #ddd | #2a2a4a |
| 消息气泡(右) | #dcf8c6 | #2a5a3a |
| 消息气泡(左) | #ffffff | #1e3a5f |

### B. 搜索API错误码

| 错误码 | 描述 |
|--------|------|
| 1001 | 关键词不能为空 |
| 1002 | 无效的日期格式 |
| 1003 | 开始日期不能大于结束日期 |
| 1004 | 页码超出范围 |

### C. 编辑/撤回API错误码

| 错误码 | 描述 |
|--------|------|
| 2001 | 消息不存在 |
| 2002 | 无权编辑此消息 |
| 2003 | 消息已超过编辑时限 |
| 2004 | 消息已被撤回 |
| 2005 | 无权撤回此消息 |
| 2006 | 消息已超过撤回时限 |

---

**文档结束**
