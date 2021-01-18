function getUnixtime(){
	return Math.floor(new Date / 1000 );
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
