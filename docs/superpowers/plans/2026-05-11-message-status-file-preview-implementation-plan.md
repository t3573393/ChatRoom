# 消息状态指示与文件预览功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为聊天室应用添加消息状态指示（三重状态）和文件预览功能（图片、PDF、音频、文档）

**Architecture:** 
- 消息状态：通过 Socket.IO 实时同步消息状态，数据库记录已送达/已读状态
- 文件预览：集成 PDF.js 实现 PDF 预览，使用 HTML5 Audio 实现音频播放，使用 Lightbox 实现图片预览

**Tech Stack:** 
- Socket.IO, SQLite, Express.js
- PDF.js, Lightbox2, HTML5 Audio
- AngularJS

---

## 文件结构

### 需要创建的文件

| 文件 | 用途 |
|------|------|
| `public/app/services/messageStatusService.js` | 消息状态管理服务 |
| `public/app/services/filePreviewService.js` | 文件预览服务 |
| `public/app/directives/pdfViewer.js` | PDF 预览指令 |
| `public/app/directives/audioPlayer.js` | 音频播放器指令 |

### 需要修改的文件

| 文件 | 修改内容 |
|------|---------|
| `database/db.js` | 添加消息状态相关字段和方法 |
| `app.js` | 添加 Socket 事件处理 |
| `public/app/controllers/chatRoomController.js` | 集成状态显示和预览功能 |
| `public/app/views/chatRoom.html` | 添加状态图标和预览模态框 |
| `public/app/css/style.css` | 添加状态图标和预览样式 |

---

## 第一阶段：消息状态指示（第1-2天）

### Task 1: 数据库变更

**Files:**
- Modify: `database/db.js`

- [ ] **Step 1: 添加消息状态相关方法**

在 `database/db.js` 中添加以下方法：

```javascript
/**
 * 标记消息为已送达
 */
async markMessageDelivered(messageId) {
    const sql = `UPDATE messages SET status = 'delivered', delivered_at = ? WHERE id = ?`;
    await db.run(sql, [new Date().toISOString(), messageId]);
}

/**
 * 标记消息为已读
 */
async markMessageRead(messageId, username) {
    const sql = `SELECT read_by FROM messages WHERE id = ?`;
    const msg = await db.get(sql, [messageId]);
    
    if (!msg) return false;
    
    let readBy = [];
    try {
        readBy = JSON.parse(msg.read_by || '[]');
    } catch (e) {
        readBy = [];
    }
    
    if (!readBy.includes(username)) {
        readBy.push(username);
    }
    
    const updateSql = `UPDATE messages SET status = 'read', read_by = ?, read_at = ? WHERE id = ?`;
    await db.run(updateSql, [JSON.stringify(readBy), new Date().toISOString(), messageId]);
    
    return true;
}

/**
 * 批量标记消息为已读
 */
async markMessagesRead(roomCode, username) {
    const sql = `SELECT id FROM messages WHERE room_code = ? AND status != 'read'`;
    const messages = await db.all(sql, [roomCode]);
    
    for (const msg of messages) {
        await this.markMessageRead(msg.id, username);
    }
}

/**
 * 获取消息状态
 */
async getMessageStatus(messageId) {
    const sql = `SELECT status, read_by FROM messages WHERE id = ?`;
    return await db.get(sql, [messageId]);
}
```

---

### Task 2: Socket 事件处理

**Files:**
- Modify: `app.js`

- [ ] **Step 1: 在 socket.on('connection') 中添加消息状态事件**

```javascript
// 发送消息后自动标记为送达
socket.on('send-message', function(data, callback) {
    // ... 现有逻辑 ...
    
    // 标记消息为已送达并广播
    db.markMessageDelivered(messageId).then(() => {
        ios.sockets.in(data.roomCode).emit('message-status-update', {
            messageId: messageId,
            status: 'delivered'
        });
    });
    
    callback({success: true});
});

// 标记消息已读
socket.on('mark-messages-read', async function(data, callback) {
    try {
        const { roomCode, username } = data;
        
        if (!roomCode || !username) {
            callback({ success: false, error: '参数错误' });
            return;
        }
        
        await db.markMessagesRead(roomCode, username);
        
        callback({ success: true });
    } catch (error) {
        callback({ success: false, error: '标记失败' });
    }
});

// 查看消息时自动标记为已读
socket.on('view-message', async function(data, callback) {
    try {
        const { messageId, username } = data;
        
        if (!messageId || !username) {
            return;
        }
        
        await db.markMessageRead(messageId, username);
        
        // 广播给房间内所有用户
        const msg = await db.getMessageStatus(messageId);
        if (msg) {
            io.emit('message-read', {
                messageId: messageId,
                username: username,
                status: msg.status,
                readBy: msg.read_by
            });
        }
    } catch (error) {
        console.error('标记已读失败:', error);
    }
});
```

---

### Task 3: 前端服务

**Files:**
- Create: `public/app/services/messageStatusService.js`

- [ ] **Step 1: 创建消息状态服务**

```javascript
/**
 * @fileoverview 消息状态服务
 * @module services/messageStatusService
 */
angular.module('app')
.service('messageStatusService', ['$rootScope', '$socket', function($rootScope, $socket) {
    
    this.markMessagesRead = function(roomCode) {
        return new Promise(function(resolve, reject) {
            $socket.emit('mark-messages-read', {
                roomCode: roomCode,
                username: $rootScope.username
            }, function(response) {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(response);
                }
            });
        });
    };
    
    this.notifyMessageView = function(messageId) {
        $socket.emit('view-message', {
            messageId: messageId,
            username: $rootScope.username
        });
    };
    
    this.registerEventListeners = function($scope) {
        // 监听消息送达状态更新
        $socket.on('message-status-update', function(data) {
            $scope.$broadcast('message-status-update', data);
        });
        
        // 监听消息已读状态更新
        $socket.on('message-read', function(data) {
            $scope.$broadcast('message-read', data);
        });
    };
    
    this.getStatusIcon = function(status) {
        switch (status) {
            case 'sent':
                return 'fa-check';
            case 'delivered':
                return 'fa-check-double';
            case 'read':
                return 'fa-eye';
            default:
                return 'fa-check';
        }
    };
    
    this.getStatusClass = function(status) {
        switch (status) {
            case 'sent':
                return 'status-sent';
            case 'delivered':
                return 'status-delivered';
            case 'read':
                return 'status-read';
            default:
                return 'status-sent';
        }
    };
}]);
```

---

### Task 4: 控制器集成

**Files:**
- Modify: `public/app/controllers/chatRoomController.js`

- [ ] **Step 1: 添加 messageStatusService 依赖**

在控制器参数中添加 `messageStatusService`：

```javascript
.controller('chatRoomCtrl', function ($scope, $rootScope, $socket, $location, $http, $window,
    Upload, $timeout, sendImageService, $translate, $sce, roomManagementService, gifService,
    burnAfterReadingService, chatExportService, chatHistoryCacheService, themeService, 
    searchService, messageEditService, messageStatusService) {
```

- [ ] **Step 2: 添加消息状态相关代码**

```javascript
// ========== 消息状态功能 ==========

// 初始化消息状态服务
messageStatusService.registerEventListeners($scope);

// 监听消息送达状态更新
$scope.$on('message-status-update', function(event, data) {
    for (var i = 0; i < $scope.messeges.length; i++) {
        if ($scope.messeges[i].id == data.messageId) {
            $scope.messeges[i].status = data.status;
            $scope.$apply();
            break;
        }
    }
});

// 监听消息已读状态更新
$scope.$on('message-read', function(event, data) {
    for (var i = 0; i < $scope.messeges.length; i++) {
        if ($scope.messeges[i].id == data.messageId) {
            $scope.messeges[i].status = data.status;
            $scope.messeges[i].readBy = JSON.parse(data.readBy || '[]');
            $scope.$apply();
            break;
        }
    }
});

// 获取状态图标类名
$scope.getStatusIcon = function(status) {
    return messageStatusService.getStatusIcon(status);
};

// 获取状态样式类名
$scope.getStatusClass = function(status) {
    return messageStatusService.getStatusClass(status);
};

// 发送消息时自动通知查看
$scope.notifyMessageView = function(messageId) {
    messageStatusService.notifyMessageView(messageId);
};
```

- [ ] **Step 3: 修改发送消息逻辑添加初始状态**

找到发送消息的地方，确保消息有初始状态：

```javascript
// 在发送消息数据中添加状态
var messageData = {
    username: $rootScope.username,
    userAvatar: $rootScope.userAvatar,
    msg: $scope.chatMsg,
    // ... 其他字段
    status: 'sent'  // 添加初始状态
};
```

---

### Task 5: UI 实现

**Files:**
- Modify: `public/app/views/chatRoom.html`

- [ ] **Step 1: 在消息气泡内添加状态图标**

找到消息时间显示的位置，在时间后面添加状态图标：

```html
<!-- 消息时间和状态 -->
<div class="message-meta">
    <span class="direct-chat-timestamp pull-right">{{ messege.msgTime }}</span>
    <!-- 状态图标（仅对自己的消息显示） -->
    <span ng-if="messege.ownMsg" class="message-status">
        <i class="fa {{ getStatusIcon(messege.status) }}" 
           ng-class="getStatusClass(messege.status)"
           title="{{ getStatusText(messege.status) }}"></i>
    </span>
</div>
```

- [ ] **Step 2: 添加状态文本辅助函数到控制器**

在 `$scope` 中添加：

```javascript
$scope.getStatusText = function(status) {
    switch (status) {
        case 'sent': return '已发送';
        case 'delivered': return '已送达';
        case 'read': return '已读';
        default: return '已发送';
    }
};
```

---

### Task 6: 添加状态图标样式

**Files:**
- Modify: `public/app/css/style.css`

- [ ] **Step 1: 添加消息状态图标样式**

```css
/* ========================================
   消息状态指示样式
   ======================================== */
.message-meta {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 5px;
    margin-top: 2px;
}

.message-status {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
}

.message-status i {
    transition: all 0.2s ease;
}

/* 已发送状态 - 灰色单勾 */
.message-status .status-sent,
.message-status i.fa-check:not(.status-delivered):not(.status-read) {
    color: #999;
}

/* 已送达状态 - 灰色双勾 */
.message-status .status-delivered,
.message-status i.fa-check-double {
    color: #999;
}

/* 已读状态 - 蓝色双勾 */
.message-status .status-read,
.message-status i.fa-eye {
    color: #3498db;
}

/* 动画效果 */
@keyframes status-animate {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
}

.message-status i.status-change {
    animation: status-animate 0.3s ease;
}
```

---

### Task 7: 消息状态功能测试

- [ ] **Step 1: 启动服务器测试**

Run: `node app.js &`

- [ ] **Step 2: 测试消息状态显示**

1. 发送消息，检查是否显示 ✓ 图标
2. 刷新页面，检查状态是否保持

---

## 第二阶段：文件预览（第3-5天）

### Task 8: 创建文件预览服务

**Files:**
- Create: `public/app/services/filePreviewService.js`

- [ ] **Step 1: 创建文件预览服务**

```javascript
/**
 * @fileoverview 文件预览服务
 * @module services/filePreviewService
 */
angular.module('app')
.service('filePreviewService', ['$rootScope', '$http', function($rootScope, $http) {
    
    this.currentPreview = null;
    
    this.openPreview = function(file, type) {
        this.currentPreview = {
            file: file,
            type: type,
            filename: file.filename || file.msg,
            size: file.size || '',
            url: file.serverfilename || file.msg
        };
        $rootScope.$broadcast('preview-opened', this.currentPreview);
    };
    
    this.closePreview = function() {
        this.currentPreview = null;
        $rootScope.$broadcast('preview-closed');
    };
    
    this.getFileType = function(filename) {
        if (!filename) return 'unknown';
        
        var ext = filename.split('.').pop().toLowerCase();
        
        var imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
        var audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
        var pdfExts = ['pdf'];
        var docExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'];
        
        if (imageExts.includes(ext)) return 'image';
        if (audioExts.includes(ext)) return 'audio';
        if (pdfExts.includes(ext)) return 'pdf';
        if (docExts.includes(ext)) return 'document';
        
        return 'unknown';
    };
    
    this.isPreviewSupported = function(filename) {
        var type = this.getFileType(filename);
        return ['image', 'audio', 'pdf', 'document'].includes(type);
    };
}]);
```

---

### Task 9: PDF 预览指令

**Files:**
- Create: `public/app/directives/pdfViewer.js`

- [ ] **Step 1: 创建 PDF 查看器指令**

```javascript
/**
 * @fileoverview PDF 预览指令
 * @module directives/pdfViewer
 */
angular.module('app')
.directive('pdfViewer', ['$rootScope', function($rootScope) {
    return {
        restrict: 'E',
        template: `
            <div class="pdf-viewer-container">
                <div class="pdf-toolbar">
                    <button class="btn btn-sm" ng-click="prevPage()" ng-disabled="currentPage <= 1">
                        <i class="fa fa-chevron-left"></i> 上一页
                    </button>
                    <span class="pdf-page-info">{{ currentPage }} / {{ totalPages }}</span>
                    <button class="btn btn-sm" ng-click="nextPage()" ng-disabled="currentPage >= totalPages">
                        下一页 <i class="fa fa-chevron-right"></i>
                    </button>
                    <button class="btn btn-sm" ng-click="zoomIn()">
                        <i class="fa fa-search-plus"></i>
                    </button>
                    <button class="btn btn-sm" ng-click="zoomOut()">
                        <i class="fa fa-search-minus"></i>
                    </button>
                </div>
                <canvas id="pdf-canvas" class="pdf-canvas"></canvas>
                <div class="pdf-loading" ng-show="loading">
                    <i class="fa fa-spinner fa-spin"></i> 加载中...
                </div>
            </div>
        `,
        scope: {
            url: '='
        },
        link: function(scope, element, attrs) {
            scope.currentPage = 1;
            scope.totalPages = 0;
            scope.scale = 1.5;
            scope.loading = true;
            scope.pdfDoc = null;
            
            scope.initPdf = function() {
                if (typeof pdfjsLib === 'undefined') {
                    console.error('PDF.js 未加载');
                    scope.loading = false;
                    return;
                }
                
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js';
                
                scope.loading = true;
                
                pdfjsLib.getDocument(scope.url).promise.then(function(pdf) {
                    scope.pdfDoc = pdf;
                    scope.totalPages = pdf.numPages;
                    scope.currentPage = 1;
                    scope.renderPage(1);
                    scope.$apply();
                }).catch(function(error) {
                    console.error('PDF 加载失败:', error);
                    scope.loading = false;
                    scope.$apply();
                });
            };
            
            scope.renderPage = function(num) {
                scope.loading = true;
                
                scope.pdfDoc.getPage(num).then(function(page) {
                    var canvas = document.getElementById('pdf-canvas');
                    var context = canvas.getContext('2d');
                    
                    var viewport = page.getViewport({ scale: scope.scale });
                    
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    var renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };
                    
                    page.render(renderContext).promise.then(function() {
                        scope.loading = false;
                        scope.$apply();
                    });
                });
            };
            
            scope.prevPage = function() {
                if (scope.currentPage > 1) {
                    scope.currentPage--;
                    scope.renderPage(scope.currentPage);
                }
            };
            
            scope.nextPage = function() {
                if (scope.currentPage < scope.totalPages) {
                    scope.currentPage++;
                    scope.renderPage(scope.currentPage);
                }
            };
            
            scope.zoomIn = function() {
                scope.scale += 0.25;
                scope.renderPage(scope.currentPage);
            };
            
            scope.zoomOut = function() {
                if (scope.scale > 0.5) {
                    scope.scale -= 0.25;
                    scope.renderPage(scope.currentPage);
                }
            };
            
            scope.$watch('url', function(newUrl) {
                if (newUrl) {
                    scope.initPdf();
                }
            });
        }
    };
}]);
```

---

### Task 10: 音频播放器指令

**Files:**
- Create: `public/app/directives/audioPlayer.js`

- [ ] **Step 1: 创建音频播放器指令**

```javascript
/**
 * @fileoverview 音频播放器指令
 * @module directives/audioPlayer
 */
angular.module('app')
.directive('audioPlayer', [function() {
    return {
        restrict: 'E',
        template: `
            <div class="audio-player-container">
                <div class="audio-controls">
                    <button class="btn btn-sm btn-primary" ng-click="togglePlay()">
                        <i class="fa" ng-class="{'fa-play': !playing, 'fa-pause': playing}"></i>
                    </button>
                    <div class="audio-progress-wrapper">
                        <div class="audio-progress">
                            <div class="audio-progress-bar" style="width: {{ progress }}%"></div>
                        </div>
                        <input type="range" class="audio-slider" min="0" max="100" 
                               ng-model="progressPercent" ng-change="seek()">
                    </div>
                    <span class="audio-time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
                    <button class="btn btn-sm" ng-click="toggleMute()">
                        <i class="fa" ng-class="{'fa-volume-up': !muted, 'fa-volume-off': muted}"></i>
                    </button>
                    <input type="range" class="volume-slider" min="0" max="100" 
                           ng-model="volumePercent" ng-change="setVolume()">
                </div>
                <audio id="audio-element" ng-src="{{ src }}"></audio>
            </div>
        `,
        scope: {
            src: '='
        },
        link: function(scope, element, attrs) {
            var audio = element.find('audio')[0];
            
            scope.playing = false;
            scope.muted = false;
            scope.currentTime = 0;
            scope.duration = 0;
            scope.progress = 0;
            scope.progressPercent = 0;
            scope.volumePercent = 100;
            
            audio.addEventListener('loadedmetadata', function() {
                scope.duration = audio.duration;
                scope.$apply();
            });
            
            audio.addEventListener('timeupdate', function() {
                scope.currentTime = audio.currentTime;
                scope.progress = (audio.currentTime / audio.duration) * 100;
                scope.progressPercent = scope.progress;
                scope.$apply();
            });
            
            audio.addEventListener('ended', function() {
                scope.playing = false;
                scope.$apply();
            });
            
            scope.togglePlay = function() {
                if (scope.playing) {
                    audio.pause();
                } else {
                    audio.play();
                }
                scope.playing = !scope.playing;
            };
            
            scope.toggleMute = function() {
                audio.muted = !audio.muted;
                scope.muted = audio.muted;
            };
            
            scope.seek = function() {
                audio.currentTime = (scope.progressPercent / 100) * audio.duration;
            };
            
            scope.setVolume = function() {
                audio.volume = scope.volumePercent / 100;
            };
            
            scope.formatTime = function(seconds) {
                if (!seconds || isNaN(seconds)) return '0:00';
                var mins = Math.floor(seconds / 60);
                var secs = Math.floor(seconds % 60);
                return mins + ':' + (secs < 10 ? '0' : '') + secs;
            };
        }
    };
}]);
```

---

### Task 11: 控制器集成文件预览

**Files:**
- Modify: `public/app/controllers/chatRoomController.js`

- [ ] **Step 1: 添加 filePreviewService 依赖**

```javascript
.controller('chatRoomCtrl', function ($scope, $rootScope, $socket, $location, $http, $window,
    Upload, $timeout, sendImageService, $translate, $sce, roomManagementService, gifService,
    burnAfterReadingService, chatExportService, chatHistoryCacheService, themeService, 
    searchService, messageEditService, messageStatusService, filePreviewService) {
```

- [ ] **Step 2: 添加文件预览相关代码**

```javascript
// ========== 文件预览功能 ==========

$scope.previewFile = null;
$scope.showPreview = false;

$scope.openPreview = function(file, type) {
    var previewType = type || filePreviewService.getFileType(file.filename || file.msg);
    
    $scope.previewFile = {
        file: file,
        type: previewType,
        filename: file.filename || file.msg,
        size: file.size || '',
        url: file.serverfilename || file.msg,
        downloadUrl: file.serverfilename || file.msg
    };
    
    $scope.showPreview = true;
    filePreviewService.openPreview(file, previewType);
};

$scope.closePreview = function() {
    $scope.showPreview = false;
    $scope.previewFile = null;
    filePreviewService.closePreview();
};

$scope.getPreviewUrl = function() {
    if (!$scope.previewFile) return '';
    return $rootScope.baseUrl + '/' + $scope.previewFile.url;
};
```

- [ ] **Step 3: 修改文件点击事件触发预览**

找到图片、PDF、音频文件的点击事件，修改为调用预览功能：

```javascript
// 图片文件点击预览
$scope.openClickImage = function(msg) {
    if (!msg.ownMsg) {
        $scope.openPreview(msg, 'image');
    }
    // ... 保留原有下载逻辑
};

// PDF 文件点击预览
$scope.openClickPDF = function(msg) {
    $scope.openPreview(msg, 'pdf');
};

// 音频文件点击预览
$scope.openClickMusic = function(msg) {
    $scope.openPreview(msg, 'audio');
};
```

---

### Task 12: UI 实现

**Files:**
- Modify: `public/app/views/chatRoom.html`

- [ ] **Step 1: 添加 PDF.js 库引用**

在 `index.html` 的 `<head>` 中添加：

```html
<!-- PDF.js -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.min.js"></script>
```

- [ ] **Step 2: 添加文件预览模态框**

在页面底部添加：

```html
<!-- 文件预览模态框 -->
<div class="preview-overlay" ng-if="showPreview" ng-click="closePreview()"></div>
<div class="preview-modal" ng-show="showPreview">
    <div class="preview-header">
        <h4>
            <i class="fa fa-file" ng-if="previewFile.type === 'document'"></i>
            <i class="fa fa-file-pdf-o" ng-if="previewFile.type === 'pdf'"></i>
            <i class="fa fa-music" ng-if="previewFile.type === 'audio'"></i>
            <i class="fa fa-image" ng-if="previewFile.type === 'image'"></i>
            {{ previewFile.filename }}
        </h4>
        <button type="button" class="close" ng-click="closePreview()">&times;</button>
    </div>
    <div class="preview-body">
        <!-- 图片预览 -->
        <div ng-if="previewFile.type === 'image'" class="preview-image-container">
            <img ng-src="{{ getPreviewUrl() }}" alt="{{ previewFile.filename }}">
        </div>
        
        <!-- PDF 预览 -->
        <div ng-if="previewFile.type === 'pdf'" class="preview-pdf-container">
            <pdf-viewer url="getPreviewUrl()"></pdf-viewer>
        </div>
        
        <!-- 音频预览 -->
        <div ng-if="previewFile.type === 'audio'" class="preview-audio-container">
            <audio controls>
                <source ng-src="{{ getPreviewUrl() }}" type="audio/mpeg">
                您的浏览器不支持音频播放
            </audio>
        </div>
        
        <!-- 文档预览 -->
        <div ng-if="previewFile.type === 'document'" class="preview-document-container">
            <div class="document-icon">
                <i class="fa fa-file-text-o"></i>
            </div>
            <p class="document-name">{{ previewFile.filename }}</p>
            <p class="document-size">大小: {{ previewFile.size }}</p>
        </div>
    </div>
    <div class="preview-footer">
        <button type="button" class="btn btn-default" ng-click="closePreview()">关闭</button>
        <a class="btn btn-primary" ng-href="{{ getPreviewUrl() }}" download="{{ previewFile.filename }}">
            <i class="fa fa-download"></i> 下载
        </a>
    </div>
</div>
```

- [ ] **Step 3: 在 index.html 添加指令引用**

```html
<!-- Directives -->
<script src="app/directives/pdfViewer.js" type="text/javascript"></script>
<script src="app/directives/audioPlayer.js" type="text/javascript"></script>
```

---

### Task 13: 添加预览样式

**Files:**
- Modify: `public/app/css/style.css`

- [ ] **Step 1: 添加文件预览模态框样式**

```css
/* ========================================
   文件预览样式
   ======================================== */
.preview-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 2000;
}

.preview-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 900px;
    max-height: 90vh;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 2001;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

[data-theme="dark"] .preview-modal {
    background: #1a1a2e;
}

.preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
}

[data-theme="dark"] .preview-header {
    background: #16213e;
    border-bottom-color: #2a2a4a;
}

.preview-header h4 {
    margin: 0;
    font-size: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
}

[data-theme="dark"] .preview-header h4 {
    color: #e4e4e4;
}

.preview-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow: auto;
    background: #f0f0f0;
}

[data-theme="dark"] .preview-body {
    background: #0f0f1a;
}

.preview-image-container img {
    max-width: 100%;
    max-height: 70vh;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.preview-pdf-container {
    width: 100%;
    height: 70vh;
    background: #fff;
    border-radius: 4px;
    overflow: hidden;
}

.preview-audio-container {
    width: 100%;
    padding: 20px;
}

.preview-audio-container audio {
    width: 100%;
}

.preview-document-container {
    text-align: center;
    padding: 40px;
}

.document-icon {
    font-size: 64px;
    color: #3498db;
    margin-bottom: 20px;
}

.document-name {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 10px;
}

[data-theme="dark"] .document-name {
    color: #e4e4e4;
}

.document-size {
    color: #999;
    margin-bottom: 20px;
}

.preview-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 15px 20px;
    background: #f8f9fa;
    border-top: 1px solid #dee2e6;
}

[data-theme="dark"] .preview-footer {
    background: #16213e;
    border-top-color: #2a2a4a;
}

/* PDF 查看器样式 */
.pdf-viewer-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.pdf-toolbar {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    padding: 10px;
    background: #e9ecef;
    border-bottom: 1px solid #dee2e6;
}

.pdf-page-info {
    font-size: 14px;
    color: #333;
}

[data-theme="dark"] .pdf-toolbar {
    background: #16213e;
    border-bottom-color: #2a2a4a;
}

[data-theme="dark"] .pdf-page-info {
    color: #e4e4e4;
}

.pdf-canvas {
    flex: 1;
    display: block;
    margin: 0 auto;
}

.pdf-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 18px;
    color: #666;
}

/* 音频播放器样式 */
.audio-player-container {
    width: 100%;
    padding: 20px;
    background: #fff;
    border-radius: 8px;
}

[data-theme="dark"] .audio-player-container {
    background: #1a1a2e;
}

.audio-controls {
    display: flex;
    align-items: center;
    gap: 15px;
}

.audio-progress-wrapper {
    flex: 1;
    position: relative;
}

.audio-progress {
    height: 6px;
    background: #e0e0e0;
    border-radius: 3px;
    overflow: hidden;
}

.audio-progress-bar {
    height: 100%;
    background: #3498db;
    transition: width 0.1s;
}

.audio-slider {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    transform: translateY(-50%);
    width: 100%;
    height: 20px;
    opacity: 0;
    cursor: pointer;
}

.audio-time {
    font-size: 13px;
    color: #666;
    min-width: 80px;
}

[data-theme="dark"] .audio-time {
    color: #a0a0a0;
}

.volume-slider {
    width: 80px;
}
```

---

### Task 14: 文件预览功能测试

- [ ] **Step 1: 测试图片预览**

发送图片消息，点击预览

- [ ] **Step 2: 测试 PDF 预览**

发送 PDF 文件，点击预览

- [ ] **Step 3: 测试音频预览**

发送音频文件，点击预览

---

## 第三阶段：集成测试（第6天）

### Task 15: 完整功能测试

- [ ] **Step 1: 消息状态测试**
- [ ] **Step 2: 文件预览测试**
- [ ] **Step 3: 回归测试**

### Task 16: 代码提交

- [ ] **Step 1: 提交代码**

---

## 实现计划完成

**文档位置**: `docs/superpowers/plans/2026-05-11-message-status-file-preview-implementation-plan.md`

**预计总工期**: 6天

**执行选项**:

**1. Subagent-Driven（推荐）** - 每个任务派遣新的子代理，任务间进行审查

**2. Inline Execution** - 在当前会话中按批次执行任务，带检查点

您选择哪种执行方式？
