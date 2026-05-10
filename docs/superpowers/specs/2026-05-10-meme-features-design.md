# 表情包功能需求文档

**项目：** ChatRoom - NodeJS 实时聊天室

**文档类型：** 功能需求文档

**版本：** 1.0.0

**创建日期：** 2026-05-10

**状态：** 待评审

---

## 一、文档概述

### 1.1 目的

本文档详细描述聊天室表情包功能的优化需求，包括三个阶段的实施计划，旨在提升用户表达体验和互动趣味性。

### 1.2 范围

- 默认表情包库建设
- 表情包选择界面 UI 优化
- 表情包分类管理
- 表情包搜索功能
- 表情包收藏功能
- GIF 动图支持
- 图片编辑功能
- 自定义表情包生成

### 1.3 用户群体

- 聊天室普通用户
- 聊天室管理员

---

## 二、当前状态

### 2.1 现有功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 表情包发送 | ✅ 已有 | 支持发送图片表情包 |
| 表情包选择界面 | ✅ 已有 | 显示表情包列表 |
| 表情包移除 | ✅ 已有 | 支持删除表情包 |

### 2.2 现有问题

| 问题 | 描述 |
|------|------|
| 无默认表情包 | `$scope.memes` 数组为空，用户进来看不到表情包 |
| UI 不美观 | 表情包显示较小（50x50），不够清晰 |
| 功能单一 | 没有分类、搜索、收藏等功能 |
| 不支持 GIF | 只支持静态图片 |

---

## 三、功能需求详情

### 3.1 第一阶段：基础优化

#### 3.1.1 添加默认表情包库

**功能描述：**
- 为用户提供一组默认的表情包，用户进入聊天室即可看到
- 使用成熟的表情包 CDN（如 EmojiOne、Twemoji）

**用户故事：**
> 作为用户，我希望进入聊天室就能看到丰富的表情包，这样我可以快速选择喜欢的表情进行聊天互动。

**功能详情：**

| 项目 | 说明 |
|------|------|
| 表情包数量 | 初始 20-30 个常用表情包 |
| 表情包来源 | 使用公开 CDN（无版权问题） |
| 格式支持 | PNG/GIF |
| 默认尺寸 | 64x64 像素 |
| 分类 | 基础分类（笑脸、手势、动物等） |

**表情包列表（初始 24 个）：**

| 分类 | 表情包 | 描述 |
|------|--------|------|
| 笑脸 | 😀 😂 😊 😍 🥰 | 开心喜悦类 |
| 表情 | 😭 😱 🤯 😤 😴 | 情绪表达类 |
| 手势 | 👍 👎 👋 🤝 ✌️ | 动作表示类 |
| 动物 | 🐶 🐱 🐰 🐼 🦊 | 可爱动物类 |
| 物品 | ❤️ 💔 ⭐ 🔥 💯 | 符号标识类 |

**技术实现：**
```javascript
$scope.memes = [
  // 笑脸类
  { id: 1, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f600.png", category: 'happy', name: '笑脸' },
  { id: 2, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f602.png", category: 'happy', name: '大笑' },
  { id: 3, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f60a.png", category: 'happy', name: '微笑' },
  { id: 4, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f970.png", category: 'happy', name: '亲亲' },
  { id: 5, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f60d.png", category: 'happy', name: '心动' },
  // 表情类
  { id: 6, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f622.png", category: 'emotion', name: '大哭' },
  { id: 7, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f631.png", category: 'emotion', name: '惊恐' },
  { id: 8, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f624.png", category: 'emotion', name: '傲娇' },
  { id: 9, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f44d.png", category: 'gesture', name: '点赞' },
  { id: 10, url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/128/1f44e.png", category: 'gesture', name: '点踩' },
  // ... 更多表情包
];
```

**验收标准：**
- [ ] 用户进入聊天室能看到默认表情包列表
- [ ] 表情包能正常显示和发送
- [ ] 表情包 CDN 加载稳定快速

---

#### 3.1.2 改进表情包选择界面 UI

**功能描述：**
- 优化表情包选择界面的视觉效果
- 增大表情包显示尺寸，提高清晰度
- 添加悬停效果和动画

**用户故事：**
> 作为用户，我希望表情包看起来更大更清晰，这样我可以更容易选择我想要的表情。

**功能详情：**

| 项目 | 当前 | 优化后 |
|------|------|--------|
| 表情包尺寸 | 50x50 | 64x64 |
| 显示方式 | 列表 | 网格布局 |
| 悬停效果 | 无 | 放大 1.1 倍 + 阴影 |
| 选中效果 | 无 | 边框高亮 |
| 动画 | 无 | 淡入淡出 |

**UI 设计要求：**

1. **布局：**
   - 使用网格布局（4-6 列）
   - 每行显示多个表情包
   - 可滚动查看更多

2. **视觉效果：**
   - 圆角边框
   - 悬停时放大并添加阴影
   - 点击时有按压效果

3. **交互设计：**
   - 悬停显示表情包名称
   - 点击直接发送
   - 双击快速添加到收藏（可选）

**技术实现：**

```html
<!-- 表情包容器 -->
<div class="meme-gallery">
  <div class="meme-grid">
    <div class="meme-item" 
         ng-repeat="meme in memes" 
         ng-click="sendMeme(meme)"
         title="{{meme.name}}">
      <img ng-src="{{meme.url}}" alt="{{meme.name}}">
    </div>
  </div>
</div>
```

```css
/* 表情包网格 */
.meme-gallery {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
}

.meme-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.meme-item {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.meme-item:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.meme-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

**验收标准：**
- [ ] 表情包显示清晰，大小适中
- [ ] 悬停有动画效果
- [ ] 布局整齐美观

---

### 3.2 第二阶段：功能增强

#### 3.2.1 表情包分类

**功能描述：**
- 将表情包按类型分类
- 提供分类标签页切换

**分类设计：**

| 分类 ID | 分类名称 | 图标 | 描述 |
|---------|----------|------|------|
| all | 全部 | 🌟 | 显示所有表情包 |
| happy | 开心 | 😀 | 开心喜悦类表情 |
| emotion | 情感 | 😭 | 各种情绪表情 |
| gesture | 手势 | 👍 | 动作手势类 |
| animals | 动物 | 🐶 | 可爱动物类 |
| objects | 物品 | ❤️ | 心形符号物品类 |

**UI 设计：**
- 顶部显示分类标签栏
- 点击标签切换显示对应分类
- 当前分类高亮显示

**技术实现：**

```javascript
$scope.memeCategories = [
  { id: 'all', name: '全部', icon: '🌟' },
  { id: 'happy', name: '开心', icon: '😀' },
  { id: 'emotion', name: '情感', icon: '😭' },
  { id: 'gesture', name: '手势', icon: '👍' },
  { id: 'animals', name: '动物', icon: '🐶' },
  { id: 'objects', name: '物品', icon: '❤️' }
];

$scope.selectedCategory = 'all';

$scope.getFilteredMemes = function() {
  if ($scope.selectedCategory === 'all') {
    return $scope.memes;
  }
  return $scope.memes.filter(meme => meme.category === $scope.selectedCategory);
};
```

**验收标准：**
- [ ] 分类标签正确显示
- [ ] 点击分类正确过滤表情包
- [ ] 切换流畅无卡顿

---

#### 3.2.2 表情包搜索

**功能描述：**
- 提供搜索框输入关键词
- 实时过滤匹配的表情包

**用户故事：**
> 作为用户，我希望能够搜索表情包，这样即使有很多表情包我也能快速找到想要的。

**功能详情：**

| 项目 | 说明 |
|------|------|
| 搜索方式 | 实时搜索（输入即搜索） |
| 匹配字段 | 表情包名称 |
| 无结果提示 | 显示"未找到匹配的表情包" |
| 清空搜索 | 提供清除按钮 |

**UI 设计：**
- 搜索框位于表情包容器顶部
- 输入框带搜索图标
- 清空按钮在有内容时显示

**技术实现：**

```javascript
$scope.memeSearchText = '';

$scope.searchMemes = function() {
  if (!$scope.memeSearchText || $scope.memeSearchText.trim() === '') {
    return $scope.getFilteredMemes();
  }
  
  var searchTerm = $scope.memeSearchText.toLowerCase().trim();
  var filteredByCategory = $scope.getFilteredMemes();
  
  return filteredByCategory.filter(meme => 
    meme.name.toLowerCase().includes(searchTerm)
  );
};

$scope.clearMemeSearch = function() {
  $scope.memeSearchText = '';
};
```

**验收标准：**
- [ ] 搜索框正确显示
- [ ] 输入关键词能正确过滤
- [ ] 清空搜索恢复正常显示

---

#### 3.2.3 表情包收藏

**功能描述：**
- 用户可以收藏喜欢的表情包
- 收藏的表情包保存在本地（localStorage）
- 方便快速访问常用表情

**用户故事：**
> 作为用户，我希望能够收藏常用的表情包，这样下次聊天时能快速找到它们。

**功能详情：**

| 项目 | 说明 |
|------|------|
| 存储方式 | localStorage |
| 存储格式 | JSON 数组 |
| 最大收藏数 | 20 个 |
| 收藏位置 | 显示在表情包列表最前面 |

**功能流程：**

```
用户点击表情包
    ↓
显示"收藏"按钮（如果是未收藏）
    ↓
用户点击收藏
    ↓
保存到 localStorage
    ↓
更新收藏列表
    ↓
提示"已添加到收藏"
```

**技术实现：**

```javascript
var FAVORITES_KEY = 'chatroom_meme_favorites';

// 获取收藏列表
$scope.getFavoriteMemes = function() {
  var favorites = localStorage.getItem(FAVORITES_KEY);
  if (favorites) {
    return JSON.parse(favorites);
  }
  return [];
};

// 添加到收藏
$scope.addToFavorites = function(meme) {
  var favorites = $scope.getFavoriteMemes();
  
  // 检查是否已收藏
  if (favorites.some(f => f.id === meme.id)) {
    return;
  }
  
  // 检查是否超过最大数量
  if (favorites.length >= 20) {
    alert('收藏已达上限（20个）');
    return;
  }
  
  favorites.push(meme);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
};

// 移除收藏
$scope.removeFromFavorites = function(meme) {
  var favorites = $scope.getFavoriteMemes();
  favorites = favorites.filter(f => f.id !== meme.id);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
};
```

**UI 设计：**
- 收藏的表情包显示星星标记 ⭐
- 悬停显示"移除收藏"按钮
- 收藏区域显示在表情包列表最前面

**验收标准：**
- [ ] 点击收藏能正确保存到 localStorage
- [ ] 刷新页面收藏依然存在
- [ ] 能正常移除收藏

---

### 3.3 第三阶段：高级功能

#### 3.3.1 GIF 支持

**功能描述：**
- 支持搜索和发送 GIF 动图
- 使用 GIPHY API 获取 GIF 资源

**用户故事：**
> 作为用户，我希望能够发送 GIF 动图，这样我的表达会更生动有趣。

**功能详情：**

| 项目 | 说明 |
|------|------|
| GIF 来源 | GIPHY API（免费额度） |
| 搜索方式 | 关键词搜索 |
| 显示数量 | 每次显示 20 个 |
| 加载方式 | 滚动加载更多 |

**API 配置：**
```javascript
var GIPHY_API_KEY = 'YOUR_GIPHY_API_KEY'; // 需要申请
var GIPHY_API_URL = 'https://api.giphy.com/v1/gifs';
```

**UI 设计：**
- 添加"GIF"标签页
- 搜索框用于搜索 GIF
- GIF 以网格形式展示
- 点击 GIF 直接发送

**技术实现：**

```javascript
$scope.searchGifs = function(query) {
  if (!query || query.trim() === '') {
    $scope.gifs = [];
    return;
  }
  
  $http.get(GIPHY_API_URL + '/search', {
    params: {
      api_key: GIPHY_API_KEY,
      q: query,
      limit: 20,
      rating: 'g'
    }
  }).then(function(response) {
    $scope.gifs = response.data.data.map(gif => ({
      id: gif.id,
      url: gif.images.fixed_height.url,
      thumbnail: gif.images.fixed_height_small.url
    }));
  });
};

$scope.sendGif = function(gif) {
  $scope.sendMeme({
    id: 'gif_' + gif.id,
    url: gif.url,
    name: 'GIF',
    isGif: true
  });
};
```

**验收标准：**
- [ ] 能搜索并显示 GIF
- [ ] 点击 GIF 能正确发送
- [ ] GIF 能正常播放

---

#### 3.3.2 图片编辑功能

**功能描述：**
- 发送图片前可以简单编辑
- 支持涂鸦、文字添加

**用户故事：**
> 作为用户，我希望能够在我发送的图片上涂鸦或添加文字，这样我可以更准确地表达我的想法。

**功能详情：**

| 功能 | 说明 |
|------|------|
| 涂鸦 | 使用画笔在图片上绘制 |
| 文字 | 添加文本标注 |
| 颜色选择 | 提供多种颜色选择 |
| 撤销 | 支持撤销操作 |

**技术方案：**
- 使用 HTML5 Canvas 实现
- 提供简化的编辑器界面
- 编辑完成后生成新图片

**UI 设计：**
- 点击图片后显示编辑选项
- 打开编辑器模态框
- 提供工具栏（画笔、文字、颜色、撤销）
- 完成后点击"发送"或"取消"

**验收标准：**
- [ ] 能加载图片到编辑器
- [ ] 涂鸦功能正常
- [ ] 能添加文字
- [ ] 编辑后图片能正确发送

---

#### 3.3.3 自定义表情包生成

**功能描述：**
- 用户可以上传本地图片
- 添加文字水印
- 生成自定义表情包

**用户故事：**
> 作为用户，我希望能够创建我自己的表情包，这样我可以表达更多个性化的内容。

**功能详情：**

| 功能 | 说明 |
|------|------|
| 图片上传 | 支持 PNG、JPG、GIF |
| 图片裁剪 | 调整表情包尺寸 |
| 文字添加 | 添加上下文字 |
| 水印 | 可选添加水印 |
| 保存 | 保存到我的表情包 |

**功能流程：**

```
用户点击"制作表情包"
    ↓
打开表情包制作界面
    ↓
上传本地图片
    ↓
添加文字（可选）
    ↓
裁剪调整尺寸
    ↓
保存为表情包
    ↓
表情包添加到我的列表
```

**技术实现：**
- 使用 Canvas 合并图片和文字
- 支持拖拽调整位置
- 生成后保存到本地或服务器

**验收标准：**
- [ ] 能上传本地图片
- [ ] 能添加文字
- [ ] 能保存为表情包
- [ ] 保存后能在聊天中使用

---

## 四、非功能需求

### 4.1 性能需求

| 项目 | 指标 |
|------|------|
| 页面加载时间 | < 2 秒 |
| 表情包加载时间 | < 1 秒 |
| 搜索响应时间 | < 300ms |
| 动画流畅度 | 60 FPS |

### 4.2 兼容性需求

| 项目 | 要求 |
|------|------|
| 浏览器支持 | Chrome、Firefox、Safari、Edge |
| 移动端支持 | iOS Safari、Android Chrome |
| 响应式设计 | 支持各种屏幕尺寸 |

### 4.3 安全需求

| 项目 | 要求 |
|------|------|
| XSS 防护 | 表情包 URL 进行转义 |
| 内容过滤 | 上传图片进行安全检查 |
| 存储限制 | 本地存储不超过 5MB |

---

## 五、实施计划

### 5.1 第一阶段：基础优化

| 任务 | 优先级 | 工作量 | 负责 |
|------|--------|--------|------|
| 添加默认表情包库 | 高 | 2h | - |
| 优化表情包 UI | 高 | 3h | - |

**预计完成时间：** 1 天

### 5.2 第二阶段：功能增强

| 任务 | 优先级 | 工作量 | 负责 |
|------|--------|--------|------|
| 表情包分类 | 中 | 4h | - |
| 表情包搜索 | 中 | 3h | - |
| 表情包收藏 | 中 | 4h | - |

**预计完成时间：** 2 天

### 5.3 第三阶段：高级功能

| 任务 | 优先级 | 工作量 | 负责 |
|------|--------|--------|------|
| GIF 支持 | 中 | 8h | - |
| 图片编辑 | 中 | 12h | - |
| 自定义表情包 | 低 | 8h | - |

**预计完成时间：** 3-4 天

---

## 六、风险评估

### 6.1 已知风险

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| CDN 加载慢 | 用户体验差 | 本地缓存、备用 CDN |
| GIF 占用带宽大 | 流量消耗 | 限制 GIF 大小和数量 |
| 图片上传安全 | 安全风险 | 添加文件类型和大小的严格验证 |

### 6.2 未知风险

- GIPHY API 免费额度限制
- Canvas 浏览器兼容性问题
- localStorage 存储空间限制

---

## 七、附录

### 7.1 术语表

| 术语 | 说明 |
|------|------|
| Meme | 表情包/梗图 |
| GIF | 动图格式 |
| CDN | 内容分发网络 |
| localStorage | 浏览器本地存储 |

### 7.2 参考资料

- [Twitter Twemoji](https://twemoji.twitter.com/)
- [GIPHY Developers](https://developers.giphy.com/)
- [Emoji Unicode](https://unicode.org/emoji/charts/full/emoji-list.html)

### 7.3 修改记录

| 日期 | 版本 | 修改内容 | 作者 |
|------|------|----------|------|
| 2026-05-10 | 1.0.0 | 初始版本 | Systenics Team |

---

**文档结束**
