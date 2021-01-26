exports.kirabot_command = {
		name: "help",
		desc: "Prints out help",
		help: "prints out help with a specific command or alias.",
		aliases: null,
		userlevel: 0,
		pingsender: 1,
		cds: {
				user: 5,
				channel: 5
			},
		code: function(sender, lparam) {
				return new Promise((resolve, reject) => {
					const paramlist = lparam.split(" ");
					if (paramlist.length<2){
						resolve(`please specify a command name to get help for. You can use ${ksb.c.prefix}commands for a list of commands.`);
						return;
					}
					const target = ksb.util.getAlias(paramlist[1]);
					const cmd = ksb.cmds.find(nam => nam.name === target);
					if(!cmd){
						resolve(`could not find that command. You can use ${ksb.c.prefix}commands for a list of commands.`);
						return;
					} else {
						resolve(cmd.help);
						return;
					}
				});
				}
}
