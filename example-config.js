/*
 * Example config file for the playsound bot
 * fill it and rename it to config.js to use
 * 
 * To find the twitch ID you need for the prodch setting you can
 * - copy it from a Chatterino "user card"
 * - go to https://customapi.aidenwallis.co.uk/api/v1/twitch/toID/yourname and get it from there
 * Obviously, replace yourname in the link to your channels name :)
 */ 
"use strict"; 
exports.kbconfig = {
	username: "",								//bots twitch username
	oauth: "",									//oauth to log into twitch get it from https://twitchapps.com/tmi/ for example
	operator: "",								//bot operator
	ratelimit: "default",							//set it to verifiedBot if your bot is verified. Otherwise let it at default
	prefix: "[",									//command prefix, should be 1 char long. Other bots usually use ! so use something else Okayeg
	ps_prefix: "ps",								//keyword to be entered first to the pubsub text field before the playsounds name
	dbname: `${process.cwd()}/kirabot.sqlite`,		//database file name.
	pspath: `${process.cwd()}/ps/`,					//path to playsound wav files with ending slash
	devch: "",									//optional channel to join where you can spam commands
	prodch: {name: "", twid: 0},				//channel namd and twitch it for the channel where the bot will run
	loglvl: 3,									//0: no logging, 1: WARN, 2: INFO, 3: DBG
	failedCmdCD: 5,									//when a command is failed this cooldown is applied rather than the command's
	channelcd: 3,									//global channel cd to be uphelp between any two command invocations
	noPermCmdCD: 30,								//forced break if a user tries to run a command they are not allowed to
	categories: {	a: "",						//title of the channelpoint option associated with categories
					b: "",
					c: ""}
}
