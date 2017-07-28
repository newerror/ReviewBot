const PersistentCollection = require('djs-collection-persistent');
const Leaderboards = new PersistentCollection({name: "leaderboards"});

const scoreboard = new Map();
let gameOn = false;

function difference(a, b) {
  return Math.abs(a - b);
}

function calculatePoints(officialScore, winners) {
  let gamePoints = new Map();

  scoreboard.forEach((guess, playerId) => {
    let p = 0;
    console.log(`guess = ${guess}; official score = ${officialScore};`);
    let diff = difference(guess, officialScore);

    if(diff <= 0.5) {
      console.log(`<= 0.5`);
      p += 3;
    } else if(diff <= 1) {
      console.log(`<= 1`);
      p += 2;
    } else if(diff <= 2) {
      console.log(`<= 0.5`);
      p += 1
    } else if(diff > 2) {
      console.log(`> 2`);
    }

    if(winners.includes(playerId)){
      if(winners.length === 2) {
        console.log(`2 winners`);
        p += 1.5;
      } else {
        console.log(`1 winner`);
        p += 3;
      }
    }
    gamePoints.set(playerId, p);
  });

  gamePoints.forEach((score, playerId) => {
    console.log(`gamePoints: ${playerId} = ${score}`);
  });

  return gamePoints;
}

function resolveGame(score) {
  let bestGuess = 1000;
  let tiebreaker = 1000;
  let firstWinnerId = undefined;
  let secondWinnerId = undefined;
  for(let [userId, guess] of scoreboard) {
    let diff = difference(guess, score);
    let bestDiff = difference(bestGuess, score);
    if(diff === bestDiff) {
      tiebreaker = guess;
      secondWinnerId = userId;
    }
    if(diff < bestDiff) {
      bestGuess = guess;
      firstWinnerId = userId;
    }
  }
  if(difference(tiebreaker, score) === difference(bestGuess, score)) {
    let winners = [firstWinnerId, secondWinnerId];
    return winners;
  } else {
    let winners = [firstWinnerId];
    return winners;
  }
}

// ===L E A D E R B O A R D S===
function showGuildLeaderboard(guildId) {
  let leaderboard = Leaderboards.get(guildId);
  if(leaderboard) {
    return leaderboard;
  } else {
    return undefined;
  }
}

function showUserRank(guildId, playerId) {
  let leaderboard = Leaderboards.get(guildId);
  if(leaderboard) {
    if(leaderboard.hasOwnProperty(playerId)) {
      return leaderboard[playerId];
    } else {
      return "no player";
    }
  } else {
    return "no leaderboard";
  }
}

function updateUserRank(guildId, playerId, points) {
  let leaderboard = Leaderboards.get(guildId);
  if(leaderboard) {
    if(leaderboard.hasOwnProperty(playerId)) {
      leaderboard[playerId] += points;
    } else {
      leaderboard[playerId] = points;
    }
  } else {
    leaderboard = {};
    leaderboard[playerId] = points;
  }
  Leaderboards.set(guildId, leaderboard);
}

function resetLeaderboard(guildId) {
  return Leaderboards.delete(guildId);
}

// NOTE: USE MODULE SYNTAX. NodeJS doesn't like import/export, currently.
module.exports.scoreboard = scoreboard;
module.exports.calculatePoints = calculatePoints;
module.exports.leaderboards = Leaderboards;
module.exports.gameOn = gameOn; // this is imported separately in bot.js because it can't be a const
module.exports.resolveGame = resolveGame;
module.exports.showGuildLeaderboard = showGuildLeaderboard;
module.exports.showUserRank = showUserRank;
module.exports.updateUserRank = updateUserRank;
module.exports.resetLeaderboard = resetLeaderboard;
