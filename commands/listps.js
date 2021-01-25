exports.kirabot_command = {
		name: "listps",
		desc: "Lists playsounds",
		help: "returns a list of enabled playsounds",
		userlevel: 0,
		aliases: ["pss", "playsounds", "listplaysounds"],
		cds: {
				user: 5,
				channel: 10
			},
		code: function(lparam) {
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
}
