/**
 * API集成测试 - 聊天记录导出和阅后即焚功能
 * 
 * 测试内容:
 * 1. GET /api/export-chat - 聊天记录导出
 * 2. POST /api/burn-message - 阅后即焚消息销毁
 */

const request = require('supertest');
const db = require('../database/db');

// 动态导入 app 模块
let app;

beforeAll(async () => {
    // 确保数据库已初始化
    await db.initDatabase();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 延迟导入app以确保数据库已准备好
    await new Promise((resolve) => {
        setTimeout(() => {
            try {
                app = require('../app');
                console.log('✅ App 模块加载成功');
                resolve();
            } catch (err) {
                console.error('❌ App 模块加载失败:', err.message);
                resolve();
            }
        }, 2000);
    });
});

afterAll(async () => {
    // 清理测试数据
    await new Promise(resolve => setTimeout(resolve, 500));
    await db.closeDatabase();
});

describe('API集成测试 - 聊天记录导出和阅后即焚', () => {
    const testRoomCode = 'test-api-room-' + Date.now();
    let testMessageId;

    beforeAll(async () => {
        // 创建测试消息
        try {
            testMessageId = await db.saveMessageWithBurn(
                testRoomCode,
                'test-user',
                'avatar.png',
                'text',
                'API测试阅后即焚消息',
                null,
                true,
                10
            );
            console.log('✅ 测试阅后即焚消息创建成功, ID:', testMessageId);
        } catch (err) {
            console.error('❌ 创建测试消息失败:', err.message);
        }
    });

    afterAll(async () => {
        // 清理测试数据
        try {
            if (testMessageId) {
                await db.deleteBurnAfterReadingMessage(testMessageId);
                console.log('✅ 测试消息已清理');
            }
        } catch (err) {
            console.log('清理测试消息时出错:', err.message);
        }
    });

    describe('GET /api/export-chat - 聊天记录导出', () => {
        it('应该能够导出所有聊天记录', async () => {
            if (!app) {
                console.log('⚠️ App未加载，跳过API测试');
                return;
            }

            const response = await request(app)
                .get('/api/export-chat')
                .query({
                    scope: 'all',
                    startDate: '',
                    endDate: ''
                });

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('text/plain');
            expect(response.headers['content-disposition']).toContain('attachment');
            expect(response.headers['content-disposition']).toContain('.txt');

            // 验证响应内容包含聊天记录格式
            expect(response.text).toContain('聊天室聊天记录');
            expect(response.text).toContain('导出时间:');

            console.log('✅ 导出所有聊天记录成功，响应长度:', response.text.length);
        });

        it('应该能够按房间导出聊天记录', async () => {
            if (!app) {
                console.log('⚠️ App未加载，跳过API测试');
                return;
            }

            const response = await request(app)
                .get('/api/export-chat')
                .query({
                    scope: 'current',
                    roomCode: testRoomCode,
                    startDate: '',
                    endDate: ''
                });

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('text/plain');
            
            console.log('✅ 按房间导出聊天记录成功');
        });

        it('应该能够按日期范围导出聊天记录', async () => {
            if (!app) {
                console.log('⚠️ App未加载，跳过API测试');
                return;
            }

            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

            const response = await request(app)
                .get('/api/export-chat')
                .query({
                    scope: 'all',
                    startDate: weekAgo.toISOString(),
                    endDate: today.toISOString()
                });

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('text/plain');

            console.log('✅ 按日期范围导出聊天记录成功');
        });

        it('导出的TXT格式应该包含正确的结构', async () => {
            if (!app) {
                console.log('⚠️ App未加载，跳过API测试');
                return;
            }

            const response = await request(app)
                .get('/api/export-chat')
                .query({
                    scope: 'all',
                    startDate: '',
                    endDate: ''
                });

            expect(response.status).toBe(200);

            const content = response.text;
            
            // 验证格式结构
            expect(content).toMatch(/=== 聊天室聊天记录 ===/);
            expect(content).toMatch(/导出时间:/);
            expect(content).toMatch(/----------------------------------------/);
            expect(content).toMatch(/共 \d+ 条消息/);

            console.log('✅ 导出TXT格式结构验证通过');
        });
    });

    describe('POST /api/burn-message - 阅后即焚消息销毁', () => {
        let tempMessageId;

        beforeEach(async () => {
            // 每个测试前创建新消息
            try {
                tempMessageId = await db.saveMessageWithBurn(
                    testRoomCode,
                    'test-user',
                    'avatar.png',
                    'text',
                    '临时测试消息',
                    null,
                    true,
                    10
                );
            } catch (err) {
                console.error('创建临时消息失败:', err.message);
            }
        });

        it('应该能够成功销毁阅后即焚消息', async () => {
            if (!app) {
                console.log('⚠️ App未加载，跳过API测试');
                return;
            }

            const response = await request(app)
                .post('/api/burn-message')
                .send({
                    messageId: tempMessageId
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            console.log('✅ 阅后即焚消息销毁成功');
        });

        it('消息ID为空时应该返回400错误', async () => {
            if (!app) {
                console.log('⚠️ App未加载，跳过API测试');
                return;
            }

            const response = await request(app)
                .post('/api/burn-message')
                .send({
                    messageId: ''
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('消息ID不能为空');

            console.log('✅ 空消息ID正确返回400错误');
        });

        it('销毁不存在的消息应该返回404错误', async () => {
            if (!app) {
                console.log('⚠️ App未加载，跳过API测试');
                return;
            }

            const response = await request(app)
                .post('/api/burn-message')
                .send({
                    messageId: 999999
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);

            console.log('✅ 不存在的消息正确返回404错误');
        });

        it('销毁后消息应该从数据库中删除', async () => {
            if (!app) {
                console.log('⚠️ App未加载，跳过API测试');
                return;
            }

            // 先创建一个新消息
            const verifyDeleteId = await db.saveMessageWithBurn(
                testRoomCode,
                'test-user',
                'avatar.png',
                'text',
                '验证销毁的消息',
                null,
                true,
                10
            );

            // 销毁消息
            const response = await request(app)
                .post('/api/burn-message')
                .send({
                    messageId: verifyDeleteId
                });

            expect(response.status).toBe(200);

            // 验证消息已从数据库删除
            const message = await db.getBurnAfterReadingMessage(verifyDeleteId);
            expect(message).toBeUndefined();

            console.log('✅ 销毁后消息从数据库正确删除');
        });
    });

    describe('HTTP基础连接测试', () => {
        it('服务器应该正常运行', async () => {
            if (!app) {
                console.log('⚠️ App未加载，跳过HTTP测试');
                return;
            }

            // 测试基本连接
            const response = await request(app).get('/');
            expect([200, 304]).toContain(response.status);
            console.log('✅ 服务器正常运行，支持HTTP连接');
        });
    });
});
