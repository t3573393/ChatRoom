/**
 * @fileoverview GIF 搜索服务
 * @module services/gifService
 * @description 提供 GIPHY API 集成和 GIF 搜索功能
 */

'use strict';

app.factory('gifService', ['$http', '$rootScope', function($http, $rootScope) {
    var service = {};

    var GIPHY_API_KEY = 'dc6zaTOxFJmzC'; // 测试用公钥
    var GIPHY_API_URL = 'https://api.giphy.com/v1/gifs';

    var trendingCache = [];
    var searchCache = {};

    service.getTrending = function(limit) {
        limit = limit || 20;

        return $http.get(GIPHY_API_URL + '/trending', {
            params: {
                api_key: GIPHY_API_KEY,
                limit: limit,
                rating: 'g'
            }
        }).then(function(response) {
            trendingCache = parseGifResponse(response);
            return trendingCache;
        }).catch(function(error) {
            console.error('获取热门 GIF 失败:', error);
            return [];
        });
    };

    service.search = function(query, limit) {
        limit = limit || 20;

        if (!query || query.trim() === '') {
            return Promise.resolve([]);
        }

        query = query.trim();

        if (searchCache[query]) {
            return Promise.resolve(searchCache[query]);
        }

        return $http.get(GIPHY_API_URL + '/search', {
            params: {
                api_key: GIPHY_API_KEY,
                q: query,
                limit: limit,
                rating: 'g'
            }
        }).then(function(response) {
            var gifs = parseGifResponse(response);
            searchCache[query] = gifs;
            return gifs;
        }).catch(function(error) {
            console.error('搜索 GIF 失败:', error);
            return [];
        });
    };

    function parseGifResponse(response) {
        if (!response.data || !response.data.data) {
            return [];
        }

        return response.data.data.map(function(gif) {
            return {
                id: gif.id,
                title: gif.title,
                url: gif.images.fixed_height.url,
                thumbnail: gif.images.fixed_height_small.url,
                preview: gif.images.fixed_height_small.url,
                width: gif.images.fixed_height.width,
                height: gif.images.fixed_height.height
            };
        });
    }

    service.clearCache = function() {
        trendingCache = [];
        searchCache = {};
    };

    return service;
}]);
