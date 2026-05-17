/**
 * @fileoverview 消息搜索服务
 * @module services/searchService
 * @description 处理消息搜索逻辑
 */

'use strict';

angular.module('Services').factory('searchService', ['$http', '$rootScope', function($http, $rootScope) {
    var service = {};

    service.searchMessages = function(params) {
        return $http({
            method: 'GET',
            url: '/api/search-messages',
            params: {
                keyword: params.keyword,
                roomCode: params.roomCode || null,
                startDate: params.startDate || null,
                endDate: params.endDate || null,
                page: params.page || 1,
                pageSize: params.pageSize || 20
            }
        }).then(function(response) {
            return response.data;
        }).catch(function(error) {
            console.error('搜索失败:', error);
            return {
                success: false,
                error: error.data ? error.data.error : '搜索请求失败'
            };
        });
    };

    service.highlightKeyword = function(text, keyword) {
        if (!text || !keyword) {
            return text;
        }
        var regex = new RegExp('(' + keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    };

    return service;
}]);
