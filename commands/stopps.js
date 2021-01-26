exports.kirabot_command = {
		name: "stopps",
		desc: "Stops playback",
		help: "Stops the current playback. Note: due to stream delays the sound might have already stopped by the time you hear and try to stop it.",
		aliases: ["stop"],
		userlevel: 1,
		pingsender: 1,
		cds: {
				user: 2,
				channel: 2
			},
		code: function(sender, lparam) {
				return new Promise((resolve, reject) => {
					ksb.player.stop();
					ksb.util.logger(3, "Stopping playback on command.");
					ksb.status = "idle";
					resolve("Playback stopped.");
				});
				}
}

