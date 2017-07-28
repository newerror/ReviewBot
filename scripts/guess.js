const { scoreboard } = require("./game");

function generateRandomGuess() {
  let guess = Math.floor(Math.random() * 10) + 1;
  if(checkDuplicateGuess(guess)) {
    console.log(`${guess} is a duplicate. Rolling again...`);
    return generateRandomGuess();
  } else {
    return guess;
  }
}

function checkDuplicateGuess(num) {
  for(let [user, guess] of scoreboard) {
    if(num === guess) {
      return true;
    }
  }
  return false;
}

function postGuess(guess, msg) {
  if(typeof guess === "number" && guess <= 10 && guess >= 0) {
    if(!checkDuplicateGuess(guess)) {
      scoreboard.set(msg.author.id, guess);
      return `${msg.author.username} guesses ${guess}`;
    } else {
      return `Sorry, ${msg.author.username}, you can't make duplicate guesses.`;
    }
  } else {
    return msg.channel.send(`Sorry, ${msg.author.username}, but your guess must be a number between 0 and 10`);
  }
}

// NOTE: USE MODULE SYNTAX. NodeJS doesn't like import/export, currently.
module.exports.generateRandomGuess = generateRandomGuess;
module.exports.checkDuplicateGuess = checkDuplicateGuess;
module.exports.postGuess = postGuess;
