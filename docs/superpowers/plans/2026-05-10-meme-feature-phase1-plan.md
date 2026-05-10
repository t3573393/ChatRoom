# 表情包功能第一阶段实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现表情包功能第一阶段 - 添加默认表情包库和改进表情包选择界面 UI

**Architecture:** 在现有 chatRoomController.js 中扩展表情包数据和服务，修改 chatRoom.html 实现新的 UI 布局，添加相应的 CSS 样式

**Tech Stack:** AngularJS, CSS Grid, Twemoji CDN, localStorage

---

## 文件结构规划

**修改文件（3个）：**
- `/workspace/public/app/controllers/chatRoomController.js` - 添加表情包数据和搜索功能
- `/workspace/public/app/views/chatRoom.html` - 重构表情包选择界面 UI
- `/workspace/public/app/css/style.css` - 添加表情包网格和动画样式

---

## Task 1: 添加默认表情包库

**Files:**
- Modify: `/workspace/public/app/controllers/chatRoomController.js:310-320`

- [ ] **Step 1: 读取当前 chatRoomController.js 中 memes 定义位置**

Run: `grep -n "memes" /workspace/public/app/controllers/chatRoomController.js | head -5`
Expected: 找到 `$scope.memes` 定义位置（约第 315 行）

- [ ] **Step 2: 替换空的 memes 数组为默认表情包数据**

```javascript
// ==================================  MEMES  ===============================

$scope.memes = [
  // 笑脸类 (Happy)
  { id: 1, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f600.png", category: 'happy', name: '笑脸' },
  { id: 2, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f602.png", category: 'happy', name: '大笑' },
  { id: 3, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f60a.png", category: 'happy', name: '微笑' },
  { id: 4, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f970.png", category: 'happy', name: '亲亲' },
  { id: 5, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f60d.png", category: 'happy', name: '心动' },
  { id: 6, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f917.png", category: 'happy', name: '抱抱' },
  // 表情类 (Emotion)
  { id: 7, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f622.png", category: 'emotion', name: '大哭' },
  { id: 8, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f631.png", category: 'emotion', name: '惊恐' },
  { id: 9, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f624.png", category: 'emotion', name: '傲娇' },
  { id: 10, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f634.png", category: 'emotion', name: '晕菜' },
  { id: 11, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f60f.png", category: 'emotion', name: '疑问' },
  { id: 12, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f611.png", category: 'emotion', name: '冷漠' },
  // 手势类 (Gesture)
  { id: 13, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f44d.png", category: 'gesture', name: '点赞' },
  { id: 14, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f44e.png", category: 'gesture', name: '点踩' },
  { id: 15, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f44b.png", category: 'gesture', name: '挥手' },
  { id: 16, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f64c.png", category: 'gesture', name: '鼓掌' },
  { id: 17, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f91d.png", category: 'gesture', name: '握手' },
  { id: 18, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f44f.png", category: 'gesture', name: '击掌' },
  // 物品类 (Objects)
  { id: 19, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/2764.png", category: 'objects', name: '爱心' },
  { id: 20, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f494.png", category: 'objects', name: '红心' },
  { id: 21, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/2b50.png", category: 'objects', name: '星星' },
  { id: 22, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f525.png", category: 'objects', name: '火焰' },
  { id: 23, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f4af.png", category: 'objects', name: '100分' },
  { id: 24, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f389.png", category: 'objects', name: '庆祝' }
];

// 表情包分类
$scope.memeCategories = [
  { id: 'all', name: '全部', icon: '🌟' },
  { id: 'happy', name: '开心', icon: '😀' },
  { id: 'emotion', name: '情感', icon: '😭' },
  { id: 'gesture', name: '手势', icon: '👍' },
  { id: 'objects', name: '物品', icon: '❤️' }
];

$scope.selectedMemeCategory = 'all';
$scope.memeSearchText = '';
```

- [ ] **Step 3: 添加表情包搜索和过滤函数**

在 `$scope.memes` 定义之后添加：

```javascript
// 表情包搜索和过滤
$scope.getFilteredMemes = function() {
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

// 选择分类
$scope.selectMemeCategory = function(categoryId) {
  $scope.selectedMemeCategory = categoryId;
};

// 清除搜索
$scope.clearMemeSearch = function() {
  $scope.memeSearchText = '';
};
```

- [ ] **Step 4: 修改 enviarMEME 函数支持新格式**

找到 enviarMEME 函数，修改为：

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

// 兼容旧版本的 sendMeme 函数
$scope.sendMeme = function() {
  if ($scope.chatMsg != undefined && $scope.chatMsg.trim() != '') {
    $scope.enviarMEME($scope.chatMsg);
  }
};
```

- [ ] **Step 5: 提交代码**

Run:
```bash
cd /workspace
git add public/app/controllers/chatRoomController.js
git commit -m "feat: add default meme library with 24 emojis and categories"
```

---

## Task 2: 重构表情包选择界面 UI

**Files:**
- Modify: `/workspace/public/app/views/chatRoom.html:167-178`

- [ ] **Step 1: 读取当前表情包容器 HTML**

Run: `sed -n '167,178p' /workspace/public/app/views/chatRoom.html`
Expected: 看到 `<div class="container-meme">` 容器

- [ ] **Step 2: 替换旧的表情包容器为新的 UI 结构**

替换整个 `<div class="container-meme">` 部分：

```html
<!-- 表情包选择器 -->
<div class="meme-selector" ng-controller="chatRoomCtrl">
  <!-- 搜索栏 -->
  <div class="meme-search-bar">
    <div class="input-group">
      <input type="text" 
             class="form-control" 
             placeholder="搜索表情包..." 
             ng-model="memeSearchText"
             ng-change="memeSearchText = memeSearchText">
      <span class="input-group-btn" ng-show="memeSearchText">
        <button class="btn btn-default" type="button" ng-click="clearMemeSearch()">
          <i class="fa fa-times"></i>
        </button>
      </span>
    </div>
  </div>
  
  <!-- 分类标签 -->
  <div class="meme-categories">
    <button class="meme-category-btn" 
            ng-repeat="cat in memeCategories"
            ng-class="{'active': selectedMemeCategory === cat.id}"
            ng-click="selectMemeCategory(cat.id)">
      <span>{{cat.icon}}</span>
      <span class="category-name">{{cat.name}}</span>
    </button>
  </div>
  
  <!-- 表情包网格 -->
  <div class="meme-gallery">
    <div class="meme-grid">
      <div class="meme-item" 
           ng-repeat="meme in getFilteredMemes() track by meme.id"
           ng-click="enviarMEME(meme)"
           title="{{meme.name}}">
        <img ng-src="{{meme.url}}" alt="{{meme.name}}">
      </div>
    </div>
    <!-- 无结果提示 -->
    <div class="meme-empty" ng-show="getFilteredMemes().length === 0">
      <i class="fa fa-search"></i>
      <p>未找到匹配的表情包</p>
    </div>
  </div>
</div>
```

- [ ] **Step 3: 删除旧的按钮式表情包选择**

确保旧的按钮式选择器被替换为新的 UI。如果有多个表情包容器，保留新创建的，删除旧的。

- [ ] **Step 4: 提交代码**

Run:
```bash
cd /workspace
git add public/app/views/chatRoom.html
git commit -m "feat: refactor meme selector UI with grid layout and categories"
```

---

## Task 3: 添加表情包样式

**Files:**
- Modify: `/workspace/public/app/css/style.css`

- [ ] **Step 1: 读取 style.css 末尾**

Run: `tail -20 /workspace/public/app/css/style.css`
Expected: 看到文件末尾的现有样式

- [ ] **Step 2: 添加表情包相关样式**

在 style.css 末尾添加：

```css
/* ========== 表情包选择器样式 ========== */

/* 容器 */
.meme-selector {
  background-color: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}

/* 搜索栏 */
.meme-search-bar {
  margin-bottom: 10px;
}

.meme-search-bar .input-group {
  width: 100%;
}

.meme-search-bar input {
  background-color: var(--input-bg);
  border-color: var(--border-color);
  color: var(--text-primary);
}

.meme-search-bar input:focus {
  border-color: var(--link-color);
  box-shadow: none;
}

/* 分类标签 */
.meme-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-light);
}

.meme-category-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary);
}

.meme-category-btn:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--link-color);
}

.meme-category-btn.active {
  background-color: var(--link-color);
  border-color: var(--link-color);
  color: white;
}

.meme-category-btn .category-name {
  font-weight: 500;
}

/* 表情包网格 */
.meme-gallery {
  max-height: 200px;
  overflow-y: auto;
}

.meme-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

/* 表情包项 */
.meme-item {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.meme-item:hover {
  transform: scale(1.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.meme-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 无结果提示 */
.meme-empty {
  text-align: center;
  padding: 30px;
  color: var(--text-muted);
}

.meme-empty i {
  font-size: 32px;
  margin-bottom: 10px;
}

.meme-empty p {
  margin: 0;
  font-size: 14px;
}

/* 滚动条样式 */
.meme-gallery::-webkit-scrollbar {
  width: 6px;
}

.meme-gallery::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 3px;
}

.meme-gallery::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.meme-gallery::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .meme-grid {
    grid-template-columns: repeat(5, 1fr);
  }
  
  .meme-category-btn .category-name {
    display: none;
  }
}
```

- [ ] **Step 3: 提交代码**

Run:
```bash
cd /workspace
git add public/app/css/style.css
git commit -m "feat: add meme selector styles with grid layout and animations"
```

---

## Task 4: 整体测试和验证

- [ ] **Step 1: 启动服务器测试**

Run:
```bash
cd /workspace
node app.js
```

Expected: 服务器在 http://localhost:8282 启动，无错误

- [ ] **Step 2: 测试表情包显示**

在浏览器中打开 http://localhost:8282
1. 登录进入聊天室
2. 检查表情包区域是否显示
3. 验证默认 24 个表情包都正确显示

Expected:
- [ ] 表情包以网格形式显示（6列）
- [ ] 表情包大小适中（48x48）
- [ ] 悬停有放大动画

- [ ] **Step 3: 测试分类切换**

点击不同的分类标签（开心、情感、手势、物品）

Expected:
- [ ] 分类标签高亮显示
- [ ] 只显示对应分类的表情包
- [ ] 切换流畅无卡顿

- [ ] **Step 4: 测试搜索功能**

在搜索框输入关键词（如"开心"）

Expected:
- [ ] 显示匹配的搜索结果
- [ ] 输入框有清空按钮
- [ ] 点击清空按钮恢复全部显示

- [ ] **Step 5: 测试表情包发送**

点击任意表情包

Expected:
- [ ] 表情包成功发送
- [ ] 消息显示正常
- [ ] 其他用户能看到表情包

- [ ] **Step 6: 最终提交**

Run:
```bash
cd /workspace
git status
git add -A
git commit -m "feat: complete meme feature phase 1 - default library and UI optimization"
```

---

## 验收清单

### 功能验收

- [ ] 默认表情包库包含 24 个表情
- [ ] 表情包分类显示正确（全部/开心/情感/手势/物品）
- [ ] 点击分类正确过滤表情包
- [ ] 搜索功能正常工作
- [ ] 表情包发送功能正常

### UI 验收

- [ ] 表情包以网格布局显示（6列）
- [ ] 表情包尺寸适中（48x48）
- [ ] 悬停有放大动画效果
- [ ] 滚动条样式美观
- [ ] 深色模式样式正确

### 性能验收

- [ ] 页面加载无明显延迟
- [ ] 分类切换流畅
- [ ] 搜索响应及时

---

## 实施总结

### 已完成任务清单

| Task | 内容 | 状态 |
|------|------|------|
| Task 1 | 添加默认表情包库 | ☐ |
| Task 2 | 重构表情包选择界面 UI | ☐ |
| Task 3 | 添加表情包样式 | ☐ |
| Task 4 | 整体测试和验证 | ☐ |

### 文件变更总结

**修改文件：**
- `/workspace/public/app/controllers/chatRoomController.js` - 添加表情包数据和功能
- `/workspace/public/app/views/chatRoom.html` - 重构 UI 结构
- `/workspace/public/app/css/style.css` - 添加样式

### 功能实现清单

- ✅ 默认表情包库（24个表情）
- ✅ 表情包分类（5个分类）
- ✅ 表情包搜索
- ✅ 网格布局 UI
- ✅ 悬停动画效果
- ✅ 深色模式支持
