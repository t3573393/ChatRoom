/**
 * @fileoverview 用户管理模块
 * @module database/userManager
 * @description 管理在线用户状态，替代全局变量
 */

var logger = require('../utils/logger');

var onlineUsers = new Map();

function buildMemberInfo(socketData) {
    return {
        username: socketData.username,
        userAvatar: socketData.userAvatar,
        roomCode: socketData.roomCode,
        isWritting: socketData.isWritting || false,
        activo: socketData.activo !== false
    };
}

function addUser(socket) {
    onlineUsers.set(socket.username, socket);
    logger.info('UserManager', '用户 ' + socket.username + ' 已上线');
}

function removeUser(username) {
    var socket = onlineUsers.get(username);
    if (socket) {
        onlineUsers.delete(username);
        logger.info('UserManager', '用户 ' + username + ' 已离线');
        return socket;
    }
    return null;
}

function getUser(username) {
    return onlineUsers.get(username);
}

function getUsersByRoom(roomCode) {
    var users = [];
    onlineUsers.forEach(function(socket) {
        if (socket.roomCode === roomCode) {
            users.push(buildMemberInfo(socket));
        }
    });
    return users;
}

function getAllUsers() {
    var users = [];
    onlineUsers.forEach(function(socket) {
        users.push(buildMemberInfo(socket));
    });
    return users;
}

function updateUserStatus(username, statusType, value) {
    var socket = onlineUsers.get(username);
    if (socket) {
        socket[statusType] = value;
        return true;
    }
    return false;
}

function isUserOnline(username) {
    return onlineUsers.has(username);
}

function getOnlineCount() {
    return onlineUsers.size;
}

function clear() {
    onlineUsers.clear();
}

module.exports = {
    addUser: addUser,
    removeUser: removeUser,
    getUser: getUser,
    getUsersByRoom: getUsersByRoom,
    getAllUsers: getAllUsers,
    updateUserStatus: updateUserStatus,
    isUserOnline: isUserOnline,
    getOnlineCount: getOnlineCount,
    clear: clear,
    buildMemberInfo: buildMemberInfo
};
