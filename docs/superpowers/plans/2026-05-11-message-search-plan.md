# 消息搜索功能实现计划

**版本**: v1.0
**日期**: 2026-05-11
**功能模块**: 消息搜索
**依赖文档**: 2026-05-11-chatroom-feature-optimization-design.md

---

## 概述

本计划详细描述消息搜索功能的具体实现步骤，包括数据库优化、后端 API、前端服务和 UI 实现。

### 功能需求

- 支持关键词搜索消息内容
- 支持日期范围筛选
- 支持房间筛选（当前房间或所有房间）
- 支持分页加载
- 支持搜索结果关键词高亮
- 支持点击跳转到消息原文位置

---

## 阶段一：数据库优化

### 任务 1.1: 添加数据库索引

**文件路径**: `database/db.js`

**变更内容**:

在数据库初始化函数中添加索引创建逻辑：

```javascript
// 在 initDatabase 函数中添加以下代码
const createIndexes = async () => {
    const indexes = [
        {
            name: 'idx_messages_content',
            sql: 'CREATE INDEX IF NOT EXISTS idx_messages_content ON messages(message_content)'
        },
        {
            name: 'idx_messages_created_at',
            sql: 'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)'
        },
        {
            name: 'idx_messages_room_code',
            sql: 'CREATE INDEX IF NOT EXISTS idx_messages_room_code ON messages(room_code)'
        }
    ];

    for (const index of indexes) {
        try {
            await db.run(index.sql);
            console.log(`索引 ${index.name} 创建成功`);
        } catch (err) {
            console.error(`创建索引 ${index.name} 失败:`, err.message);
        }
    }
};
```

**预期产出**: 数据库索引创建函数

---

### 任务 1.2: 添加搜索方法

**文件路径**: `database/db.js`

**新增方法**:

```javascript
/**
 * 搜索消息
 * @param {Object} options - 搜索选项
 * @param {string} options.keyword - 搜索关键词
 * @param {string} options.roomCode - 房间代码（可选）
 * @param {string} options.startDate - 开始日期（可选）
 * @param {string} options.endDate - 结束日期（可选）
 * @param {number} options.page - 页码
 * @param {number} options.pageSize - 每页条数
 * @returns {Promise<Object>} 搜索结果
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

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM messages ${whereClause}`;
    const countResult = await db.get(countSql, params);
    const total = countResult.total;

    // 获取消息列表
    const sql = `
        SELECT
            id,
            username,
            user_avatar,
            message_content,
            msg_time,
            created_at,
            room_code
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

**预期产出**: searchMessages 数据库方法

---

## 阶段二：后端 API 实现

### 任务 2.1: 添加搜索 API

**文件路径**: `app.js`

**变更内容**:

在现有 API 路由部分添加搜索接口：

```javascript
/**
 * 消息搜索 API
 * GET /api/search-messages
 *
 * Query Parameters:
 * - keyword: string (必填) - 搜索关键词
 * - roomCode: string (可选) - 房间代码
 * - startDate: string (可选) - 开始日期 YYYY-MM-DD
 * - endDate: string (可选) - 结束日期 YYYY-MM-DD
 * - page: number (可选) - 页码，默认1
 * - pageSize: number (可选) - 每页条数，默认20，最大50
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

        // 验证必填参数
        if (!keyword || keyword.trim() === '') {
            return res.status(400).json({
                success: false,
                error: '关键词不能为空',
                errorCode: 1001
            });
        }

        // 验证日期格式
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (startDate && !dateRegex.test(startDate)) {
            return res.status(400).json({
                success: false,
                error: '无效的开始日期格式',
                errorCode: 1002
            });
        }
        if (endDate && !dateRegex.test(endDate)) {
            return res.status(400).json({
                success: false,
                error: '无效的结束日期格式',
                errorCode: 1003
            });
        }

        // 验证日期范围
        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({
                success: false,
                error: '开始日期不能大于结束日期',
                errorCode: 1003
            });
        }

        // 解析分页参数
        const pageNum = Math.max(1, parseInt(page) || 1);
        let pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize) || 20));

        // 执行搜索
        const result = await db.searchMessages({
            keyword: keyword.trim(),
            roomCode: roomCode || null,
            startDate: startDate || null,
            endDate: endDate || null,
            page: pageNum,
            pageSize: pageSizeNum
        });

        // 格式化结果，添加高亮文本
        const formattedMessages = result.messages.map(msg => {
            const highlight = highlightKeyword(msg.message_content, keyword.trim());
            return {
                id: msg.id,
                username: msg.username,
                userAvatar: msg.user_avatar,
                msg: msg.message_content,
                msgTime: msg.msg_time,
                createdAt: msg.created_at,
                roomCode: msg.room_code,
                highlight: highlight
            };
        });

        logger.info('[Search]', `用户搜索关键词: ${keyword}, 找到 ${result.total} 条结果`);

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

/**
 * 关键词高亮函数
 */
function highlightKeyword(text, keyword) {
    if (!text || !keyword) return text;
    const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}

/**
 * 转义正则特殊字符
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

**预期产出**: 搜索 API 路由处理

---

## 阶段三：前端服务

### 任务 3.1: 创建搜索服务

**文件路径**: `public/app/services/searchService.js`

**代码模板**:

```javascript
/**
 * @fileoverview 搜索服务
 * @module services/searchService
 * @description 管理消息搜索功能
 */

angular.module('app')
.service('searchService', ['$http', '$rootScope', function($http, $rootScope) {
    var BASE_URL = $rootScope.baseUrl || '';

    /**
     * 搜索消息
     * @param {Object} params - 搜索参数
     * @returns {Promise<Object>} 搜索结果
     */
    this.searchMessages = function(params) {
        var defaultParams = {
            page: 1,
            pageSize: 20
        };

        var requestParams = angular.extend({}, defaultParams, params);

        return $http.get(BASE_URL + '/api/search-messages', {
            params: requestParams
        }).then(function(response) {
            return response.data;
        }).catch(function(error) {
            console.error('搜索请求失败:', error);
            return {
                success: false,
                error: error.data?.error || '搜索失败'
            };
        });
    };

    /**
     * 高亮关键词
     * @param {string} text - 原始文本
     * @param {string} keyword - 关键词
     * @returns {string} 带高亮的HTML
     */
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

    /**
     * 验证日期格式
     * @param {string} dateStr - 日期字符串
     * @returns {boolean} 是否有效
     */
    this.isValidDate = function(dateStr) {
        if (!dateStr) return true;
        var regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateStr)) return false;
        var date = new Date(dateStr);
        return date instanceof Date && !isNaN(date);
    };

    /**
     * 格式化日期为 YYYY-MM-DD
     * @param {Date} date - 日期对象
     * @returns {string} 格式化后的日期字符串
     */
    this.formatDate = function(date) {
        var year = date.getFullYear();
        var month = ('0' + (date.getMonth() + 1)).slice(-2);
        var day = ('0' + date.getDate()).slice(-2);
        return year + '-' + month + '-' + day;
    };
}]);
```

**预期产出**: 搜索服务 JS 文件

---

## 阶段四：前端集成

### 任务 4.1: 修改 chatRoomController.js

**文件路径**: `public/app/controllers/chatRoomController.js`

**变更内容**:

1. 引入 searchService 依赖
2. 添加搜索相关变量和函数

**需要添加的代码段**:

```javascript
// 在控制器参数中添加 searchService
.controller('chatRoomCtrl', function ($scope, $rootScope, $socket, $location, $http, $window,
    Upload, $timeout, sendImageService, $translate, $sce, roomManagementService, gifService,
    burnAfterReadingService, chatExportService, chatHistoryCacheService, themeService, searchService) {

    // ========== 搜索功能 ==========
    $scope.showSearch = false;
    $scope.searchKeyword = '';
    $scope.searchResults = [];
    $scope.searchRoom = 'current';
    $scope.searchStartDate = '';
    $scope.searchEndDate = '';
    $scope.searchPage = 1;
    $scope.searchTotalPages = 1;
    $scope.searchHasMore = false;
    $scope.searchDone = false;
    $scope.searchLoading = false;

    // 显示搜索面板
    $scope.showSearchPanel = function() {
        $scope.showSearch = true;
        $scope.searchKeyword = '';
        $scope.searchResults = [];
        $scope.searchPage = 1;
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
        $scope.searchPage = 1;

        var params = {
            keyword: $scope.searchKeyword.trim(),
            page: 1,
            pageSize: 20
        };

        // 添加房间筛选
        if ($scope.searchRoom === 'current') {
            params.roomCode = $rootScope.roomCode;
        }

        // 添加日期筛选
        if ($scope.searchStartDate) {
            params.startDate = $scope.searchStartDate;
        }
        if ($scope.searchEndDate) {
            params.endDate = $scope.searchEndDate;
        }

        searchService.searchMessages(params).then(function(result) {
            $scope.searchLoading = false;
            $scope.searchDone = true;

            if (result.success) {
                $scope.searchResults = result.messages;
                $scope.searchTotalPages = Math.ceil(result.total / 20);
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

    // 加载指定页
    $scope.loadSearchPage = function(page) {
        $scope.searchLoading = true;

        var params = {
            keyword: $scope.searchKeyword.trim(),
            page: page,
            pageSize: 20
        };

        if ($scope.searchRoom === 'current') {
            params.roomCode = $rootScope.roomCode;
        }

        if ($scope.searchStartDate) {
            params.startDate = $scope.searchStartDate;
        }
        if ($scope.searchEndDate) {
            params.endDate = $scope.searchEndDate;
        }

        searchService.searchMessages(params).then(function(result) {
            $scope.searchLoading = false;

            if (result.success) {
                $scope.searchResults = result.messages;
                $scope.searchHasMore = result.hasMore;
            }
        });
    };

    // 跳转到消息位置
    $scope.goToMessage = function(result) {
        $scope.closeSearch();

        // 滚动到目标消息
        $timeout(function() {
            var targetElement = document.querySelector('[data-message-id="' + result.id + '"]');
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetElement.classList.add('search-target');
                setTimeout(function() {
                    targetElement.classList.remove('search-target');
                }, 2000);
            } else {
                // 如果消息不在当前页面，加载更多历史消息
                alert('消息不在当前页面，请先加载更多历史记录');
            }
        }, 100);
    };

    // 清空搜索
    $scope.clearSearch = function() {
        $scope.searchKeyword = '';
        $scope.searchResults = [];
        $scope.searchPage = 1;
        $scope.searchDone = false;
    };
});
```

### 任务 4.2: 修改 chatRoom.html

**文件路径**: `public/app/views/chatRoom.html`

**变更内容**:

1. 在工具栏添加搜索按钮
2. 添加搜索面板 HTML

**1. 添加搜索按钮（在工具栏区域）**:

```html
<!-- 搜索按钮 -->
<li ng-if="loggedIn" style="cursor: pointer;">
    <a ng-click="showSearchPanel()" title="搜索消息">
        <i class="fa fa-search"></i>
        <span class="hidden-xs">搜索</span>
    </a>
</li>
```

**2. 添加搜索面板**:

```html
<!-- 搜索面板 -->
<div class="search-overlay" ng-if="showSearch" ng-click="closeSearch()"></div>
<div class="search-panel" ng-show="showSearch">
    <div class="search-header">
        <div class="search-input-wrapper">
            <i class="fa fa-search search-icon"></i>
            <input type="text"
                   class="form-control search-input"
                   ng-model="searchKeyword"
                   placeholder="搜索消息内容..."
                   ng-keyup="$event.keyCode === 13 && doSearch()">
            <button class="btn btn-clear" ng-if="searchKeyword" ng-click="clearSearch()">
                <i class="fa fa-times"></i>
            </button>
        </div>
        <button class="btn btn-primary search-btn" ng-click="doSearch()">
            <i class="fa fa-search"></i> 搜索
        </button>
    </div>

    <div class="search-filters">
        <div class="filter-row">
            <div class="filter-group">
                <label>房间:</label>
                <select class="form-control" ng-model="searchRoom">
                    <option value="current">当前房间</option>
                    <option value="all">所有房间</option>
                </select>
            </div>
            <div class="filter-group">
                <label>日期:</label>
                <input type="date" class="form-control" ng-model="searchStartDate" placeholder="开始日期">
                <span class="date-separator">至</span>
                <input type="date" class="form-control" ng-model="searchEndDate" placeholder="结束日期">
            </div>
        </div>
    </div>

    <div class="search-results" ng-show="searchResults.length > 0">
        <div class="results-count">
            共找到 <strong>{{searchResults.length}}</strong> 条结果
        </div>
        <div class="search-result-item"
             ng-repeat="result in searchResults"
             ng-click="goToMessage(result)">
            <div class="result-header">
                <img ng-src="{{result.userAvatar}}" class="result-avatar" onerror="this.src='app/css/dist/img/avatar.png'">
                <span class="result-username">{{result.username}}</span>
                <span class="result-time">{{result.msgTime}}</span>
                <span class="result-room">[{{result.roomCode}}]</span>
            </div>
            <div class="result-content" ng-bind-html="result.highlight"></div>
        </div>
        <div class="search-pagination" ng-show="searchTotalPages > 1">
            <button class="btn btn-default btn-sm"
                    ng-disabled="searchPage <= 1"
                    ng-click="prevSearchPage()">
                <i class="fa fa-chevron-left"></i> 上一页
            </button>
            <span class="page-info">{{searchPage}} / {{searchTotalPages}}</span>
            <button class="btn btn-default btn-sm"
                    ng-disabled="!searchHasMore"
                    ng-click="nextSearchPage()">
                下一页 <i class="fa fa-chevron-right"></i>
            </button>
        </div>
    </div>

    <div class="search-loading" ng-show="searchLoading">
        <i class="fa fa-spinner fa-spin"></i> 搜索中...
    </div>

    <div class="search-empty" ng-show="searchDone && searchResults.length === 0">
        <i class="fa fa-search"></i>
        <p>未找到匹配的消息</p>
        <small>尝试其他关键词或调整筛选条件</small>
    </div>
</div>
```

### 任务 4.3: 添加搜索样式

**文件路径**: `public/app/css/style.css`

**添加样式**:

```css
/* ========================================
   搜索面板样式
   ======================================== */
.search-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
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
    padding-right: 30px !important;
}

.btn-clear {
    position: absolute;
    right: 5px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #999;
    padding: 5px;
}

.btn-clear:hover {
    color: #333;
}

.search-btn {
    white-space: nowrap;
}

.search-filters {
    padding: 10px 15px;
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
}

[data-theme="dark"] .search-filters {
    background: #16213e;
    border-bottom-color: #2a2a4a;
}

.filter-row {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
}

.filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.filter-group label {
    margin: 0;
    font-size: 13px;
    color: #666;
}

[data-theme="dark"] .filter-group label {
    color: #a0a0a0;
}

.filter-group select,
.filter-group input {
    padding: 5px 8px;
    font-size: 13px;
}

.date-separator {
    color: #999;
}

.search-results {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
}

.results-count {
    padding: 8px 5px;
    font-size: 13px;
    color: #666;
    border-bottom: 1px solid #f0f0f0;
}

[data-theme="dark"] .results-count {
    color: #a0a0a0;
    border-bottom-color: #2a2a4a;
}

.search-result-item {
    padding: 12px;
    border-radius: 6px;
    cursor: pointer;
    margin-bottom: 8px;
    background: #f8f9fa;
    transition: background 0.2s;
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
    object-fit: cover;
}

.result-username {
    font-weight: 600;
    font-size: 14px;
}

.result-time {
    color: #999;
    font-size: 12px;
}

.result-room {
    color: #666;
    font-size: 12px;
    background: #e0e0e0;
    padding: 2px 6px;
    border-radius: 3px;
}

[data-theme="dark"] .result-room {
    background: #2a2a4a;
    color: #a0a0a0;
}

.result-content {
    font-size: 14px;
    line-height: 1.5;
    color: #333;
}

[data-theme="dark"] .result-content {
    color: #e4e4e4;
}

.search-highlight {
    background: #ffd700;
    color: #000;
    padding: 1px 3px;
    border-radius: 2px;
    font-weight: 600;
}

[data-theme="dark"] .search-highlight {
    background: #5a4a2a;
    color: #ffd700;
}

.search-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    padding: 15px;
    border-top: 1px solid #f0f0f0;
}

[data-theme="dark"] .search-pagination {
    border-top-color: #2a2a4a;
}

.page-info {
    color: #666;
    font-size: 13px;
}

[data-theme="dark"] .page-info {
    color: #a0a0a0;
}

.search-loading,
.search-empty {
    padding: 40px;
    text-align: center;
    color: #999;
}

.search-loading i {
    font-size: 24px;
    margin-bottom: 10px;
}

.search-empty i {
    font-size: 48px;
    margin-bottom: 15px;
    opacity: 0.3;
}

.search-empty p {
    margin: 10px 0 5px;
    font-size: 16px;
    color: #666;
}

[data-theme="dark"] .search-empty p {
    color: #a0a0a0;
}

.search-empty small {
    color: #999;
}

/* 消息定位高亮 */
.search-target {
    animation: highlight-pulse 1s ease-in-out 2;
    background: rgba(255, 215, 0, 0.3) !important;
}

[data-theme="dark"] .search-target {
    background: rgba(90, 74, 42, 0.5) !important;
}

@keyframes highlight-pulse {
    0%, 100% {
        box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.4);
    }
    50% {
        box-shadow: 0 0 0 10px rgba(255, 215, 0, 0);
    }
}
```

**预期产出**: 完整的搜索 UI 和样式

---

## 阶段五：测试验证

### 任务 5.1: API 测试

| 测试项 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 正常搜索 | GET /api/search-messages?keyword=test | 返回匹配的消息 |
| 空关键词 | GET /api/search-messages?keyword= | 返回错误：关键词不能为空 |
| 日期筛选 | 添加 startDate 和 endDate 参数 | 只返回日期范围内的消息 |
| 房间筛选 | 添加 roomCode 参数 | 只返回指定房间的消息 |
| 分页 | 添加 page 和 pageSize 参数 | 返回正确的分页结果 |
| 高亮 | 检查返回的 highlight 字段 | 关键词被正确包裹 |

### 任务 5.2: UI 测试

| 测试项 | 测试步骤 | 预期结果 |
|--------|----------|----------|
| 打开搜索 | 点击搜索按钮 | 搜索面板正常显示 |
| 关闭搜索 | 点击关闭或点击遮罩 | 搜索面板正常关闭 |
| 执行搜索 | 输入关键词，点击搜索 | 显示搜索结果 |
| 日期筛选 | 设置日期范围，搜索 | 只显示范围内的消息 |
| 房间筛选 | 选择"所有房间"，搜索 | 显示所有房间的结果 |
| 跳转消息 | 点击搜索结果 | 滚动到对应消息位置 |
| 分页 | 点击下一页 | 加载下一页结果 |

---

## 依赖关系

```
消息搜索功能实现
├── 数据库优化
│   ├── 添加索引 (db.js)
│   └── 添加搜索方法 (db.js)
├── 后端 API
│   └── 添加搜索接口 (app.js)
├── 前端服务
│   └── 创建搜索服务 (searchService.js)
├── 前端集成
│   ├── 修改控制器 (chatRoomController.js)
│   ├── 修改视图 (chatRoom.html)
│   └── 添加样式 (style.css)
└── 测试验证
    ├── API 测试
    └── UI 测试
```

---

## 风险和注意事项

1. **搜索性能**: 大数据量时搜索可能较慢，考虑添加搜索结果缓存
2. **SQL 注入**: 确保关键词转义，避免 SQL 注入风险
3. **XSS 攻击**: highlight 函数输出的 HTML 需要确保安全
4. **分页边界**: 确保页码和每页条数在合理范围内
5. **消息定位**: 如果目标消息不在当前加载的历史中，需要提示用户

---

**计划结束**
