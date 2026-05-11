angular.module('app')
.service('filePreviewService', ['$rootScope', function($rootScope) {
    var service = this;
    
    service.currentPreview = null;
    
    service.openPreview = function(file, type) {
        service.currentPreview = {
            file: file,
            type: type,
            filename: file.filename || file.msg,
            size: file.size,
            serverfilename: file.serverfilename,
            url: null
        };
        $rootScope.$broadcast('preview:open', service.currentPreview);
    };
    
    service.closePreview = function() {
        service.currentPreview = null;
        $rootScope.$broadcast('preview:close');
    };
    
    service.getFileType = function(filename) {
        if (!filename) return 'document';
        
        var ext = filename.toLowerCase().split('.').pop();
        
        var imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
        var audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
        var pdfExts = ['pdf'];
        var docExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'];
        
        if (imageExts.indexOf(ext) !== -1) return 'image';
        if (audioExts.indexOf(ext) !== -1) return 'audio';
        if (pdfExts.indexOf(ext) !== -1) return 'pdf';
        if (docExts.indexOf(ext) !== -1) return 'document';
        
        return 'document';
    };
    
    service.isPreviewSupported = function(filename) {
        var type = service.getFileType(filename);
        return ['image', 'audio', 'pdf'].indexOf(type) !== -1;
    };
    
    service.getPreviewUrl = function(file) {
        if (!file) return null;
        
        var baseUrl = $rootScope.baseUrl || '';
        
        if (file.serverfilename) {
            if (file.serverfilename.startsWith('http')) {
                return file.serverfilename;
            }
            return baseUrl + '/' + file.serverfilename;
        }
        
        if (file.msg && (file.msg.startsWith('http') || file.msg.startsWith('/'))) {
            return file.msg;
        }
        
        return null;
    };
}]);
