global.ksb = new Object;

const { ChatClient} = require("dank-twitch-irc");
ksb.c	= require("./config.js").kbconfig;
ksb.stt		= require("set-terminal-title");
ksb.util	= require("./ksb-util.js");
ksb.cmds	= require("./commands.js");
ksb.ps		= require("./twitch-pubsub.js");
ksb.os		= require("os");
ksb.fs		= require("fs");
ksb.player	= require("node-wav-player");
ksb.chatclient = new ChatClient({username: ksb.c.username, password: ksb.c.oauth, rateLimits: ksb.c.ratelimit});

ptl = ksb.util.logger;
ksb.status = "idle";

ptl(1, "Kira playsound bot v0.1 starting up");
ptl(1, `System: ${ksb.os.platform} @ ${ksb.os.hostname}, node version: ${process.versions.node}, v8 version: ${process.versions.v8}`);
ptl(1, `<db> Attempting to open sqlite database at '${ksb.c.dbname}'`);
try { ksb.db = new ksb.util.DonkDB(ksb.c.dbname); }
catch(err) {
	ptl(2, `Error while attempting to open the database: ${err}`);
	process.exit(1);
}	
ptl(1, `<db> Database opened successfully.`);
process.on('exit', () => { ksb.db.close(); });

ksb.chatclient.on("connecting", onConnecting);
ksb.chatclient.on("connect", onConnect);
ksb.chatclient.on("ready", onReady);
ksb.chatclient.on("close", onClose);
ksb.chatclient.on("error", onError);
ksb.chatclient.on("PRIVMSG", incomingMessage);

if(ksb.c.prodch.twid===0){
	ptl(2, `WARNING: twitch id of the production channel is not set. Channel point monitoring will not work!`);
}

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
	joinChannels2();
	ksb.ps.connect();
}
function onClose(){
	ptl(2, `<cc> Connection to TMI was closed.`);
}
function onError(inErr){
	ptl(2, `<cc> Chatclient error detected: ${inErr}`);
}

async function incomingMessage(inMsg){
	let sender 	= inMsg.senderUsername.toLowerCase();
	let message = String(inMsg.messageText);
	let channel = inMsg.channelName;
	
	if (sender === ksb.c.username || message.length<2 || message[0] != ksb.c.prefix) return;
	
	commandHandler(message, channel, sender);
}

function commandHandler(msg, ch, sender){
	let inparams = msg.trim().substring(1).split(" ");
	let cmd, param="";
	switch(inparams[0]){
		case "ping":
		case "pong":
			cmd = ksb.cmds.ping;
			break;
		case "stop":
		case "stopps":
			if (ksb.status === "idle"){
				sendMsg(ch, `${sender} playback is already stopped`);
				return;
			} else {
				cmd = ksb.cmds.stopps;
			}
			break;
		case "ps":
		case "play":
		case "playsound":
			if (ksb.status != "idle"){
				sendMsg(ch, `${sender} a sound file is already playing.`);
				return;
			}
			if (inparams.length<2){
				sendMsg(ch, `${sender}, you must specify a playsound name`);
				return;
			}
			param = inparams[1];
			cmd = ksb.cmds.playsound;
			break;
		case "listps":
		case "playsounds":
		case "listplaysounds":
			cmd = ksb.cmds.listps;
			break;
		case "debug":
			if (inparams.length===0){
				sendMsg(ch, "Bad command or filename.");
				return;
			}
			param = {usr: sender, cmd: inparams.slice(1).join(" ")};
			cmd = ksb.cmds.debug;
			break;
		default:
			ptl(4, `<command handler> Receive unknown command ${inparams[0]}`);
			return;
			break;
	}
	cmd(param).then((data) =>{
		if (data!="noprint"){
			sendMsg(ch, sender+", "+data);
			return;
		}
	}).catch((err) => {
		ptl(1, `<command handler> Error while trying to execute ${inparams[0]}: ${err}`);
		sendMsg(ch, sender+", error while executing the command: "+err);
	});
}

async function sendMsg(channel, msg){
	if(!(channel===ksb.c.devch || channel === ksb.c.prodch.name)){
		ptl(2, `<cc> Warning: sendMsg called with unknown channel ${channel}`);
		return;
	}
	if(!msg || msg.length===0){
		ptl(2, `<cc> Warning: sendMsg called with empty or undefined message`);
		return;
	}
	try{
		await ksb.chatclient.say(channel, msg);
	}
	catch(err){
		ptl(2, `<cc> Warninig: DTI SayError in channel ${channel}: ${err}`);
	}
}

async function joinChannels2(){
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
			smain = false;
		}	
	}
	if(sMain) ptl(1, `<cc> Successfully joined the main channel ${ksb.c.prodch.name}`);
	if(!(sMain || sDev)){
		ptl(2, `<cc> Could join neither the dev or the main channel. Terminating applicationj.`);
		process.exit(1);
	}
}


