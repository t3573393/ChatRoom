var App = angular.module('ChatRoom',['ngResource','ngRoute','ngStorage','socket.io','ngFileUpload','Controllers','Services', 'ngImageCompress'])
.run(["$rootScope", function ($rootScope){
	$rootScope.baseUrl = 'http://172.20.10.3:8282'; //Application URL
}]);
App.config(function ($routeProvider, $socketProvider){
	$socketProvider.setConnectionUrl('http://172.20.10.3:8282'); // Socket URL

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
