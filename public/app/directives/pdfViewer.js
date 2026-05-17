angular.module('Controllers')
.directive('pdfViewer', [function() {
    return {
        restrict: 'E',
        template: `
            <div class="pdf-viewer-container">
                <div class="pdf-toolbar">
                    <button ng-click="prevPage()" ng-disabled="currentPage <= 1" class="pdf-btn">
                        <i class="fa fa-chevron-left"></i> 上一页
                    </button>
                    <span class="pdf-page-info">{{ currentPage }} / {{ totalPages }}</span>
                    <button ng-click="nextPage()" ng-disabled="currentPage >= totalPages" class="pdf-btn">
                        下一页 <i class="fa fa-chevron-right"></i>
                    </button>
                    <button ng-click="zoomIn()" class="pdf-btn">
                        <i class="fa fa-search-plus"></i> 放大
                    </button>
                    <button ng-click="zoomOut()" class="pdf-btn">
                        <i class="fa fa-search-minus"></i> 缩小
                    </button>
                    <button ng-click="fitToWidth()" class="pdf-btn">
                        <i class="fa fa-arrows-alt-h"></i> 适应宽度
                    </button>
                </div>
                <div class="pdf-canvas-container" id="pdf-canvas-container">
                    <canvas id="pdf-canvas"></canvas>
                </div>
                <div class="pdf-loading" ng-show="loading">
                    <i class="fa fa-spinner fa-spin"></i>
                    <span>加载中...</span>
                </div>
                <div class="pdf-error" ng-show="error">
                    <i class="fa fa-exclamation-triangle"></i>
                    <span>{{ error }}</span>
                </div>
            </div>
        `,
        scope: {
            url: '='
        },
        link: function(scope, element, attrs) {
            scope.currentPage = 1;
            scope.totalPages = 0;
            scope.scale = 1.0;
            scope.loading = false;
            scope.error = null;
            
            var pdfDoc = null;
            var canvas = null;
            var ctx = null;
            
            scope.initPdf = function(url) {
                if (!url) {
                    scope.error = 'PDF URL 未提供';
                    return;
                }
                
                // PDF.js功能暂时禁用，因为CDN资源无法访问
                scope.$apply(function() {
                    scope.loading = false;
                    scope.error = 'PDF.js功能暂时不可用';
                });
            };
            
            scope.renderPage = function(pageNum) {
                if (!pdfDoc) return;
                
                scope.loading = true;
                
                pdfDoc.getPage(pageNum).then(function(page) {
                    var viewport = page.getViewport({ scale: scope.scale });
                    
                    if (!canvas) {
                        canvas = document.getElementById('pdf-canvas');
                    }
                    if (!ctx) {
                        ctx = canvas.getContext('2d');
                    }
                    
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    var renderContext = {
                        canvasContext: ctx,
                        viewport: viewport
                    };
                    
                    page.render(renderContext).then(function() {
                        scope.$apply(function() {
                            scope.loading = false;
                        });
                    }).catch(function(err) {
                        scope.$apply(function() {
                            scope.loading = false;
                            scope.error = '页面渲染失败: ' + err.message;
                        });
                    });
                });
            };
            
            scope.prevPage = function() {
                if (scope.currentPage > 1) {
                    scope.currentPage--;
                    scope.renderPage(scope.currentPage);
                }
            };
            
            scope.nextPage = function() {
                if (scope.currentPage < scope.totalPages) {
                    scope.currentPage++;
                    scope.renderPage(scope.currentPage);
                }
            };
            
            scope.zoomIn = function() {
                scope.scale = Math.min(scope.scale + 0.25, 3.0);
                scope.renderPage(scope.currentPage);
            };
            
            scope.zoomOut = function() {
                scope.scale = Math.max(scope.scale - 0.25, 0.5);
                scope.renderPage(scope.currentPage);
            };
            
            scope.fitToWidth = function() {
                if (!pdfDoc) return;
                
                var container = document.getElementById('pdf-canvas-container');
                if (container) {
                    pdfDoc.getPage(scope.currentPage).then(function(page) {
                        var viewport = page.getViewport({ scale: 1.0 });
                        scope.scale = (container.clientWidth - 40) / viewport.width;
                        scope.renderPage(scope.currentPage);
                    });
                }
            };
            
            scope.$watch('url', function(newUrl) {
                if (newUrl) {
                    scope.currentPage = 1;
                    scope.scale = 1.0;
                    scope.initPdf(newUrl);
                }
            });
            
            scope.$on('$destroy', function() {
                if (pdfDoc) {
                    pdfDoc.destroy();
                }
            });
        }
    };
}]);
