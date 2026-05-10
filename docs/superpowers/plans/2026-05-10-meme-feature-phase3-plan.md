# 表情包功能第三阶段实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现表情包功能第三阶段 - GIF 动图支持

**Architecture:** 在现有 chatRoomController.js 中添加 GIF 搜索功能，修改 chatRoom.html 添加 GIF 标签页，创建 gifService.js 管理 GIPHY API 调用

**Tech Stack:** AngularJS, GIPHY API, localStorage

---

## 文件结构规划

**新建文件（1个）：**
- `/workspace/public/app/services/gifService.js` - GIF 搜索服务

**修改文件（2个）：**
- `/workspace/public/app/controllers/chatRoomController.js` - 添加 GIF 功能
- `/workspace/public/app/views/chatRoom.html` - 添加 GIF 标签页

---

## Task 1: 创建 GIF 搜索服务

**Files:**
- Create: `/workspace/public/app/services/gifService.js`

- [ ] **Step 1: 创建 gifService.js**

```javascript
/**
 * @fileoverview GIF 搜索服务
 * @module services/gifService
 * @description 提供 GIPHY API 集成和 GIF 搜索功能
 */

'use strict';

app.factory('gifService', ['$http', '$rootScope', function($http, $rootScope) {
    var service = {};
    
    // GIPHY API 配置
    // 注意：需要替换为您自己的 API Key
    // 申请地址：https://developers.giphy.com/
    var GIPHY_API_KEY = 'dc6zaTOxFJmzC'; // 测试用公钥（有限制）
    var GIPHY_API_URL = 'https://api.giphy.com/v1/gifs';
    
    // 缓存
    var trendingCache = [];
    var searchCache = {};
    
    /**
     * 获取热门 GIF
     * @param {number} limit - 返回数量
     * @returns {Promise<Array>} GIF 列表
     */
    service.getTrending = function(limit) {
        limit = limit || 20;
        
        return $http.get(GIPHY_API_URL + '/trending', {
            params: {
                api_key: GIPHY_API_KEY,
                limit: limit,
                rating: 'g'
            }
        }).then(function(response) {
            trendingCache = parseGifResponse(response);
            return trendingCache;
        }).catch(function(error) {
            console.error('获取热门 GIF 失败:', error);
            return [];
        });
    };
    
    /**
     * 搜索 GIF
     * @param {string} query - 搜索关键词
     * @param {number} limit - 返回数量
     * @returns {Promise<Array>} GIF 列表
     */
    service.search = function(query, limit) {
        limit = limit || 20;
        
        if (!query || query.trim() === '') {
            return Promise.resolve([]);
        }
        
        query = query.trim();
        
        // 检查缓存
        if (searchCache[query]) {
            return Promise.resolve(searchCache[query]);
        }
        
        return $http.get(GIPHY_API_URL + '/search', {
            params: {
                api_key: GIPHY_API_KEY,
                q: query,
                limit: limit,
                rating: 'g'
            }
        }).then(function(response) {
            var gifs = parseGifResponse(response);
            searchCache[query] = gifs;
            return gifs;
        }).catch(function(error) {
            console.error('搜索 GIF 失败:', error);
            return [];
        });
    };
    
    /**
     * 解析 GIPHY API 响应
     * @param {Object} response - API 响应
     * @returns {Array} GIF 列表
     */
    function parseGifResponse(response) {
        if (!response.data || !response.data.data) {
            return [];
        }
        
        return response.data.data.map(function(gif) {
            return {
                id: gif.id,
                title: gif.title,
                url: gif.images.fixed_height.url,
                thumbnail: gif.images.fixed_height_small.url,
                preview: gif.images.fixed_height_small.url,
                width: gif.images.fixed_height.width,
                height: gif.images.fixed_height.height
            };
        });
    }
    
    /**
     * 清除缓存
     */
    service.clearCache = function() {
        trendingCache = [];
        searchCache = {};
    };
    
    return service;
}]);
```

- [ ] **Step 2: 提交代码**

Run:
```bash
cd /workspace
git add public/app/services/gifService.js
git commit -m "feat: add gifService for GIPHY API integration"
```

---

## Task 2: 集成 GIF 功能到控制器

**Files:**
- Modify: `/workspace/public/app/controllers/chatRoomController.js`

- [ ] **Step 1: 在控制器依赖中添加 gifService**

找到控制器定义行，修改为：

```javascript
.controller('chatRoomCtrl', function ($scope, $rootScope, $socket, $location, $http, $window, Upload, $timeout, sendImageService, $translate, $sce, roomManagementService, gifService) {
```

- [ ] **Step 2: 添加 GIF 相关变量**

在收藏变量后面添加：

```javascript
// GIF 相关
$scope.gifs = [];
$scope.gifSearchText = '';
$scope.isLoadingGifs = false;
$scope.showGifTab = false;
$scope.gifOffset = 0;
$scope.hasMoreGifs = true;
```

- [ ] **Step 3: 添加 GIF 相关函数**

```javascript
// GIF 功能
$scope.toggleGifTab = function(show) {
  $scope.showGifTab = show;
  if (show && $scope.gifs.length === 0) {
    $scope.loadTrendingGifs();
  }
};

$scope.loadTrendingGifs = function() {
  if ($scope.isLoadingGifs) return;
  
  $scope.isLoadingGifs = true;
  
  gifService.getTrending(20).then(function(gifs) {
    $scope.gifs = gifs;
    $scope.hasMoreGifs = gifs.length >= 20;
    $scope.isLoadingGifs = false;
  });
};

$scope.searchGifs = function() {
  if ($scope.isLoadingGifs) return;
  
  var query = $scope.gifSearchText.trim();
  
  if (!query) {
    $scope.loadTrendingGifs();
    return;
  }
  
  $scope.isLoadingGifs = true;
  
  gifService.search(query, 20).then(function(gifs) {
    $scope.gifs = gifs;
    $scope.hasMoreGifs = gifs.length >= 20;
    $scope.isLoadingGifs = false;
  });
};

$scope.loadMoreGifs = function() {
  if ($scope.isLoadingGifs || !$scope.hasMoreGifs) return;
  
  $scope.gifOffset += 20;
  $scope.isLoadingGifs = true;
  
  var query = $scope.gifSearchText.trim();
  
  if (query) {
    gifService.search(query, 20).then(function(gifs) {
      $scope.gifs = $scope.gifs.concat(gifs);
      $scope.hasMoreGifs = gifs.length >= 20;
      $scope.isLoadingGifs = false;
    });
  } else {
    gifService.getTrending(20).then(function(gifs) {
      $scope.gifs = $scope.gifs.concat(gifs);
      $scope.hasMoreGifs = gifs.length >= 20;
      $scope.isLoadingGifs = false;
    });
  }
};

$scope.sendGif = function(gif) {
  $scope.enviarMEME({
    id: 'gif_' + gif.id,
    url: gif.url,
    category: 'gif',
    name: gif.title || 'GIF'
  });
};
```

- [ ] **Step 4: 修改 enviarMEME 函数支持 GIF**

找到 enviarMEME 函数，确保支持 GIF：

```javascript
$scope.enviarMEME = function(meme) {
  $scope.isFileSelected = false;
  $scope.isMsg = true;
  var dateString = formatAMPM(new Date());
  var memeUrl = typeof meme === 'string' ? meme : meme.url;
  var isGif = meme && meme.category === 'gif';
  
  $socket.emit("send-message", {
    username: $rootScope.username,
    userAvatar: $rootScope.userAvatar,
    msg: memeUrl,
    isImageMSG: false,
    isMeme: true,
    isGif: isGif,
    hasMsg: $scope.isMsg,
    hasFile: $scope.isFileSelected,
    msgTime: dateString,
    roomCode: $rootScope.roomCode
  }, function(data) {
    if (data.success == true) {
      $scope.chatMsg = "";
      $scope.setFocus = true;
    }
  });
  
  $socket.emit("send-meme", {
    username: $rootScope.username,
    msg: memeUrl,
    roomCode: $rootScope.roomCode
  }, function(data) {
    if (data.success == true) {
      $scope.chatMsg = "";
      $scope.setFocus = true;
    }
  });
};
```

- [ ] **Step 5: 提交代码**

Run:
```bash
cd /workspace
git add public/app/controllers/chatRoomController.js
git commit -m "feat: integrate GIF search functionality"
```

---

## Task 3: 添加 GIF UI 到视图

**Files:**
- Modify: `/workspace/public/app/views/chatRoom.html`

- [ ] **Step 1: 在表情包选择器中添加 GIF 标签**

找到 meme-categories 部分，添加 GIF 标签：

```html
<!-- 分类标签 -->
<div class="meme-categories">
  <!-- GIF 标签 -->
  <button class="meme-category-btn gif-tab" 
          ng-class="{'active': showGifTab}"
          ng-click="toggleGifTab(!showGifTab)">
    <span>GIF</span>
  </button>
  
  <!-- 收藏标签 -->
  <button class="meme-category-btn" 
          ng-class="{'active': showFavoritesOnly}"
          ng-click="toggleFavoritesView(true)">
    <span>⭐</span>
    <span class="category-name">收藏</span>
    <span class="favorites-count" ng-show="favorites.length > 0">({{favorites.length}})</span>
  </button>
  
  <!-- 常规分类 -->
  <button class="meme-category-btn" 
          ng-repeat="cat in memeCategories"
          ng-class="{'active': !showFavoritesOnly && !showGifTab && selectedMemeCategory === cat.id}"
          ng-click="toggleFavoritesView(false); toggleGifTab(false); selectMemeCategory(cat.id)">
    <span>{{cat.icon}}</span>
    <span class="category-name">{{cat.name}}</span>
  </button>
</div>
```

- [ ] **Step 2: 添加 GIF 搜索和显示区域**

在 meme-categories 后面添加：

```html
<!-- GIF 搜索和显示 -->
<div class="gif-panel" ng-show="showGifTab">
  <!-- GIF 搜索栏 -->
  <div class="gif-search-bar">
    <div class="input-group">
      <input type="text" 
             class="form-control" 
             placeholder="搜索 GIF..." 
             ng-model="gifSearchText"
             ng-keyup="$event.keyCode === 13 && searchGifs()">
      <span class="input-group-btn">
        <button class="btn btn-primary" type="button" ng-click="searchGifs()">
          <i class="fa fa-search"></i>
        </button>
      </span>
    </div>
  </div>
  
  <!-- GIF 网格 -->
  <div class="gif-gallery">
    <div class="gif-grid" ng-show="gifs.length > 0">
      <div class="gif-item" 
           ng-repeat="gif in gifs track by gif.id"
           ng-click="sendGif(gif)"
           title="{{gif.title}}">
        <img ng-src="{{gif.preview || gif.url}}" 
             alt="{{gif.title}}"
             loading="lazy">
      </div>
    </div>
    
    <!-- 加载中 -->
    <div class="gif-loading" ng-show="isLoadingGifs">
      <i class="fa fa-spinner fa-spin"></i>
      <span>加载中...</span>
    </div>
    
    <!-- 空状态 -->
    <div class="gif-empty" ng-show="!isLoadingGifs && gifs.length === 0">
      <i class="fa fa-search"></i>
      <p ng-if="gifSearchText">未找到匹配的 GIF</p>
      <p ng-if="!gifSearchText">搜索或浏览热门 GIF</p>
    </div>
    
    <!-- 加载更多 -->
    <div class="gif-load-more" ng-show="hasMoreGifs && gifs.length > 0">
      <button class="btn btn-default btn-sm" ng-click="loadMoreGifs()" ng-disabled="isLoadingGifs">
        <span ng-show="isLoadingGifs"><i class="fa fa-spinner fa-spin"></i> 加载中...</span>
        <span ng-show="!isLoadingGifs">加载更多</span>
      </button>
    </div>
  </div>
</div>

<!-- 表情包画廊（非 GIF 模式） -->
<div class="meme-gallery" ng-show="!showGifTab">
```

- [ ] **Step 3: 确保闭合标签正确**

确保原有的 `</div>` 闭合标签在正确位置。查找 `<!-- 表情包画廊（非 GIF 模式） -->` 之前的 `</div>` 是 GIF 容器的闭合。

- [ ] **Step 4: 提交代码**

Run:
```bash
cd /workspace
git add public/app/views/chatRoom.html
git commit -m "feat: add GIF search UI and tab"
```

---

## Task 4: 添加 GIF 样式

**Files:**
- Modify: `/workspace/public/app/css/style.css`

- [ ] **Step 1: 添加 GIF 相关样式**

在收藏样式后面添加：

```css
/* ========== GIF 功能样式 ========== */

/* GIF 标签 */
.meme-category-btn.gif-tab {
  background-color: #00BFFF;
  border-color: #00BFFF;
  color: white;
  font-weight: bold;
}

.meme-category-btn.gif-tab:hover {
  background-color: #00AEEE;
  border-color: #00AEEE;
}

.meme-category-btn.gif-tab.active {
  background-color: #008CBA;
  border-color: #008CBA;
}

/* GIF 面板 */
.gif-panel {
  background-color: var(--card-bg);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}

/* GIF 搜索栏 */
.gif-search-bar {
  margin-bottom: 12px;
}

.gif-search-bar .input-group {
  width: 100%;
}

.gif-search-bar input {
  background-color: var(--input-bg);
  border-color: var(--border-color);
  color: var(--text-primary);
}

.gif-search-bar input:focus {
  border-color: #00BFFF;
  box-shadow: none;
}

.gif-search-bar .btn-primary {
  background-color: #00BFFF;
  border-color: #00BFFF;
}

.gif-search-bar .btn-primary:hover {
  background-color: #00AEEE;
  border-color: #00AEEE;
}

/* GIF 画廊 */
.gif-gallery {
  max-height: 280px;
  overflow-y: auto;
}

.gif-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

/* GIF 项 */
.gif-item {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease;
  background-color: var(--bg-secondary);
}

.gif-item:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.gif-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* GIF 加载状态 */
.gif-loading {
  text-align: center;
  padding: 30px;
  color: var(--text-muted);
}

.gif-loading i {
  font-size: 24px;
  margin-bottom: 10px;
}

/* GIF 空状态 */
.gif-empty {
  text-align: center;
  padding: 30px;
  color: var(--text-muted);
}

.gif-empty i {
  font-size: 32px;
  margin-bottom: 10px;
}

/* 加载更多按钮 */
.gif-load-more {
  text-align: center;
  padding: 10px;
}

/* GIF 滚动条 */
.gif-gallery::-webkit-scrollbar {
  width: 6px;
}

.gif-gallery::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 3px;
}

.gif-gallery::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .gif-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

- [ ] **Step 2: 提交代码**

Run:
```bash
cd /workspace
git add public/app/css/style.css
git commit -m "feat: add GIF styles and layout"
```

---

## Task 5: 整体测试和验证

- [ ] **Step 1: 启动服务器测试**

Run:
```bash
cd /workspace
node app.js
```

- [ ] **Step 2: 测试 GIF 功能**

在浏览器中打开 http://localhost:8282
1. 登录进入聊天室
2. 找到表情包选择器
3. 点击 "GIF" 标签
4. 验证热门 GIF 加载显示
5. 输入关键词搜索 GIF
6. 点击 GIF 发送

Expected:
- [ ] GIF 标签正确显示
- [ ] 热门 GIF 自动加载
- [ ] 搜索功能正常
- [ ] 点击 GIF 能正确发送
- [ ] GIF 在聊天中正确显示

- [ ] **Step 3: 测试分类切换**

Expected:
- [ ] 点击其他分类恢复正常表情包显示
- [ ] GIF 和表情包切换流畅

- [ ] **Step 4: 最终提交**

Run:
```bash
cd /workspace
git add -A
git commit -m "feat: complete meme feature phase 3 - GIF support"
```

---

## 验收清单

### 功能验收

- [ ] GIF 标签正确显示
- [ ] 热门 GIF 自动加载
- [ ] GIF 搜索功能正常
- [ ] GIF 发送功能正常
- [ ] 加载更多功能正常

### UI 验收

- [ ] GIF 面板样式美观
- [ ] GIF 网格布局合理
- [ ] 加载动画正常
- [ ] 深色模式样式正确

### 性能验收

- [ ] GIF 加载速度可接受
- [ ] 滚动流畅无卡顿
- [ ] 搜索响应及时

---

## 实施总结

### 已完成任务清单

| Task | 内容 | 状态 |
|------|------|------|
| Task 1 | 创建 gifService.js | ☐ |
| Task 2 | 集成 GIF 功能到控制器 | ☐ |
| Task 3 | 添加 GIF UI 到视图 | ☐ |
| Task 4 | 添加 GIF 样式 | ☐ |
| Task 5 | 整体测试和验证 | ☐ |

### 文件变更总结

**新建文件：**
- `/workspace/public/app/services/gifService.js`

**修改文件：**
- `/workspace/public/app/controllers/chatRoomController.js`
- `/workspace/public/app/views/chatRoom.html`
- `/workspace/public/app/css/style.css`

### 功能实现清单

- ✅ GIF 标签页
- ✅ 热门 GIF 自动加载
- ✅ GIF 搜索功能
- ✅ GIF 发送功能
- ✅ 加载更多功能
- ✅ 响应式布局

---

## 注意事项

### GIPHY API Key

当前使用的是 GIPHY 提供的测试 API Key，功能有限：

- 测试 Key: `dc6zaTOxFJmzC`
- 限制: 42 请求/小时
- 用途: 开发测试

**生产环境建议：**
1. 访问 https://developers.giphy.com/
2. 注册账号并创建应用
3. 获取自己的 API Key
4. 替换 `gifService.js` 中的 `GIPHY_API_KEY`
