/**
 * @fileoverview 消息滚动指令
 * @module directives/scrollToMessage
 * @description 提供滚动到指定消息的功能封装
 */

angular.module('app')
.directive('scrollToMessage', ['$timeout', function($timeout) {
    return {
        restrict: 'A',
        scope: {
            scrollToMessage: '=',
            highlightDuration: '@?highlightDuration'
        },
        link: function(scope, element) {
            var defaultDuration = scope.highlightDuration || 2000;

            scope.$watch('scrollToMessage', function(messageId) {
                if (messageId) {
                    $timeout(function() {
                        var targetElement = element[0].querySelector('[data-message-id="' + messageId + '"]');
                        if (targetElement) {
                            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            targetElement.classList.add('search-target');
                            $timeout(function() {
                                targetElement.classList.remove('search-target');
                            }, defaultDuration);
                        }
                    }, 100);
                }
            });
        }
    };
}])
.directive('onScrollBottom', ['$timeout', function($timeout) {
    return {
        restrict: 'A',
        scope: {
            onScrollBottom: '&',
            scrollThreshold: '@?scrollThreshold'
        },
        link: function(scope, element) {
            var threshold = parseInt(scope.scrollThreshold) || 100;

            element.on('scroll', function() {
                var scrollTop = element[0].scrollTop;
                var scrollHeight = element[0].scrollHeight;
                var clientHeight = element[0].clientHeight;

                if (scrollHeight - scrollTop - clientHeight < threshold) {
                    $timeout(function() {
                        scope.$apply(function() {
                            scope.onScrollBottom();
                        });
                    });
                }
            });

            scope.$on('$destroy', function() {
                element.off('scroll');
            });
        }
    };
}]);
