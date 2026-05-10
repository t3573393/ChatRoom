var express = require('express');			// express module
var app = express();						// initiating express app
var http = require('http');					// http module
http.globalAgent.maxSockets = 100;			// limiting socket connections to 100
var bodyParser = require('body-parser');	// body-parser module for reading request body
var fs = require('fs');						// fs module for handling file operations
var server = http.createServer(app);		// creating server
var io = require('socket.io');				// using sockets
var ios = io.listen(server);				// listening sockets
var formidable = require('formidable');		// file upload module
var util = require('util');

var path = require('path');

// 数据库模块
var db = require('./database/db');
// 房间管理模块
var roomManager = require('./database/roomManager');


// Initializing Variables
var nickname = [];
var i = [];
var x = [];
var online_member = [];
var temp1;
var socket_id;
var socket_data;
var files_array  = [];
var expiryTime = 8;
var routineTime = 1;

server.listen(8282);		// server starting on port '8282'

// 初始化数据库
db.initDatabase().then(() => {
    console.log('数据库初始化成功');
}).catch(err => {
    console.error('数据库初始化失败:', err);
});

// 设置定时清理任务（每小时清理一次）
setInterval(function() {
    db.cleanupExpiredMessages().then(count => {
        if (count > 0) {
            console.log(`定时清理完成，删除了 ${count} 条过期消息`);
        }
    });
}, 3600000); // 每小时执行

// cofiguring body-parser
app.use(bodyParser.json({	// setting json limit 	
    limit: 1024 * 10000
}));
app.use(bodyParser.text({ 	// setting text limit
    limit: 1024 * 10000
}));
app.use(bodyParser.raw({ 	// setting raw limit
    limit: 1024 * 10000
}));
app.use(bodyParser.urlencoded({		// setting url encoding
        extended: true
}));
//static file configuration
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/public/app/upload/images'));
app.use(express.static(__dirname + '/public/app/upload/music'));
app.use(express.static(__dirname + '/public/app/upload/doc'));

var url_server = "http://10.44.43.174:8282";

// CORS Issue Fix
app.use(function(req, res, next) {														
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//sockets handling
ios.on('connection', function(socket){	

	// creating new user if nickname doesn't exists
	socket.on('new user', function(data, callback){
		if(nickname[data.username])
			{
				callback({success:false});
			}else{
				callback({success:true});
				socket.username = data.username;
				socket.userAvatar = data.userAvatar;
				socket.roomCode = data.roomCode;
				socket.isWritting = false;
				socket.activo = true;
				nickname[data.username] = socket;
				
				var isCreator = roomManager.addRoomCreator(data.roomCode, data.username);
				socket.isRoomCreator = isCreator;
			}
	});

	socket.on('kick-user', function(data, callback) {
		if (!socket.username || !socket.roomCode) {
			callback({success: false, message: '参数错误'});
			return;
		}
		
		if (!roomManager.isRoomCreator(socket.roomCode, socket.username)) {
			callback({success: false, message: '您没有权限执行此操作'});
			return;
		}
		
		if (data.targetUsername == socket.username) {
			callback({success: false, message: '不能踢出自己'});
			return;
		}
		
		var success = roomManager.kickUser(socket.roomCode, data.targetUsername);
		
		if (success) {
			if (nickname[data.targetUsername]) {
				var targetSocket = nickname[data.targetUsername];
				
				targetSocket.emit('you-have-been-kicked', {
					roomCode: socket.roomCode,
					message: '您已被管理员踢出房间'
				});
				
				targetSocket.disconnect(true);
				
				delete nickname[data.targetUsername];
			}
			
			ios.sockets.in(socket.roomCode).emit('user-kicked', {
				kickedUsername: data.targetUsername,
				operator: socket.username
			});
			
			callback({success: true});
		} else {
			callback({success: false, message: '操作失败'});
		}
	});

	socket.on('mute-user', function(data, callback) {
		if (!socket.username || !socket.roomCode) {
			callback({success: false, message: '参数错误'});
			return;
		}
		
		if (!roomManager.isRoomCreator(socket.roomCode, socket.username)) {
			callback({success: false, message: '您没有权限执行此操作'});
			return;
		}
		
		if (data.targetUsername == socket.username) {
			callback({success: false, message: '不能禁言自己'});
			return;
		}
		
		var success = roomManager.muteUser(socket.roomCode, data.targetUsername);
		
		if (success) {
			ios.sockets.in(socket.roomCode).emit('user-muted', {
				mutedUsername: data.targetUsername,
				operator: socket.username
			});
			
			callback({success: true});
		} else {
			callback({success: false, message: '操作失败'});
		}
	});

	socket.on('unmute-user', function(data, callback) {
		if (!socket.username || !socket.roomCode) {
			callback({success: false, message: '参数错误'});
			return;
		}
		
		if (!roomManager.isRoomCreator(socket.roomCode, socket.username)) {
			callback({success: false, message: '您没有权限执行此操作'});
			return;
		}
		
		var success = roomManager.unmuteUser(socket.roomCode, data.targetUsername);
		
		if (success) {
			ios.sockets.in(socket.roomCode).emit('user-unmuted', {
				unmutedUsername: data.targetUsername,
				operator: socket.username
			});
			
			callback({success: true});
		} else {
			callback({success: false, message: '操作失败'});
		}
	});

	socket.on('user-activo', function(data, callback){
		//console.log("escribiendo:"+data);
		if(!nickname[data.username])
			{
				callback({success:false});
			}else{
				var online_member = [];
				callback({success:true});
				i = Object.keys(nickname);
				for(var j=0;j<i.length;j++ )
				{
					socket_id = i[j];
					socket_data = nickname[socket_id];
					if(data.username == socket_data.username)
						socket_data.activo = true;
					temp1 = {"username": socket_data.username, "userAvatar":socket_data.userAvatar, "roomCode":socket_data.roomCode, "isWritting": socket_data.isWritting, "activo": socket_data.activo};
					online_member.push(temp1);
				}
				ios.sockets.emit('online-members', online_member);
			}
	});

	socket.on('user-inactivo', function(data, callback){
		//console.log("escribiendo:"+data);
		if(!nickname[data.username])
			{
				callback({success:false});
			}else{
				var online_member = [];
				callback({success:true});
				i = Object.keys(nickname);
				for(var j=0;j<i.length;j++ )
				{
					socket_id = i[j];
					socket_data = nickname[socket_id];
					if(data.username == socket_data.username)
						socket_data.activo = false;
					temp1 = {"username": socket_data.username, "userAvatar":socket_data.userAvatar, "roomCode":socket_data.roomCode, "isWritting": socket_data.isWritting, "activo": socket_data.activo};
					online_member.push(temp1);
				}
				ios.sockets.emit('online-members', online_member);
			}
	});

	socket.on('user-writting', function(data, callback){
		//console.log("escribiendo:"+data);
		if(!nickname[data.username])
			{
				callback({success:false});
			}else{
				var online_member = [];
				callback({success:true});
				i = Object.keys(nickname);
				for(var j=0;j<i.length;j++ )
				{
					socket_id = i[j];
					socket_data = nickname[socket_id];
					if(data.username == socket_data.username)
						socket_data.isWritting = true;
					temp1 = {"username": socket_data.username, "userAvatar":socket_data.userAvatar, "roomCode":socket_data.roomCode, "isWritting": socket_data.isWritting, "activo": socket_data.activo};
					online_member.push(temp1);
				}
				ios.sockets.emit('online-members', online_member);
			}
	});


	socket.on('user-stop-writting', function(data, callback){
		//console.log("no escribiendo:"+data);
		if(!nickname[data.username])
			{
				callback({success:false});
			}else{
				var online_member = [];
				callback({success:true});
				i = Object.keys(nickname);
				for(var j=0;j<i.length;j++ )
				{
					socket_id = i[j];
					socket_data = nickname[socket_id];
					if(data.username == socket_data.username)
						socket_data.isWritting = false;
					temp1 = {"username": socket_data.username, "userAvatar":socket_data.userAvatar, "roomCode":socket_data.roomCode, "isWritting": socket_data.isWritting, "activo": socket_data.activo};
					online_member.push(temp1);
				}
				ios.sockets.emit('online-members', online_member);
			}
	});

	// sending online members list
	socket.on('get-online-members', function(data){
		var online_member = [];
		i = Object.keys(nickname);
		for(var j=0;j<i.length;j++ )
		{
			socket_id = i[j];
			socket_data = nickname[socket_id];
			temp1 = {"username": socket_data.username, "userAvatar":socket_data.userAvatar, "roomCode":socket_data.roomCode, "isWritting": socket_data.isWritting, "activo": socket_data.activo};
			online_member.push(temp1);
		}
		ios.sockets.emit('online-members', online_member);		
	});

	// sending new message
	socket.on('send-message', function(data, callback){
		if (!socket.username || !socket.roomCode) {
			callback({success: false, message: '参数错误'});
			return;
		}
		
		if (roomManager.isMuted(socket.roomCode, socket.username)) {
			callback({success: false, message: '您已被管理员禁言，无法发送消息'});
			return;
		}
		
		var filterResult = roomManager.filterSensitiveWords(data.msg);
		if (filterResult.contains) {
			callback({success: false, message: '消息包含敏感词，请修改后重试'});
			return;
		}
		
		if (nickname[data.username]) {
			if(data.hasMsg){
				console.log(data.username+"["+data.roomCode+"]: "+ data.msg);
				ios.sockets.emit('new message', data);
				callback({success:true});	
			}else if(data.hasFile){
				if(data.istype == "image"){
					socket.emit('new message image', data);
					callback({success:true});
				} else if(data.istype == "music"){
					socket.emit('new message music', data);
					callback({success:true});
				} else if(data.istype == "PDF"){
					socket.emit('new message PDF', data);
					callback({success:true});
				}
			}else{
				callback({ success:false});
			}
		}		
	});
	socket.on('remove-meme', function(data, callback){
		if (nickname[data.username]) {
				ios.sockets.emit('remove meme', data);
				callback({success:true});
		}		
	});
	socket.on('send-meme', function(data, callback){
		if (nickname[data.username]) {
				ios.sockets.emit('new meme', data);
				callback({success:true});
		}		
	});
	
	// disconnect user handling 
	socket.on('disconnect', function () {	
		if (socket.username && socket.roomCode) {
			roomManager.removeRoomMember(socket.roomCode, socket.username);
		}
		delete nickname[socket.username];
		online_member = [];
		x = Object.keys(nickname);
		for(var k=0;k<x.length;k++ )
    	{
        	socket_id = x[k];
        	socket_data = nickname[socket_id];
        	temp1 = {"username": socket_data.username, "userAvatar":socket_data.userAvatar, "roomCode":socket_data.roomCode};
            online_member.push(temp1);
    	}
		ios.sockets.emit('online-members', online_member);            	
   	});
});

// route for uploading images asynchronously
app.post('/v1/uploadImage',function (req, res){
	var imgdatetimenow = Date.now();
	var form = new formidable.IncomingForm({
      	uploadDir: __dirname + '/public/app/upload/images',
      	keepExtensions: true
      });

	form.on('end', function() {
      res.end();
    });
    
    form.parse(req,function(err,fields,files){
		var data = { 
				username : fields.username, 
				userAvatar : fields.userAvatar, 
				roomCode: fields.roomCode,
				repeatMsg : true, 
				hasFile : fields.hasFile, 
				isImageFile : fields.isImageFile, 
				istype : fields.istype, 
				showme : fields.showme, 
				dwimgsrc : fields.dwimgsrc, 
				dwid : fields.dwid,
				serverfilename : baseName(files.file.path), 
				msgTime : fields.msgTime,
				filename : files.file.name,
				size : bytesToSize(files.file.size)
		};
		data.serverfilename = url_server + '/' +path.parse(data.serverfilename).base;
		//console.log(data);
	    var image_file = { 
		        dwid : fields.dwid,
		        filename : files.file.name,
				roomCode: fields.roomCode,
		        filetype : fields.istype,
		        serverfilename : baseName(files.file.path),
		        serverfilepath : files.file.path,
		        expirytime : imgdatetimenow + (3600000 * expiryTime)           
	    };
	    files_array.push(image_file);
		ios.sockets.emit('new message image', data);
    });
});

// route for uploading audio asynchronously
app.post('/v1/uploadAudio',function (req, res){
	var userName, useravatar, hasfile, ismusicfile, isType, showMe, DWimgsrc, DWid, msgtime;
	var imgdatetimenow = Date.now();
	var form = new formidable.IncomingForm({
      	uploadDir: __dirname + '/public/app/upload/music',
      	keepExtensions: true
      });


	form.on('end', function() {
      res.end();
    });
    form.parse(req,function(err,fields,files){
		console.log("files : ",files);
		console.log("fields : ", fields);
		var data = { 
				username : fields.username, 
				userAvatar : fields.userAvatar, 
				roomCode: fields.roomCode,
				repeatMsg : true, 
				hasFile : fields.hasFile, 
				isMusicFile : fields.isMusicFile, 
				istype : fields.istype, 
				showme : fields.showme, 
				dwimgsrc : fields.dwimgsrc, 
				dwid : fields.dwid,
				serverfilename : baseName(files.file.path), 
				msgTime : fields.msgTime,
				filename : files.file.name,
				size : bytesToSize(files.file.size)
		};
		data.serverfilename = url_server + '/' +path.parse(data.serverfilename).base;
	    var audio_file = { 
		        dwid : fields.dwid,
		        filename : files.file.name,
				roomCode: fields.roomCode,
		        filetype : fields.istype,
		        serverfilename : baseName(files.file.path),
		        serverfilepath : files.file.path,
		        expirytime : imgdatetimenow + (3600000 * expiryTime)           
	    };
	    files_array.push(audio_file);
		ios.sockets.emit('new message music', data);
    });
});

// route for uploading document asynchronously
app.post('/v1/uploadPDF',function (req, res){
	var imgdatetimenow = Date.now();
	
	var form = new formidable.IncomingForm({
      	uploadDir: __dirname + '/public/app/upload/doc',
      	keepExtensions: true
      });

	form.on('end', function() {
      res.end();
    });
    form.parse(req,function(err,fields,files){
		var data = { 
				username : fields.username, 
				userAvatar : fields.userAvatar, 
				roomCode: fields.roomCode,
				repeatMsg : true, 
				hasFile : fields.hasFile, 
				isPDFFile : fields.isPDFFile, 
				istype : fields.istype, 
				showme : fields.showme, 
				dwimgsrc : fields.dwimgsrc, 
				dwid : fields.dwid,
				serverfilename : baseName(files.file.path), 
				msgTime : fields.msgTime,
				filename : files.file.name,
				size : bytesToSize(files.file.size)
		};
		data.serverfilename = url_server + '/' +path.parse(data.serverfilename).base;
	    var pdf_file = { 
		        dwid : fields.dwid,
		        filename : files.file.name,
				roomCode: fields.roomCode,
		        filetype : fields.istype,
		        serverfilename : baseName(files.file.path),
		        serverfilepath : files.file.path,
		        expirytime : imgdatetimenow + (3600000 * expiryTime)           
	    };
	    files_array.push(pdf_file);
		ios.sockets.emit('new message PDF', data);
    });
});

// route for checking requested file , does exist on server or not
app.post('/v1/getfile', function(req, res){
    var data = req.body.dwid;
    var filenm = req.body.filename;
    var dwidexist = false;
    var req_file_data;
    
    for(var i = 0; i<files_array.length; i++)
    {
        if(files_array[i].dwid == data && files_array[i].roomCode == req.body.roomCode)
        {
            dwidexist = true;
            req_file_data = files_array[i];
        }
    }

    // CASE 1 : File Exists
    if(dwidexist == true)
    {
    	//CASE 2 : File Expired and Deleted
        if(req_file_data.expirytime < Date.now())
        {
	        var deletedfileinfo = { 
                isExpired : true,
	            expmsg : "File has beed removed."
	        	};
	            fs.unlink(req_file_data.serverfilepath, function(err){
	               	if (err) {
	                   	return console.error(err);
	                }
	    				res.send(deletedfileinfo);           
	            });
               var index = files_array.indexOf(req_file_data);
               files_array.splice(index,1);           
        }else{
        	// CASE 3 : File Exist and returned serverfilename in response
            var fileinfo = {
            	isExpired : false, 
            	filename : req_file_data.filename,            
            	serverfilename : req_file_data.serverfilename };
            res.send(fileinfo);
        }
    }else{  
    		// CASE 4 : File Doesn't Exists.       
	    	var deletedfileinfo = { 
	                isExpired : true,
	                expmsg : "File has beed removed."
	        };
	        res.send(deletedfileinfo);       
        }
});

// Routine Clean up call
setInterval(function() {routine_cleanup();}, (3600000 * routineTime));

// Size Conversion
function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return 'n/a';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    if (i == 0) return bytes + ' ' + sizes[i]; 
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};
//get file name from server file path
function baseName(str)
{
   var base = new String(str).substring(str.lastIndexOf('/') + 1);     
   return base;
}

// Routine cleanup function (files delete after specific interval)
function routine_cleanup()
{
    for(var i=0; i<files_array.length; i++)
    {
            if(Date.now() > files_array[i].expirytime)
            {
                fs.unlink(files_array[i].serverfilepath, function(err) 
                          {
                   if (err) {
                       return console.error(err);
                            }
                            });
                   files_array.splice(i,1);
            }
    }
};

// ===================================== 消息持久化 API ===============================
// 保存消息 API
app.post('/v1/messages', function(req, res) {
    var body = req.body;
    
    // 验证必需参数
    if (!body.roomCode || !body.username || !body.messageType) {
        res.status(400).json({ 
            success: false, 
            error: 'Missing required parameters' 
        });
        return;
    }

    // 保存到数据库
    db.saveMessage(
        body.roomCode,
        body.username,
        body.userAvatar || '',
        body.messageType,
        body.messageContent || '',
        body.fileInfo || null
    ).then(messageId => {
        res.json({ 
            success: true, 
            messageId: messageId 
        });
    }).catch(err => {
        console.error('保存消息失败:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Database error' 
        });
    });
});

// 获取历史消息 API
app.get('/v1/messages/:roomCode', function(req, res) {
    var roomCode = req.params.roomCode;
    var pageSize = parseInt(req.query.pageSize) || 20;
    var beforeId = req.query.beforeId ? parseInt(req.query.beforeId) : null;
    var page = parseInt(req.query.page) || 1;

    // 限制每页最大条数
    pageSize = Math.min(pageSize, 50);

    // 获取消息
    db.getMessages(roomCode, pageSize, beforeId)
        .then(result => {
            // 获取总数
            return db.getMessageCount(roomCode).then(total => {
                return {
                    ...result,
                    total: total
                };
            });
        })
        .then(result => {
            // 转换数据库字段为前端格式
            var messages = result.messages.map(msg => ({
                id: msg.id,
                roomCode: msg.room_code,
                username: msg.username,
                userAvatar: msg.user_avatar,
                messageType: msg.message_type,
                messageContent: msg.message_content,
                fileInfo: msg.file_info ? JSON.parse(msg.file_info) : null,
                createdAt: msg.created_at,
                msgTime: formatTime(new Date(msg.created_at))
            }));

            res.json({
                success: true,
                messages: messages,
                hasMore: result.hasMore,
                total: result.total
            });
        })
        .catch(err => {
            console.error('获取消息失败:', err);
            res.status(500).json({
                success: false,
                error: 'Database error'
            });
        });
});

// 格式化时间函数
function formatTime(date) {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return hours + ':' + minutes + ' ' + ampm;
}
