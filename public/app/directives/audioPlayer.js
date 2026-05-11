angular.module('app')
.directive('audioPlayer', [function() {
    return {
        restrict: 'E',
        template: `
            <div class="audio-player-container">
                <button ng-click="togglePlay()" class="audio-btn play-btn">
                    <i class="fa" ng-class="{'fa-play': !playing, 'fa-pause': playing}"></i>
                </button>
                <div class="audio-progress" ng-click="seek($event)">
                    <div class="audio-progress-bar" style="width: {{ progress }}%"></div>
                </div>
                <span class="audio-time">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
                <button ng-click="toggleMute()" class="audio-btn volume-btn">
                    <i class="fa" ng-class="{'fa-volume-up': !muted && volumePercent > 50, 'fa-volume-down': !muted && volumePercent <= 50 && volumePercent > 0, 'fa-volume-off': muted || volumePercent === 0}"></i>
                </button>
                <input type="range" class="volume-slider" min="0" max="100" ng-model="volumePercent" ng-change="setVolume()">
            </div>
        `,
        scope: {
            src: '='
        },
        link: function(scope, element, attrs) {
            var audio = new Audio();
            
            scope.playing = false;
            scope.currentTime = 0;
            scope.duration = 0;
            scope.progress = 0;
            scope.muted = false;
            scope.volumePercent = 100;
            
            scope.togglePlay = function() {
                if (scope.playing) {
                    audio.pause();
                    scope.playing = false;
                } else {
                    audio.play();
                    scope.playing = true;
                }
            };
            
            scope.toggleMute = function() {
                scope.muted = !scope.muted;
                audio.muted = scope.muted;
            };
            
            scope.setVolume = function() {
                audio.volume = scope.volumePercent / 100;
                scope.muted = audio.volume === 0;
            };
            
            scope.seek = function(event) {
                if (!scope.duration) return;
                
                var progressBar = event.currentTarget;
                var rect = progressBar.getBoundingClientRect();
                var percent = (event.clientX - rect.left) / rect.width;
                
                audio.currentTime = percent * scope.duration;
            };
            
            scope.formatTime = function(seconds) {
                if (!seconds || isNaN(seconds)) return '00:00';
                
                var mins = Math.floor(seconds / 60);
                var secs = Math.floor(seconds % 60);
                
                return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
            };
            
            audio.addEventListener('timeupdate', function() {
                scope.$apply(function() {
                    scope.currentTime = audio.currentTime;
                    scope.progress = scope.duration ? (scope.currentTime / scope.duration) * 100 : 0;
                });
            });
            
            audio.addEventListener('loadedmetadata', function() {
                scope.$apply(function() {
                    scope.duration = audio.duration;
                });
            });
            
            audio.addEventListener('ended', function() {
                scope.$apply(function() {
                    scope.playing = false;
                    scope.currentTime = 0;
                    scope.progress = 0;
                });
            });
            
            audio.addEventListener('error', function() {
                scope.$apply(function() {
                    scope.playing = false;
                });
            });
            
            scope.$watch('src', function(newSrc) {
                if (newSrc) {
                    audio.src = newSrc;
                    audio.load();
                    scope.playing = false;
                    scope.currentTime = 0;
                    scope.progress = 0;
                }
            });
            
            scope.$on('$destroy', function() {
                audio.pause();
                audio.src = '';
            });
        }
    };
}]);
