/**
 * @fileoverview 聊天记录导出服务
 * @module services/chatExportService
 * @description 处理聊天记录导出逻辑
 */

'use strict';

angular.module('Services').factory('chatExportService', ['$http', function($http) {
    var service = {};
    
    /**
     * 导出聊天记录
     * @param {Object} options - 导出选项
     * @param {string} options.scope - 'current' 或 'all'
     * @param {string} options.roomCode - 当前房间代码
     * @param {string} options.startDate - 开始日期 (ISO格式)
     * @param {string} options.endDate - 结束日期 (ISO格式)
     * @returns {Promise} 下载文件
     */
    service.exportChat = function(options) {
        var params = {
            scope: options.scope || 'current',
            roomCode: options.roomCode || '',
            startDate: options.startDate || '',
            endDate: options.endDate || ''
        };
        
        var queryString = Object.keys(params)
            .filter(function(key) { return params[key]; })
            .map(function(key) { 
                return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]); 
            })
            .join('&');
        
        window.location.href = '/api/export-chat?' + queryString;
        
        return Promise.resolve({ success: true });
    };
    
    return service;
}]);
