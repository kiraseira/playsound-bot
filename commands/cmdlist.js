exports.kirabot_command = {
		name: "commandlist",
		desc: "List of available commands",
		help: "Prints a list of available commands",
		aliases: ["commands", "cmds"],
		userlevel: 0,
		pingsender: 1,
		cds: {
				user: 10,
				channel: 10
			},
		code: function(sender, lparam) {
				return new Promise((resolve, reject) => {
					let result = "commands(aliases): ";
					ksb.cmds.forEach(cmd => {
						result += cmd.name;
						if(cmd.aliases){
							result+="(";
							result+=cmd.aliases.join(", ");
							result+=")";
						}
						result += ", ";
					});
					resolve(result.substr(0, result.length-2));
					return;
				});
				}
}
