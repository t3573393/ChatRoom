/**
 * 数据库集成测试 - 聊天记录导出和阅后即焚功能
 * 
 * 测试内容:
 * 1. 聊天记录导出查询功能
 * 2. 阅后即焚消息删除功能
 * 3. 阅后即焚消息查询功能
 */

const path = require('path');

// 设置测试环境
process.env.NODE_ENV = 'test';

// 引入数据库模块
const db = require('../database/db');

describe('数据库集成测试 - 聊天记录导出和阅后即焚', () => {
    // 测试变量
    let testMessageId;
    let testRoomCode = 'test-room-' + Date.now();

    beforeAll(async () => {
        // 等待数据库初始化
        await db.initDatabase();
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    afterAll(async () => {
        // 清理测试数据
        if (testMessageId) {
            try {
                await db.deleteBurnAfterReadingMessage(testMessageId);
            } catch (e) {
                // 忽略删除错误
            }
        }
        
        // 关闭数据库连接
        await db.closeDatabase();
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    describe('getMessagesForExport - 聊天记录导出查询', () => {
        it('应该能够查询所有聊天记录', async () => {
            const result = await db.getMessagesForExport({
                roomCode: null,
                startDate: null,
                endDate: null
            });

            expect(Array.isArray(result)).toBe(true);
            console.log('✅ 查询所有聊天记录成功，记录数:', result.length);
        });

        it('应该能够按房间过滤聊天记录', async () => {
            const result = await db.getMessagesForExport({
                roomCode: testRoomCode,
                startDate: null,
                endDate: null
            });

            expect(Array.isArray(result)).toBe(true);
            // 如果有数据，应该都在同一个房间
            if (result.length > 0) {
                result.forEach(msg => {
                    expect(msg.room_code).toBe(testRoomCode);
                });
            }
            console.log('✅ 按房间过滤聊天记录成功，记录数:', result.length);
        });

        it('应该能够按日期范围过滤聊天记录', async () => {
            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

            const result = await db.getMessagesForExport({
                roomCode: null,
                startDate: weekAgo.toISOString(),
                endDate: today.toISOString()
            });

            expect(Array.isArray(result)).toBe(true);
            console.log('✅ 按日期范围过滤聊天记录成功，记录数:', result.length);
        });

        it('应该能够同时按房间和日期范围过滤', async () => {
            const today = new Date();
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

            const result = await db.getMessagesForExport({
                roomCode: testRoomCode,
                startDate: monthAgo.toISOString(),
                endDate: today.toISOString()
            });

            expect(Array.isArray(result)).toBe(true);
            if (result.length > 0) {
                result.forEach(msg => {
                    expect(msg.room_code).toBe(testRoomCode);
                });
            }
            console.log('✅ 按房间和日期范围过滤成功，记录数:', result.length);
        });
    });

    describe('saveMessageWithBurn - 阅后即焚消息保存', () => {
        it('应该能够保存阅后即焚消息', async () => {
            // 保存消息并获取返回的ID
            const savedId = await db.saveMessageWithBurn(
                testRoomCode,
                'test-user',
                'avatar.png',
                'text',
                '这是一条测试阅后即焚消息',
                null,
                true,
                10
            );

            testMessageId = savedId;
            console.log('✅ 阅后即焚消息保存成功, ID:', testMessageId);

            // 验证消息已保存
            const savedMessage = await db.getBurnAfterReadingMessage(testMessageId);
            expect(savedMessage).not.toBeNull();
            expect(savedMessage.message_content).toBe('这是一条测试阅后即焚消息');
            expect(savedMessage.is_burn_after_reading).toBe(1);
            expect(savedMessage.burn_duration).toBe(10);
        });

        it('应该能够保存普通消息（非阅后即焚）', async () => {
            const normalMsgId = await db.saveMessageWithBurn(
                testRoomCode,
                'test-user',
                'avatar.png',
                'text',
                '这是一条普通消息',
                null,
                false,
                0
            );

            console.log('✅ 普通消息保存成功, ID:', normalMsgId);

            // 验证普通消息不能被阅后即焚查询找到
            const burnMessage = await db.getBurnAfterReadingMessage(normalMsgId);
            expect(burnMessage).toBeUndefined();
        });
    });

    describe('getBurnAfterReadingMessage - 获取阅后即焚消息', () => {
        it('应该能够获取阅后即焚消息详情', async () => {
            const message = await db.getBurnAfterReadingMessage(testMessageId);

            expect(message).not.toBeNull();
            expect(message.id).toBe(testMessageId);
            expect(message.is_burn_after_reading).toBe(1);
            console.log('✅ 获取阅后即焚消息详情成功');
        });

        it('不存在的消息应该返回undefined', async () => {
            const message = await db.getBurnAfterReadingMessage(999999);
            expect(message).toBeUndefined();
            console.log('✅ 不存在的消息正确返回undefined');
        });
    });

    describe('deleteBurnAfterReadingMessage - 删除阅后即焚消息', () => {
        it('应该能够删除阅后即焚消息', async () => {
            // 先创建一个阅后即焚消息
            const deleteTestId = await db.saveMessageWithBurn(
                testRoomCode,
                'test-user',
                'avatar.png',
                'text',
                '将被删除的阅后即焚消息',
                null,
                true,
                10
            );

            console.log('✅ 测试消息创建成功, ID:', deleteTestId);

            // 删除消息
            const deleted = await db.deleteBurnAfterReadingMessage(deleteTestId);
            expect(deleted).toBe(true);
            console.log('✅ 删除阅后即焚消息成功');

            // 验证消息已被删除
            const message = await db.getBurnAfterReadingMessage(deleteTestId);
            expect(message).toBeUndefined();
        });

        it('删除不存在的消息应该返回false', async () => {
            const deleted = await db.deleteBurnAfterReadingMessage(999999);
            expect(deleted).toBe(false);
            console.log('✅ 删除不存在的消息正确返回false');
        });
    });

    describe('cleanupExpiredMessages - 清理过期消息', () => {
        it('应该能够清理30天前的消息', async () => {
            const result = await db.cleanupExpiredMessages();
            
            expect(typeof result).toBe('number');
            console.log('✅ 清理过期消息功能正常，清理了', result, '条消息');
        });
    });
});
