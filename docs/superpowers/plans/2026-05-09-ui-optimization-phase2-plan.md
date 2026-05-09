# 第二阶段：界面/交互优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement dark mode, message quote/reply, and @mention features

**Architecture:** Progressive enhancement approach, CSS variables for dark mode, incremental additions for reply/quote and @mention

**Tech Stack:** CSS variables (for dark mode), AngularJS, Socket.io

---

## 文件结构规划

**修改文件（3个）：
- `public/app/css/style.css` - Add CSS variables and dark theme
- `public/app/views/chatRoom.html` - Add UI components
- `public/app/controllers/chatRoomController.js` - Add reply/quote and mention logic

---

## Task 1: Define CSS Variable System

**Files:**
- Modify: [public/app/css/style.css](file:///workspace/public/app/css/style.css)

### Step 1: Add CSS variables at the top of the file

```css
:root {
    /* Light theme (default) */
    --bg-primary: #ffffff;
    --bg-secondary: #f5f5f5;
    --bg-tertiary: #eeeeee;
    --text-primary: #333333;
    --text-secondary: #666666;
    --text-muted: #999999;
    --border-color: #dddddd;
    --border-light: #eeeeee;
    --link-color: #337ab7;
    --success-color: #28a745;
    --danger-color: #dc3545;
    --warning-color: #ffc107;
    --info-color: #17a2b8;
    --chat-bg: #ffffff;
    --chat-header-bg: #f5f5f5;
    --message-bg: #f0f0f0;
    --message-own-bg: #dcf8c6;
    --input-bg: #ffffff;
    --card-bg: #ffffff;
    --shadow: rgba(0, 0, 0, 0.1);
}

@media (prefers-color-scheme: dark) {
    :root {
        /* Dark theme */
        --bg-primary: #1a1a1a;
        --bg-secondary: #2d2d2d;
        --bg-tertiary: #3d3d3d;
        --text-primary: #e0e0e0;
        --text-secondary: #a0a0a0;
        --text-muted: #707070;
        --border-color: #404040;
        --border-light: #333333;
        --link-color: #6eb3f7;
        --success-color: #4caf50;
        --danger-color: #f44336;
        --warning-color: #ff9800;
        --info-color: #03a9f4;
        --chat-bg: #1a1a1a;
        --chat-header-bg: #2d2d2d;
        --message-bg: #2d2d2d;
        --message-own-bg: #2e5a3c;
        --input-bg: #2d2d2d;
        --card-bg: #2d2d2d;
        --shadow: rgba(0, 0, 0, 0.3);
    }
}
```

### Step 2: Replace hardcoded colors with CSS variables

Modify existing styles using a few key elements:

Find all existing styles and replace with variables.

### Step 3: Commit

```bash
git add public/app/css/style.css
git commit -m "feat: add CSS variable system and dark theme"
```

---

## Task 2: Add Quote Preview UI Components

**Files:**
- Modify: [public/app/views/chatRoom.html](file:///workspace/public/app/views/chatRoom.html)

### Step 1: Add quote preview component

Find the quote preview HTML above the form inside the box footer:

```html
<!-- Quote Preview -->
<div class="quote-preview" ng-show="replyQuote">
    <div class="quote-header">
        <span class="quote-author">{{ replyQuote.username }}</span>
        <button class="quote-close" ng-click="clearReplyQuote()">×</button>
    </div>
    <div class="quote-content">
        {{ replyQuote.content | limitTo:100 }}{{ replyQuote.content.length > 100 ? '...' : '' }}
    </div>
</div>
```

### Step 2: Add reply button on messages

Find the message div for each message, add reply button:

```html
<div class="message-actions">
    <button class="btn btn-xs btn-default" ng-click="startReply(message)" title="回复">
        <i class="fa fa-reply"></i>
    </button>
</div>
```

### Step 3: Add quote display in received messages

Modify the message display to show quote blocks:

```html
<div class="message-with-quote" ng-show="message.quote">
    <div class="quote-block">
        <div class="quote-author">{{ message.quote.username }}:</div>
        <div class="quote-text">{{ message.quote.content | limitTo:100 }}{{ message.quote.content.length > 100 ? '...' : '' }}</div>
    </div>
</div>
```

### Step 4: Commit

```bash
git add public/app/views/chatRoom.html
git commit -m "feat: add quote preview and reply UI components"
```

---

## Task 3: Add Quote Styles

**Files:**
- Modify: [public/app/css/style.css](file:///workspace/public/app/css/style.css)

### Step 1: Add quote-related styles

Add the following styles at the end of the file:

```css
/* ========== Quote/Reply Styles ========== */
.quote-preview {
    background-color: var(--bg-secondary);
    border-left: 3px solid var(--link-color);
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 4px;
}

.quote-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
}

.quote-author {
    font-weight: bold;
    color: var(--link-color);
}

.quote-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 20px;
    padding: 0 5px;
}

.quote-close:hover {
    color: var(--text-primary);
}

.quote-content {
    color: var(--text-secondary);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.message-with-quote {
    margin-bottom: 5px;
}

.quote-block {
    background-color: var(--bg-tertiary);
    border-left: 2px solid var(--link-color);
    padding: 5px 10px;
    margin-bottom: 5px;
    border-radius: 0 4px 4px 0;
}

.quote-author {
    font-size: 12px;
    font-weight: bold;
    color: var(--link-color);
}

.quote-text {
    font-size: 12px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.message-actions {
    opacity: 0;
    transition: opacity 0.2s;
    position: absolute;
    right: 5px;
    top: 5px;
}

.direct-chat-msg:hover .message-actions {
    opacity: 1;
}

.message-actions .btn {
    padding: 2px 6px;
    font-size: 10px;
}
```

### Step 2: Commit

```bash
git add public/app/css/style.css
git commit -m "feat: add quote/reply styles"
```

---

## Task 4: Add Quote Logic to Controller

**Files:**
- Modify: [public/app/controllers/chatRoomController.js](file:///workspace/public/app/controllers/chatRoomController.js)

### Step 1: Add quote scope variables

Add these near the top of the controller:

```javascript
$scope.replyQuote = null;
```

### Step 2: Add quote functions

Find where other scope functions, add:

```javascript
$scope.startReply = function(message) {
    $scope.replyQuote = {
        messageId: message.id,
        username: message.username,
        content: message.msg,
        timestamp: message.msgTime
    };
    $scope.setFocus = true;
};

$scope.clearReplyQuote = function() {
    $scope.replyQuote = null;
};
```

### Step 3: Modify sendMsg function to include quote

Find the sendMsg function, add the quote data to the message being sent:

Add this code when building the messageData:

```javascript
var messageData = {
    username: $rootScope.username,
    userAvatar: $rootScope.userAvatar,
    msg: $scope.chatMsg,
    isImageMSG: IsImageMSG,
    hasMsg: true,
    hasFile: false,
    msgTime: dateString,
    roomCode: $rootScope.roomCode,
    quote: $scope.replyQuote ? {
        username: $scope.replyQuote.username,
        content: $scope.replyQuote.content
    } : null
};
```

After sending, clear the quote:

```javascript
$scope.replyQuote = null;
```

### Step 4: Handle receiving messages with quotes

No backend changes needed - just ensure the received message with quote data will render correctly.

### Step 5: Commit

```bash
git add public/app/controllers/chatRoomController.js
git commit -m "feat: implement quote/reply functionality"
```

---

## Task 5: Add Mention Dropdown UI

**Files:**
- Modify: [public/app/views/chatRoom.html](file:///workspace/public/app/views/chatRoom.html)

### Step 1: Add mention dropdown

Add this near the input:

```html
<!-- Mention Dropdown -->
<div class="mention-dropdown" ng-show="showMentionDropdown">
    <div class="mention-header">选择要提及的用户</div>
    <div class="mention-list">
        <div class="mention-item" 
             ng-repeat="user in filteredMentionUsers"
             ng-click="selectMentionUser(user)"
             ng-class="{'mention-active': selectedMentionIndex === $index">
            <img class="mention-avatar" ng-src="{{ user.userAvatar }}">
            <span class="mention-name">{{ user.username }}</span>
        </div>
    </div>
    <div class="mention-empty" ng-show="filteredMentionUsers.length === 0">
        无在线用户
    </div>
</div>
```

### Step 2: Commit

```bash
git add public/app/views/chatRoom.html
git commit -m "feat: add mention dropdown UI"
```

---

## Task 6: Add Mention Styles

**Files:**
- Modify: [public/app/css/style.css](file:///workspace/public/app/css/style.css)

### Step 1: Add mention-related styles

Add the following styles:

```css
/* ========== Mention Styles ========== */
.mention-dropdown {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    background-color: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    box-shadow: 0 -2px 10px var(--shadow);
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
}

.mention-header {
    padding: 8px 12px;
    font-size: 12px;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border-light);
}

.mention-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
}

.mention-item:hover,
.mention-active {
    background-color: var(--bg-secondary);
}

.mention-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    margin-right: 10px;
}

.mention-name {
    font-size: 14px;
    color: var(--text-primary);
}

.mention-empty {
    padding: 15px;
    text-align: center;
    color: var(--text-muted);
}

/* Mention highlight in messages */
.message-content .mention {
    color: var(--link-color);
    font-weight: bold;
    background-color: rgba(51, 122, 183, 0.1);
    padding: 0 4px;
    border-radius: 3px;
}
```

### Step 2: Commit

```bash
git add public/app/css/style.css
git commit -m "feat: add mention styles"
```

---

## Task 7: Add Mention Logic to Controller

**Files:**
- Modify: [public/app/controllers/chatRoomController.js](file:///workspace/public/app/controllers/chatRoomController.js)

### Step 1: Add mention scope variables

Add:

```javascript
$scope.showMentionDropdown = false;
$scope.filteredMentionUsers = [];
$scope.selectedMentionIndex = 0;
$scope.mentionSearchText = '';
```

### Step 2: Add input event handler

Find where the input is handled, add mention trigger:

```javascript
$scope.onInputChange = function() {
    const value = $scope.chatMsg || '';
    const lastAtIndex = value.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
        const afterAt = value.substring(lastAtIndex + 1);
        const beforeAt = value.substring(0, lastAtIndex);
        const lastSpaceBeforeAt = Math.max(beforeAt.lastIndexOf(' '), beforeAt.lastIndexOf('\n'));
        const searchText = value.substring(lastSpaceBeforeAt + 1);
        
        if (searchText.startsWith('@')) {
            $scope.mentionSearchText = searchText.substring(1);
            $scope.showMentionDropdown = true;
            $scope.filteredMentionUsers = $scope.usersRoom.filter(user => 
                user.username.toLowerCase().includes($scope.mentionSearchText.toLowerCase()) && 
                user.username !== $rootScope.username
            );
            $scope.selectedMentionIndex = 0;
            return;
        }
    }
    
    $scope.showMentionDropdown = false;
};
```

### Step 3: Add mention user selection function

```javascript
$scope.selectMentionUser = function(user) {
    const value = $scope.chatMsg || '';
    const lastAtIndex = value.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
        const beforeAt = value.substring(0, lastAtIndex);
        const afterInsert = beforeAt + '@' + user.username + ' ';
        $scope.chatMsg = afterInsert;
        $scope.showMentionDropdown = false;
    }
};
```

### Step 4: Modify sendMsg to parse mentions

```javascript
function extractMentions(text) {
    const mentions = [];
    const regex = /@(\w+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (!mentions.includes(match[1])) {
            mentions.push(match[1]);
        }
    }
    return mentions;
}

const mentions = extractMentions($scope.chatMsg);

var messageData = {
    // ... existing fields ...
    mentions: mentions
};
```

### Step 5: Handle received mentions and send notifications

Add this after receiving a new message:

```javascript
if (message.mentions && message.mentions.includes($rootScope.username)) {
    if (window.Notification && Notification.permission === 'granted') {
        new Notification('ChatRoom', {
            body: message.username + ' mentioned you',
            icon: 'app/images/favicon.png'
        });
    }
}
```

### Step 6: Add message content rendering with mentions

Add this helper to render mentions:

```javascript
$scope.renderMessageContent = function(message) {
    if (!message.msg) return '';
    
    let content = message.msg;
    
    if (message.mentions && message.mentions.length > 0) {
        message.mentions.forEach(username => {
            const regex = new RegExp('@' + username, 'gi');
            content = content.replace(regex, '<span class="mention">@' + username + '</span>');
        });
    }
    
    return content;
};
```

### Step 7: Update view to use renderMessageContent

Find where messages are rendered, use `ng-bind-html` the rendered content:

```html
<div class="direct-chat-text" ng-bind-html="renderMessageContent(message)"></div>
```

### Step 8: Commit

```bash
git add public/app/controllers/chatRoomController.js
git commit -m "feat: implement @mention functionality"
```

---

## Task 8: Test and Verify

### Step 1: Test dark mode

- Open browser dev tools
- Toggle system dark/light mode
- Verify colors update
- Test with Chrome DevTools -> Rendering -> Emulate CSS media feature prefers-color-scheme

### Step 2: Test quote/reply

- Send a message
- Click reply button
- Verify quote preview appears
- Send reply
- Verify quote block renders correctly

### Step 3: Test mentions

- Type @ in input
- Verify mention dropdown appears
- Select user
- Verify @username inserted
- Send message
- Verify mention highlights
- Verify notification appears

### Step 4: Commit all

```bash
git status
git add -A
git commit -m "feat: complete phase 2 UI optimization"
```

---

## Implementation Summary

### Completed Tasks Checklist

| Task | Content | Status |
|------|---------|--------|
| Task 1 | CSS Variable System | ☐ |
| Task 2 | Quote Preview UI | ☐ |
| Task 3 | Quote Styles | ☐ |
| Task 4 | Quote Logic | ☐ |
| Task 5 | Mention Dropdown UI | ☐ |
| Task 6 | Mention Styles | ☐ |
| Task 7 | Mention Logic | ☐ |
| Task 8 | Test and Verify | ☐ |

### Files Modified

- `public/app/css/style.css`
- `public/app/views/chatRoom.html`
- `public/app/controllers/chatRoomController.js`

### Features Implemented

- Dark mode (system following)
- Message quote/reply
- @mention autocomplete and notifications
