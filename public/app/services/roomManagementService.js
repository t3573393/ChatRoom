'use strict';

/**
 * @fileoverview 房间管理服务
 * @module services/roomManagementService
 * @description 提供踢出用户、禁言/解禁等管理功能
 */

angular.module('Services').factory('roomManagementService', ['$rootScope', '$socket', function($rootScope, $socket) {
    var service = {};
    
    /**
     * 踢出用户
     * @param {string} targetUsername - 目标用户名
     * @param {Function} callback - 回调函数
     */
    service.kickUser = function(targetUsername, callback) {
        $socket.emit('kick-user', {
            targetUsername: targetUsername
        }, function(response) {
            if (callback) {
                callback(response);
            }
        });
    };
    
    service.muteUser = function(targetUsername, callback) {
        $socket.emit('mute-user', {
            targetUsername: targetUsername
        }, function(response) {
            if (callback) {
                callback(response);
            }
        });
    };
    
    service.unmuteUser = function(targetUsername, callback) {
        $socket.emit('unmute-user', {
            targetUsername: targetUsername
        }, function(response) {
            if (callback) {
                callback(response);
            }
        });
    };
    
    service.isRoomCreator = function() {
        return $rootScope.isRoomCreator || false;
    };
    
    service.isMuted = function(username, mutedUsers) {
        return mutedUsers && mutedUsers.includes(username);
    };
    
    service.registerEventListeners = function($scope) {
        $socket.on('you-have-been-kicked', function(data) {
            $scope.$emit('you-have-been-kicked', data);
        });
        
        $socket.on('user-kicked', function(data) {
            $scope.$emit('user-kicked', data);
        });
        
        $socket.on('user-muted', function(data) {
            $scope.$emit('user-muted', data);
        });
        
        $socket.on('user-unmuted', function(data) {
            $scope.$emit('user-unmuted', data);
        });
    };
    
    return service;
}]);
