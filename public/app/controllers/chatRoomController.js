angular.module('Controllers')
.directive('schrollBottom', function () {		// custom directive for scrolling bottom on new message load
  return {
    scope: {
      schrollBottom: "="
    },
    link: function (scope, element) {
      scope.$watchCollection('schrollBottom', function (newValue) {
        if (newValue)
        {
          $(element).scrollTop($(element)[0].scrollHeight);
        }
      });
    }
  }
})
.directive('ngEnter', function () {			// custom directive for sending message on enter click
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });
                event.preventDefault();
            }
        });
    };
})
.directive('focusMe', function($timeout) {		// custom directive for focusing on message sending input box
    return {
        link: function(scope, element, attrs) {
          scope.$watch(attrs.focusMe, function(value) {
            if(value === true) { 
              $timeout(function() {
                element[0].focus();
                scope[attrs.focusMe] = false;
              });
            }
          });
        }
    };
})
.controller('chatRoomCtrl', function ($scope, $rootScope, $socket, $location, $http, $window, Upload, $timeout, sendImageService,$translate){		// Chat Page Controller
	// Varialbles Initialization.
	$scope.isMsgBoxEmpty = false;
	$scope.isFileSelected = false;
	$scope.isMsg = false;
	$scope.setFocus = true;
	$scope.chatMsg = "";
	$scope.users = [];
	$scope.messeges = [];
	console.log("inicializando variables...");
	$scope.autoScroll = true;
	$scope.roomCode = $rootScope.roomCode;
	$scope.mensajesNuevos = 0;
		
	function beep() {
		var snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");  
		snd.play();
	};

	function SumaMensaje(){
		if($rootScope.loggedIn == true && $scope.autoScroll == false){
			$scope.mensajesNuevos = $scope.mensajesNuevos + 1;
			$rootScope.title = " ("+$scope.mensajesNuevos+")";
			console.log("Mensaje entrante ("+$scope.mensajesNuevos+")...");
		}
	};
	function ScrolltoBottom(){
		console.log("autoScroll = " + $scope.autoScroll + "- loggedIn = " + $rootScope.loggedIn);
		
			console.log("Entro scroll...");
			$timeout(function() {
				if($rootScope.loggedIn == true && $scope.autoScroll == true && $scope.mensajesNuevos == 0){				
					$("#divBox").scrollTop($("#divBox")[0].scrollHeight);	
					console.log("Aplicó scroll...");
				}
			}, 20);
				
		
			
	}
	
		
	// redirection if user is not logged in.
	if(!$rootScope.loggedIn){
		$location.path('/v1/');
	}
	
	$window.onfocus = function(){
		 console.log("Tiene foco.")
		 $scope.autoScroll = true;
		 $scope.mensajesNuevos = 0;
		 $rootScope.title = "";
		  $socket.emit("user-activo",{ username : $rootScope.username}, function(data){
				//delivery report code goes here
				/*if (data.success == true) {
					$scope.chatMsg = "";
					$scope.setFocus = true;				
				}*/
			});
	}
	$window.onblur = function(){
		console.log("Perdio foco.")
		$scope.autoScroll = false;
		$socket.emit("user-inactivo",{ username : $rootScope.username}, function(data){
				//delivery report code goes here
				/*if (data.success == true) {
					$scope.chatMsg = "";
					$scope.setFocus = true;				
				}*/
			});
    }
	
// ==================================  MEMES  ===============================

	$scope.memes = [	
	];

	$scope.enviarMEME = function(url){
		$scope.isFileSelected = false;
			$scope.isMsg = true;
			var dateString = formatAMPM(new Date());
		$socket.emit("send-message",{ username : $rootScope.username, userAvatar : $rootScope.userAvatar, msg : url, isImageMSG: false, isMeme: true, hasMsg : $scope.isMsg , hasFile : $scope.isFileSelected , msgTime : dateString, roomCode : $rootScope.roomCode }, function(data){
				//delivery report code goes here
				if (data.success == true) {
					$scope.chatMsg = "";
					$scope.setFocus = true;				
				}
			});
		
		$socket.emit("send-meme",{username : $rootScope.username, msg : url, roomCode : $rootScope.roomCode }, function(data){
				if (data.success == true) {
					$scope.chatMsg = "";
					$scope.setFocus = true;				
				}
		});
		
		
		
	}
	$scope.removeMeme = function(url){
		$socket.emit("remove-meme",{username : $rootScope.username, msg : url, roomCode : $rootScope.roomCode }, function(data){
				if (data.success == true) {
					$scope.chatMsg = "";
					$scope.setFocus = true;				
				}
		});
	}
	$scope.sendMeme = function(){
			$scope.isFileSelected = false;
			$scope.isMsg = true;
			var dateString = formatAMPM(new Date());
			
			//addMeme({url: $scope.chatMsg});
			
			$socket.emit("send-message",{ username : $rootScope.username, userAvatar : $rootScope.userAvatar, msg : $scope.chatMsg, isImageMSG: false, isMeme: true, hasMsg : $scope.isMsg , hasFile : $scope.isFileSelected , msgTime : dateString, roomCode : $rootScope.roomCode }, function(data){
				//delivery report code goes here
				if (data.success == true) {
					$scope.chatMsg = "";
					$scope.setFocus = true;				
				}
			});
			if($scope.chatMsg != undefined && $scope.chatMsg.trim() != ''){
				$socket.emit("send-meme",{username : $rootScope.username, msg : $scope.chatMsg, roomCode : $rootScope.roomCode }, function(data){
					if (data.success == true) {
						$scope.chatMsg = "";
						$scope.setFocus = true;				
					}
				});
			}
	}
		
	// recieving new text message
	$socket.on("new meme", function(data){
		if(data.username == $rootScope.username){
			data.ownMsg = true;	
		}else{
			data.ownMsg = false;
		}
		if(data.roomCode == $rootScope.roomCode){
			if(data.roomCode != $rootScope.roomCode){
				return;
			}
			
			SumaMensaje();
			var esta = false;
			for(var i = 0; i < $scope.memes.length; i++){
				if($scope.memes[i].url == data.msg){
					esta = true;
					break;
				}
			}
			if(!esta && data.msg != ''){
				$scope.memes.push({url: data.msg});
			}
		}
		ScrolltoBottom();
	});

	$socket.on("disconnect", function(data){
		let msg = $translate.instant('The-server-has-been-disconnected-Please-log-in-again');
		alert(msg);
		//$location.path('/v1/');
		$window.location.href = '/';
		console.log("socket desconectado.");
	});
	
	$socket.on("remove meme", function(data){
		if(data.username == $rootScope.username){
			data.ownMsg = true;	
		}else{
			data.ownMsg = false;
		}
		if(data.roomCode == $rootScope.roomCode){
			if(data.roomCode != $rootScope.roomCode){
				return;
			}
			
			var esta = false;
			var posicion = -1;
			for(var i = 0; i < $scope.memes.length; i++){
				if($scope.memes[i].url == data.msg){
					esta = true;
					posicion = i;
					break;
				}
			}
			if(esta && data.msg != ''){
				$scope.memes.splice(posicion, 1);
			}
		}
	});


// ================================== Online Members List ===============================

	$("#inputText").on("change keyup paste", function(){
		if($('#inputText').val() != "" && $('#inputText').val() != undefined){
			console.log($rootScope.username + " esta escribiendo...");
			$socket.emit("user-writting",{ username : $rootScope.username}, function(data){
				//delivery report code goes here
				/*if (data.success == true) {
					$scope.chatMsg = "";
					$scope.setFocus = true;				
				}*/
			});
		}
    	else{
			console.log($rootScope.username + " dejo de escribir.");
			$socket.emit("user-stop-writting",{ username : $rootScope.username}, function(data){
				//delivery report code goes here
				/*if (data.success == true) {
					$scope.chatMsg = "";
					$scope.setFocus = true;				
				}*/
			});
		}
	});
	$socket.emit('get-online-members',function(data){
		console.log("get online members");
	});
	$socket.on("online-members", function(data){			
			console.log("getting online members...");
			$scope.users = data;
			//console.log(data);
			
			var logedUsers = data.filter(data => data.roomCode == $rootScope.roomCode);
			
			if($scope.usersRoom && $scope.usersRoom.length < logedUsers.length){
				for(var i = 0; i < logedUsers.length; i++){
					var esta = false;
					var nombre = logedUsers[i].username;
					if($scope.usersRoom){
						for(var j = 0; j < $scope.usersRoom.length; j++){
							if(logedUsers[i].username == $scope.usersRoom[j].username){
								esta = true;
								continue;
							}
						}
					}
					if(!esta && $rootScope.username != nombre){
						let msg = $translate.instant('has-joined-to-this-room');
						var dateString = formatAMPM(new Date());
						var data = {
							esin: true,
							userLogin: true,
							username: nombre,
							msg: msg,
							msgTime: dateString
						};
						$scope.messeges.push(data);
						SumaMensaje();
						ScrolltoBottom();
					}
				}
			}
			if($scope.usersRoom && $scope.usersRoom.length > logedUsers.length){
				for(var i = 0; i < $scope.usersRoom.length; i++){
					var esta = false;
					var nombre = $scope.usersRoom[i].username;
					if($scope.usersRoom){
						for(var j = 0; j < logedUsers.length; j++){
							if(logedUsers[j].username == $scope.usersRoom[i].username){
								esta = true;
								continue;
							}
						}
					}
					if(!esta && $rootScope.username != nombre){						
						let msg = $translate.instant('has-left-this-room');
						var dateString = formatAMPM(new Date());
						var data = {
							esin: false,
							userLogin: true,
							username: nombre,
							msg: msg,
							msgTime: dateString
						};
						$scope.messeges.push(data);
						SumaMensaje();
						ScrolltoBottom();
					}
				}
			}
						
			$scope.usersRoom = logedUsers;
			
	});

// ================================== Common Functions ==================================    
	// device/desktop detection
	var isMobile = false;
    if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
    || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4)))
		isMobile = true;        

        if(isMobile){
        	var height = $( window ).height() * 0.7;
				$scope.setFocus = false;
				setTimeout(function(){ $('.direct-chat-messages').height(height); }, 1000);
        	$(window).on("resize", function () {
				var height = $( window ).height() * 0.7;
				$scope.setFocus = false;
				setTimeout(function(){ $('.direct-chat-messages').height(height); }, 1000);    
			});
        }else{
        	var height = $( document ).height() * 0.8;
			$('.direct-chat-messages').height(height);
        }
    // message time formatting into string    
	function formatAMPM(date) {
		var reqLanguage = navigator.language || navigator.userLanguage; 
		console.log("reqLanguage:" + reqLanguage);
		var hours = date.getHours();
		var minutes = date.getMinutes();
		var ampm = hours >= 12 ? 'pm' : 'am';
		if(reqLanguage == "zh-CN") {
			ampm = hours >= 12 ? '下午' : '上午';
		} 
		hours = hours % 12;
		hours = hours ? hours : 12; // the hour '0' should be '12'
		minutes = minutes < 10 ? '0'+minutes : minutes;
		var strTime = hours + ':' + minutes + ' ' + ampm;
		return strTime;
	}
	// toggle online member list mobile
 	$scope.custom = true;
    $scope.toggleCustom = function() {
        $scope.custom = $scope.custom === false ? true: false;	
        if(!$scope.custom){
        	if(!angular.element(document.querySelector("#slidememberlist")).hasClass("slideout_inner_trans")){
        		angular.element(document.querySelector("#slidememberlist")).addClass("slideout_inner_trans");
        	}
        }else{
        	if (angular.element(document.querySelector("#slidememberlist")).hasClass("slideout_inner_trans")) {
        		angular.element(document.querySelector("#slidememberlist")).removeClass("slideout_inner_trans");        		
        	}
        }        
    };   
	/*
	$( "#inputText" ).focusin(function() {
		$("#divBox").scrollTop($("#divBox")[0].scrollHeight);
	});*/
// ====================================== Code Sending Code ============================
$scope.sendCode = function(){
		if ($scope.chatMsg) {
			$scope.isFileSelected = false;
			$scope.isMsg = true;
			var dateString = formatAMPM(new Date());
			
			var IsImageMSG = false;
			if ($scope.chatMsg.match(/\.(jpeg|jpg|gif|png)$/) != null){
				IsImageMSG = true;
			}
			
			
			
			$socket.emit("send-message",{ username : $rootScope.username, userAvatar : $rootScope.userAvatar, msg : $scope.chatMsg, isCode: true, isImageMSG: false, hasMsg : $scope.isMsg , hasFile : $scope.isFileSelected , msgTime : dateString, roomCode : $rootScope.roomCode }, function(data){
				//delivery report code goes here
				if (data.success == true) {
					$scope.chatMsg = "";
					$scope.setFocus = true;				
				}
			});
		}else{
			$scope.isMsgBoxEmpty = true;
		}		
	}

// ====================================== Messege Sending Code ============================
	// sending text message function
	$scope.sendMsg = function(){
		if ($scope.chatMsg) {
			$scope.isFileSelected = false;
			$scope.isMsg = true;
			var dateString = formatAMPM(new Date());
			
			var IsImageMSG = false;
			if ($scope.chatMsg.match(/\.(jpeg|jpg|gif|png)$/) != null){
				IsImageMSG = true;
			}
			
			
			
			$socket.emit("send-message",{ username : $rootScope.username, userAvatar : $rootScope.userAvatar, msg : $scope.chatMsg, isImageMSG: IsImageMSG, hasMsg : $scope.isMsg , hasFile : $scope.isFileSelected , msgTime : dateString, roomCode : $rootScope.roomCode }, function(data){
				//delivery report code goes here
				if (data.success == true) {
					$scope.chatMsg = "";
					$scope.setFocus = true;	
					ScrolltoBottom();				
				}
			});
		}else{
			$scope.isMsgBoxEmpty = true;
		}		
	}

	// recieving new text message
	$socket.on("new message", function(data){
		console.log("-------------------------------------");
		console.log(data);
		if(data.username == $rootScope.username){
			data.ownMsg = true;	
		}else{
			data.ownMsg = false;
		}
		if(data.roomCode == $rootScope.roomCode){
			$scope.messeges.push(data);	
			if(!data.ownMsg){
				SumaMensaje();
				ScrolltoBottom();
				beep();

				if(window.Notification && Notification.permission == "granted") {
					var n = new Notification('notification', {
					   body : 'new message'
					});

					n.onshow = function () {
						setTimeout(n.close.bind(n),5000);
					}
				}
			}
		}
	});

// ====================================== Image Sending Code ==============================
    $scope.$watch('imageFiles', function () {
        $scope.sendImage($scope.imageFiles);
    });

    //  opens the sent image on gallery_icon click
    $scope.openClickImage = function(msg){
		if(!msg.ownMsg){
		$http.post($rootScope.baseUrl + "/v1/getfile",msg, 
						{
							headers: { 'Content-Type': undefined, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS' 
							}
							}).success(function (response){
	    	if(!response.isExpired){
	    		msg.showme = false;
	    		msg.serverfilename = msg.serverfilename;
	    	}else{
	    		var html = '<p id="alert">'+ response.expmsg +'</p>';
	    		if ($( ".chat-box" ).has( "p" ).length < 1) {
					$(html).hide().prependTo(".chat-box").fadeIn(1500);
					$('#alert').delay(1000).fadeOut('slow', function(){
						$('#alert').remove();
					});
				}
	    	}
	    });	
		}
    };
    
    // recieving new image message
    $socket.on("new message image", function(data){
		//console.log("entro a imagen");
		//console.log(data);
		$scope.showme = true;
		if(data.username == $rootScope.username){
			data.ownMsg = true;	
			data.dwimgsrc = "app/images/spin.gif";	
		}else{
			data.ownMsg = false;
		}
		if(data.roomCode == $rootScope.roomCode || data.ownMsg){
			
			if((data.username == $rootScope.username) && data.repeatMsg){
				SumaMensaje();
				checkMessegesImage(data);
			}else{
				$scope.messeges.push(data);
			}
		}

		if(data.roomCode == $rootScope.roomCode){
			if(!data.ownMsg){
				if(window.Notification && Notification.permission == "granted") {
					var n = new Notification('notification', {
					   body : 'new message image'
					});

					n.onshow = function () {
						setTimeout(n.close.bind(n),5000);
					}
				}
			}
		}
		ScrolltoBottom();
	});

	// replacing spinning wheel in sender message after image message delivered to everyone.
	function checkMessegesImage(msg){
		for (var i = ($scope.messeges.length-1); i >= 0 ; i--) {
			if($scope.messeges[i].hasFile){
				if ($scope.messeges[i].istype === "image") {
					if($scope.messeges[i].dwid === msg.dwid){
						$scope.messeges[i].showme = false;
						$scope.messeges[i].filename = msg.filename;
						$scope.messeges[i].size = msg.size;
						$scope.messeges[i].imgsrc = msg.serverfilename;
						$scope.messeges[i].serverfilename = msg.serverfilename;
						break;	
					}
				}						
			}
		};
	}

	// validate file type to image function
	$scope.validateImage = function(file){
		var filetype = file.type.substring(0,file.type.indexOf('/'));
		if (filetype == "image") {
			return true;
		}else{
			var html = '<p id="alert">Select Images.</p>';
			if ($( ".chat-box" ).has( "p" ).length < 1) {
				$(html).hide().prependTo(".chat-box").fadeIn(1500);
				$('#alert').delay(1000).fadeOut('slow', function(){
					$('#alert').remove();
				});
			}	
			return false;
		}
	}

	// download image if it exists on server else return error message
	$scope.downloadImage = function(ev, elem){
		var search_id = elem.id;
    	for (var i = ($scope.messeges.length-1); i >= 0 ; i--) {
			if($scope.messeges[i].hasFile){
				if ($scope.messeges[i].istype === "image") {
					if($scope.messeges[i].dwid === search_id){
						$http.post($rootScope.baseUrl + "/v1/getfile",$scope.messeges[i]).success(function (response){
					    	if(!response.isExpired){
					    		var linkID = "#" + search_id + "A";
					    		$(linkID).find('i').click();
					    		return true;
					    	}else{
					    		var html = '<p id="alert">'+ response.expmsg +'</p>';
								if ($( ".chat-box" ).has( "p" ).length < 1) {
									$(html).hide().prependTo(".chat-box").fadeIn(1500);
									$('#alert').delay(1000).fadeOut('slow', function(){
										$('#alert').remove();
									});
								}	
								return false;
					    	}
					    });				
						break;	
					}
				}						
			}
		};
    }

    // sending new images function
    $scope.sendImage = function (files) {
        if (files && files.length) {
        	$scope.isFileSelected = true;
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var dateString = formatAMPM(new Date());            
                var DWid = $rootScope.username + "dwid" + Date.now();
                var image = {
			      		username : $rootScope.username, 
						roomCode : $rootScope.roomCode, 
			      		userAvatar : $rootScope.userAvatar, 
			      		hasFile : $scope.isFileSelected , 
			      		isImageFile : true, 
			      		istype : "image", 
			      		showme : true , 
			      		dwimgsrc : "app/images/gallery_icon5.png", 
			      		dwid : DWid, 
			      		msgTime : dateString			      		
			    };
                $socket.emit('send-message',image,function (data){       // sending new image message via socket    
                });
				
				
                var fd = new FormData();
    			fd.append('file', file);
        		fd.append('username', $rootScope.username);
        		fd.append('userAvatar', $rootScope.userAvatar);
				fd.append('roomCode', $rootScope.roomCode);
        		fd.append('hasFile', $scope.isFileSelected);
        		fd.append('isImageFile', true);
				fd.append('istype', "image");        		
				fd.append('showme', true);
				fd.append('dwimgsrc', "app/images/gallery_icon5.png");
				fd.append('dwid', DWid);
				fd.append('msgTime', dateString);
				fd.append('filename', file.name);
				$http.post($rootScope.baseUrl +"/v1/uploadImage", fd, {
				//$http.post("/v1/uploadImage", fd, {
		            transformRequest: angular.identity,
		            headers: { 'Content-Type': undefined, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS' }
		        }).then(function (response) {
		        });

            }
        }
    };

// =========================================== Audio Sending Code =====================
    $scope.$watch('musicFiles', function () {
        $scope.sendAudio($scope.musicFiles);
    });

    //  opens the sent music file on music_icon click on new window
    $scope.openClickMusic = function(msg){
    	$http.post($rootScope.baseUrl + "/v1/getfile",msg).success(function (response){
	    	if(!response.isExpired){
	    		window.open($rootScope.baseUrl +'/'+response.serverfilename, "_blank");
	    	}else{	    		
		    		var html = '<p id="alert">'+ response.expmsg +'</p>';
				if ($( ".chat-box" ).has( "p" ).length < 1) {
					$(html).hide().prependTo(".chat-box").fadeIn(1500);
					$('#alert').delay(1000).fadeOut('slow', function(){
						$('#alert').remove();
					});
				}
	    	}
	    });	
	}

	// recieving new music message
    $socket.on("new message music", function(data){
		if(data.username == $rootScope.username){
			data.ownMsg = true;
			data.dwimgsrc = "app/images/spin.gif";
		}else{
			data.ownMsg = false;
		}
		if(data.roomCode == $rootScope.roomCode || data.ownMsg){
			
			if((data.username == $rootScope.username) && data.repeatMsg){	
				SumaMensaje();
				checkMessegesMusic(data);
			}else{
				$scope.messeges.push(data);
			}
		}
		if(data.roomCode == $rootScope.roomCode){
			if(!data.ownMsg){
				if(window.Notification && Notification.permission == "granted") {
					var n = new Notification('notification', {
					   body : 'new message music'
					});

					n.onshow = function () {
						setTimeout(n.close.bind(n),5000);
					}
				}
			}
		}
		ScrolltoBottom();
	});

	// replacing spinning wheel in sender message after music message delivered to everyone.
	function checkMessegesMusic(msg){
		for (var i = ($scope.messeges.length-1); i >= 0 ; i--) {
			if($scope.messeges[i].hasFile){
				if ($scope.messeges[i].istype === "music") {					
					if($scope.messeges[i].dwid === msg.dwid){
						$scope.messeges[i].showme = true;
						$scope.messeges[i].serverfilename = msg.serverfilename;
						$scope.messeges[i].filename = msg.filename;
						$scope.messeges[i].size = msg.size;
						$scope.messeges[i].dwimgsrc = "app/images/musicplay_icon.png";
						break;	
					}
				}						
			}
		};
	}

	// download music file if it exists on server else return error message
	$scope.downloadMusic = function(ev, elem){
		var search_id = elem.id;
    	for (var i = ($scope.messeges.length-1); i >= 0 ; i--) {
			if($scope.messeges[i].hasFile){
				if ($scope.messeges[i].istype === "music") {
					if($scope.messeges[i].dwid === search_id){
						$http.post($rootScope.baseUrl + "/v1/getfile",$scope.messeges[i]).success(function (response){
					    	if(!response.isExpired){
					    		var linkID = "#" + search_id + "A";
					    		$(linkID).find('i').click();
					    		return true;
					    	}else{
					    		var html = '<p id="alert">'+ response.expmsg +'</p>';
								if ($( ".chat-box" ).has( "p" ).length < 1) {
									$(html).hide().prependTo(".chat-box").fadeIn(1500);
									$('#alert').delay(1000).fadeOut('slow', function(){
										$('#alert').remove();
									});
								}
								return false;
					    	}
					    });				
						break;	
					}
				}						
			}
		};
    }

    // validate file type to 'music file' function
	$scope.validateMP3 = function(file){
		if (file.type == "audio/mp3" || file.type == "audio/mpeg") {
			return true;
		}else{
			var html = '<p id="alert">Select MP3.</p>';
			if ($( ".chat-box" ).has( "p" ).length < 1) {
				$(html).hide().prependTo(".chat-box").fadeIn(1500);
				$('#alert').delay(1000).fadeOut('slow', function(){
					$('#alert').remove();
				});
			}
			return false;
		}
	}    

	// sending new 'music file' function
    $scope.sendAudio = function (files) {
        if (files && files.length) {
        	$scope.isFileSelected = true;
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var dateString = formatAMPM(new Date());
                var DWid = $rootScope.username + "dwid" + Date.now();
                var audio = {
                		username : $rootScope.username, 
			      		userAvatar : $rootScope.userAvatar, 
						roomCode : $rootScope.roomCode, 
			      		hasFile : $scope.isFileSelected ,
			      		isMusicFile : true,
                		istype : "music",
                		showme : false,
                		dwimgsrc : "app/images/musicplay_icon.png", 
			      		dwid : DWid, 
                		msgTime : dateString
                }		

                $socket.emit('send-message',audio,function (data){		// sending new image message via socket
                });
                var fd = new FormData();
    			fd.append('file', file);
        		fd.append('username', $rootScope.username);
        		fd.append('userAvatar', $rootScope.userAvatar);
				fd.append('roomCode', $rootScope.roomCode);
        		fd.append('hasFile', $scope.isFileSelected);
        		fd.append('isMusicFile', true);
				fd.append('istype', "music");        		
				fd.append('showme', false);
				fd.append('dwimgsrc', "app/images/musicplay_icon.png");
				fd.append('dwid', DWid);
				fd.append('msgTime', dateString);
				fd.append('filename', file.name);
				$http.post('/v1/uploadAudio', fd, {
		            transformRequest: angular.identity,
		            headers: { 'Content-Type': undefined }
		        }).then(function (response) {
		        });    
            }
        }
    };

//==================================== Doc Sending Code ==============================
    $scope.$watch('PDFFiles', function () {
    	var file = $scope.PDFFiles;
        $scope.sendPDF($scope.PDFFiles);
    });

    //  download the document file on doc_icon click 
    $scope.openClickPDF = function(msg){
    	$http.post($rootScope.baseUrl + "/v1/getfile",msg).success(function (response){
	    	if(!response.isExpired){
	    		window.open($rootScope.baseUrl+'/'+response.serverfilename, "_blank");
	    	}else{
	    		var html = '<p id="alert">'+ response.expmsg +'</p>';
	    		if ($( ".chat-box" ).has( "p" ).length < 1) {
					$(html).hide().prependTo(".chat-box").fadeIn(1500);
					$('#alert').delay(1000).fadeOut('slow', function(){
						$('#alert').remove();
					});
				}
	    	}
	    });
	}

	// recieving new document message
	$socket.on("new message PDF", function(data){
		if(data.username == $rootScope.username){
			data.ownMsg = true;
			data.dwimgsrc = "app/images/spin.gif";
		}else{
			data.ownMsg = false;
		}
		if(data.roomCode == $rootScope.roomCode || data.ownMsg){
			if((data.username == $rootScope.username) && data.repeatMsg){	
				checkMessegesPDF(data);
			}else{
				$scope.messeges.push(data);
			}
		}
		if(data.roomCode == $rootScope.roomCode){
			if(!data.ownMsg){
				if(window.Notification && Notification.permission == "granted") {
					var n = new Notification('notification', {
					   body : 'new message PDF'
					});

					n.onshow = function () {
						setTimeout(n.close.bind(n),5000);
					}
				}
			}
		}
		ScrolltoBottom();
	});

	// replacing spinning wheel in sender message after document message delivered to everyone.
	function checkMessegesPDF(msg){
		for (var i = ($scope.messeges.length-1); i >= 0 ; i--) {
			if($scope.messeges[i].hasFile){
				if ($scope.messeges[i].istype === "PDF") {
					if($scope.messeges[i].dwid === msg.dwid){
						$scope.messeges[i].showme = true;
						$scope.messeges[i].serverfilename = msg.serverfilename;
						$scope.messeges[i].filename = msg.filename;
						$scope.messeges[i].size = msg.size;
						$scope.messeges[i].dwimgsrc = "app/images/doc_icon.png";
						break;	
					}
				}						
			}
		};
	}
	
	// validate file type to 'document file' function
	$scope.validatePDF = function(file){
		if (file.type == "application/pdf" || file.type == "application/msword" || file.type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.type == "text/plain" || file.type == "application/vnd.ms-excel") {
			return true;
		}else{
			var html = '<p id="alert">Select pdf/excel/doc.</p>';
			if ($( ".chat-box" ).has( "p" ).length < 1) {
				$(html).hide().prependTo(".chat-box").fadeIn(1500);
				$('#alert').delay(1000).fadeOut('slow', function(){
					$('#alert').remove();
				});
			}
			return false;
		}
	}

	// download document file if it exists on server else return error message
	$scope.downloadPDF = function(ev, elem){
		var search_id = elem.id;
    	for (var i = ($scope.messeges.length-1); i >= 0 ; i--) {
			if($scope.messeges[i].hasFile){
				if ($scope.messeges[i].istype === "PDF") {
					if($scope.messeges[i].dwid === search_id){
						$http.post($rootScope.baseUrl + "/v1/getfile",$scope.messeges[i]).success(function (response){
					    	if(!response.isExpired){
					    		var linkID = "#" + search_id + "A";
					    		$(linkID).find('i').click();
					    		return true;
					    	}else{
					    		var html = '<p id="alert">'+ response.expmsg +'</p>';
								if ($( ".chat-box" ).has( "p" ).length < 1) {
									$(html).hide().prependTo(".chat-box").fadeIn(1500);
									$('#alert').delay(1000).fadeOut('slow', function(){
										$('#alert').remove();
									});
								}
								return false;
					    	}
					    });				
						break;	
					}
				}						
			}
		};
    }

    // sending new 'document file' function
    $scope.sendPDF = function (files) {
        if (files && files.length) {
        	$scope.isFileSelected = true;
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var dateString = formatAMPM(new Date());
                var DWid = $rootScope.username + "dwid" + Date.now();
                var PDF = {
						roomCode : $rootScope.roomCode, 
                		username : $rootScope.username, 
			      		userAvatar : $rootScope.userAvatar, 
			      		hasFile : $scope.isFileSelected ,
			      		isPDFFile : true,
                		istype : "PDF",
                		showme : false,
                		dwimgsrc : "app/images/doc_icon.png", 
			      		dwid : DWid, 
                		msgTime : dateString
                }
                $socket.emit('send-message',PDF,function (data){
                });
                var fd = new FormData();
    			fd.append('file', file);
        		fd.append('username', $rootScope.username);
        		fd.append('userAvatar', $rootScope.userAvatar);
				fd.append('roomCode', $rootScope.roomCode);
        		fd.append('hasFile', $scope.isFileSelected);
        		fd.append('isPDFFile', true);
				fd.append('istype', "PDF");        		
				fd.append('showme', false);
				fd.append('dwimgsrc', "app/images/doc_icon.png");
				fd.append('dwid', DWid);
				fd.append('msgTime', dateString);
				fd.append('filename', file.name);
				$http.post("/v1/uploadPDF", fd, {
		            transformRequest: angular.identity,
		            headers: { 'Content-Type': undefined }
		        }).then(function (response) {
		            //console.log(response);
		        });
            }
        }
    };
	

//==================================== Any File Upload ============================
    $scope.$watch('Files', function () {
        var filetype = $scope.catchFile($scope.Files);
        if(filetype == "document"){
        	$scope.sendPDF($scope.Files);
        }else if(filetype == "music"){
        	$scope.sendAudio($scope.Files);
        }else if(filetype == "image"){
        	$scope.sendImage($scope.Files);
        }else if(filetype == "invalid format"){
			$scope.sendPDF($scope.Files);
			/*
        	var html = '<p id="alert">Invalid file format.</p>';
        	if ($( ".chat-box" ).has( "p" ).length < 1) {
				$(html).hide().prependTo(".chat-box").fadeIn(1500);
				$('#alert').delay(1000).fadeOut('slow', function(){
					$('#alert').remove();
				});
			}
			*/
        }    
    });

    // function for checking file type
    $scope.catchFile = function (files){
    	if (files && files.length) {
        	$scope.isFileSelected = true;
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (file.type == "application/pdf" || file.type == "application/msword" || file.type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.type == "text/plain" || file.type == "application/vnd.ms-excel") {
					return "document";
				}else if(file.type == "audio/mp3" || file.type == "audio/mpeg"){
					return "music";
				}else{
					var filetype = file.type.substring(0,file.type.indexOf('/'));
					if (filetype == "image") {
						return "image";
					}else{
						return "invalid format";
					}
				}

            }
        }
    }

})
