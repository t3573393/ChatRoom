/**
 * @fileoverview 阅后即焚服务
 * @module services/burnAfterReadingService
 * @description 管理阅后即焚消息的配置和状态
 */

'use strict';

app.factory('burnAfterReadingService', ['$rootScope', function($rootScope) {
    var service = {};

    var CONFIG_KEY = 'burn_after_reading_config';

    var defaultConfig = {
        enabled: false,
        duration: 10
    };

    service.getConfig = function() {
        try {
            var stored = localStorage.getItem(CONFIG_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('加载阅后即焚配置失败:', e);
        }
        return defaultConfig;
    };

    service.saveConfig = function(config) {
        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        } catch (e) {
            console.error('保存阅后即焚配置失败:', e);
        }
    };

    service.setEnabled = function(enabled) {
        var config = service.getConfig();
        config.enabled = enabled;
        service.saveConfig(config);
    };

    service.isEnabled = function() {
        return service.getConfig().enabled;
    };

    service.getDuration = function() {
        return service.getConfig().duration;
    };

    service.setDuration = function(duration) {
        var config = service.getConfig();
        config.duration = duration;
        service.saveConfig(config);
    };

    return service;
}]);
