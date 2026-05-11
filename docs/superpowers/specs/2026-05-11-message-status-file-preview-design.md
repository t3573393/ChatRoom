# 消息状态指示与文件预览功能设计文档

**版本**: v1.0
**日期**: 2026-05-11
**状态**: 待评审

---

## 目录

1. [概述](#概述)
2. [功能模块一：消息状态指示](#功能模块一消息状态指示)
3. [功能模块二：文件预览](#功能模块二文件预览)
4. [数据库变更](#数据库变更)
5. [实现计划](#实现计划)

---

## 概述

### 背景

当前聊天室应用已完成核心功能和第一轮优化（深色模式、消息搜索、消息编辑与撤回）。本次优化新增两个功能：

1. **消息状态指示** - 显示消息的三种状态（已发送、已送达、已读）
2. **文件预览** - 支持图片、PDF、音频、文档的在线预览

### 设计原则

- **渐进式开发**: 按模块分阶段实现
- **用户体验优先**: 简洁直观的UI设计
- **性能优化**: 使用 Socket.IO 高效同步状态
- **向后兼容**: 不破坏现有功能

---

## 功能模块一：消息状态指示

### 功能描述

为用户发送的消息添加状态指示器，显示消息的传递状态。

### 状态定义

| 状态 | 图标 | 含义 | 触发条件 |
|------|------|------|---------|
| 已发送 | ✓ | 消息已发送到服务器 | 服务器接收成功 |
| 已送达 | ✓✓ | 消息已广播到房间所有用户 | 服务器广播完成 |
| 已读 | ✓✓(蓝色) | 房间内其他用户查看了消息 | 用户滚动到消息位置或收到新消息 |

### 技术方案

#### 1. 消息状态数据结构

```javascript
// 消息对象新增字段
{
    id: 12345,
    status: 'read',           // 'sent' | 'delivered' | 'read'
    readBy: ['user1', 'user2'],  // 已读用户列表
    deliveredAt: timestamp,   // 送达时间
    readAt: timestamp,         // 首次被阅读时间
    // ... 其他字段
}
```

#### 2. Socket 事件设计

| 事件名 | 方向 | 数据 | 说明 |
|--------|------|------|------|
| message-status-update | Server → Client | { messageId, status, readBy } | 状态更新广播 |
| mark-messages-read | Client → Server | { roomCode, messageIds } | 标记消息为已读 |

#### 3. 状态转换逻辑

```
发送消息 → 状态: sent
    ↓
服务器广播 → 状态: delivered
    ↓
其他用户查看 → 状态: read
```

#### 4. UI 设计

**消息状态图标位置**: 在消息时间后面显示

```html
<!-- 自己的消息显示状态 -->
<div class="message-status">
    <span class="status-icon" ng-class="{'sent': msg.status === 'sent', 'delivered': msg.status === 'delivered', 'read': msg.status === 'read'}">
        <i class="fa" ng-class="{'fa-check': msg.status === 'sent', 'fa-check-double': msg.status === 'delivered', 'fa-eye': msg.status === 'read'}"></i>
    </span>
</div>
```

**状态图标样式**:
- 已发送: 灰色单勾 ✓
- 已送达: 灰色双勾 ✓✓
- 已读: 蓝色双勾 ✓✓ (蓝色表示已读)

### 文件变更

| 操作 | 文件路径 |
|------|---------|
| 修改 | database/db.js (添加状态相关字段) |
| 修改 | app.js (Socket 事件处理) |
| 修改 | public/app/controllers/chatRoomController.js |
| 修改 | public/app/views/chatRoom.html |
| 修改 | public/app/css/style.css |

---

## 功能模块二：文件预览

### 功能描述

支持图片、PDF、音频、文档的在线预览，无需下载即可查看内容。

### 预览类型

| 文件类型 | 预览方式 | 说明 |
|---------|---------|------|
| 图片 | Lightbox 弹窗 | 已有 lightbox，可直接使用 |
| PDF | PDF.js 在线渲染 | 嵌入查看器 |
| 音频 | HTML5 Audio | 内置播放器 |
| 文档 | 文本预览 / 下载 | 显示文件信息，提供下载 |

### 技术方案

#### 1. 预览组件结构

```html
<!-- 文件预览模态框 -->
<div class="file-preview-modal" ng-show="previewFile">
    <div class="preview-header">
        <h4>{{ previewFile.filename }}</h4>
        <button class="close" ng-click="closePreview()">&times;</button>
    </div>
    <div class="preview-body">
        <!-- 根据文件类型动态加载预览内容 -->
        <img ng-if="previewFile.type === 'image'" ng-src="{{ previewFile.url }}">
        <pdf-viewer ng-if="previewFile.type === 'pdf'" url="{{ previewFile.url }}"></pdf-viewer>
        <audio-player ng-if="previewFile.type === 'audio'" src="{{ previewFile.url }}"></audio-player>
        <div class="file-info" ng-if="previewFile.type === 'document'">
            <i class="fa fa-file-text-o"></i>
            <p>文件名: {{ previewFile.filename }}</p>
            <p>大小: {{ previewFile.size }}</p>
            <a ng-href="{{ previewFile.downloadUrl }}" download>下载文件</a>
        </div>
    </div>
    <div class="preview-footer">
        <button class="btn btn-default" ng-click="closePreview()">关闭</button>
        <a class="btn btn-primary" ng-href="{{ previewFile.downloadUrl }}" download>下载</a>
    </div>
</div>
```

#### 2. PDF.js 集成

使用 PDF.js 实现 PDF 在线预览：

```html
<!-- PDF.js 查看器 -->
<canvas id="pdf-canvas"></canvas>
<div class="pdf-controls">
    <button ng-click="pdfPrevPage()">上一页</button>
    <span>{{ pdfCurrentPage }} / {{ pdfTotalPages }}</span>
    <button ng-click="pdfNextPage()">下一页</button>
</div>
```

#### 3. 音频播放器

```html
<!-- HTML5 音频播放器 -->
<audio controls>
    <source ng-src="{{ audioUrl }}" type="audio/mpeg">
    您的浏览器不支持音频播放
</audio>
```

#### 4. 点击触发预览

在现有文件消息中添加预览点击事件：

```html
<!-- 图片文件 -->
<div ng-show="messege.isImageFile" class="file-preview-trigger" ng-click="openPreview(messege, 'image')">
    <img ng-src="{{ messege.serverfilename }}">
</div>

<!-- PDF 文件 -->
<div ng-show="messege.isPDFFile" class="file-preview-trigger" ng-click="openPreview(messege, 'pdf')">
    <i class="fa fa-file-pdf-o"></i>
    <span>{{ messege.filename }}</span>
</div>

<!-- 音频文件 -->
<div ng-show="messege.isMusicFile" class="file-preview-trigger" ng-click="openPreview(messege, 'audio')">
    <i class="fa fa-music"></i>
    <span>{{ messege.filename }}</span>
</div>
```

### 文件变更

| 操作 | 文件路径 |
|------|---------|
| 新建 | public/app/services/filePreviewService.js |
| 新建 | public/app/directives/pdfViewer.js |
| 新建 | public/app/directives/audioPlayer.js |
| 修改 | public/app/controllers/chatRoomController.js |
| 修改 | public/app/views/chatRoom.html |
| 修改 | public/app/css/style.css |
| 添加 | public/lib/plugins/pdfjs/ (PDF.js 库) |

---

## 数据库变更

### 消息状态相关

```sql
-- 为现有消息表添加状态相关字段
ALTER TABLE messages ADD COLUMN status TEXT DEFAULT 'sent';
-- status: 'sent' | 'delivered' | 'read'

ALTER TABLE messages ADD COLUMN read_by TEXT DEFAULT '[]';
-- JSON 数组，存储已读用户列表

ALTER TABLE messages ADD COLUMN delivered_at DATETIME;
ALTER TABLE messages ADD COLUMN read_at DATETIME;
```

---

## 实现计划

### 阶段一：消息状态指示（第1-2天）

| 任务 | 内容 | 状态 |
|------|------|------|
| 1.1 | 数据库字段添加 | 待开始 |
| 1.2 | Socket 事件实现 | 待开始 |
| 1.3 | 前端状态显示 | 待开始 |
| 1.4 | 测试验证 | 待开始 |

### 阶段二：文件预览（第3-5天）

| 任务 | 内容 | 状态 |
|------|------|------|
| 2.1 | PDF.js 集成 | 待开始 |
| 2.2 | 预览服务创建 | 待开始 |
| 2.3 | 预览 UI 实现 | 待开始 |
| 2.4 | 音频播放器 | 待开始 |
| 2.5 | 测试验证 | 待开始 |

### 阶段三：集成测试（第6天）

| 任务 | 内容 | 状态 |
|------|------|------|
| 3.1 | 功能回归测试 | 待开始 |
| 3.2 | 代码提交 | 待开始 |

---

## 附录

### A. 消息状态图标样式

```css
.message-status {
    display: inline-block;
    margin-left: 5px;
    font-size: 12px;
}

.message-status .status-icon.sent {
    color: #999;
}

.message-status .status-icon.delivered {
    color: #999;
}

.message-status .status-icon.read {
    color: #3498db; /* 蓝色表示已读 */
}
```

### B. 预览模态框样式

```css
.file-preview-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 2000;
    display: flex;
    flex-direction: column;
}

.file-preview-modal .preview-header {
    padding: 15px;
    background: #fff;
    border-bottom: 1px solid #ddd;
}

.file-preview-modal .preview-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
}

.file-preview-modal .preview-body img {
    max-width: 100%;
    max-height: 100%;
}
```

### C. PDF.js 配置

```javascript
// PDF.js worker 配置
pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/plugins/pdfjs/build/pdf.worker.min.js';
```

---

**文档结束**
