# 表情包功能第二阶段实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现表情包功能第二阶段 - 增强分类管理、添加表情包收藏功能

**Architecture:** 在现有 chatRoomController.js 中扩展收藏功能，修改 chatRoom.html 添加收藏标签页和操作按钮，更新 CSS 样式

**Tech Stack:** AngularJS, localStorage, CSS

---

## 文件结构规划

**修改文件（3个）：**
- `/workspace/public/app/controllers/chatRoomController.js` - 添加收藏功能和收藏标签页
- `/workspace/public/app/views/chatRoom.html` - 添加收藏标签页和收藏按钮
- `/workspace/public/app/css/style.css` - 添加收藏相关样式

---

## Task 1: 添加表情包收藏功能

**Files:**
- Modify: `/workspace/public/app/controllers/chatRoomController.js`

- [ ] **Step 1: 添加收藏相关变量**

在 `memeCategories` 数组后面添加收藏相关变量：

```javascript
// 收藏相关
var FAVORITES_KEY = 'chatroom_meme_favorites';
var MAX_FAVORITES = 20;

$scope.favorites = [];
$scope.showFavoritesOnly = false;

// 加载收藏列表
$scope.loadFavorites = function() {
  try {
    var stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      $scope.favorites = JSON.parse(stored);
    }
  } catch (e) {
    console.error('加载收藏失败:', e);
    $scope.favorites = [];
  }
};

// 保存收藏列表
$scope.saveFavorites = function() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify($scope.favorites));
  } catch (e) {
    console.error('保存收藏失败:', e);
  }
};

// 检查是否已收藏
$scope.isFavorite = function(meme) {
  return $scope.favorites.some(function(f) {
    return f.id === meme.id;
  });
};

// 添加到收藏
$scope.addToFavorites = function(meme) {
  if ($scope.isFavorite(meme)) {
    return;
  }
  
  if ($scope.favorites.length >= MAX_FAVORITES) {
    alert('收藏已达上限（' + MAX_FAVORITES + '个）');
    return;
  }
  
  $scope.favorites.push({
    id: meme.id,
    url: meme.url,
    category: meme.category,
    name: meme.name,
    addedAt: new Date().toISOString()
  });
  
  $scope.saveFavorites();
};

// 从收藏移除
$scope.removeFromFavorites = function(meme) {
  $scope.favorites = $scope.favorites.filter(function(f) {
    return f.id !== meme.id;
  });
  $scope.saveFavorites();
};

// 初始化加载收藏
$scope.loadFavorites();
```

- [ ] **Step 2: 修改 getFilteredMemes 函数支持收藏显示**

更新 `getFilteredMemes` 函数：

```javascript
$scope.getFilteredMemes = function() {
  // 如果只显示收藏
  if ($scope.showFavoritesOnly) {
    return $scope.favorites;
  }
  
  var result = $scope.memes;
  
  // 按分类过滤
  if ($scope.selectedMemeCategory !== 'all') {
    result = result.filter(function(meme) {
      return meme.category === $scope.selectedMemeCategory;
    });
  }
  
  // 按搜索词过滤
  if ($scope.memeSearchText && $scope.memeSearchText.trim() !== '') {
    var searchTerm = $scope.memeSearchText.toLowerCase().trim();
    result = result.filter(function(meme) {
      return meme.name.toLowerCase().includes(searchTerm);
    });
  }
  
  return result;
};

// 切换收藏显示
$scope.toggleFavoritesView = function(show) {
  $scope.showFavoritesOnly = show;
  if (show) {
    $scope.memeSearchText = '';
  }
};
```

- [ ] **Step 3: 修改 enviarMEME 函数支持收藏发送**

更新 `enviarMEME` 函数：

```javascript
$scope.enviarMEME = function(meme) {
  $scope.isFileSelected = false;
  $scope.isMsg = true;
  var dateString = formatAMPM(new Date());
  var memeUrl = typeof meme === 'string' ? meme : meme.url;
  
  $socket.emit("send-message", {
    username: $rootScope.username,
    userAvatar: $rootScope.userAvatar,
    msg: memeUrl,
    isImageMSG: false,
    isMeme: true,
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

- [ ] **Step 4: 提交代码**

Run:
```bash
cd /workspace
git add public/app/controllers/chatRoomController.js
git commit -m "feat: add meme favorites functionality with localStorage"
```

---

## Task 2: 更新表情包选择器 UI

**Files:**
- Modify: `/workspace/public/app/views/chatRoom.html`

- [ ] **Step 1: 读取当前表情包选择器 HTML**

Run: `sed -n '167,220p' /workspace/public/app/views/chatRoom.html`
Expected: 看到当前的表情包选择器结构

- [ ] **Step 2: 更新分类标签，添加收藏标签**

找到 `<div class="meme-categories">` 部分，修改为：

```html
<!-- 分类标签 -->
<div class="meme-categories">
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
          ng-class="{'active': !showFavoritesOnly && selectedMemeCategory === cat.id}"
          ng-click="toggleFavoritesView(false); selectMemeCategory(cat.id)">
    <span>{{cat.icon}}</span>
    <span class="category-name">{{cat.name}}</span>
  </button>
</div>
```

- [ ] **Step 3: 在表情包项上添加收藏按钮**

找到 `<div class="meme-item">` 部分，修改为：

```html
<!-- 表情包网格 -->
<div class="meme-gallery">
  <div class="meme-grid">
    <div class="meme-item" 
         ng-repeat="meme in getFilteredMemes() track by meme.id"
         ng-click="enviarMEME(meme)"
         title="{{meme.name}}">
      <img ng-src="{{meme.url}}" alt="{{meme.name}}">
      
      <!-- 收藏按钮 -->
      <button class="meme-favorite-btn"
              ng-click="toggleFavorite($event, meme)"
              ng-class="{'is-favorite': isFavorite(meme)}"
              title="{{isFavorite(meme) ? '取消收藏' : '添加收藏'}}">
        <i class="fa" ng-class="isFavorite(meme) ? 'fa-star' : 'fa-star-o'"></i>
      </button>
    </div>
  </div>
  
  <!-- 无结果提示 -->
  <div class="meme-empty" ng-show="getFilteredMemes().length === 0">
    <i class="fa" ng-class="showFavoritesOnly ? 'fa-star-o' : 'fa-search'"></i>
    <p ng-if="showFavoritesOnly">暂无收藏的表情包</p>
    <p ng-if="!showFavoritesOnly">未找到匹配的表情包</p>
  </div>
</div>
```

- [ ] **Step 4: 添加 toggleFavorite 函数支持**

在控制器中添加 `toggleFavorite` 函数（在 enviarMEME 之前）：

```javascript
// 切换收藏状态
$scope.toggleFavorite = function($event, meme) {
  $event.stopPropagation();
  
  if ($scope.isFavorite(meme)) {
    $scope.removeFromFavorites(meme);
  } else {
    $scope.addToFavorites(meme);
  }
};
```

- [ ] **Step 5: 提交代码**

Run:
```bash
cd /workspace
git add public/app/views/chatRoom.html
git commit -m "feat: add favorites tab and favorite button to meme selector"
```

---

## Task 3: 添加收藏相关样式

**Files:**
- Modify: `/workspace/public/app/css/style.css`

- [ ] **Step 1: 添加收藏标签和按钮样式**

在表情包样式末尾添加：

```css
/* 收藏标签 */
.meme-category-btn .favorites-count {
  font-size: 10px;
  margin-left: 2px;
  color: var(--warning-color);
}

.meme-category-btn.active .favorites-count {
  color: white;
}

/* 表情包项收藏按钮 */
.meme-item {
  position: relative;
}

.meme-favorite-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  color: white;
  font-size: 12px;
}

.meme-item:hover .meme-favorite-btn {
  opacity: 1;
}

.meme-favorite-btn:hover {
  background: rgba(0, 0, 0, 0.7);
  transform: scale(1.1);
}

.meme-favorite-btn.is-favorite {
  opacity: 1;
  color: var(--warning-color);
  background: rgba(255, 255, 255, 0.9);
}

.meme-favorite-btn.is-favorite:hover {
  color: var(--danger-color);
}

/* 收藏空状态 */
.meme-empty .fa-star-o {
  color: var(--text-muted);
}
```

- [ ] **Step 2: 提交代码**

Run:
```bash
cd /workspace
git add public/app/css/style.css
git commit -m "feat: add favorites styles and animations"
```

---

## Task 4: 整体测试和验证

- [ ] **Step 1: 启动服务器测试**

Run:
```bash
cd /workspace
node app.js
```

- [ ] **Step 2: 测试收藏功能**

在浏览器中打开 http://localhost:8282
1. 登录进入聊天室
2. 找到表情包选择器
3. 点击表情包上的星标按钮添加收藏
4. 验证星标变金色
5. 点击"收藏"标签查看收藏列表
6. 点击星标移除收藏

Expected:
- [ ] 收藏按钮显示正常
- [ ] 点击收藏按钮收藏成功
- [ ] 收藏标签显示收藏数量
- [ ] 点击收藏标签显示收藏列表
- [ ] 收藏持久化（刷新页面后收藏仍在）

- [ ] **Step 3: 测试分类和搜索**

Expected:
- [ ] 点击其他分类恢复正常显示
- [ ] 搜索功能正常
- [ ] 收藏项也能通过搜索找到

- [ ] **Step 4: 最终提交**

Run:
```bash
cd /workspace
git add -A
git commit -m "feat: complete meme feature phase 2 - favorites functionality"
```

---

## 验收清单

### 功能验收

- [ ] 收藏标签正确显示
- [ ] 点击星标能添加/移除收藏
- [ ] 收藏数量正确显示
- [ ] 收藏列表正常显示
- [ ] localStorage 持久化正常

### UI 验收

- [ ] 收藏按钮悬停显示
- [ ] 收藏状态金色星标
- [ ] 动画效果流畅
- [ ] 深色模式样式正确

### 性能验收

- [ ] 收藏操作响应及时
- [ ] 刷新页面收藏不丢失

---

## 实施总结

### 已完成任务清单

| Task | 内容 | 状态 |
|------|------|------|
| Task 1 | 添加表情包收藏功能 | ☐ |
| Task 2 | 更新表情包选择器 UI | ☐ |
| Task 3 | 添加收藏相关样式 | ☐ |
| Task 4 | 整体测试和验证 | ☐ |

### 文件变更总结

**修改文件：**
- `/workspace/public/app/controllers/chatRoomController.js` - 收藏功能逻辑
- `/workspace/public/app/views/chatRoom.html` - 收藏 UI
- `/workspace/public/app/css/style.css` - 收藏样式

### 功能实现清单

- ✅ 收藏标签页
- ✅ 添加收藏按钮
- ✅ 移除收藏功能
- ✅ 收藏列表显示
- ✅ localStorage 持久化
- ✅ 收藏数量显示
