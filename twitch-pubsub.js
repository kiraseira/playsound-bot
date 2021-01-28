/* Twitc Pubsub module for playsound bot
 * 
 * Original code from https://github.com/Leppunen/scriptorex/blob/master/client/twitch-pubsub.js
 * Copyright 2019-2020 Leppunen
 * Released under the MIT license, see included LICENSE.pubsub.txt for details
 * 
 * Modifications: (c) 2020 github.com/kiraseira
 * Modifications are also under the MIT license
 */ 
"use strict";

const RWS = require('reconnecting-websocket');
const WS = require('ws');
const crypto = require('crypto');
let psStarted = false;

const ps = new RWS('wss://pubsub-edge.twitch.tv', [], {WebSocket: WS, startClosed: true});

let pstopics = [];

ps.addEventListener('open', ELopen);
ps.addEventListener('message', ELmessage);

function ELopen(){
	ksb.util.logger(2, `<ps> Connected to pubsub. Subscribing to topics.`);
	//listenStreamStatus();
	listenChannelPoints();
}

function ELmessage({data}){
    const msg = JSON.parse(data);
    switch (msg.type) {
    case 'PONG':
        break;
    case 'RESPONSE':
        handleWSResp(msg);
        break;
    case 'MESSAGE':
        if (msg.data) {
            const msgData = JSON.parse(msg.data.message);
            const msgTopic = msg.data.topic;
            switch (msgData.type) {
            case 'viewcount':
                break;
            case 'commercial':
                break;
            case 'stream-up':
            case 'stream-down':
                handleWSMsg({channel: msgTopic.replace('video-playback.', ''), type: msgData.type});
                break;
            case 'reward-redeemed':
                handleWSMsg({channel: msgData.data.redemption.channel_id, type: msgData.type, data: msgData.data.redemption});
                break;
            default:
                ksb.util.logger(2, `<ps> Received unknown topic message type: [${msgTopic}] ${JSON.stringify(msgData)}`);
            }
        } else {
            ksb.util.logger(2, `<ps> No data associated with message [${JSON.stringify(msg)}]`);
        }
        break;
    case 'RECONNECT':
        ksb.util.logger(2, '<ps> Pubsub server sent a reconnect message. restarting the socket');
        ps.reconnect();
        break;
    default:
        ksb.util.logger(2, `<ps> Received pubsub message with unknown message type: ${msg.type}`);
    }
}

async function listenStreamStatus (channel) {
    const nonce = crypto.randomBytes(20).toString('hex').slice(-8);
    pstopics.push({channel: ksb.c.prodch.name, topic: 'video-playback', nonce: nonce});
    const message = {
        'type': 'LISTEN',
        'nonce': nonce,
        'data': {
            'topics': [`video-playback.${ksb.c.prodch.name}`],
            'auth_token': ksb.c.oauth,
        },
    };
    await ps.send(JSON.stringify(message));
}

async function listenChannelPoints () {
    const nonce = crypto.randomBytes(20).toString('hex').slice(-8);
    pstopics.push({channel: ksb.c.prodch.name, topic: 'channel-points', nonce: nonce});
    const message = {
        'type': 'LISTEN',
        'nonce': nonce,
        'data': {
            'topics': [`community-points-channel-v1.${ksb.c.prodch.twid}`],
            'auth_token': ksb.c.oauth,
        },
    };
    await ps.send(JSON.stringify(message));
}

async function handleWSMsg (msg = {}){
    if (msg) {
        switch (msg.type) {
        case 'viewcount':
            break;
        case 'stream-up':
            //TODO: add things when stream goes up like online broadcast
            //or just enabled playsounds
            break;
        case 'stream-down':
            //TODO: same as above, but disable playsounds
            break;
        case 'reward-redeemed':
            //ksb.util.logger(3, `<debug> Channel point redemption: ${JSON.stringify(msg)}`);
            const redeemer	= msg.data.user.login;
            const category	= msg.data.reward.title;
            const uin 		= String(msg.data.user_input).trim().split(" ");
            let tcat;
            switch(category){
				case ksb.c.categories.a:
					tcat = "a";
					break;
				case ksb.c.categories.b:
					tcat = "b";
					break;
				case ksb.c.categories.c:
					tcat = "c";
					break;
				default:
					return;
					break;
			}
            if (ksb.c.ps_prefix === null) {
				ksb.util.pointPS(redeemer, tcat, uin[0].toLowerCase());
			} else {
				if (uin[0].toLowerCase() === ksb.c.ps_prefix)
					ksb.util.pointPS(redeemer, tcat, uin[1].toLowerCase());
			}
            break;
        }
    }
}

function handleWSResp (msg) {
    if (!msg.nonce) {
		ksb.util.logger(2, `<ps> Received unknown message without nonce: ${JSON.stringify(msg)}`);
		return;
    }

    const {channel, topic} = pstopics.find((i) => i.nonce === msg.nonce);

    if (msg.error) {
        ksb.util.logger(1, `<ps> An error occurred while subscribing to topic "${topic}": ${msg.error}`);
    } else {
		ksb.util.logger(1, `<ps> Successfully subscribed to topic "${topic}"`);
    }
}

// Keepalive

setInterval(() => {
    ps.send(JSON.stringify({
        type: 'PING',
    }));
}, 250 * 1000);

module.exports.connect = function() {
    if(!psStarted){
		ps.reconnect();
		psStarted = true;
	}	
};
