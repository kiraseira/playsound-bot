function template(inParam){
return new Promise((resolve, reject) => {
	
});
}

function debug(inParam){
return new Promise((resolve, reject) => {
	let usr, cmd, dbgret;
	try{
		usr = inParam.usr;
		cmd = inParam.cmd;
	}
	catch(err){
		reject(`invalid parameter`);
		ksb.util.logger(2, `<debug command> unable to parse parameter: ${err}`);
		return;
	}
	if (usr != ksb.c.operator){
		reject(`Only the operator can use this command.`);
		return;
	}
	const startt = new Date();
	try{
		dbgret = eval (cmd);
	}
	catch(err){
		resolve(`Error while evaluation expression: ${err}`);
		return;
	}
	const totaltime = new Date()-startt;
	resolve(`result (in ${totaltime} ms): ${dbgret}`);
});
}

function ping(){
return new Promise((resolve, reject) => {
	let data = ksb.db.syncSelect(`SELECT COUNT(id) AS cid FROM playsounds WHERE enabled='1';`);
	resolve (`Playsound bot ready to roll. Command prefix is ${ksb.c.prefix} , memory usage: ${ksb.util.memusage()}, enabled playsounds: ${data[0].cid}`);
});
}

function stopps(){
return new Promise((resolve, reject) => {
	ksb.player.stop();
	ksb.util.logger(3, "Stopping playback on command.");
	ksb.status = "idle";
	resolve("Playback stopped.");
});
}

function listps(){
return new Promise((resolve, reject) => {
	let sdata = ksb.db.syncSelect(`SELECT * FROM playsounds WHERE enabled='1';`);
	if (!sdata || sdata.length===0){
		resolve(`there are no enabled playsounds Saj`);
		return;
	}
	let pss = "";
	for(let i=0; i<sdata.length-1;i++){
		pss += sdata[i].name+" ";
	}
	resolve(`Available playsounds (total: ${sdata.length}): ${pss}`);
	return;
});
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

exports.ping = ping;
exports.playsound = playsound;
exports.stopps = stopps;
exports.listps = listps;
exports.debug = debug;
