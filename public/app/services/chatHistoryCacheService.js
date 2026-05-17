/**
 * @fileoverview 聊天记录本地缓存服务
 * @module services/chatHistoryCacheService
 * @description 提供聊天记录的本地缓存功能，用于离线查看和快速加载
 */

'use strict';

angular.module('Services').factory('chatHistoryCacheService', ['$rootScope', function($rootScope) {
    var service = {};
    
    var CACHE_KEY = 'chat_history_cache';
    var MAX_CACHE_SIZE = 200;  // 最多缓存200条消息
    var CACHE_EXPIRY_DAYS = 7;  // 缓存有效期7天
    
    /**
     * 获取缓存的聊天记录
     * @param {string} roomCode - 房间代码
     * @returns {Array} 缓存的消息列表
     */
    service.getCachedMessages = function(roomCode) {
        try {
            var cache = localStorage.getItem(CACHE_KEY);
            if (!cache) return [];
            
            var cacheData = JSON.parse(cache);
            var now = new Date().getTime();
            
            // 检查缓存是否过期
            if (cacheData.expiry && now > cacheData.expiry) {
                service.clearCache();
                return [];
            }
            
            // 返回指定房间的缓存消息
            if (cacheData.rooms && cacheData.rooms[roomCode]) {
                return cacheData.rooms[roomCode].messages || [];
            }
            
            return [];
        } catch (e) {
            console.error('读取聊天缓存失败:', e);
            return [];
        }
    };
    
    /**
     * 保存消息到缓存
     * @param {string} roomCode - 房间代码
     * @param {Array} messages - 消息列表
     */
    service.cacheMessages = function(roomCode, messages) {
        try {
            var cache = localStorage.getItem(CACHE_KEY);
            var cacheData = cache ? JSON.parse(cache) : {
                rooms: {},
                lastUpdate: null
            };
            
            // 限制每房间消息数量
            var limitedMessages = messages.slice(-MAX_CACHE_SIZE);
            
            cacheData.rooms[roomCode] = {
                messages: limitedMessages,
                updatedAt: new Date().toISOString()
            };
            
            cacheData.lastUpdate = new Date().toISOString();
            
            // 设置过期时间
            var expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + CACHE_EXPIRY_DAYS);
            cacheData.expiry = expiryDate.getTime();
            
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } catch (e) {
            console.error('保存聊天缓存失败:', e);
        }
    };
    
    /**
     * 添加单条消息到缓存
     * @param {string} roomCode - 房间代码
     * @param {Object} message - 消息对象
     */
    service.addMessage = function(roomCode, message) {
        try {
            var messages = service.getCachedMessages(roomCode);
            
            // 避免重复添加
            var exists = messages.some(function(m) {
                return m.id === message.id || 
                       (m.msgTime === message.msgTime && m.username === message.username && m.msg === message.msg);
            });
            
            if (!exists) {
                messages.push(message);
                
                // 保持缓存大小
                if (messages.length > MAX_CACHE_SIZE) {
                    messages = messages.slice(-MAX_CACHE_SIZE);
                }
                
                service.cacheMessages(roomCode, messages);
            }
        } catch (e) {
            console.error('添加消息到缓存失败:', e);
        }
    };
    
    /**
     * 清除指定房间的缓存
     * @param {string} roomCode - 房间代码
     */
    service.clearRoomCache = function(roomCode) {
        try {
            var cache = localStorage.getItem(CACHE_KEY);
            if (cache) {
                var cacheData = JSON.parse(cache);
                if (cacheData.rooms && cacheData.rooms[roomCode]) {
                    delete cacheData.rooms[roomCode];
                    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                }
            }
        } catch (e) {
            console.error('清除房间缓存失败:', e);
        }
    };
    
    /**
     * 清除所有聊天缓存
     */
    service.clearCache = function() {
        try {
            localStorage.removeItem(CACHE_KEY);
        } catch (e) {
            console.error('清除聊天缓存失败:', e);
        }
    };
    
    /**
     * 获取缓存信息
     * @returns {Object} 缓存统计信息
     */
    service.getCacheInfo = function() {
        try {
            var cache = localStorage.getItem(CACHE_KEY);
            if (!cache) return { totalRooms: 0, totalMessages: 0 };
            
            var cacheData = JSON.parse(cache);
            var totalMessages = 0;
            var roomCount = 0;
            
            if (cacheData.rooms) {
                for (var room in cacheData.rooms) {
                    roomCount++;
                    totalMessages += cacheData.rooms[room].messages ? cacheData.rooms[room].messages.length : 0;
                }
            }
            
            return {
                totalRooms: roomCount,
                totalMessages: totalMessages,
                lastUpdate: cacheData.lastUpdate,
                expiry: cacheData.expiry ? new Date(cacheData.expiry).toLocaleString() : null
            };
        } catch (e) {
            console.error('获取缓存信息失败:', e);
            return { totalRooms: 0, totalMessages: 0 };
        }
    };
    
    /**
     * 检查缓存是否可用
     * @returns {boolean}
     */
    service.isCacheAvailable = function() {
        try {
            var testKey = '__cache_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            return false;
        }
    };
    
    return service;
}]);
