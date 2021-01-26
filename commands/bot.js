exports.kirabot_command = {
		name: "bot",
		desc: "Basic information about the bot",
		help: "Short info about the bot.",
		aliases: null,
		userlevel: 0,
		pingsender: 1,
		cds: {
				user: 5,
				channel: 10
			},
		code: function(sender, lparam) {
				return new Promise((resolve, reject) => {
					resolve(`This is an on-command/channelpoint redemption playsound bot, made by kiraseira in nodejs. Command prefix: ${ksb.c.prefix}`);
				});
				}
}
