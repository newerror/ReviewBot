# ReviewBot
A Discord bot made with DiscordJS and NodeJS. Tracks scores and leaderboards for a fantasy food-review league.

## Note
This is still a rough build. While this bot works as described the code is still pretty messy. In the next commit I'll clean up some of the redundant code (example: multiple module.exports), refactor a bit, rename some functions/arguments for clarity, and split the code up into multiple files so it's easier to digest.

**Important:** the settings.json file is omitted from this repository because that's where the Discord API token is kept. You can either create your own settings.json file to store your token, or just include it in the bot.js file wherever `settings.token` is used.
