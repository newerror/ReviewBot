const Discord = require("discord.js");
const bot = new Discord.Client();
const PersistentCollection = require('djs-collection-persistent');

const settings = require("./settings.json"); // NOTE: This file is omitted from the repository, so it will need to be created locally. It contains two values: "prefix", which stores the prefix to be used in commands, and the Discord API token.
const prefix = settings.prefix;
const defaultGameState = "Hardcore Denny's";
let gameName = defaultGameState;
let awaitResetCommand = false;
let resetCommandAuthor = "";

// Import commands, scripts, & data
const { generateRandomGuess, checkDuplicateGuess, postGuess } = require("./scripts/guess");
const { scoreboard, calculatePoints, leaderboards, resolveGame, showGuildLeaderboard, showUserRank, updateUserRank, resetLeaderboard } = require("./scripts/game");
let { gameOn } = require("./scripts/game"); // imported separately because it can't be reassigned as a const

// ===H E L P E R S===
function showScores() {
  let s = "G U E S S E S\n";
  if(scoreboard.size > 0) {
    for(let [userId, guess] of scoreboard) {
      s += `${bot.users.get(userId).username} guessed ${guess}.\n`;
    }
    return s;
  } else {
    return "No guesses recorded... yet.";
  }
}

bot.login(settings.token);

bot.on("ready", () => {
  console.log(`Logged in as ${bot.user.tag}`);
  for(let guild of bot.guilds) {
    console.log(`Guild ${guild}`);
  }
  bot.user.setGame(defaultGameState);

  // NOTE: THIS GENERATES SERVER INV FOR THE BOT
  // bot.generateInvite(["ADD_REACTIONS", "READ_MESSAGES", "SEND_MESSAGES", "MENTION_EVERYONE", "EMBED_LINKS"])
  //   .then(link => {
  //     console.log(`Generated bot invite link: ${link}`);
  //   }).catch(err => {
  //     console.log(err.stack);
  //   });
});

bot.on("message", async (msg) => {
  // ===Q U A L I T Y - C H E C K===
  // ignore message if it doesn't start with the correct prefix OR it was sent by a bot OR it was sent in a DM
  if(!msg.content.startsWith(prefix) || msg.author.bot || msg.channel.type === "dm") return;

  let command = msg.content.split(" ");
  let commandName = command[0].toLowerCase();
  let commandArgs = command.slice(1); // NOTE: TYPEOF === STRING

  if(commandName === `${prefix}start`) {
    gameName = commandArgs.join(" ");
    bot.user.setGame(gameName);
    console.log(`${gameName} started`);
    if(gameOn) {
      return msg.channel.send(`Game is already started. Type ~end to end game without scoring.`);
    } else {
      gameOn = true;
      return msg.channel.send(
        `Hello everyone, this is Running On Empty... *fooooooooooood review!* Today I'm reviewing **${gameName}**.\n\n\`~guess [number]\` to record your guess.\n\`~end [officialScore]\` to score the game.\n\`~cancel\` to cancel the game.\n\`~help\` for a list of available commands.`
      );
    }
  }

  if(commandName === `${prefix}cancel`) {
    if(gameOn) {
      gameOn = false;
      bot.user.setGame(defaultGameState);
      gameName = defaultGameState;
      return msg.channel.send(`Game canceled. No scores were recorded.`);
    }
    if(!gameOn) {
      return msg.channel.send(`No game running.`);
    }
  }

  if(commandName === `${prefix}help`) {
    return msg.channel.send(
      "+++ C O M M A N D + M E + S E N P A I +++\r~start [name of the game] to start a game.\r~guess [any number from 0-10] to record your guess.\r~cancel to end the game without recording any scores.\r~end [Reviewbrah's official score] to record scores and hand out points.\r~guesses to show the guesses that have been recorded so far.\r~leaderboard to see the leaderboards for this server.\r~rank to show just your own score.\r~help to see this message again for some stupid reason.",
      {code: true}
    );
  }

  if(commandName === `${prefix}guess` && gameOn) {
    let guess = postGuess(Number(commandArgs[0]), msg);
    return msg.channel.send(guess);
  }

  if(commandName === `${prefix}guesses`) {
    return msg.channel.send(showScores());
  }

  if(commandName === `${prefix}end` && gameOn) { // TODO: move a bunch of this into the resolveGame function
    let officialScore = Number(commandArgs[0]);
    if(typeof officialScore === "number" && scoreboard.size > 0) {
      msg.channel.send(`REVIEWBRAH GAVE ${gameName} A **${officialScore}** / 10`);
      msg.channel.send(showScores(), {code: true});
      let gameWinners = resolveGame(officialScore);
      let playerPoints = calculatePoints(officialScore, gameWinners);
      let ppMsg = [];
      playerPoints.forEach((points, playerId) => {
        let playerName = bot.users.get(playerId).username;
        ppMsg.push(`${playerName} gets ${points} points.`);
      });
      ppMsg.join("\n");

      if(gameWinners.length === 2) { // handle tie
        let firstWinner = bot.users.get(gameWinners[0]);
        let secondWinner = bot.users.get(gameWinners[1]);
        let winningGuesses = [scoreboard.get(gameWinners[0]), scoreboard.get(gameWinners[1])];
        msg.channel.send(
          `TIE: ${firstWinner.username}(${winningGuess[0]}) and ${secondWinner.username}(${winningGuess[1]}) are equally close to ${officialScore}.\n${ppMsg}`
        );
      } else { // one winner
        let winner = bot.users.get(gameWinners[0]);
        let winningGuess = scoreboard.get(gameWinners[0]);
        if(winningGuess === officialScore) { // handle perfect guess
          msg.channel.send(`PERFECT! ${winner.username} wins!\n${ppMsg}`);
        } else {
          msg.channel.send(`WINNER: ${winner.username}(${winningGuess})\n${ppMsg}`);
        }
      }

      // Record points to leaderboard & compose a leaderboard message
      let leaderboardMsg = `L E A D E R B O A R D\n`;
      playerPoints.forEach((points, playerId) => {
        updateUserRank(msg.guild.id, playerId, points);

        let playerRank = showUserRank(msg.guild.id, playerId);
        let playerName = bot.users.get(playerId).username;

        leaderboardMsg += `${playerName} has ${playerRank} points.\n`
      });
      msg.channel.send(leaderboardMsg, {code: true});
      gameOn = false;
      bot.user.setGame(defaultGameState);
      msg.channel.send(`Game over, man.`);
    } else if(typeof officialScore !== "number") {
      return msg.channel.send(`Please include Reviewbrah's official score as a number.`);
    } else if(scoreboard.size === 0) {
      return msg.channel.send(`You need to record at least one guess before the game will record scores.`);
    }
  }

  // ===L E A D E R B O A R D S===
  if(commandName === `${prefix}rank`) {
    let rank = showUserRank(msg.guild.id, msg.author.id);
    if(typeof rank === "number") {
      msg.channel.send(`${msg.author.username} has ${rank} points.`);
    } else if(rank === "no player") {
      msg.channel.send(`No points recorded for ${msg.author.username}`);
    } else if(rank === "no leaderboard") {
      msg.channel.send(`This server has no leaderboard, yet.`);
    }
  }

  if(commandName === `${prefix}leaderboard`) {
    let leaderboard = showGuildLeaderboard(msg.guild.id);
    let leaderboardMsg = "";
    if(leaderboard) {
      for(let playerId in leaderboard) {
        let playerName = bot.users.get(playerId).username;
        leaderboardMsg += `${playerName} has ${leaderboard[playerId]} points.\n`;
      }
      msg.channel.send(leaderboardMsg);
    } else {
      msg.channel.send(`Sorry, your guild doesn't have a leaderboard yet.`)
    }
  }

  if(commandName === `${prefix}reset-leaderboard`) {
    if(gameOn) return msg.channel.send(`Can't reset leaderboards while a game is running.`);
    let guild = msg.guild;
    let member = guild.member(msg.author);
    if(!member.hasPermission("MANAGE_GUILD")) return msg.channel.send(`You don't have permission to do that.`);

    awaitResetCommand = true;
    resetCommandAuthor = member.id;
    msg.channel.send(`Are you sure you want to reset this server's ReviewBot leaderboard?\n~y or ~n`);
  }

  if(commandName === `${prefix}y` && awaitResetCommand && msg.author.id === resetCommandAuthor) {
    msg.channel.send(`Resetting ${msg.guild.name}'s ReviewBot leaderboard...`);
    resetCommandAuthor = "";
    awaitResetCommand = false;
    if(resetLeaderboard(msg.guild.id)) {
      msg.channel.send(`Leaderboard reset.`);
    } else {
      msg.channel.send(`Sorry, something went wrong...`);
    }
  }

  if(commandName === `${prefix}n` && awaitResetCommand && msg.author.id === resetCommandAuthor) {
    msg.channel.send(`Leaderboard reset canceled.`);
    resetCommandAuthor = "";
    awaitResetCommand = false;
  }

  // ===P I N G===
  if(commandName === `${prefix}hi` || commandName === `${prefix}hello`) {
    msg.channel.send(`Hello everyone, this is Running On Empty... *fooooooooooood ReviewBot!*`);
  }
});
