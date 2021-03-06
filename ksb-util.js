"use strict";

let antispam = [0, 0];
let aliases = [];
let cooldowns = [];
//cooldowns format: Array of {usr: "username", cmd: "command name", ptime: unixtime}
//NOTE: channel name is not tracked in cooldowns as only the prod channel is subject to CDs
const sqlite3 = require("better-sqlite3-with-prebuilds");
const user_levels = ["user", "trusted user", "broadcaster", "operator"];

function getUnixtime(){
	return Math.floor(new Date()/1000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getUserLevel(username){
	/* There are the following user levels:
	 * 3 - bot operator
	 * 2 - broadcaster of the production channel
	 * 1 - users marked as trusted by the broadcaster
	 * 0 - everyone else Okayeg
	 */
	if (username === ksb.c.operator) return 3;
	if (username === ksb.c.prodch.name ) return 2;
	let trdata = ksb.db.syncSelect(`SELECT * FROM trusted WHERE username='${username}';`);
	if (trdata.length>0) return 1;
		else return 0;
}

function grabCommands(){
	const cmd_dir = process.cwd()+'/commands-enabled';
	let filelist, retlist=[];
	try{
		filelist = ksb.fs.readdirSync(cmd_dir);
	}
	catch(err){
		throw(err);
	}
	filelist.forEach((infile) => {
		if(infile.substr(infile.length-3, infile.length-1)===".js")
			retlist.push(infile);
	});
	return retlist;
}

function loadCommands(){
	let cmdfiles = grabCommands();
	if (cmdfiles.length === 0){
		logger(0, `<loadcmd> Cannot find any commands to be loaded eShrug\n<loadcmd> While the bot will still work in channelpoint mode I suggest you enable a few commands.`);
		return;
	}
	logger(2, `<loadcmd> Loding ${cmdfiles.length} command(s)`);
	cmdfiles.forEach((infile) => {
		logger(2, `<loadcmd> -> ${infile}`);
		try{
			ksb.cmds.push(require("./commands-enabled/"+infile).kirabot_command);
		}
		catch(err){
			logger(1, `<loadcmd> Unable to load command from ${infile}: ${err}`);
		}
	});
	if(ksb.cmds.length>0){
		logger(1, `<loadcmd> Loaded ${ksb.cmds.length} command(s). Loading aliases`);
		ksb.cmds.forEach((incmd) => {
			if(incmd.aliases){
				incmd.aliases.forEach((inal) => { aliases.push({cmd: incmd.name, alias: inal}); });
			}
		});
		logger(2, `<loadcmd> Done loading aliases.`);
	} else {
		logger(1, `<loadcmd> Couldn't load any of the commands saj`);
	}
}

function getAlias(cmdname){
	let nam = aliases.find(drow => drow.alias === cmdname);
	if(!nam)
		return cmdname;
			else
		return nam.cmd;
}

function getPsAlias(sndname){
	if(!sndname || sndname.length===0) return "";
	if (sndname.indexOf(`'`) != -1) return "";
	let nam = ksb.db.syncSelect(`SELECT * FROM aliases WHERE alias='${sndname}';`);
	if (nam.length === 0) return sndname;
	return nam[0].target;
}

function getAS(channel){
	switch(channel){
		case(ksb.c.devch):
			if(antispam[0]===0){
				antispam[0]=1;
				return '';
			} else {
				antispam[0]=0;
				return ' \u{E0000}';
			}
			break;
		case(ksb.c.prodch.name):
			if(antispam[1]===0){
				antispam[1]=1;
				return '';
			} else {
				antispam[1]=0;
				return ' \u{E0000}';
			}
			break;
		default:
			ksb.util.logger(2, `<antiping> Interal error: specified channel ${channel} is not known.`);
			return '';
			break;
	}
}

function memusage(){
	return `${(process.memoryUsage().rss/1024/1024).toFixed(2)}MiB`;
}

function logger(loglvl, logtext){
	//todo: implement to file or to db logging here
	if(loglvl<=ksb.c.loglvl)
		console.log(logtext);
}

class DonkDB{
	constructor(dbFile){
		try{
			this.db = new sqlite3(dbFile);
		}
		catch(err){
				throw err;
		}
	}
	syncSelect(inQuery){
		let sQ = this.db.prepare(inQuery);
		let data = null;
		try{
			data = sQ.all();
		}
		catch (err){
			throw err;
		}
		return data;
	}
	syncInsert(inQuery){
		let sQ = this.db.prepare(inQuery);
		let data = null;
		try{
			data = sQ.run();
		}
		catch (err){
			throw err;
		}
		return data;
	}
	close(){
		this.db.close();
	}
}

function playsound(tsndName){
return new Promise((resolve, reject) => {
	const sndName = getPsAlias(tsndName.toLowerCase());
	if(sndName === ""){
		reject("illegal playsound name");
		return;
	}	
	let sdata = ksb.db.syncSelect(`SELECT * FROM playsounds WHERE name='${sndName}';`);
	if (!sdata || sdata.length===0){
		reject(`invalid playsound ${sndName}`);
		return;
	}
	if (sdata[0].enabled === 0){
		reject(`that playsound is not enabled.`);
		return;
	}
	const wavpath = ksb.c.pspath+sdata[0].path;
	ksb.util.logger(4, `<playsound> Starting playback of ${sdata[0].path}`);
	ksb.status = "playing";
	ksb.player.play({path: wavpath, sync: true}).then(() => {
		ksb.util.logger(4, `<playsound> Finished playback.`);
		ksb.status = "idle";
		resolve("finished playback");
		return;
	}).catch((err) => {
		ksb.util.logger(2, `<playsound> Error while trying to play "${wavpath}": ${err}`);
		ksb.status = "idle";
		reject("playback error");
		return;
	});
});
}

function pointPS(sender, category, insndname){
	ksb.util.logger(3, `<chps> Redemption by ${sender} for sound ${insndname}`);
	if(bancheck(sender)){
		ksb.util.logger(3, `<chps> No, I don't think so (user is banned)`);
		return;
	}
	const sndname = getPsAlias(insndname);
	if (sndname === ""){
		ksb.sendMsg(ksb.c.prodch.name, `${sender} what you specified is not a valid playsound name.`);
		ksb.sendMsg(ksb.c.prodch.name, `MODS check if the name was a possible sql injection attempt.`);
		logger(2, `<security> ${sender} tried to redeem an illegal playsoundname "${insndname}" using channelpoints.`);
		return;
	}
	let sdata = ksb.db.syncSelect(`SELECT * FROM playsounds WHERE name='${sndname}';`);
	if (!sdata || sdata.length===0){
		ksb.sendMsg(ksb.c.prodch.name, `${sender}, that playsound does not exist. See ${ksb.c.prefix}listps for a list of playsounds.`);
		return;
	}
	if (sdata[0].category != category){
		ksb.sendMsg(ksb.c.prodch.name, `${sender}, you need to redeem points in another point redemption option for that playsound. NOTE: you cannot play "cheaper" ps' with a "more expensive" category.`);
		return;
	}
	playsound(sndname).then(() => {
		//NaM
	}).catch((err) => {
		ksb.sendMsg(ksb.c.prodch.name, `${sender} there was a problem while trying to play your sound, ask for point refund.`);
		return;
	});
}

function bancheck(username){
	let d = ksb.db.syncSelect(`SELECT * FROM bans WHERE username='${username}';`);
	if(d.length>0) return true;
		else return false;
}

function registerCooldown(user, command, time){
	cooldowns.unshift({usr: user, cmd: command, ptime: time});
}

function getChannelCD(){
	if(cooldowns.length === 0) return false;
	const lcmd = cooldowns.find(nam => nam.cmd != "__command_execution");
	if ((getUnixtime()-lcmd.ptime) > ksb.c.channelcd)
		return false;
	else
		return true;
}

function getCmdCD(cmd){
	if(cooldowns.length === 0) return false;
	const ccmd = cooldowns.find(nam => nam.cmd === cmd);
	const tcmd = ksb.cmds.find(nam => nam.name === cmd);
	if(!ccmd || !tcmd) return false;

	if((getUnixtime()-ccmd.ptime) > tcmd.cds.channel){
		return false;
	} else {
		return true;
	}

}

function getUserCD(name, cmd){
	if(cooldowns.length === 0) return false;
	const tcmd = ksb.cmds.find(nam => nam.name === cmd);
	const ccmd = cooldowns.find(nam => nam.cmd === cmd && nam.usr === name);
	if(!tcmd || !ccmd) return false;

	if((getUnixtime()-ccmd.ptime) > tcmd.cds.user){
		return false;
	} else {
		return true;
	}
}

function getExecutionStatus(name, cmdname){
	if(cooldowns.length === 0) return false;
	//1. check if its even an execution cd with that command. If none, not on cd
	const ccmd  = cooldowns.find(nam => nam.usr === name && nam.cmd === "__command_execution:"+cmdname);
	if(!ccmd) return false;
	//2. If there is an execution cd, check if there is a normal cd for the same user and same command
	//	 If there is indeed one then the command finished and we coo.
	const fcmd = cooldowns.find(nam => nam.usr === name && nam.cmd===cmdname);
	if(fcmd){
		if(fcmd.ptime>ccmd.ptime) return false;
	}
	//NOTE: resetting execution CD for failed commands is done in the command handler.

	//3. If we got there, the user has a command executing, BUT after a grace
	//	 period, release it. In case of stuck commands, unlikely but could happen.
	if((getUnixtime()-ccmd.ptime) > 60){
		return false;
	} else {
		return true;
	}
}

function getOtherCD(name){
	//There are two "other" cooldown sources:
	//1. the user messed up a command. This does not warrant a full command cd,
	//   but should give them a few seconds cd
	//2. the user tried to run a command they are not allowed to run. To prevent
	//   spamming admin commands and flooding the chat with the error message they
	//   should wait a reasonable amount of time before using anything else.

	const badcmd = cooldowns.find(nam => nam.usr===name && nam.cmd === "__failed_command");
	const noperm = cooldowns.find(nam => nam.usr===name && nam.cmd === "__global_security");
	let rbad, rnoperm;

	if(!badcmd){
		rbad = false;
	} else {
		if((getUnixtime() - badcmd.ptime) > ksb.c.failedCmdCD)
			rbad = false;
		else
			rbad = true;
	}
	if(!noperm){
		rnoperm = false;
	} else {
		if((getUnixtime() - noperm.ptime) > ksb.c.noPermCmdCD)
			rnoperm = false;
		else
			rnoperm = true;
	}
	return (rbad || rnoperm);
}

function checkCD(user, cmd){
	return (getChannelCD() || getCmdCD(cmd) || getUserCD(user, cmd) || getOtherCD(user));
}

function timeconv(inSecs){
	if(isNaN(inSecs)) return "NaN";
	let tday, thour, tmin, tsecs;
	let result = "";
	
	tsecs	= inSecs;
	tday	= Math.floor(tsecs/86400);
	tsecs  -= tday*86400;
	thour	= Math.floor(tsecs/3600);
	tsecs  -= thour*3600
	tmin	= Math.floor(tsecs/60);
	tsecs  -= tmin*60;

	if(tday >0) result += (`${tday}d `);
	if(thour>0) result += (`${thour}h `);
	if(tmin >0) result += (`${tmin}min `);
	if(tsecs>0) result += (`${tsecs}s`);

	return result;
}

exports.getUnixtime	= getUnixtime;
exports.sleep		= sleep;
exports.DonkDB		= DonkDB;
exports.logger		= logger;
exports.memusage	= memusage;
exports.getAS		= getAS;
exports.playsound	= playsound;;
exports.pointPS		= pointPS;
exports.getAlias	= getAlias;
exports.loadCommands= loadCommands;
exports.user_levels	= user_levels;
exports.getUserLevel= getUserLevel;
exports.checkCD		= checkCD;
exports.registerCooldown = registerCooldown;
exports.getExecutionStatus = getExecutionStatus;
exports.cooldowns	= cooldowns;
exports.timeconv	= timeconv;
exports.getPsAlias	= getPsAlias;
exports.bancheck	= bancheck;
