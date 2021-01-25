"use strict";

let antispam = [0, 0];
let aliases=[];

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

function usercheck(username, context){
	let sdata;
	switch(context){
		case "operator":
			if(username === ksb.c.operator)
				return true;
			else
				return false;
			break;
		case "banned":
			sdata = ksb.db.syncSelect(`SELECT * FROM bans WHERE name='${username}';`);
			if (sdata.length>0)
				return true;
			else
				return false;
			break;
		case "trusted":
			sdata = ksb.db.syncSelect(`SELECT * FROM trusted WHERE name='${username}';`);
			if (sdata.length>0)
				return true;
			else
				return false;
			break;
		default:
			ksb.util.logger(2, `<usercheck> warning: invalid context ${context}`);
			return false;
			break;
	}
}


const sqlite3 = require("better-sqlite3");
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

function playsound(sndName){
return new Promise((resolve, reject) => {
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

function pointPS(sender, category, sndname){
	ksb.util.logger(3, `<chps> Redemption by ${sender} for sound ${sndname}`);
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

exports.getUnixtime	= getUnixtime;
exports.sleep		= sleep;
exports.DonkDB		= DonkDB;
exports.logger		= logger;
exports.memusage	= memusage;
exports.usercheck	= usercheck;
exports.getAS		= getAS;
exports.playsound	= playsound;;
exports.pointPS		= pointPS;
exports.getAlias	= getAlias;
exports.loadCommands= loadCommands;
exports.user_levels	= user_levels;
exports.getUserLevel= getUserLevel;
