'use strict';

angular.module('Services')
.service('messageEditService', ['$http', '$rootScope', '$socket', function($http, $rootScope, $socket) {
    var EDIT_TIME_LIMIT = 5 * 60 * 1000;

    function getMessageAge(message) {
        if (!message.createdAt && !message.created_at) {
            return 0;
        }
        var createdAt = message.createdAt || message.created_at;
        var timestamp = new Date(createdAt).getTime();
        return Date.now() - timestamp;
    }

    this.getConfig = function() {
        return {
            editTimeLimit: EDIT_TIME_LIMIT
        };
    };

    this.canEdit = function(message) {
        if (!message) return false;
        if (message.username !== $rootScope.username) return false;
        if (message.status === 'recalled') return false;
        if (message.status === 'edited') return true;
        var age = getMessageAge(message);
        return age < EDIT_TIME_LIMIT;
    };

    this.canRecall = function(message) {
        if (!message) return false;
        if (message.username !== $rootScope.username) return false;
        if (message.status === 'recalled') return false;
        return true;
    };

    this.getTimeRemaining = function(message) {
        if (!message) return 0;
        var age = getMessageAge(message);
        var remaining = EDIT_TIME_LIMIT - age;
        return Math.max(0, Math.ceil(remaining / 1000));
    };

    this.editMessageSocket = function(messageId, newContent) {
        return new Promise(function(resolve, reject) {
            $socket.emit('edit-message', {
                messageId: messageId,
                newContent: newContent
            }, function(response) {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.message || '编辑失败'));
                }
            });
        });
    };

    this.editMessageAPI = function(messageId, newContent, roomCode) {
        return $http.post('/api/edit-message', {
            messageId: messageId,
            username: $rootScope.username,
            newContent: newContent,
            roomCode: roomCode
        }).then(function(response) {
            return response.data;
        }).catch(function(error) {
            return error.data || { success: false, error: '编辑请求失败' };
        });
    };

    this.recallMessageSocket = function(messageId) {
        return new Promise(function(resolve, reject) {
            $socket.emit('recall-message', {
                messageId: messageId
            }, function(response) {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.message || '撤回失败'));
                }
            });
        });
    };

    this.recallMessageAPI = function(messageId, roomCode) {
        return $http.post('/api/recall-message', {
            messageId: messageId,
            username: $rootScope.username,
            roomCode: roomCode
        }).then(function(response) {
            return response.data;
        }).catch(function(error) {
            return error.data || { success: false, error: '撤回请求失败' };
        });
    };

    this.registerEventListeners = function($scope) {
        $scope.$on('message-edited', function(event, data) {
            for (var i = 0; i < $scope.messeges.length; i++) {
                var msg = $scope.messeges[i];
                if (msg.id == data.messageId || msg.messageId == data.messageId) {
                    msg.msg = data.newContent;
                    msg.messageContent = data.newContent;
                    msg.status = 'edited';
                    msg.editedAt = new Date().toISOString();
                    break;
                }
            }
        });

        $scope.$on('message-recalled', function(event, data) {
            for (var i = 0; i < $scope.messeges.length; i++) {
                var msg = $scope.messeges[i];
                if (msg.id == data.messageId || msg.messageId == data.messageId) {
                    msg.status = 'recalled';
                    msg.recalledAt = new Date().toISOString();
                    break;
                }
            }
        });
    };
}]);
