'use strict';

angular.module('messageStatusServices', [])
.service('messageStatusService', ['$rootScope', '$socket', function($rootScope, $socket) {
    var STATUS_SENT = 'sent';
    var STATUS_DELIVERED = 'delivered';
    var STATUS_READ = 'read';

    this.markMessagesRead = function(roomCode) {
        if (!roomCode || !$rootScope.username) {
            return;
        }

        $socket.emit('mark-messages-read', {
            roomCode: roomCode
        }, function(response) {
            if (response.success) {
                console.log('批量标记已读成功:', response.count);
            } else {
                console.error('批量标记已读失败:', response.message);
            }
        });
    };

    this.notifyMessageView = function(messageId) {
        if (!messageId || !$rootScope.username) {
            return;
        }

        $socket.emit('view-message', {
            messageId: messageId
        }, function(response) {
            if (response.success) {
                console.log('标记消息已读成功:', messageId);
            } else {
                console.error('标记消息已读失败:', response.message);
            }
        });
    };

    this.registerEventListeners = function($scope) {
        $scope.$on('message-delivered', function(event, data) {
            if (data.roomCode !== $rootScope.roomCode) {
                return;
            }

            for (var i = 0; i < $scope.messeges.length; i++) {
                var msg = $scope.messeges[i];
                if (msg.id === data.messageId || msg.messageId === data.messageId) {
                    if (msg.ownMsg) {
                        msg.status = STATUS_DELIVERED;
                    }
                    break;
                }
            }
        });

        $scope.$on('message-read', function(event, data) {
            if (data.roomCode !== $rootScope.roomCode) {
                return;
            }

            if (data.messageId) {
                for (var i = 0; i < $scope.messeges.length; i++) {
                    var msg = $scope.messeges[i];
                    if (msg.id === data.messageId || msg.messageId === data.messageId) {
                        if (msg.ownMsg && data.reader !== $rootScope.username) {
                            msg.status = STATUS_READ;
                        }
                        break;
                    }
                }
            } else if (data.reader && data.reader !== $rootScope.username) {
                for (var i = 0; i < $scope.messeges.length; i++) {
                    var msg = $scope.messeges[i];
                    if (msg.ownMsg) {
                        msg.status = STATUS_READ;
                    }
                }
            }
        });
    };

    this.getStatusIcon = function(status) {
        switch (status) {
            case STATUS_SENT:
                return 'fa-check';
            case STATUS_DELIVERED:
                return 'fa-check';
            case STATUS_READ:
                return 'fa-eye';
            default:
                return 'fa-check';
        }
    };

    this.getStatusClass = function(status) {
        switch (status) {
            case STATUS_SENT:
                return 'status-sent';
            case STATUS_DELIVERED:
                return 'status-delivered';
            case STATUS_READ:
                return 'status-read';
            default:
                return 'status-sent';
        }
    };

    this.getStatusText = function(status) {
        switch (status) {
            case STATUS_SENT:
                return '已发送';
            case STATUS_DELIVERED:
                return '已送达';
            case STATUS_READ:
                return '已读';
            default:
                return '已发送';
        }
    };
}]);
