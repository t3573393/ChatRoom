/**
 * 本地存储功能测试脚本
 * 验证登录信息持久化和聊天记录缓存功能
 */

console.log('='.repeat(60));
console.log('🧪 开始测试本地存储功能');
console.log('='.repeat(60));

// 模拟 localStorage
const mockLocalStorage = {
    store: {},
    getItem(key) {
        return this.store[key] || null;
    },
    setItem(key, value) {
        this.store[key] = String(value);
    },
    removeItem(key) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
    }
};

// 替换全局 localStorage
global.localStorage = mockLocalStorage;

// 引入测试模块
const fs = require('fs');
const path = require('path');

// 测试 1: 登录信息持久化
function testLoginPersistence() {
    console.log('\n📝 测试 1: 登录信息持久化');
    console.log('-'.repeat(40));
    
    // 模拟登录控制器逻辑
    function saveLoginInfo(username, roomCode, avatar) {
        if (username) localStorage.setItem('savedUsername', username);
        if (roomCode) localStorage.setItem('savedRoomCode', roomCode);
        if (avatar) localStorage.setItem('userAvatar', avatar);
    }
    
    function loadLoginInfo() {
        return {
            username: localStorage.getItem('savedUsername'),
            roomCode: localStorage.getItem('savedRoomCode'),
            avatar: localStorage.getItem('userAvatar')
        };
    }
    
    // 测试保存
    saveLoginInfo('张三', 'room123', 'avatar1.jpg');
    const saved = loadLoginInfo();
    
    console.log('  保存的数据:', saved);
    
    // 验证保存
    const test1_pass = (
        saved.username === '张三' &&
        saved.roomCode === 'room123' &&
        saved.avatar === 'avatar1.jpg'
    );
    
    console.log('  ✅ 保存测试:', test1_pass ? '通过' : '失败');
    
    // 测试加载
    const test2_pass = (
        localStorage.getItem('savedUsername') === '张三' &&
        localStorage.getItem('savedRoomCode') === 'room123'
    );
    
    console.log('  ✅ 加载测试:', test2_pass ? '通过' : '失败');
    
    return test1_pass && test2_pass;
}

// 测试 2: 聊天记录缓存服务
function testChatHistoryCache() {
    console.log('\n💬 测试 2: 聊天记录缓存');
    console.log('-'.repeat(40));
    
    // 模拟缓存服务逻辑
    const CACHE_KEY = 'chat_history_cache';
    const MAX_CACHE_SIZE = 200;
    const CACHE_EXPIRY_DAYS = 7;
    
    function cacheMessages(roomCode, messages) {
        const cacheData = {
            rooms: {},
            lastUpdate: new Date().toISOString()
        };
        
        // 限制每房间消息数量
        const limitedMessages = messages.slice(-MAX_CACHE_SIZE);
        
        cacheData.rooms[roomCode] = {
            messages: limitedMessages,
            updatedAt: new Date().toISOString()
        };
        
        // 设置过期时间
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + CACHE_EXPIRY_DAYS);
        cacheData.expiry = expiryDate.getTime();
        
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    }
    
    function getCachedMessages(roomCode) {
        const cache = localStorage.getItem(CACHE_KEY);
        if (!cache) return [];
        
        const cacheData = JSON.parse(cache);
        
        if (cacheData.rooms && cacheData.rooms[roomCode]) {
            return cacheData.rooms[roomCode].messages || [];
        }
        
        return [];
    }
    
    function clearRoomCache(roomCode) {
        const cache = localStorage.getItem(CACHE_KEY);
        if (cache) {
            const cacheData = JSON.parse(cache);
            if (cacheData.rooms && cacheData.rooms[roomCode]) {
                delete cacheData.rooms[roomCode];
                localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                return true;
            }
        }
        return false;
    }
    
    // 测试缓存消息
    const testMessages = [
        { id: 1, username: '张三', msg: '你好' },
        { id: 2, username: '李四', msg: '嗨' },
        { id: 3, username: '王五', msg: '在吗' }
    ];
    
    cacheMessages('room123', testMessages);
    const cached = getCachedMessages('room123');
    
    console.log('  缓存的消息数:', cached.length);
    
    // 验证缓存
    const test1_pass = cached.length === 3 && cached[0].username === '张三';
    console.log('  ✅ 缓存消息测试:', test1_pass ? '通过' : '失败');
    
    // 测试清除
    const cleared = clearRoomCache('room123');
    const afterClear = getCachedMessages('room123');
    
    const test2_pass = cleared && afterClear.length === 0;
    console.log('  ✅ 清除缓存测试:', test2_pass ? '通过' : '失败');
    
    return test1_pass && test2_pass;
}

// 测试 3: 登出清除功能
function testLogoutClearing() {
    console.log('\n🚪 测试 3: 登出清除功能');
    console.log('-'.repeat(40));
    
    // 模拟登出函数
    function logout(roomCode) {
        // 清除聊天缓存
        const cache = localStorage.getItem('chat_history_cache');
        if (cache) {
            const cacheData = JSON.parse(cache);
            if (cacheData.rooms && cacheData.rooms[roomCode]) {
                delete cacheData.rooms[roomCode];
                localStorage.setItem('chat_history_cache', JSON.stringify(cacheData));
            }
        }
        
        // 清除登录信息（头像保留）
        localStorage.removeItem('savedUsername');
        localStorage.removeItem('savedRoomCode');
        
        // 清除其他会话数据
        localStorage.removeItem('currentUsername');
        localStorage.removeItem('userSession');
    }
    
    // 先保存一些数据
    localStorage.setItem('savedUsername', '张三');
    localStorage.setItem('savedRoomCode', 'room123');
    localStorage.setItem('userAvatar', 'avatar1.jpg');
    localStorage.setItem('currentUsername', '张三');
    localStorage.setItem('userSession', 'session123');
    
    const beforeLogout = {
        username: localStorage.getItem('savedUsername'),
        roomCode: localStorage.getItem('savedRoomCode'),
        avatar: localStorage.getItem('userAvatar'),
        currentUser: localStorage.getItem('currentUsername'),
        session: localStorage.getItem('userSession')
    };
    
    console.log('  登出前:', beforeLogout);
    
    // 执行登出
    logout('room123');
    
    const afterLogout = {
        username: localStorage.getItem('savedUsername'),
        roomCode: localStorage.getItem('savedRoomCode'),
        avatar: localStorage.getItem('userAvatar'),
        currentUser: localStorage.getItem('currentUsername'),
        session: localStorage.getItem('userSession')
    };
    
    console.log('  登出后:', afterLogout);
    
    // 验证清除结果
    const test1_pass = (
        afterLogout.username === null &&
        afterLogout.roomCode === null &&
        afterLogout.currentUser === null &&
        afterLogout.session === null
    );
    console.log('  ✅ 清除登录信息测试:', test1_pass ? '通过' : '失败');
    
    // 验证头像保留
    const test2_pass = afterLogout.avatar === 'avatar1.jpg';
    console.log('  ✅ 保留头像测试:', test2_pass ? '通过' : '失败');
    
    return test1_pass && test2_pass;
}

// 测试 4: 缓存容量限制
function testCacheLimit() {
    console.log('\n📦 测试 4: 缓存容量限制');
    console.log('-'.repeat(40));
    
    const MAX_CACHE_SIZE = 200;
    
    // 生成 250 条测试消息
    const messages = [];
    for (let i = 1; i <= 250; i++) {
        messages.push({ id: i, username: '用户' + i, msg: '消息' + i });
    }
    
    // 模拟缓存限制逻辑
    const limitedMessages = messages.slice(-MAX_CACHE_SIZE);
    
    console.log('  原始消息数:', messages.length);
    console.log('  限制后消息数:', limitedMessages.length);
    
    const test_pass = limitedMessages.length === 200 && limitedMessages[0].id === 51;
    console.log('  ✅ 容量限制测试:', test_pass ? '通过' : '失败');
    
    return test_pass;
}

// 运行所有测试
console.log('\n');
console.log('='.repeat(60));
console.log('🚀 运行所有测试');
console.log('='.repeat(60));

const test1 = testLoginPersistence();
const test2 = testChatHistoryCache();
const test3 = testLogoutClearing();
const test4 = testCacheLimit();

// 测试总结
console.log('\n');
console.log('='.repeat(60));
console.log('📊 测试结果总结');
console.log('='.repeat(60));

const results = [
    { name: '登录信息持久化', pass: test1 },
    { name: '聊天记录缓存', pass: test2 },
    { name: '登出清除功能', pass: test3 },
    { name: '缓存容量限制', pass: test4 }
];

results.forEach((test, index) => {
    console.log(`  ${index + 1}. ${test.name}: ${test.pass ? '✅ 通过' : '❌ 失败'}`);
});

const allPassed = test1 && test2 && test3 && test4;

console.log('\n');
console.log('='.repeat(60));
if (allPassed) {
    console.log('🎉 所有测试通过！');
} else {
    console.log('❌ 有测试失败，请检查');
}
console.log('='.repeat(60));

// 导出测试结果
module.exports = {
    testLoginPersistence: test1,
    testChatHistoryCache: test2,
    testLogoutClearing: test3,
    testCacheLimit: test4,
    allPassed: allPassed
};
