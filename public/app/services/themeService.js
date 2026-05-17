'use strict';

angular.module('Services').factory('themeService', ['$rootScope', '$interval', function($rootScope, $interval) {
    var service = {};

    var THEME_KEY = 'user_theme_preference';
    var defaultConfig = {
        mode: 'manual',
        theme: 'light'
    };

    var config = angular.copy(defaultConfig);
    var mediaQuery = null;
    var timeCheckPromise = null;

    service.getConfig = function() {
        return angular.copy(config);
    };

    service.getCurrentTheme = function() {
        if (config.mode === 'system') {
            return service.isSystemDark() ? 'dark' : 'light';
        } else if (config.mode === 'time') {
            return service.isNightTime() ? 'dark' : 'light';
        }
        return config.theme;
    };

    service.isSystemDark = function() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    };

    service.isNightTime = function() {
        var hour = new Date().getHours();
        return hour >= 18 || hour < 6;
    };

    service.setMode = function(mode) {
        if (['manual', 'system', 'time'].indexOf(mode) === -1) {
            return;
        }
        config.mode = mode;
        service.saveConfig();
        service.applyTheme(service.getCurrentTheme());
        $rootScope.$broadcast('theme:changed', service.getCurrentTheme());
    };

    service.setTheme = function(theme) {
        if (['light', 'dark'].indexOf(theme) === -1) {
            return;
        }
        config.mode = 'manual';
        config.theme = theme;
        service.saveConfig();
        service.applyTheme(theme);
        $rootScope.$broadcast('theme:changed', theme);
    };

    service.toggleTheme = function() {
        var current = service.getCurrentTheme();
        var newTheme = current === 'dark' ? 'light' : 'dark';
        service.setTheme(newTheme);
    };

    service.applyTheme = function(theme) {
        var body = document.body;
        if (theme === 'dark') {
            body.setAttribute('data-theme', 'dark');
        } else {
            body.removeAttribute('data-theme');
        }
    };

    service.saveConfig = function() {
        try {
            localStorage.setItem(THEME_KEY, JSON.stringify(config));
        } catch (e) {
            console.error('保存主题配置失败:', e);
        }
    };

    service.loadConfig = function() {
        try {
            var saved = localStorage.getItem(THEME_KEY);
            if (saved) {
                var parsed = JSON.parse(saved);
                if (parsed && typeof parsed.mode !== 'undefined' && typeof parsed.theme !== 'undefined') {
                    config.mode = parsed.mode;
                    config.theme = parsed.theme;
                }
            }
        } catch (e) {
            console.error('加载主题配置失败:', e);
            config = angular.copy(defaultConfig);
        }
    };

    service.init = function() {
        service.loadConfig();

        service.applyTheme(service.getCurrentTheme());

        if (window.matchMedia) {
            mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', function(e) {
                if (config.mode === 'system') {
                    service.applyTheme(e.matches ? 'dark' : 'light');
                    $rootScope.$broadcast('theme:changed', service.getCurrentTheme());
                }
            });
        }

        timeCheckPromise = $interval(function() {
            if (config.mode === 'time') {
                var newTheme = service.getCurrentTheme();
                var currentAttr = document.body.getAttribute('data-theme');
                var shouldBeDark = newTheme === 'dark';

                if ((shouldBeDark && !currentAttr) || (!shouldBeDark && currentAttr)) {
                    service.applyTheme(newTheme);
                    $rootScope.$broadcast('theme:changed', newTheme);
                }
            }
        }, 60000);

        $rootScope.$broadcast('theme:changed', service.getCurrentTheme());
    };

    service.destroy = function() {
        if (timeCheckPromise) {
            $interval.cancel(timeCheckPromise);
            timeCheckPromise = null;
        }
        if (mediaQuery) {
            mediaQuery.removeEventListener('change', function() {});
            mediaQuery = null;
        }
    };

    return service;
}]);
