# 聊天室功能优化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为聊天室应用添加三个新功能：深色模式、消息搜索、消息编辑与撤回

**Architecture:** 
- 深色模式：使用 CSS 变量和 data-theme 属性实现主题切换，支持手动/跟随系统/跟随时间三种模式
- 消息搜索：后端提供搜索 API，前端实现搜索面板和结果高亮
- 消息编辑/撤回：后端 API + Socket.IO 实时同步，5分钟时限限制

**Tech Stack:** 
- AngularJS, Socket.IO, SQLite, Express.js
- localStorage 持久化
- CSS 变量实现主题切换

---

## 文件结构

### 需要创建的文件

| 文件 | 用途 |
|------|------|
| `public/app/css/dark-theme.css` | 深色主题样式 |
| `public/app/services/themeService.js` | 主题管理服务 |
| `public/app/services/searchService.js` | 搜索服务 |
| `public/app/services/messageEditService.js` | 消息编辑/撤回服务 |

### 需要修改的文件

| 文件 | 修改内容 |
|------|---------|
| `public/index.html` | 引入深色主题 CSS |
| `public/app/controllers/chatRoomController.js` | 集成所有新功能 |
| `public/app/views/chatRoom.html` | 添加新功能 UI |
| `public/app/css/style.css` | 添加搜索、编辑、撤回样式 |
| `app.js` | 添加搜索、编辑、撤回 API 和 Socket 事件 |
| `database/db.js` | 添加搜索、编辑、撤回相关数据库方法 |

---

## 第一阶段：深色模式（第1-2天）

### Task 1: 创建深色主题样式文件

**Files:**
- Create: `public/app/css/dark-theme.css`

- [ ] **Step 1: 创建 CSS 变量定义和深色模式样式**

```css
/* 深色主题样式文件 */

/* ========================================
   CSS 变量定义
   ======================================== */
:root {
    /* 浅色模式（默认） */
    --bg-primary: #ffffff;
    --bg-secondary: #f4f6f9;
    --bg-sidebar: #ffffff;
    --text-primary: #333333;
    --text-secondary: #777777;
    --border-color: #dddddd;
    --chat-bubble-right: #dcf8c6;
    --chat-bubble-left: #ffffff;
    --input-bg: #ffffff;
    --input-border: #dcdcdc;
    --hover-bg: #f5f5f5;
    --scrollbar-bg: #e0e0e0;
}

/* 深色模式 */
[data-theme="dark"] {
    --bg-primary: #1a1a2e;
    --bg-secondary: #16213e;
    --bg-sidebar: #0f3460;
    --text-primary: #e4e4e4;
    --text-secondary: #a0a0a0;
    --border-color: #2a2a4a;
    --chat-bubble-right: #2a5a3a;
    --chat-bubble-left: #1e3a5f;
    --input-bg: #1a1a2e;
    --input-border: #3a3a5a;
    --hover-bg: #2a2a4a;
    --scrollbar-bg: #3a3a5a;
}

/* ========================================
   基础元素样式覆盖
   ======================================== */
body,
.content-wrapper,
.main-sidebar,
.left-side {
    background-color: var(--bg-primary);
    color: var(--text-primary);
}

/* 侧边栏 */
.sidebar-menu > li > a {
    color: var(--text-primary);
}

.sidebar-menu > li > a:hover {
    background-color: var(--hover-bg);
}

/* ========================================
   聊天区域
   ======================================== */
.direct-chat {
    background-color: var(--bg-secondary);
}

.direct-chat-messages {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
}

.direct-chat-text {
    background-color: var(--chat-bubble-left);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
}

.direct-chat-msg.right .direct-chat-text {
    background-color: var(--chat-bubble-right);
    color: #ffffff;
}

/* ========================================
   表单元素
   ======================================== */
input,
textarea,
.form-control,
select {
    background-color: var(--input-bg);
    border-color: var(--input-border);
    color: var(--text-primary);
}

/* ========================================
   按钮
   ======================================== */
.btn-default {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

/* ========================================
   模态框
   ======================================== */
.modal-content {
    background-color: var(--bg-primary);
    border-color: var(--border-color);
}

.modal-header {
    background-color: var(--bg-secondary);
    border-bottom-color: var(--border-color);
    color: var(--text-primary);
}

/* ========================================
   滚动条
   ======================================== */
::-webkit-scrollbar-thumb {
    background: var(--scrollbar-bg);
}

/* ========================================
   工具栏
   ======================================== */
.chat-tools {
    background-color: var(--bg-secondary);
    border-top-color: var(--border-color);
}

/* ========================================
   消息输入区域
   ======================================== */
.message-input-wrapper {
    background-color: var(--bg-secondary);
    border-top-color: var(--border-color);
}

#inputText {
    background-color: var(--input-bg);
    border-color: var(--input-border);
    color: var(--text-primary);
}

/* ========================================
   皮肤切换器
   ======================================== */
.theme-panel {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.theme-options button.active {
    background: #3a5a8a;
    color: #ffffff;
}
```

- [ ] **Step 2: 测试样式文件语法**

Run: `cat public/app/css/dark-theme.css | head -50`
Expected: 显示 CSS 文件内容

---

### Task 2: 创建主题服务

**Files:**
- Create: `public/app/services/themeService.js`

- [ ] **Step 1: 创建主题服务文件**

```javascript
/**
 * @fileoverview 主题服务
 * @module services/themeService
 */
angular.module('app')
.service('themeService', ['$rootScope', '$interval', function($rootScope, $interval) {
    var THEME_KEY = 'user_theme_preference';
    var AUTO_CHECK_INTERVAL = 60000;

    var defaultConfig = {
        mode: 'manual',
        theme: 'light'
    };

    var currentConfig = loadConfig();
    var autoCheckPromise = null;

    function loadConfig() {
        try {
            var saved = localStorage.getItem(THEME_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('加载主题配置失败:', e);
        }
        return angular.copy(defaultConfig);
    }

    function saveConfig(config) {
        try {
            localStorage.setItem(THEME_KEY, JSON.stringify(config));
        } catch (e) {
            console.error('保存主题配置失败:', e);
        }
    }

    this.getConfig = function() {
        return angular.copy(currentConfig);
    };

    this.getCurrentTheme = function() {
        if (currentConfig.mode === 'manual') {
            return currentConfig.theme;
        } else if (currentConfig.mode === 'system') {
            return isSystemDarkMode() ? 'dark' : 'light';
        } else if (currentConfig.mode === 'time') {
            return isNightTime() ? 'dark' : 'light';
        }
        return 'light';
    };

    this.setMode = function(mode) {
        currentConfig.mode = mode;
        saveConfig(currentConfig);
        applyTheme(this.getCurrentTheme());
    };

    this.setTheme = function(theme) {
        if (currentConfig.mode !== 'manual') {
            currentConfig.mode = 'manual';
        }
        currentConfig.theme = theme;
        saveConfig(currentConfig);
        applyTheme(theme);
    };

    this.toggleTheme = function() {
        var newTheme = currentConfig.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    };

    function isSystemDarkMode() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function isNightTime() {
        var hour = new Date().getHours();
        return hour >= 18 || hour < 6;
    }

    function applyTheme(theme) {
        var body = document.body;
        if (theme === 'dark') {
            body.setAttribute('data-theme', 'dark');
        } else {
            body.removeAttribute('data-theme');
        }
        $rootScope.currentTheme = theme;
        if (!$rootScope.$$phase) {
            $rootScope.$apply();
        }
    }

    this.applyTheme = function(theme) {
        applyTheme(theme);
    };

    this.init = function() {
        var initialTheme = this.getCurrentTheme();
        applyTheme(initialTheme);

        if (currentConfig.mode === 'system') {
            setupSystemThemeListener();
        } else if (currentConfig.mode === 'time') {
            setupTimeBasedTheme();
        }
    };

    function setupSystemThemeListener() {
        if (window.matchMedia) {
            var mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', function(e) {
                applyTheme(e.matches ? 'dark' : 'light');
            });
        }
    }

    function setupTimeBasedTheme() {
        if (autoCheckPromise) {
            $interval.cancel(autoCheckPromise);
        }
        autoCheckPromise = $interval(function() {
            if (currentConfig.mode === 'time') {
                var newTheme = isNightTime() ? 'dark' : 'light';
                if ($rootScope.currentTheme !== newTheme) {
                    applyTheme(newTheme);
                }
            }
        }, AUTO_CHECK_INTERVAL);
    }

    this.destroy = function() {
        if (autoCheckPromise) {
            $interval.cancel(autoCheckPromise);
            autoCheckPromise = null;
        }
    };
}]);
```

---

### Task 3: 修改 index.html 引入主题样式

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: 在 head 中添加主题样式引用**

找到 `<link rel="stylesheet" href="app/css/style.css">` 行，在其后添加：

```html
<!-- 主题样式 -->
<link rel="stylesheet" href="app/css/dark-theme.css">
```

---

### Task 4: 修改 chatRoomController.js 集成主题服务

**Files:**
- Modify: `public/app/controllers/chatRoomController.js`

- [ ] **Step 1: 添加 themeService 依赖**

在控制器参数中添加 `themeService`：

```javascript
.controller('chatRoomCtrl', function ($scope, $rootScope, $socket, $location, $http, $window,
    Upload, $timeout, sendImageService, $translate, $sce, roomManagementService, gifService,
    burnAfterReadingService, chatExportService, chatHistoryCacheService, themeService) {
```

- [ ] **Step 2: 添加主题相关变量**

在变量初始化区域添加：

```javascript
// 主题相关变量
$scope.currentTheme = 'light';
$scope.themeMode = 'manual';
$scope.showThemePanel = false;
```

- [ ] **Step 3: 添加主题相关函数**

```javascript
// 初始化主题
$scope.initTheme = function() {
    var config = themeService.getConfig();
    $scope.themeMode = config.mode;
    $scope.currentTheme = themeService.getCurrentTheme();
};

// 切换主题面板显示
$scope.toggleThemePanel = function() {
    $scope.showThemePanel = !$scope.showThemePanel;
};

// 设置主题模式
$scope.setThemeMode = function(mode) {
    $scope.themeMode = mode;
    themeService.setMode(mode);
    $scope.currentTheme = themeService.getCurrentTheme();
};

// 手动设置主题
$scope.setTheme = function(theme) {
    themeService.setTheme(theme);
    $scope.currentTheme = theme;
};

// 控制器初始化时调用
$scope.initTheme();

// 监听 scope 销毁事件
$scope.$on('$destroy', function() {
    themeService.destroy();
});
```

---

### Task 5: 修改 chatRoom.html 添加主题 UI

**Files:**
- Modify: `public/app/views/chatRoom.html`

- [ ] **Step 1: 在工具栏添加主题切换按钮**

找到工具栏 `<ul class="nav navbar-nav">` 或类似结构，添加：

```html
<!-- 主题切换按钮 -->
<li ng-if="loggedIn" class="theme-switch-item" style="cursor: pointer;">
    <a ng-click="toggleThemePanel()" title="切换主题">
        <i class="fa" ng-class="{'fa-moon-o': currentTheme === 'light', 'fa-sun-o': currentTheme === 'dark'}"></i>
        <span class="hidden-xs">主题</span>
    </a>
</li>
```

- [ ] **Step 2: 添加主题设置面板**

在页面底部或适当位置添加：

```html
<!-- 主题设置面板 -->
<div class="theme-panel-overlay" ng-if="showThemePanel" ng-click="toggleThemePanel()"></div>
<div class="theme-panel" ng-show="showThemePanel">
    <div class="panel-header">
        <h4>主题设置</h4>
        <button type="button" class="close" ng-click="toggleThemePanel()">&times;</button>
    </div>
    <div class="panel-body">
        <div class="form-group">
            <label>切换模式</label>
            <select class="form-control" ng-model="themeMode" ng-change="setThemeMode(themeMode)">
                <option value="manual">手动切换</option>
                <option value="system">跟随系统</option>
                <option value="time">跟随时间</option>
            </select>
        </div>
        <div class="form-group" ng-show="themeMode === 'manual'">
            <label>选择主题</label>
            <div class="theme-options">
                <button type="button" class="btn"
                        ng-class="{'btn-primary': currentTheme === 'light', 'btn-default': currentTheme !== 'light'}"
                        ng-click="setTheme('light')">
                    <i class="fa fa-sun-o"></i> 浅色
                </button>
                <button type="button" class="btn"
                        ng-class="{'btn-primary': currentTheme === 'dark', 'btn-default': currentTheme !== 'dark'}"
                        ng-click="setTheme('dark')">
                    <i class="fa fa-moon-o"></i> 深色
                </button>
            </div>
        </div>
        <div class="theme-tips" ng-show="themeMode === 'system'">
            <small><i class="fa fa-info-circle"></i> 将跟随您操作系统的深色模式设置</small>
        </div>
        <div class="theme-tips" ng-show="themeMode === 'time'">
            <small><i class="fa fa-info-circle"></i> 白天(6:00-18:00)使用浅色模式，夜间自动切换深色模式</small>
        </div>
    </div>
</div>
```

---

### Task 6: 深色模式测试

- [ ] **Step 1: 启动服务器测试深色模式**

Run: `node app.js &` 然后访问聊天室

- [ ] **Step 2: 验证手动切换功能**

1. 点击"主题"按钮
2. 选择"手动切换"，点击"深色"
3. 验证页面切换为深色模式

- [ ] **Step 3: 验证 localStorage 持久化**

Run: `localStorage.getItem('user_theme_preference')`
Expected: `{"mode":"manual","theme":"dark"}`

---

## 第二阶段：消息搜索（第3-4天）

### Task 7: 添加数据库索引和搜索方法

**Files:**
- Modify: `database/db.js`

- [ ] **Step 1: 在 initDatabase 函数中添加索引创建**

在数据库初始化部分添加：

```javascript
// 创建搜索索引
const createIndexes = async () => {
    const indexes = [
        {
            name: 'idx_messages_content',
            sql: 'CREATE INDEX IF NOT EXISTS idx_messages_content ON messages(message_content)'
        },
        {
            name: 'idx_messages_created_at',
            sql: 'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)'
        }
    ];

    for (const index of indexes) {
        try {
            await db.run(index.sql);
            console.log(`索引 ${index.name} 创建成功`);
        } catch (err) {
            if (!err.message.includes('already exists')) {
                console.error(`创建索引 ${index.name} 失败:`, err.message);
            }
        }
    }
};
```

- [ ] **Step 2: 在 initDatabase 末尾调用索引创建**

在 `initDatabase` 函数的 `.then()` 中添加：

```javascript
db.initDatabase().then(() => {
    return createIndexes();
}).then(() => {
    logger.info('Database', '数据库初始化成功');
}).catch(err => {
    logger.error('Database', '数据库初始化失败: ' + err.message);
});
```

- [ ] **Step 3: 添加搜索方法**

```javascript
/**
 * 搜索消息
 */
async searchMessages(options) {
    const {
        keyword,
        roomCode = null,
        startDate = null,
        endDate = null,
        page = 1,
        pageSize = 20
    } = options;

    const offset = (page - 1) * pageSize;
    const params = [];
    let whereClause = 'WHERE message_content LIKE ?';
    params.push(`%${keyword}%`);

    if (roomCode) {
        whereClause += ' AND room_code = ?';
        params.push(roomCode);
    }

    if (startDate) {
        whereClause += ' AND created_at >= ?';
        params.push(startDate);
    }

    if (endDate) {
        whereClause += ' AND created_at <= ?';
        params.push(endDate + ' 23:59:59');
    }

    const countSql = `SELECT COUNT(*) as total FROM messages ${whereClause}`;
    const countResult = await db.get(countSql, params);
    const total = countResult.total;

    const sql = `
        SELECT id, username, user_avatar, message_content, msg_time, created_at, room_code
        FROM messages
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `;

    params.push(pageSize, offset);
    const messages = await db.all(sql, params);

    return {
        messages,
        total,
        page,
        pageSize,
        hasMore: offset + messages.length < total
    };
}
```

---

### Task 8: 添加搜索 API

**Files:**
- Modify: `app.js`

- [ ] **Step 1: 添加搜索 API 路由**

在现有 API 路由部分添加：

```javascript
/**
 * 消息搜索 API
 * GET /api/search-messages
 */
app.get('/api/search-messages', async function(req, res) {
    try {
        const {
            keyword,
            roomCode,
            startDate,
            endDate,
            page = '1',
            pageSize = '20'
        } = req.query;

        if (!keyword || keyword.trim() === '') {
            return res.status(400).json({
                success: false,
                error: '关键词不能为空',
                errorCode: 1001
            });
        }

        const pageNum = Math.max(1, parseInt(page) || 1);
        let pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize) || 20));

        const result = await db.searchMessages({
            keyword: keyword.trim(),
            roomCode: roomCode || null,
            startDate: startDate || null,
            endDate: endDate || null,
            page: pageNum,
            pageSize: pageSizeNum
        });

        const formattedMessages = result.messages.map(msg => ({
            id: msg.id,
            username: msg.username,
            userAvatar: msg.user_avatar,
            msg: msg.message_content,
            msgTime: msg.msg_time,
            createdAt: msg.created_at,
            roomCode: msg.room_code,
            highlight: highlightKeyword(msg.message_content, keyword.trim())
        }));

        logger.info('[Search]', `搜索关键词: ${keyword}, 找到 ${result.total} 条结果`);

        res.json({
            success: true,
            messages: formattedMessages,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
            hasMore: result.hasMore
        });

    } catch (error) {
        logger.error('[Search]', '搜索失败:', error);
        res.status(500).json({
            success: false,
            error: '搜索失败，请稍后重试'
        });
    }
});

function highlightKeyword(text, keyword) {
    if (!text || !keyword) return text;
    const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

---

### Task 9: 创建搜索服务

**Files:**
- Create: `public/app/services/searchService.js`

- [ ] **Step 1: 创建搜索服务**

```javascript
/**
 * @fileoverview 搜索服务
 * @module services/searchService
 */
angular.module('app')
.service('searchService', ['$http', '$rootScope', function($http, $rootScope) {
    var BASE_URL = $rootScope.baseUrl || '';

    this.searchMessages = function(params) {
        var defaultParams = { page: 1, pageSize: 20 };
        var requestParams = angular.extend({}, defaultParams, params);

        return $http.get(BASE_URL + '/api/search-messages', {
            params: requestParams
        }).then(function(response) {
            return response.data;
        }).catch(function(error) {
            console.error('搜索请求失败:', error);
            return { success: false, error: '搜索失败' };
        });
    };

    this.highlightKeyword = function(text, keyword) {
        if (!keyword || !text) return text;
        try {
            var escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            var regex = new RegExp('(' + escapedKeyword + ')', 'gi');
            return text.replace(regex, '<span class="search-highlight">$1</span>');
        } catch (e) {
            return text;
        }
    };
}]);
```

---

### Task 10: 修改 chatRoomController.js 集成搜索功能

**Files:**
- Modify: `public/app/controllers/chatRoomController.js`

- [ ] **Step 1: 添加 searchService 依赖**

```javascript
.controller('chatRoomCtrl', function ($scope, $rootScope, $socket, $location, $http, $window,
    Upload, $timeout, sendImageService, $translate, $sce, roomManagementService, gifService,
    burnAfterReadingService, chatExportService, chatHistoryCacheService, themeService, searchService) {
```

- [ ] **Step 2: 添加搜索相关变量和函数**

```javascript
// ========== 搜索功能 ==========
$scope.showSearch = false;
$scope.searchKeyword = '';
$scope.searchResults = [];
$scope.searchRoom = 'current';
$scope.searchStartDate = '';
$scope.searchEndDate = '';
$scope.searchPage = 1;
$scope.searchHasMore = false;
$scope.searchDone = false;
$scope.searchLoading = false;

// 显示搜索面板
$scope.showSearchPanel = function() {
    $scope.showSearch = true;
    $scope.searchKeyword = '';
    $scope.searchResults = [];
    $scope.searchDone = false;
};

// 关闭搜索面板
$scope.closeSearch = function() {
    $scope.showSearch = false;
};

// 执行搜索
$scope.doSearch = function() {
    if (!$scope.searchKeyword || $scope.searchKeyword.trim() === '') {
        alert('请输入搜索关键词');
        return;
    }

    $scope.searchLoading = true;
    $scope.searchDone = false;

    var params = {
        keyword: $scope.searchKeyword.trim(),
        page: 1,
        pageSize: 20
    };

    if ($scope.searchRoom === 'current') {
        params.roomCode = $rootScope.roomCode;
    }

    if ($scope.searchStartDate) params.startDate = $scope.searchStartDate;
    if ($scope.searchEndDate) params.endDate = $scope.searchEndDate;

    searchService.searchMessages(params).then(function(result) {
        $scope.searchLoading = false;
        $scope.searchDone = true;
        if (result.success) {
            $scope.searchResults = result.messages;
            $scope.searchHasMore = result.hasMore;
        } else {
            alert(result.error || '搜索失败');
            $scope.searchResults = [];
        }
    });
};

// 上一页
$scope.prevSearchPage = function() {
    if ($scope.searchPage <= 1) return;
    $scope.searchPage--;
    $scope.loadSearchPage($scope.searchPage);
};

// 下一页
$scope.nextSearchPage = function() {
    if (!$scope.searchHasMore) return;
    $scope.searchPage++;
    $scope.loadSearchPage($scope.searchPage);
};

// 跳转到消息位置
$scope.goToMessage = function(result) {
    $scope.closeSearch();
    $timeout(function() {
        var targetElement = document.querySelector('[data-message-id="' + result.id + '"]');
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetElement.classList.add('search-target');
            setTimeout(function() {
                targetElement.classList.remove('search-target');
            }, 2000);
        }
    }, 100);
};
```

---

### Task 11: 修改 chatRoom.html 添加搜索 UI

**Files:**
- Modify: `public/app/views/chatRoom.html`

- [ ] **Step 1: 在工具栏添加搜索按钮**

```html
<!-- 搜索按钮 -->
<li ng-if="loggedIn" style="cursor: pointer;">
    <a ng-click="showSearchPanel()" title="搜索消息">
        <i class="fa fa-search"></i>
        <span class="hidden-xs">搜索</span>
    </a>
</li>
```

- [ ] **Step 2: 添加搜索面板**

```html
<!-- 搜索面板 -->
<div class="search-overlay" ng-if="showSearch" ng-click="closeSearch()"></div>
<div class="search-panel" ng-show="showSearch">
    <div class="search-header">
        <div class="search-input-wrapper">
            <i class="fa fa-search search-icon"></i>
            <input type="text" class="form-control search-input"
                   ng-model="searchKeyword" placeholder="搜索消息内容..."
                   ng-keyup="$event.keyCode === 13 && doSearch()">
        </div>
        <button class="btn btn-primary search-btn" ng-click="doSearch()">
            <i class="fa fa-search"></i>
        </button>
    </div>
    <div class="search-filters">
        <div class="filter-group">
            <label>房间:</label>
            <select class="form-control" ng-model="searchRoom">
                <option value="current">当前房间</option>
                <option value="all">所有房间</option>
            </select>
        </div>
        <div class="filter-group">
            <label>日期:</label>
            <input type="date" class="form-control" ng-model="searchStartDate">
            <span>至</span>
            <input type="date" class="form-control" ng-model="searchEndDate">
        </div>
    </div>
    <div class="search-results" ng-show="searchResults.length > 0">
        <div class="results-count">共找到 <strong>{{searchResults.length}}</strong> 条结果</div>
        <div class="search-result-item" ng-repeat="result in searchResults" ng-click="goToMessage(result)">
            <div class="result-header">
                <img ng-src="{{result.userAvatar}}" class="result-avatar">
                <span class="result-username">{{result.username}}</span>
                <span class="result-time">{{result.msgTime}}</span>
                <span class="result-room">[{{result.roomCode}}]</span>
            </div>
            <div class="result-content" ng-bind-html="result.highlight"></div>
        </div>
        <div class="search-pagination">
            <button class="btn btn-default btn-sm" ng-disabled="searchPage <= 1" ng-click="prevSearchPage()">
                <i class="fa fa-chevron-left"></i>
            </button>
            <button class="btn btn-default btn-sm" ng-disabled="!searchHasMore" ng-click="nextSearchPage()">
                <i class="fa fa-chevron-right"></i>
            </button>
        </div>
    </div>
    <div class="search-loading" ng-show="searchLoading">
        <i class="fa fa-spinner fa-spin"></i> 搜索中...
    </div>
    <div class="search-empty" ng-show="searchDone && searchResults.length === 0">
        <i class="fa fa-search"></i>
        <p>未找到匹配的消息</p>
    </div>
</div>
```

---

### Task 12: 添加搜索样式

**Files:**
- Modify: `public/app/css/style.css`

- [ ] **Step 1: 添加搜索相关样式**

```css
/* ========================================
   搜索面板样式
   ======================================== */
.search-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 1040;
}

.search-panel {
    position: fixed;
    top: 50px;
    right: 20px;
    width: 500px;
    max-width: 90vw;
    max-height: 80vh;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    z-index: 1050;
    display: flex;
    flex-direction: column;
}

[data-theme="dark"] .search-panel {
    background: #1a1a2e;
    border: 1px solid #2a2a4a;
}

.search-header {
    display: flex;
    padding: 15px;
    border-bottom: 1px solid #e0e0e0;
    gap: 10px;
}

[data-theme="dark"] .search-header {
    border-bottom-color: #2a2a4a;
}

.search-input-wrapper {
    flex: 1;
    position: relative;
}

.search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #999;
}

.search-input {
    padding-left: 35px !important;
}

.search-btn {
    white-space: nowrap;
}

.search-filters {
    padding: 10px 15px;
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    gap: 15px;
}

[data-theme="dark"] .search-filters {
    background: #16213e;
    border-bottom-color: #2a2a4a;
}

.filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.filter-group label {
    margin: 0;
    font-size: 13px;
}

.search-results {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
}

.search-result-item {
    padding: 12px;
    border-radius: 6px;
    cursor: pointer;
    margin-bottom: 8px;
    background: #f8f9fa;
}

[data-theme="dark"] .search-result-item {
    background: #16213e;
}

.search-result-item:hover {
    background: #e9ecef;
}

[data-theme="dark"] .search-result-item:hover {
    background: #1e3a5f;
}

.result-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
}

.result-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
}

.search-highlight {
    background: #ffd700;
    color: #000;
    padding: 1px 3px;
    border-radius: 2px;
}

[data-theme="dark"] .search-highlight {
    background: #5a4a2a;
    color: #ffd700;
}

.search-target {
    animation: highlight-pulse 1s ease-in-out 2;
}

@keyframes highlight-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.4); }
    50% { box-shadow: 0 0 0 10px rgba(255, 215, 0, 0); }
}

.search-loading,
.search-empty {
    padding: 40px;
    text-align: center;
    color: #999;
}
```

---

### Task 13: 消息搜索测试

- [ ] **Step 1: 发送测试消息**

在聊天室发送包含特定关键词的消息

- [ ] **Step 2: 测试搜索 API**

Run: `curl "http://localhost:8282/api/search-messages?keyword=测试词"`
Expected: 返回匹配的消息

- [ ] **Step 3: 测试搜索 UI**

1. 点击"搜索"按钮
2. 输入关键词
3. 验证结果显示和高亮

---

## 第三阶段：消息编辑与撤回（第5-7天）

### Task 14: 数据库变更

**Files:**
- Modify: `database/db.js`

- [ ] **Step 1: 添加数据库迁移函数**

```javascript
async runMessageMigrations() {
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
                edited_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        }
    ];

    for (const migration of migrations) {
        try {
            await db.run(migration.sql);
            console.log(`迁移 ${migration.name} 执行成功`);
        } catch (err) {
            if (!err.message.includes('duplicate column') && 
                !err.message.includes('already exists')) {
                console.error(`迁移 ${migration.name} 失败:`, err.message);
            }
        }
    }
}
```

- [ ] **Step 2: 在初始化时调用迁移**

```javascript
db.initDatabase().then(() => {
    return createIndexes();
}).then(() => {
    return runMessageMigrations();
}).then(() => {
    logger.info('Database', '数据库初始化成功');
}).catch(err => {
    logger.error('Database', '数据库初始化失败: ' + err.message);
});
```

- [ ] **Step 3: 添加编辑相关方法**

```javascript
async getEditableMessage(messageId, username, timeLimit = 5 * 60 * 1000) {
    const sql = `SELECT id, username, message_content, room_code, created_at, status
                 FROM messages WHERE id = ? AND username = ? AND status = 'normal'`;
    const message = await db.get(sql, [messageId, username]);
    if (!message) return null;
    const createdAt = new Date(message.created_at);
    const elapsed = Date.now() - createdAt.getTime();
    return { ...message, expired: elapsed > timeLimit };
}

async editMessage(messageId, newContent) {
    const sql = `UPDATE messages SET message_content = ?, status = 'edited' WHERE id = ?`;
    const result = await db.run(sql, [newContent, messageId]);
    return result.changes > 0;
}

async saveEditHistory(messageId, oldContent) {
    const sql = `INSERT INTO message_edit_history (message_id, old_content) VALUES (?, ?)`;
    await db.run(sql, [messageId, oldContent]);
}

async recallMessage(messageId, username) {
    const timeLimit = 5 * 60 * 1000;
    const getSql = `SELECT id, username, message_content, room_code FROM messages
                    WHERE id = ? AND username = ? AND status = 'normal'`;
    const message = await db.get(getSql, [messageId, username]);
    if (!message) return { success: false, error: '消息不存在' };
    
    const createdAt = new Date(message.created_at);
    if (Date.now() - createdAt.getTime() > timeLimit) {
        return { success: false, error: '消息已超过撤回时限' };
    }
    
    const updateSql = `UPDATE messages SET status = 'recalled' WHERE id = ?`;
    await db.run(updateSql, [messageId]);
    return { success: true, message: message };
}
```

---

### Task 15: 添加编辑/撤回 API 和 Socket 事件

**Files:**
- Modify: `app.js`

- [ ] **Step 1: 添加编辑 API**

```javascript
app.post('/api/edit-message', async function(req, res) {
    try {
        const { messageId, newContent, username } = req.body;
        if (!messageId || !newContent || !username) {
            return res.status(400).json({ success: false, error: '参数不完整' });
        }

        const message = await db.getEditableMessage(messageId, username);
        if (!message) {
            return res.status(404).json({ success: false, error: '消息不存在' });
        }
        if (message.expired) {
            return res.status(403).json({ success: false, error: '消息已超过编辑时限' });
        }

        await db.saveEditHistory(messageId, message.message_content);
        await db.editMessage(messageId, newContent);

        ios.sockets.in(message.room_code).emit('message-edited', {
            messageId: messageId,
            newContent: newContent,
            editedAt: new Date().toISOString(),
            editor: username
        });

        res.json({ success: true, messageId, editedAt: new Date().toISOString() });
    } catch (error) {
        logger.error('[Edit]', '编辑失败:', error);
        res.status(500).json({ success: false, error: '编辑失败' });
    }
});
```

- [ ] **Step 2: 添加撤回 API**

```javascript
app.post('/api/recall-message', async function(req, res) {
    try {
        const { messageId, username } = req.body;
        if (!messageId || !username) {
            return res.status(400).json({ success: false, error: '参数不完整' });
        }

        const result = await db.recallMessage(messageId, username);
        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        ios.sockets.in(result.message.room_code).emit('message-recalled', {
            messageId: messageId,
            recaller: username,
            recallTime: new Date().toISOString()
        });

        res.json({ success: true, messageId });
    } catch (error) {
        logger.error('[Recall]', '撤回失败:', error);
        res.status(500).json({ success: false, error: '撤回失败' });
    }
});
```

- [ ] **Step 3: 添加 Socket 事件处理**

在 socket.on('connection') 内添加：

```javascript
socket.on('edit-message', async function(data, callback) {
    try {
        const { messageId, newContent } = data;
        if (!socket.username || !socket.roomCode) {
            callback({ success: false, error: '参数错误' });
            return;
        }

        const message = await db.getEditableMessage(messageId, socket.username);
        if (!message || message.expired) {
            callback({ success: false, error: message ? '已超时' : '消息不存在' });
            return;
        }

        await db.saveEditHistory(messageId, message.message_content);
        await db.editMessage(messageId, newContent);

        ios.sockets.in(socket.roomCode).emit('message-edited', {
            messageId, newContent, editedAt: new Date().toISOString(), editor: socket.username
        });

        callback({ success: true, editedAt: new Date().toISOString() });
    } catch (error) {
        callback({ success: false, error: '编辑失败' });
    }
});

socket.on('recall-message', async function(data, callback) {
    try {
        const { messageId } = data;
        if (!socket.username || !socket.roomCode) {
            callback({ success: false, error: '参数错误' });
            return;
        }

        const result = await db.recallMessage(messageId, socket.username);
        if (!result.success) {
            callback({ success: false, error: result.error });
            return;
        }

        ios.sockets.in(socket.roomCode).emit('message-recalled', {
            messageId, recaller: socket.username, recallTime: new Date().toISOString()
        });

        callback({ success: true });
    } catch (error) {
        callback({ success: false, error: '撤回失败' });
    }
});
```

---

### Task 16: 创建消息编辑服务

**Files:**
- Create: `public/app/services/messageEditService.js`

- [ ] **Step 1: 创建服务文件**

```javascript
/**
 * @fileoverview 消息编辑服务
 * @module services/messageEditService
 */
angular.module('app')
.service('messageEditService', ['$http', '$rootScope', '$socket', function($http, $rootScope, $socket) {
    var EDIT_TIME_LIMIT = 5 * 60 * 1000;

    this.canEdit = function(message) {
        if (!message) return false;
        if (message.username !== $rootScope.username) return false;
        if (message.status && message.status !== 'normal') return false;
        var createdAt = new Date(message.createdAt || message.created_at);
        if (isNaN(createdAt.getTime())) return false;
        return (Date.now() - createdAt.getTime()) < EDIT_TIME_LIMIT;
    };

    this.canRecall = function(message) {
        return this.canEdit(message);
    };

    this.getTimeRemaining = function(message) {
        var createdAt = new Date(message.createdAt || message.created_at);
        var remaining = EDIT_TIME_LIMIT - (Date.now() - createdAt.getTime());
        if (remaining <= 0) return { text: '已超时', expired: true };
        var minutes = Math.floor(remaining / 60000);
        var seconds = Math.floor((remaining % 60000) / 1000);
        return { text: minutes + '分' + seconds + '秒', expired: false };
    };

    this.editMessageSocket = function(messageId, newContent) {
        return new Promise(function(resolve, reject) {
            $socket.emit('edit-message', { messageId, newContent }, function(response) {
                response.success ? resolve(response) : reject(response);
            });
        });
    };

    this.recallMessageSocket = function(messageId) {
        return new Promise(function(resolve, reject) {
            $socket.emit('recall-message', { messageId }, function(response) {
                response.success ? resolve(response) : reject(response);
            });
        });
    };

    this.registerEventListeners = function($scope) {
        $socket.on('message-edited', function(data) {
            $scope.$broadcast('message-edited', data);
        });
        $socket.on('message-recalled', function(data) {
            $scope.$broadcast('message-recalled', data);
        });
    };
}]);
```

---

### Task 17: 修改 chatRoomController.js 集成编辑/撤回功能

**Files:**
- Modify: `public/app/controllers/chatRoomController.js`

- [ ] **Step 1: 添加 messageEditService 依赖**

```javascript
.controller('chatRoomCtrl', function ($scope, $rootScope, $socket, $location, $http, $window,
    Upload, $timeout, sendImageService, $translate, $sce, roomManagementService, gifService,
    burnAfterReadingService, chatExportService, chatHistoryCacheService, themeService, 
    searchService, messageEditService) {
```

- [ ] **Step 2: 添加编辑/撤回相关变量和函数**

```javascript
// ========== 消息编辑/撤回功能 ==========
$scope.editingMessage = null;
$scope.editingContent = '';
$scope.editTimeRemaining = '';
$scope.showEditModal = false;

$scope.showEditDialog = function(message) {
    if (!messageEditService.canEdit(message)) {
        alert('该消息已超过可编辑时限');
        return;
    }
    $scope.editingMessage = message;
    $scope.editingContent = message.msg || message.message_content;
    $scope.showEditModal = true;
    updateEditTimeRemaining(message);
};

function updateEditTimeRemaining(message) {
    var timeInfo = messageEditService.getTimeRemaining(message);
    $scope.editTimeRemaining = timeInfo.text;
    if (!timeInfo.expired && $scope.showEditModal) {
        $timeout(function() { updateEditTimeRemaining(message); }, 1000);
    }
}

$scope.closeEditModal = function() {
    $scope.showEditModal = false;
    $scope.editingMessage = null;
};

$scope.confirmEdit = function() {
    if (!$scope.editingMessage) return;
    var messageId = $scope.editingMessage.id;
    var newContent = $scope.editingContent.trim();
    if (!newContent) { alert('消息内容不能为空'); return; }

    messageEditService.editMessageSocket(messageId, newContent)
        .then(function() { $scope.closeEditModal(); })
        .catch(function(error) { alert('编辑失败: ' + (error.error || '未知错误')); });
};

$scope.recallMessage = function(message) {
    if (!confirm('确定要撤回这条消息吗？')) return;
    if (!messageEditService.canRecall(message)) {
        alert('该消息已超过可撤回时限');
        return;
    }
    messageEditService.recallMessageSocket(message.id)
        .catch(function(error) { alert('撤回失败: ' + (error.error || '未知错误')); });
};

$scope.canEditMessage = function(message) { return messageEditService.canEdit(message); };
$scope.canRecallMessage = function(message) { return messageEditService.canRecall(message); };

messageEditService.registerEventListeners($scope);

$scope.$on('message-edited', function(event, data) {
    for (var i = 0; i < $scope.messeges.length; i++) {
        if ($scope.messeges[i].id == data.messageId) {
            $scope.messeges[i].msg = data.newContent;
            $scope.messeges[i].status = 'edited';
            $scope.$apply();
            break;
        }
    }
});

$scope.$on('message-recalled', function(event, data) {
    for (var i = 0; i < $scope.messeges.length; i++) {
        if ($scope.messeges[i].id == data.messageId) {
            $scope.messeges[i].status = 'recalled';
            $scope.$apply();
            break;
        }
    }
});
```

---

### Task 18: 修改 chatRoom.html 添加编辑/撤回 UI

**Files:**
- Modify: `public/app/views/chatRoom.html`

- [ ] **Step 1: 在消息气泡内添加操作按钮**

找到消息显示的部分，添加：

```html
<!-- 在消息内容后添加操作按钮 -->
<div class="message-actions" 
     ng-if="message.username === username && (canEditMessage(message) || canRecallMessage(message))">
    <button class="btn-action" ng-click="showEditDialog(message)"
            ng-if="canEditMessage(message)" title="编辑">
        <i class="fa fa-edit"></i>
    </button>
    <button class="btn-action" ng-click="recallMessage(message)"
            ng-if="canRecallMessage(message)" title="撤回">
        <i class="fa fa-undo"></i>
    </button>
</div>
```

- [ ] **Step 2: 添加编辑对话框**

```html
<!-- 编辑消息对话框 -->
<div class="modal fade" id="editMessageModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" ng-click="closeEditModal()">
                    <span>&times;</span>
                </button>
                <h4 class="modal-title"><i class="fa fa-edit"></i> 编辑消息</h4>
            </div>
            <div class="modal-body">
                <textarea class="form-control" ng-model="editingContent" rows="4"></textarea>
                <div class="edit-tips">
                    <i class="fa fa-clock-o"></i>
                    剩余时间: <strong>{{editTimeRemaining}}</strong>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" ng-click="closeEditModal()">取消</button>
                <button type="button" class="btn btn-primary" ng-click="confirmEdit()">保存</button>
            </div>
        </div>
    </div>
</div>
```

- [ ] **Step 3: 添加撤回消息显示**

在消息内容区域添加：

```html
<div class="message-recalled" ng-if="message.status === 'recalled'">
    <i class="fa fa-undo"></i> 此消息已被撤回
</div>
```

---

### Task 19: 添加编辑/撤回样式

**Files:**
- Modify: `public/app/css/style.css`

- [ ] **Step 1: 添加编辑/撤回样式**

```css
/* ========================================
   消息编辑/撤回样式
   ======================================== */
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
}

.btn-action:hover {
    background: rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .btn-action {
    background: rgba(255, 255, 255, 0.1);
    color: #a0a0a0;
}

[data-theme="dark"] .btn-action:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
}

.direct-chat-msg.right .btn-action {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
}

.message-recalled {
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 6px;
    color: #999;
    font-style: italic;
}

[data-theme="dark"] .message-recalled {
    background: rgba(255, 255, 255, 0.05);
    color: #777;
}

.edit-tips {
    margin-top: 10px;
    font-size: 13px;
    color: #666;
}

[data-theme="dark"] .edit-tips {
    color: #a0a0a0;
}
```

---

### Task 20: 消息编辑/撤回测试

- [ ] **Step 1: 发送测试消息并获取消息ID**

- [ ] **Step 2: 测试编辑 API**

Run: `curl -X POST http://localhost:8282/api/edit-message -H "Content-Type: application/json" -d '{"messageId":123,"newContent":"测试编辑","username":"测试用户"}'`

- [ ] **Step 3: 测试撤回 API**

Run: `curl -X POST http://localhost:8282/api/recall-message -H "Content-Type: application/json" -d '{"messageId":123,"username":"测试用户"}'`

- [ ] **Step 4: 测试 UI 功能**

1. 鼠标悬停在自己消息上，显示编辑/撤回按钮
2. 点击编辑按钮，弹出编辑对话框
3. 修改内容并保存
4. 验证消息显示"已编辑"
5. 测试撤回功能

---

## 第四阶段：集成测试（第8天）

### Task 21: 完整功能测试

- [ ] **Step 1: 深色模式测试**
- [ ] **Step 2: 消息搜索测试**
- [ ] **Step 3: 消息编辑/撤回测试**
- [ ] **Step 4: 原有功能回归测试**

### Task 22: 提交代码

- [ ] **Step 1: 提交深色模式相关代码**
- [ ] **Step 2: 提交消息搜索相关代码**
- [ ] **Step 3: 提交消息编辑/撤回相关代码**

---

## 实现计划完成

**文档位置**: `docs/superpowers/plans/2026-05-11-chatroom-feature-optimization-implementation-plan.md`

**预计总工期**: 8天

**执行选项**:

**1. Subagent-Driven（推荐）** - 每个任务派遣新的子代理，任务间进行审查，快速迭代

**2. Inline Execution** - 在当前会话中按批次执行任务，带检查点

您选择哪种执行方式？
