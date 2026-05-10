/**
 * @fileoverview 图片发送服务
 * @module services/sendImageService
 * @description 提供图片上传功能
 */

angular.module('Services',[])
.service('sendImageService', function ($http, $rootScope) {
    /**
     * 发送图片
     * @param {File} file - 要发送的图片文件
     * @returns {Promise} HTTP请求Promise
     */
	this.sendImage = function (file) {
		// console.log(file);
		// var fd = new FormData();
        // fd.append('file', file);
        // fd.append('name', 'saad');
        // console.log("fd", fd);
        var fd= {name : "Ankit", 
        			Desg : "Developer"};
		 return $http.post( $rootScope.baseUrl + '/v1/demo', fd, {
                transformRequest: angular.identity,
                headers: { 'Content-Type': undefined }
            }).then(function (response) {
                return response;
            });

	};

});