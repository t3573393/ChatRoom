/**
 * 简化版 API 验证脚本
 * 用于验证聊天记录导出和阅后即焚功能
 */

const path = require('path');
const request = require('supertest');
const bodyParser = require('body-parser');

// 创建测试应用
const app = require('express')();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 获取正确的数据库路径
const dbPath = path.join(__dirname, '..', 'database', 'db');

// 模拟 API 路由
app.get('/api/export-chat', async (req, res) => {
    try {
        const { scope, roomCode, startDate, endDate } = req.query;
        const db = require(dbPath);
        
        const options = {
            roomCode: scope === 'current' ? roomCode : null,
            startDate: startDate || null,
            endDate: endDate || null
        };
        
        const messages = await db.getMessagesForExport(options);
        
        let content = '=== 聊天室聊天记录 ===\n';
        content += `导出时间: ${new Date().toLocaleString('zh-CN')}\n`;
        content += `房间: ${scope === 'current' ? roomCode : '所有房间'}\n`;
        content += '\n----------------------------------------\n';
        
        messages.forEach(msg => {
            const time = new Date(msg.created_at).toLocaleTimeString('zh-CN');
            const username = msg.username || '未知用户';
            const message = msg.message_content || '';
            content += `[${time}] ${username}: ${message}\n`;
        });
        
        content += '----------------------------------------\n';
        content += `共 ${messages.length} 条消息\n`;
        
        const filename = `chat-export-${new Date().toISOString().split('T')[0]}.txt`;
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(content);
    } catch (error) {
        console.error('导出失败:', error);
        res.status(500).json({ success: false, error: '导出失败' });
    }
});

app.post('/api/burn-message', async (req, res) => {
    try {
        const { messageId } = req.body;
        const db = require(dbPath);
        
        if (!messageId) {
            return res.status(400).json({ success: false, error: '消息ID不能为空' });
        }
        
        const deleted = await db.deleteBurnAfterReadingMessage(messageId);
        
        if (deleted) {
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: '消息不存在或已被删除' });
        }
    } catch (error) {
        console.error('销毁失败:', error);
        res.status(500).json({ success: false, error: '销毁失败' });
    }
});

module.exports = app;

// 如果直接运行此脚本，执行测试
if (require.main === module) {
    const db = require(dbPath);
    
    (async () => {
        console.log('🚀 开始 API 功能验证测试...\n');
        
        // 初始化数据库
        await db.initDatabase();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 创建测试消息
        const testRoomCode = 'test-verify-room-' + Date.now();
        const testMessageId = await db.saveMessageWithBurn(
            testRoomCode,
            'test-user',
            'avatar.png',
            'text',
            'API验证测试阅后即焚消息',
            null,
            true,
            10
        );
        console.log('✅ 测试消息创建成功, ID:', testMessageId);
        
        // 测试 GET /api/export-chat
        console.log('\n📤 测试聊天记录导出 API...');
        try {
            const exportResponse = await request(app)
                .get('/api/export-chat')
                .query({ scope: 'all' });
            
            console.log('状态码:', exportResponse.status);
            console.log('Content-Type:', exportResponse.headers['content-type']);
            console.log('Content-Disposition:', exportResponse.headers['content-disposition']);
            console.log('响应内容前200字符:', exportResponse.text.substring(0, 200));
            
            if (exportResponse.status === 200 && 
                exportResponse.headers['content-type'].includes('text/plain') &&
                exportResponse.text.includes('聊天室聊天记录')) {
                console.log('✅ 导出 API 测试通过!');
            } else {
                console.log('❌ 导出 API 测试失败');
            }
        } catch (err) {
            console.error('❌ 导出 API 测试出错:', err.message);
        }
        
        // 测试 POST /api/burn-message
        console.log('\n🔥 测试阅后即焚消息销毁 API...');
        try {
            const burnResponse = await request(app)
                .post('/api/burn-message')
                .send({ messageId: testMessageId });
            
            console.log('状态码:', burnResponse.status);
            console.log('响应:', JSON.stringify(burnResponse.body));
            
            if (burnResponse.status === 200 && burnResponse.body.success === true) {
                console.log('✅ 销毁 API 测试通过!');
            } else {
                console.log('❌ 销毁 API 测试失败');
            }
            
            // 验证消息已删除
            const deleted = await db.getBurnAfterReadingMessage(testMessageId);
            if (!deleted) {
                console.log('✅ 消息已从数据库删除');
            } else {
                console.log('❌ 消息未正确删除');
            }
        } catch (err) {
            console.error('❌ 销毁 API 测试出错:', err.message);
        }
        
        // 测试错误处理
        console.log('\n⚠️ 测试错误处理...');
        try {
            const emptyResponse = await request(app)
                .post('/api/burn-message')
                .send({ messageId: '' });
            
            console.log('空ID状态码:', emptyResponse.status);
            if (emptyResponse.status === 400) {
                console.log('✅ 空ID错误处理测试通过!');
            }
        } catch (err) {
            console.error('❌ 错误处理测试出错:', err.message);
        }
        
        // 关闭数据库
        await db.closeDatabase();
        
        console.log('\n🎉 API 功能验证完成!');
    })();
}
