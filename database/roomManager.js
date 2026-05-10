var roomStates = {};

var sensitiveWords = [
  '敏感词1',
  '敏感词2',
  '广告',
  '垃圾',
  '测试敏感词'
];

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
