"use strict";

function getUnixtime(){
	return Math.floor(new Date()/1000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

exports.getUnixtime = getUnixtime;
exports.sleep = sleep;
exports.DonkDB = DonkDB;
exports.logger = logger;
exports.memusage = memusage;
exports.usercheck = usercheck;
