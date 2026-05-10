/**
 * @fileoverview 房间管理模块
 * @module database/roomManager
 * @description 提供房间状态管理、用户踢出、禁言、敏感词过滤功能
 */

var roomStates = {};

/**
 * 敏感词列表
 * @type {Array}
 */
var sensitiveWords = [
  '敏感词1',
  '敏感词2',
  '广告',
  '垃圾',
  '测试敏感词'
];

/**
 * 添加房间创建者
 * @param {string} roomCode - 房间代码
 * @param {string} username - 用户名
 * @returns {boolean} 是否是新房间的创建者
 */
function addRoomCreator(roomCode, username) {
  if (!roomStates[roomCode]) {
    roomStates[roomCode] = {
      creator: username,
      mutes: [],
      members: [username]
    };
    return true;
  } else {
    if (!roomStates[roomCode].members.includes(username)) {
      roomStates[roomCode].members.push(username);
    }
    return false;
  }
}

/**
 * 判断是否是房间创建者
 * @param {string} roomCode - 房间代码
 * @param {string} username - 用户名
 * @returns {boolean}
 */
function isRoomCreator(roomCode, username) {
  return roomStates[roomCode] && 
         roomStates[roomCode].creator === username;
}

function getRoomMembers(roomCode) {
  return roomStates[roomCode] ? roomStates[roomCode].members : [];
}

function removeRoomMember(roomCode, username) {
  if (roomStates[roomCode]) {
    var idx = roomStates[roomCode].members.indexOf(username);
    if (idx !== -1) {
      roomStates[roomCode].members.splice(idx, 1);
    }
  }
}

function kickUser(roomCode, targetUsername) {
  if (!roomStates[roomCode]) return false;
  
  removeRoomMember(roomCode, targetUsername);
  
  var muteIdx = roomStates[roomCode].mutes.indexOf(targetUsername);
  if (muteIdx !== -1) {
    roomStates[roomCode].mutes.splice(muteIdx, 1);
  }
  
  return true;
}

function muteUser(roomCode, targetUsername) {
  if (!roomStates[roomCode]) return false;
  
  if (!roomStates[roomCode].mutes.includes(targetUsername)) {
    roomStates[roomCode].mutes.push(targetUsername);
  }
  
  return true;
}

function unmuteUser(roomCode, targetUsername) {
  if (!roomStates[roomCode]) return false;
  
  var idx = roomStates[roomCode].mutes.indexOf(targetUsername);
  if (idx !== -1) {
    roomStates[roomCode].mutes.splice(idx, 1);
  }
  
  return true;
}

function isMuted(roomCode, username) {
  return roomStates[roomCode] && 
         roomStates[roomCode].mutes.includes(username);
}

function containsSensitiveWords(text) {
  if (!text) return false;
  
  for (var i = 0; i < sensitiveWords.length; i++) {
    if (text.toLowerCase().indexOf(sensitiveWords[i].toLowerCase()) !== -1) {
      return true;
    }
  }
  
  return false;
}

function filterSensitiveWords(text) {
  return {
    contains: containsSensitiveWords(text),
    original: text
  };
}

function addSensitiveWord(word) {
  if (!sensitiveWords.includes(word)) {
    sensitiveWords.push(word);
  }
}

function getSensitiveWords() {
  return sensitiveWords.slice();
}

module.exports = {
  addRoomCreator: addRoomCreator,
  isRoomCreator: isRoomCreator,
  getRoomMembers: getRoomMembers,
  removeRoomMember: removeRoomMember,
  kickUser: kickUser,
  muteUser: muteUser,
  unmuteUser: unmuteUser,
  isMuted: isMuted,
  filterSensitiveWords: filterSensitiveWords,
  containsSensitiveWords: containsSensitiveWords,
  addSensitiveWord: addSensitiveWord,
  getSensitiveWords: getSensitiveWords
};
