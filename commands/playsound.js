exports.kirabot_command = {
		name: "playsound",
		desc: "Lets users play sounds on command",
		help: "Lets users play sounds on command if enabled. Take a playsound name as parameter.",
		aliases: ["ps"],
		userlevel: 1,
		pingsender: 1,
		cds: {
				user: 30,
				channel: 40
			},
		code: function(sender, lparam) {
				return new Promise((resolve, reject) => {
					const cparam = lparam.split(" ");
					if (cparam.length<2){
						reject("you must specify a playsound name to play");
						return;
					}
					if (ksb.status != "idle"){
						reject("a sound is already playing!");
						return;
					}
					ksb.util.playsound(cparam[1]).then((d) => {
						resolve(d);
						return;
					}).catch((err) => { reject(err); });	
				});
				}
}
