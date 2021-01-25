exports.kirabot_command = {
		name: "ping",
		desc: "Ping command 4HEad",
		help: "Pongs back with some stats",
		aliases: ["pong"],
		userlevel: 0,
		cds: {
				user: 10,
				channel: 5
			},
		code: function(lparam) {
				return new Promise((resolve, reject) => {
					let data = ksb.db.syncSelect(`SELECT COUNT(id) AS cid FROM playsounds WHERE enabled='1';`);
					resolve (`Playsound bot ready to roll. Command prefix is ${ksb.c.prefix} , memory usage: ${ksb.util.memusage()}, enabled playsounds: ${data[0].cid}`);
				});
				}
}
