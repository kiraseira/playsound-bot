# playsound-bot
Dank Twitch playsound bot

**Runtime:**

Developed on debian sid's node 12.x LTS. It *should* work on later.

**Note about sqlite3:**
The program uses better-sqlite3 for database access, however bs3 does not 
provide prebuilt binaries for win32, meaning you need to install Visual Studio 
with the size of an average GNU/Linux distro to compile it LULW

For this reason I set the project to depend on better-sqlite3-with-prebuilds 
which has prebuild binaries for a few platforms, however its a bit behind with 
versions. The bot is developed and tested with this. Yes, I know it's a 
3rd party thing etc. forsenCD you can edit package.json to use mainline bs3. 
Compilation on GNU/Linux, BSDs is painless, you probably just need make and cc. 
npm will tell you.

