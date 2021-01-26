exports.kirabot_command = {
		name: "debug",
		desc: "Lets the operator run raw javascript",
		help: "Lets the operator to run raw javascript and returns the result of the expression.",
		aliases: null,
		userlevel: 3,
		pingsender: 1,
		cds: {
				user: 1,
				channel: 2
			},
		code: function(sender, lparam) {
				return new Promise((resolve, reject) => {
					if(lparam.split(" ").length<2){
						resolve("PowerUpL EntropyWins PowerUpR");
						return;
					}
					const startt = new Date();
					try{
						dbgret = eval (lparam.substr(lparam.indexOf(" ")+1));
					}
					catch(err){
						resolve(`Error while evaluation expression: ${err}`);
						return;
					}
					const totaltime = new Date()-startt;
					resolve(`result (in ${totaltime} ms): ${dbgret}`);

				});
				}
}
