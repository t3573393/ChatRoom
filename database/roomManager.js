/**
 * @fileoverview 房间管理模块
 * @module database/roomManager
 * @description 提供房间状态管理、用户踢出、禁言、敏感词过滤功能
 */

var roomStates = {};
var fs = require('fs');
var path = require('path');
var logger = require('../utils/logger');

var sensitiveWords = [];
var sensitiveWordsConfigPath = path.join(__dirname, '../config/sensitive-words.json');
var db = null;

function loadSensitiveWords() {
  try {
    var configPath = sensitiveWordsConfigPath;
    if (fs.existsSync(configPath)) {
      var configData = fs.readFileSync(configPath, 'utf8');
      var config = JSON.parse(configData);
      sensitiveWords = config.sensitiveWords || [];
      console.log('敏感词加载成功，共 ' + sensitiveWords.length + ' 个敏感词');
    } else {
      console.warn('敏感词配置文件不存在: ' + configPath);
      sensitiveWords = [];
    }
  } catch (err) {
    console.error('加载敏感词配置失败:', err.message);
    sensitiveWords = [];
  }
}

function loadRoomStatesFromDb() {
  if (!db) return;
  try {
    db.getAllRoomStates().then(function(states) {
      states.forEach(function(state) {
        roomStates[state.room_code] = {
          creator: state.creator,
          mutes: state.mutes,
          members: state.members
        };
      });
      logger.info('RoomManager', '从数据库加载了 ' + states.length + ' 个房间状态');
    }).catch(function(err) {
      console.error('加载房间状态失败:', err.message);
    });
  } catch (err) {
    console.error('加载房间状态失败:', err.message);
  }
}

function persistRoomState(roomCode) {
  if (!db || !roomStates[roomCode]) return;
  try {
    db.saveRoomState(
      roomCode,
      roomStates[roomCode].creator,
      roomStates[roomCode].members,
      roomStates[roomCode].mutes
    );
  } catch (err) {
    console.error('持久化房间状态失败:', err.message);
  }
}

function init(database) {
  db = database;
  loadSensitiveWords();
  loadRoomStatesFromDb();
  logger.info('RoomManager', '房间管理模块初始化完成');
}

loadSensitiveWords();

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
    persistRoomState(roomCode);
    return true;
  } else {
    if (!roomStates[roomCode].members.includes(username)) {
      roomStates[roomCode].members.push(username);
      persistRoomState(roomCode);
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
      persistRoomState(roomCode);
    }
  }
}

function kickUser(roomCode, targetUsername) {
  if (!roomStates[roomCode]) return false;

  removeRoomMember(roomCode, targetUsername);

  var muteIdx = roomStates[roomCode].mutes.indexOf(targetUsername);
  if (muteIdx !== -1) {
    roomStates[roomCode].mutes.splice(muteIdx, 1);
    persistRoomState(roomCode);
  }

  return true;
}

function muteUser(roomCode, targetUsername) {
  if (!roomStates[roomCode]) return false;

  if (!roomStates[roomCode].mutes.includes(targetUsername)) {
    roomStates[roomCode].mutes.push(targetUsername);
    persistRoomState(roomCode);
  }

  return true;
}

function unmuteUser(roomCode, targetUsername) {
  if (!roomStates[roomCode]) return false;

  var idx = roomStates[roomCode].mutes.indexOf(targetUsername);
  if (idx !== -1) {
    roomStates[roomCode].mutes.splice(idx, 1);
    persistRoomState(roomCode);
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
  init: init,
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
