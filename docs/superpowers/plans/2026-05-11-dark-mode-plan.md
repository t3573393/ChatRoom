# 深色模式实现计划

**版本**: v1.0
**日期**: 2026-05-11
**功能模块**: 深色模式
**依赖文档**: 2026-05-11-chatroom-feature-optimization-design.md

---

## 概述

本计划详细描述深色模式功能的具体实现步骤，包括需要创建/修改的文件、代码实现细节和预期产出。

### 功能需求

- 支持手动切换深色/浅色模式
- 支持跟随操作系统设置
- 支持跟随时间自动切换（白天浅色，夜间深色）
- 主题偏好保存在 localStorage

---

## 阶段一：样式文件创建

### 任务 1.1: 创建深色主题样式文件

**文件路径**: `public/app/css/dark-theme.css`

**实现内容**:

1. CSS 变量定义（用于主题切换）
2. 深色模式颜色覆盖
3. 组件样式适配

**代码模板**:

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

/* 侧边栏样式 */
.sidebar-menu > li > a {
    color: var(--text-primary);
}

.sidebar-menu > li > a:hover {
    background-color: var(--hover-bg);
}

.sidebar-menu > li.active > a {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
}

/* ========================================
   聊天区域样式
   ======================================== */
.direct-chat {
    background-color: var(--bg-secondary);
}

.direct-chat-messages {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
}

.direct-chat-msg {
    margin-bottom: 15px;
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

.direct-chat-name,
.direct-chat-timestamp {
    color: var(--text-secondary);
}

/* ========================================
   表单元素样式
   ======================================== */
input,
textarea,
.form-control,
select {
    background-color: var(--input-bg);
    border-color: var(--input-border);
    color: var(--text-primary);
}

input:focus,
textarea:focus,
.form-control:focus {
    background-color: var(--input-bg);
    border-color: #3a3a8a;
    color: var(--text-primary);
}

/* ========================================
   按钮样式
   ======================================== */
.btn {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

.btn-primary {
    background-color: #3a5a8a;
    border-color: #3a5a8a;
    color: #ffffff;
}

.btn-primary:hover {
    background-color: #4a6a9a;
}

.btn-default {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

/* ========================================
   模态框样式
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

.modal-body {
    color: var(--text-primary);
}

.modal-footer {
    border-top-color: var(--border-color);
}

/* ========================================
   消息框样式
   ======================================== */
.box {
    background-color: var(--bg-primary);
    border-color: var(--border-color);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.box-header {
    background-color: var(--bg-secondary);
    border-bottom-color: var(--border-color);
    color: var(--text-primary);
}

.box-body {
    color: var(--text-primary);
}

/* ========================================
   滚动条样式
   ======================================== */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
    background: var(--scrollbar-bg);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-bg);
}

/* ========================================
   工具栏样式
   ======================================== */
.chat-tools {
    background-color: var(--bg-secondary);
    border-top-color: var(--border-color);
}

.chat-tools button {
    color: var(--text-secondary);
}

.chat-tools button:hover {
    color: var(--text-primary);
}

/* ========================================
   用户列表样式
   ======================================== */
.users-list > li {
    background-color: var(--bg-primary);
}

.users-list > li > a {
    color: var(--text-primary);
}

.users-list > li > .text-muted {
    color: var(--text-secondary) !important;
}

/* ========================================
   皮肤切换器样式
   ======================================== */
.theme-switch {
    position: relative;
}

.theme-switch .btn {
    padding: 6px 12px;
}

.theme-panel {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 15px;
    min-width: 200px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1000;
}

.theme-panel select,
.theme-panel input {
    width: 100%;
    margin-bottom: 10px;
}

.theme-options {
    display: flex;
    gap: 10px;
}

.theme-options button {
    flex: 1;
    padding: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-radius: 4px;
    cursor: pointer;
}

.theme-options button.active {
    background: #3a5a8a;
    color: #ffffff;
    border-color: #3a5a8a;
}

/* ========================================
   系统消息样式
   ======================================== */
.system-message {
    background-color: var(--bg-secondary);
    color: var(--text-secondary);
    border: none;
}

/* ========================================
   表情包面板样式
   ======================================== */
.meme-panel,
.gif-panel {
    background-color: var(--bg-primary);
    border-color: var(--border-color);
}

.meme-category {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
}

.meme-category.active {
    background-color: #3a5a8a;
    color: #ffffff;
}

/* ========================================
   输入区域样式
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

#inputText:focus {
    background-color: var(--input-bg);
    color: var(--text-primary);
}

/* ========================================
   回复引用样式
   ======================================== */
.reply-quote {
    background-color: var(--bg-secondary);
    border-left: 3px solid #3a5a8a;
    color: var(--text-secondary);
}

/* ========================================
   @提及样式
   ======================================== */
.mention {
    background-color: rgba(58, 90, 138, 0.3);
    color: #6a9ae8;
    padding: 2px 4px;
    border-radius: 3px;
}

/* ========================================
   阅后即焚消息样式
   ======================================== */
.burn-message {
    background: linear-gradient(135deg, #2a1a3a, #3a2a4a);
    border: 1px solid #5a4a6a;
}

.burn-timer {
    color: #ff6b6b;
}

.burn-indicator {
    color: #ff6b6b;
}

/* ========================================
   搜索面板样式
   ======================================== */
.search-panel {
    background-color: var(--bg-primary);
    border-color: var(--border-color);
}

.search-result-item {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
}

.search-result-item:hover {
    background-color: var(--hover-bg);
}

.search-highlight {
    background-color: #ffd700;
    color: #000000;
    padding: 1px 3px;
    border-radius: 2px;
}

/* ========================================
   导出模态框样式
   ======================================== */
.export-options label {
    color: var(--text-primary);
}
```

**预期产出**: 深色主题完整 CSS 文件

---

## 阶段二：服务层实现

### 任务 2.1: 创建主题服务

**文件路径**: `public/app/services/themeService.js`

**实现内容**:

1. 主题偏好管理
2. 自动主题切换逻辑
3. 主题应用函数

**代码模板**:

```javascript
/**
 * @fileoverview 主题服务
 * @module services/themeService
 * @description 管理深色/浅色主题切换，支持手动、自动跟随系统和时间
 */

angular.module('app')
.service('themeService', ['$rootScope', '$interval', function($rootScope, $interval) {
    var THEME_KEY = 'user_theme_preference';
    var AUTO_CHECK_INTERVAL = 60000; // 每分钟检查一次

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

**预期产出**: 主题服务 JS 文件

---

## 阶段三：前端集成

### 任务 3.1: 修改 index.html

**文件路径**: `public/index.html`

**变更内容**:

在 `<head>` 标签内添加深色主题样式引用：

```html
<!-- 主题样式 -->
<link rel="stylesheet" href="app/css/dark-theme.css">
```

### 任务 3.2: 修改 chatRoomController.js

**文件路径**: `public/app/controllers/chatRoomController.js`

**变更内容**:

1. 引入 themeService 依赖
2. 初始化主题服务
3. 添加主题切换相关变量和函数

**需要添加的代码段**:

```javascript
// 在控制器参数中添加 themeService
.controller('chatRoomCtrl', function ($scope, $rootScope, $socket, $location, $http, $window,
    Upload, $timeout, sendImageService, $translate, $sce, roomManagementService, gifService,
    burnAfterReadingService, chatExportService, chatHistoryCacheService, themeService) {

    // 添加主题相关变量
    $scope.currentTheme = 'light';
    $scope.themeMode = 'manual';
    $scope.showThemePanel = false;

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

    // 切换深色/浅色主题
    $scope.toggleTheme = function() {
        themeService.toggleTheme();
        $scope.currentTheme = themeService.getCurrentTheme();
    };

    // 手动设置主题
    $scope.setTheme = function(theme) {
        themeService.setTheme(theme);
        $scope.currentTheme = theme;
    };

    // 控制器初始化时调用
    $scope.initTheme();

    // 监听 scope 销毁事件，清理资源
    $scope.$on('$destroy', function() {
        themeService.destroy();
    });
});
```

### 任务 3.3: 修改 chatRoom.html

**文件路径**: `public/app/views/chatRoom.html`

**变更内容**:

在聊天工具栏中添加主题切换按钮和面板：

**1. 添加主题切换按钮（在工具栏区域）**:

```html
<!-- 主题切换按钮 -->
<li ng-if="loggedIn" class="theme-switch-item" style="cursor: pointer;">
    <a ng-click="toggleThemePanel()" title="切换主题">
        <i class="fa" ng-class="{'fa-moon-o': currentTheme === 'light', 'fa-sun-o': currentTheme === 'dark'}"></i>
        <span class="hidden-xs">主题</span>
    </a>
</li>
```

**2. 添加主题设置面板（在页面底部或侧边）**:

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

**预期产出**: 修改后的 HTML 文件，包含主题切换功能

---

## 阶段四：测试验证

### 任务 4.1: 手动测试清单

| 测试项 | 测试步骤 | 预期结果 |
|--------|----------|----------|
| 浅色模式 | 首次访问或重置后 | 默认使用浅色主题 |
| 手动切换深色 | 点击月亮图标，设置为深色 | 页面切换为深色主题 |
| 手动切换浅色 | 点击太阳图标，设置为浅色 | 页面切换为浅色主题 |
| 跟随系统 | 设置为跟随系统，观察系统设置 | 随系统设置变化 |
| 跟随时间 | 设置为跟随时间 | 根据时间段自动切换 |
| 刷新保持 | 切换主题后刷新页面 | 主题保持不变 |
| localStorage | 检查 localStorage | 包含正确的主题配置 |

---

## 依赖关系

```
深色模式实现
├── 样式文件创建
│   └── dark-theme.css
├── 服务层实现
│   └── themeService.js
├── 前端集成
│   ├── index.html (引入样式)
│   ├── chatRoomController.js (集成服务)
│   └── chatRoom.html (添加UI)
└── 测试验证
    └── 手动测试
```

---

## 风险和注意事项

1. **CSS 冲突**: 部分第三方库样式可能需要额外覆盖
2. **主题切换闪烁**: 考虑在 body 上添加过渡动画
3. **localStorage 配额**: 确保配置数据足够小
4. **系统主题监听**: 确保正确移除事件监听器避免内存泄漏

---

**计划结束**
