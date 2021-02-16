var App = angular.module('ChatRoom',['ngResource','ngRoute','ngStorage','socket.io','ngFileUpload','Controllers','Services', 'ngImageCompress','pascalprecht.translate'])
.run(["$rootScope", function ($rootScope){
	$rootScope.baseUrl = 'http://localhost:8282'; //Application URL
}]);
App.config(function ($routeProvider, $socketProvider){
	$socketProvider.setConnectionUrl('http://localhost:8282'); // Socket URL

	$routeProvider	// AngularJS Routes
	.when('/v1/', {
		templateUrl: 'app/views/login.html',
		controller: 'loginCtrl'
	})
	.when('/v1/ChatRoom', {
		templateUrl: 'app/views/chatRoom.html',
		controller: 'chatRoomCtrl'
	})
	.otherwise({		
        redirectTo: '/v1/'	// Default Route
    });
});
App.controller('myCtrl', ['$translate', function ($translate) {
    var vm = this;
    vm.language = "zh";
    vm.change = function () {
      $translate.use(vm.language);
    };
  }])
  .config(function ($translateProvider) {
	// 注册语言表
	/*$translateProvider.translations('en', {
		"has-joined-to-this-room": "has joined to this room.",
		"The-server-has-been-disconnected-Please-log-in-again": "The server has been disconnected. Please log in again."
	}).translations('zh', {
		"has-joined-to-this-room": "已经加入聊天室。",
		"The-server-has-been-disconnected-Please-log-in-again": "服务器已断开连接，请重新登录。"
	});*/

    // 读取本地JSON文件，prefix代表文件路径前缀，suffix代表文件后续
    $translateProvider.useStaticFilesLoader({
      prefix: './language/',
      suffix: '.json'
    });
    // 设置默认的语言
    $translateProvider.preferredLanguage('zh');
  });

if(window.Notification && Notification.permission !== "denied") {
	Notification.requestPermission(function (status){
		if (status == "granted") {
			var n = new Notification('notification OK!');

			n.onshow = function () {
				setTimeout(n.close.bind(n),5000);
			}
		}
	});
}
