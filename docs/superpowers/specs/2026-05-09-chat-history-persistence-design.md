# 聊天记录持久化设计方案

**项目：** ChatRoom - NodeJS 实时聊天室

**作者：** Systenics Development Team

**创建日期：** 2026-05-09

**状态：** 已完成

---

## 一、需求概述

### 1.1 功能目标

实现聊天记录的持久化存储，使用户在重新进入同一聊天室时能够查看之前的消息历史。

### 1.2 设计原则

- **基本会话持久化**：同一用户重新进入同一聊天室时，能看到之前的消息历史
- **分页加载**：考虑到性能，数据量较大时采用分页和分段方式获取展示
- **可配置化**：聊天记录保留天数在服务端统一配置

---

## 二、技术选型

### 2.1 数据库选择：SQLite

**选择理由：**

- 轻量级，无需单独数据库服务
- 实现简单，维护方便
- 性能足够支持分页查询
- Node.js 有成熟的 `sqlite3` 驱动
- 零配置，直接使用

### 2.2 依赖包

```json
{
  "sqlite3": "^5.0.3"
}
```

---

## 三、数据库设计

### 3.1 表结构

**表名：`chat_messages`**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY AUTOINCREMENT | 自增主键 |
| room_code | TEXT NOT NULL | 聊天室编号 |
| username | TEXT NOT NULL | 发送者昵称 |
| user_avatar | TEXT | 发送者头像 URL |
| message_type | TEXT NOT NULL | 消息类型：text/image/music/pdf/meme |
| message_content | TEXT | 消息内容（文本或文件URL） |
| file_info | TEXT | 文件信息JSON（文件名、大小等），可为NULL |
| created_at | DATETIME DEFAULT CURRENT_TIMESTAMP | 创建时间 |

### 3.2 索引设计

```sql
CREATE INDEX IF NOT EXISTS idx_room_created ON chat_messages(room_code, created_at DESC);
```

**索引用途：**

- 按房间快速查询消息
- 支持按时间倒序获取最新消息
- 支持分页查询

### 3.3 表创建语句

```sql
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT NOT NULL,
    username TEXT NOT NULL,
    user_avatar TEXT,
    message_type TEXT NOT NULL,
    message_content TEXT,
    file_info TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_room_created ON chat_messages(room_code, created_at DESC);
```

---

## 四、后端 API 设计

### 4.1 保存消息

**接口：** `POST /v1/messages`

**请求体：**

```json
{
  "roomCode": "room123",
  "username": "user1",
  "userAvatar": "/path/to/avatar.jpg",
  "messageType": "text",
  "messageContent": "Hello World",
  "fileInfo": null
}
```

**响应：**

```json
{
  "success": true,
  "messageId": 123
}
```

**处理逻辑：**

1. 验证请求参数
2. 插入消息到 SQLite 数据库
3. 返回成功响应

### 4.2 获取历史消息（分页）

**接口：** `GET /v1/messages/:roomCode`

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码，从1开始，默认1 |
| pageSize | integer | 否 | 每页条数，默认20，最大50 |
| beforeId | integer | 否 | 获取此ID之前的消息（用于加载更早消息） |

**请求示例：**

```
GET /v1/messages/room123?page=1&pageSize=20
GET /v1/messages/room123?beforeId=100&pageSize=20
```

**响应：**

```json
{
  "success": true,
  "messages": [
    {
      "id": 120,
      "roomCode": "room123",
      "username": "user1",
      "userAvatar": "/path/to/avatar.jpg",
      "messageType": "text",
      "messageContent": "Hello",
      "fileInfo": null,
      "createdAt": "2026-05-09T10:30:00.000Z"
    }
  ],
  "hasMore": true,
  "total": 100
}
```

**处理逻辑：**

1. 验证房间编号
2. 构建分页查询（ORDER BY id DESC LIMIT pageSize）
3. 返回消息列表和是否有更多数据标志

### 4.3 清理过期消息（定时任务）

**触发方式：** 定时任务，每小时执行一次

**处理逻辑：**

1. 查询配置的消息保留天数（默认30天）
2. 删除 `created_at` 超过保留天数的记录
3. 记录清理日志

---

## 五、服务端配置

### 5.1 配置项（app.js）

```javascript
// 消息持久化配置
var messageRetentionDays = 30;  // 消息保留天数，可根据需要修改
var messagePageSize = 20;       // 每页消息数量
```

### 5.2 数据库初始化

在服务器启动时初始化 SQLite 数据库：

1. 创建数据库文件（如果不存在）
2. 创建消息表（如果不存在）
3. 创建索引（如果不存在）

---

## 六、前端交互设计

### 6.1 初始加载

**触发时机：** 用户进入聊天室时

**行为：**

1. 调用 `GET /v1/messages/:roomCode?page=1&pageSize=20`
2. 显示最近 20 条消息
3. 消息按时间倒序显示（最新在底部）

### 6.2 历史记录按钮

**位置：** 消息列表顶部

**行为：**

1. 显示"加载历史记录"按钮
2. 点击后：
   - 显示加载动画
   - 调用 `GET /v1/messages/:roomCode?beforeId={oldestId}&pageSize=20`
   - 加载成功后，将历史消息插入到列表顶部
   - 自动滚动到新加载的历史消息位置

### 6.3 UI 提示

| 状态 | 提示内容 |
|------|----------|
| 加载中 | 显示加载动画（旋转图标或进度条） |
| 无更多历史 | 显示"暂无更多历史记录" |
| 加载失败 | 显示"加载失败，点击重试"按钮 |

---

## 七、数据流程

### 7.1 发送消息流程

```
用户发送消息
    ↓
前端 → Socket.io 实时广播 (new message)
    ↓
同时 → HTTP POST /v1/messages 保存到 SQLite
    ↓
其他用户 → 实时接收 + 渲染消息
```

### 7.2 加载历史流程

```
用户点击"加载历史"
    ↓
前端 → GET /v1/messages/:roomCode?beforeId=xxx
    ↓
后端 → SQLite 查询（ORDER BY id DESC LIMIT 20）
    ↓
返回消息列表 + hasMore 标志
    ↓
前端 → 渲染消息到列表顶部 + 更新"加载更多"按钮状态
```

---

## 八、错误处理

### 8.1 后端错误处理

| 错误情况 | HTTP状态码 | 响应 |
|----------|------------|------|
| 参数缺失 | 400 | `{ success: false, error: "Missing required parameter" }` |
| 数据库错误 | 500 | `{ success: false, error: "Database error" }` |
| 服务器错误 | 500 | `{ success: false, error: "Internal server error" }` |

### 8.2 前端错误处理

- 显示友好的错误提示
- 提供重试机制
- 记录错误日志便于排查

---

## 九、兼容性考虑

### 9.1 向后兼容

- 不影响现有的 Socket.io 实时通信
- 历史记录功能作为增量功能
- 用户不升级前端也能正常使用聊天功能

### 9.2 数据迁移

- 首次启动时自动创建数据库和表
- 无需手动迁移数据

---

## 十、性能优化

### 10.1 数据库优化

- 使用索引加速查询
- 分页查询限制返回数据量
- 定期清理过期数据

### 10.2 前端优化

- 只加载可见区域的数据
- 使用虚拟滚动（可选优化）
- 缓存已加载的消息

---

## 十一、实现计划

### 11.1 第一阶段：后端实现

1. 安装 sqlite3 依赖
2. 创建数据库初始化模块
3. 实现保存消息 API
4. 实现获取历史消息 API
5. 实现定时清理任务

### 11.2 第二阶段：前端实现

1. 创建消息服务模块
2. 实现历史消息加载功能
3. 添加"加载历史"按钮 UI
4. 实现分页加载逻辑
5. 添加加载状态提示

### 11.3 第三阶段：测试与优化

1. 功能测试
2. 性能测试
3. 错误场景测试
4. 根据测试结果优化

---

## 十二、附录

### 12.1 文件修改清单

**需要修改的文件：**

1. `package.json` - 添加 sqlite3 依赖
2. `app.js` - 添加数据库初始化、API路由、定时任务
3. `public/app/js/app.js` - 添加消息服务配置
4. `public/app/controllers/chatRoomController.js` - 添加历史消息加载逻辑
5. `public/app/views/chatRoom.html` - 添加历史加载按钮 UI

**需要创建的文件：**

1. `database/db.js` - 数据库初始化和操作模块
2. `public/app/services/messageService.js` - 前端消息服务

---

## 十三、实现完成信息

### 实现日期
2026-05-09

### 实现状态
✅ 已完成

### 实现的文件
- `package.json` - 添加 sqlite3 依赖
- `database/db.js` - 数据库操作模块（新建）
- `app.js` - 后端 API 路由集成
- `public/app/controllers/chatRoomController.js` - 前端历史加载逻辑
- `public/app/views/chatRoom.html` - 历史加载按钮 UI
- `public/app/css/style.css` - 历史加载按钮样式

### 测试验证
- ✅ 服务器启动成功
- ✅ 数据库初始化正常
- ✅ 保存消息 API 测试通过
- ✅ 获取历史消息 API 测试通过
- ✅ 分页加载功能正常
- ✅ 错误处理健壮

### 注意事项
- 数据库文件位于 `database/chat_history.db`
- 消息默认保留 30 天，可通过修改 `database/db.js` 中的 `messageRetentionDays` 变量调整
- 定时清理任务每小时执行一次
