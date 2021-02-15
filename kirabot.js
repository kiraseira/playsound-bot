"use strict";
global.ksb = new Object;

const { ChatClient} = require("dank-twitch-irc");
ksb.stt		= require("set-terminal-title");
ksb.os		= require("os");
ksb.fs		= require("fs");
ksb.got		= require("got");
ksb.player	= require("node-wav-player");
ksb.c		= require("./config.js").kbconfig;
ksb.util	= require("./ksb-util.js");
ksb.ps		= require("./twitch-pubsub.js");
ksb.wavinfo = require("wav-file-info");
ksb.haste	= require("hastebin");
ksb.cmds	= [];
ksb.messageq= [];
ksb.startt	= ksb.util.getUnixtime();
ksb.chatclient = new ChatClient({username: ksb.c.username, password: ksb.c.oauth, rateLimits: ksb.c.ratelimit});

const ptl = ksb.util.logger;
ksb.status = "idle";

ptl(1, "Kira playsound bot v0.1 starting up");
ptl(1, `System: ${ksb.os.platform} @ ${ksb.os.hostname}, node version: ${process.versions.node}, v8 version: ${process.versions.v8}`);

if(ksb.c.devch === ksb.c.prodch.name){
	ptl(0, "Your dev channel and production channel are the same you pepga. If you don't want to use a dev channel unset the variable!");
	process.exit(0);
}

ptl(1, `<db> Attempting to open sqlite database at '${ksb.c.dbname}'`);
try { ksb.db = new ksb.util.DonkDB(ksb.c.dbname); }
catch(err) {
	ptl(2, `Error while attempting to open the database: ${err}`);
	process.exit(1);
}	
ptl(1, `<db> Database opened successfully.`);
checkConfigCats();
process.on('exit', () => { ksb.db.close(); });

ksb.chatclient.on("connecting", onConnecting);
ksb.chatclient.on("connect", onConnect);
ksb.chatclient.on("ready", onReady);
ksb.chatclient.on("close", onClose);
ksb.chatclient.on("error", onError);
ksb.chatclient.on("PRIVMSG", incomingMessage);

ksb.chatclient.connect();

function onConnecting(){
	ptl(2, `<cc> Connecting to TMI`);
}
function onConnect(){
	ptl(2, `<cc> Connected!`);
	ptl(2, `<cc> Logging in...`);
}

function onReady(){
	ptl(2, `<cc> Logged in! Chat module ready.`);
	ksb.util.loadCommands();
	joinChannels();
	ksb.ps.connect();
	msgQ();
	ksb.sendMsg(ksb.c.devch, "connected FeelsDankMan 📣");
	//ksb.sendMsg(ksb.c.prodch.name, "connected FeelsDankMan 📣");
	ksb.stt(`kirabot online - dev: ${ksb.c.devch}, prod: ${ksb.c.prodch.name}(${ksb.c.prodch.twid})`);
}

function onClose(){
	ptl(2, `<cc> Connection to TMI was closed.`);
}
function onError(inErr){
	ptl(2, `<cc> Chatclient error detected: ${inErr}`);
	if (String(inErr).match(/CapabilitiesError/) || String(inErr).match(/LoginError\: Failed to login\: Connection closed with no error/)){
		ptl(1, `<cc> Capability error or donk login error detected, closing the client then trying to reconnect after 5 seconds`);
		ksb.chatclient.close();
		ksb.util.sleep(5000).then(()=>{
			ksb.chatclient.connect();
		});
	}
}

async function incomingMessage(inMsg){
	let sender 	= inMsg.senderUsername.toLowerCase();
	let message = String(inMsg.messageText);
	let channel = inMsg.channelName;
	
	if(ksb.util.bancheck(sender)) return;

	if (sender === ksb.c.username || message.length<2 || message[0] != ksb.c.prefix) return;
	if (ksb.util.getUserLevel(sender) < 2 && channel === ksb.c.devch) return;

	commandHandler(message, channel, sender);
}

function commandHandler(message, channel, sender){
	//don't even continue if the user has a command in executing status
	if(channel===ksb.c.prodch.name && ksb.util.getExecutionStatus(sender)) return;
	//in the dev channel only the operator and the broadcaster can post
	let userlvl = ksb.util.getUserLevel(sender);
	if(userlvl <2 && channel === ksb.c.devch) return;
	//check if the command even exists, return if its not
	let cmd, inparams = message.trim().substring(1);
	cmd = ksb.cmds.find(ccmd => ccmd.name === ksb.util.getAlias(inparams.split(" ")[0]));
	if(!cmd) return;	//there is no command with that name or alias.
	
	if(ksb.util.checkCD(sender, cmd.name) && channel===ksb.c.prodch.name){
		ptl(3, `<cmds> Not executing ${cmd.name} because it's still on cooldown.`);
		return;
	}
	if (cmd.userlevel > userlvl){
		sendMsg(channel, `${sender} you are not allowed to run that command.`);
		ksb.util.registerCooldown(sender, "__global_security", ksb.util.getUnixtime());
		return;
	}
	if(cmd.execution_check)
		ksb.util.registerCooldown(sender, "__command_execution", ksb.util.getUnixtime());
	cmd.code(sender, inparams).then((data) => {
		if(cmd.pingsender === 1)
			sendMsg(channel, `${sender}, ${data.msg}`);
		else
			sendMsg(channel, `${data.msg}`);
		if (data.resolvedOnSuccess)	
			ksb.util.registerCooldown(sender, cmd.name, ksb.util.getUnixtime());
		else
			ksb.util.registerCooldown(sender, "__failed_command", ksb.util.getUnixtime());
		return;
	}).catch((err) => {
		sendMsg(channel, `${sender}, couldn't execute your command: ${err}`);
		ksb.util.registerCooldown(sender, "__failed_command", ksb.util.getUnixtime());
		return;
	});
}

function sendMsg(channel, msg){
	if(!(channel===ksb.c.devch || channel === ksb.c.prodch.name)){
		ptl(2, `<cc> Warning: sendMsg called with unknown channel ${channel}`);
		return;
	}
	if(!msg || msg.length===0){
		ptl(2, `<cc> Warning: sendMsg called with empty or undefined message`);
		return;
	}
	ksb.messageq.push({ch: channel, message: msg+ksb.util.getAS(channel)});
}
ksb.sendMsg = sendMsg;

async function joinChannels(){
	let sDev=true, sMain=true;
	if (!ksb.c.devch || ksb.c.devch.length===0){
		ptl(2, `<cc> not joining a development channel: variable not set.`);
		sDev = false;
	} else {
		try{
			await ksb.chatclient.join(ksb.c.devch);
		}
		catch(err){
			ptl(2, `<cc> Error while attempting to join dev channel: ${err}`);
			sDev = false;
		}	
	}
	if(sDev) ptl(1, `<cc> Successfully joined the dev channel ${ksb.c.devch}`);
	if (!ksb.c.prodch.name || ksb.c.prodch.name===0){
		ptl(2, `<cc> not joining the main channel: variable not set.`);
		sMain = false;
	} else {
		try{
			await ksb.chatclient.join(ksb.c.prodch.name);
		}
		catch(err){
			ptl(2, `<cc> Error while attempting the main dev channel: ${err}`);
			sMain = false;
		}	
	}
	if(sMain) ptl(1, `<cc> Successfully joined the main channel ${ksb.c.prodch.name}`);
	if(!(sMain || sDev)){
		ptl(2, `<cc> Could join neither the dev or the main channel. Terminating applicationj.`);
		process.exit(1);
	}
}

async function msgQ(){
	ptl(3, `<msgq> Message queue intialized`);
	const msgDelay = 1100;	//ms
	let lastmsg = Date.now(), mWait, nextmsg, msgqstate=0;
	while(1){
		//wait if the chlient is not ready of there are no messages to post
		while(!ksb.chatclient.ready){
			if(msgqstate === 1){
				ptl(2, `<msgq> Message queue stopping, because the clatclient is not ready.`);
				msgqstate = 0;
			}
			await ksb.util.sleep(500);
		}
		if(msgqstate === 0){
			ptl(2, `<msgq> Message queue resuming.`);
			msgqstate = 1;
		}
		while(ksb.messageq.length===0){
			await ksb.util.sleep(100);
		}
		//calculate the time since the last command and wait only as much as needed
		mWait =  msgDelay - (Date.now() - lastmsg);
		if (mWait > 0) await ksb.util.sleep(mWait);
		
		nextmsg = ksb.messageq.shift();
		try{
			await ksb.chatclient.say(nextmsg.ch, nextmsg.message);
		}
		catch(err){
			ptl(2, `<msgq> Warning: error while trying to post ${nextmsg.message} to channel ${nextmsg.ch}: ${err}`);			
		}
		finally{
			lastmsg = Date.now();
		}	
	}	
}

function checkConfigCats(){
	if (ksb.c.categories.a.length === 0) ptl(1, `<system> Warning: first category name is empty. Playsounds tagged to be in that category will not be playable!`);
	if (ksb.c.categories.b.length === 0) ptl(1, `<system> Warning: second category name is empty. Playsounds tagged to be in that category will not be playable!`);
	if (ksb.c.categories.c.length === 0) ptl(1, `<system> Warning: third category name is empty. Playsounds tagged to be in that category will not be playable!`);
}


