/**
 * @package ipmsg-cli
 * @auther Mr. Rar / https://mrrar.github.io/
 */

// modules that will be used
const dgram = require('dgram');
const server = dgram.createSocket('udp4');
const os = require("os");
const readline = require('readline');
const net = require("net");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// app data
const protocalVersion = 1;
const users = {};
const commands = {
	IPMSG_NOOPERATION: 0x00000000,

	IPMSG_BR_ENTRY: 0x00000001,
	IPMSG_BR_EXIT: 0x00000002,
	IPMSG_ANSENTRY: 0x00000003,
	IPMSG_BR_ABSENCE: 0x00000004,
	IPMSG_BR_NOTIFY: 0x00000004,

	IPMSG_BR_ISGETLIST: 0x00000010,
	IPMSG_OKGETLIST: 0x00000011,
	IPMSG_GETLIST: 0x00000012,
	IPMSG_ANSLIST: 0x00000013,
	IPMSG_BR_ISGETLIST2: 0x00000018,

	IPMSG_SENDMSG: 0x00000020,
	IPMSG_RECVMSG: 0x00000021,
	IPMSG_READMSG: 0x00000030,
	IPMSG_DELMSG: 0x00000031,
	IPMSG_ANSREADMSG: 0x00000032,

	IPMSG_GETINFO: 0x00000040,
	IPMSG_SENDINFO: 0x00000041,

	IPMSG_GETABSENCEINFO: 0x00000050,
	IPMSG_SENDABSENCEINFO: 0x00000051,

	IPMSG_GETFILEDATA: 0x00000060,
	IPMSG_RELEASEFILES: 0x00000061,
	IPMSG_GETDIRFILES: 0x00000062,

	IPMSG_GETPUBKEY: 0x00000072,
	IPMSG_ANSPUBKEY: 0x00000073
};
server.on('error', (err) => {
	console.log(`A terrifying error just happend!\n${err.stack}`);
	server.close();
});

server.on('message', (msg, rinfo) => {
	//console.log(msg.toString()); // for debuging
	const message = parseMessage(msg);
	switch(parseCommand(message.command)) {
		case commands.IPMSG_ANSENTRY:
			users[message.id] = {
				nickName: message.payLoad,
				IP: rinfo.address,
				port: rinfo.port,
				host: message.host
			};
		break;
		case commands.IPMSG_BR_ENTRY:
			users[message.id] = {
				nickName: message.payLoad,
				IP: rinfo.address,
				port: rinfo.port,
				host: message.host
			};
			sendMessage(rinfo.address, commands.IPMSG_ANSENTRY, users.me.nickName);
		break;
		case commands.IPMSG_SENDMSG:
			const name = users[message.id]? users[message.id].nickName : "someone";
			console.log(`\x1b[92m\r${name} says:\x1b[0m\x1b[32m\n${escapeMessage(message.payLoad)}\x1b[0m`);
			sendMessage(rinfo.address, commands.IPMSG_RECVMSG, message.packetNo);
		break;
		case commands.IPMSG_RECVMSG:
			// you're welcome!
		break;
	}
});

/**
 * main entry for the application
 */
server.on('listening', () => {
	
	// don't show the console interface if this ipmsg is being required
	if (require.main === module) {
		process.title = "Basic Ipmsg";
		console.log("\x1b[32m░▒▓\x1b[92;42mIpmsg CLI\x1b[0m\x1b[32;40m▓▒░\x1b[0m");
		rl.question("> ",rootInterface);
	}
	users["me"] = {
		host: os.hostname(),
		nickName: os.userInfo().username,
		id: os.userInfo().username+(os.networkInterfaces()['Local Area Connection']? os.networkInterfaces()['Local Area Connection'][1].mac : "00").replace(/:/g,""),
		IP: os.networkInterfaces()['Local Area Connection']? os.networkInterfaces()['Local Area Connection'][1].address : "0.0.0.0",
		port: 2425
	};
	const brodcastIP = users.me.IP.slice(0,users.me.IP.lastIndexOf(".")+1) + "255";
	users["everyone"] = {nickName: "everyone", host:"everywhere", IP: brodcastIP, port: "2425"};
	sendMessage(users.everyone.IP, commands.IPMSG_BR_ENTRY, users.me.nickName);
});
server.bind(2425);
rl.on('close', quit);
function quit() {
	sendMessage(users.everyone.IP, commands.IPMSG_BR_EXIT, users.me.nickName);
	process.exit();
}
function sendMessage(address, command, message) {
	const packetNo = Date.now();
	const msg = `${protocalVersion}:${packetNo}:${users.me.id}:${users.me.host}:${command}:${message}\0`;
	server.send(msg, 2425, address, function(error) {
		if (error) console.log(`\rMessage failed to send!\n${error.stack}`);
	});
}
function escapeMessage(message) {
	return message.replace("\x1b","");
}
function parseCommand(command) {
	return command & 0xff;
}
function parseMessage(message) {
	message = message.toString("utf8");
	const header  = message.split("\0",1)[0];
	const items = header.split(":");
	return {
		protocalVersion: items[0],
		packetNo: items[1],
		id: items[2],
		host: items[3],
		command: items[4],
		payLoad: items[5]
	};
}
function rootInterface(command) {
	switch (command) {
		case "users":
			var count = 0;
			for (var i in users) {
				if (++count % 2) {
					process.stdout.write("\x1b[93m"); // bright green
				} else {
					process.stdout.write("\x1b[0m\x1b[33m"); // green
				}
				console.log("name: "+users[i].nickName);
				console.log("host: "+users[i].host);
				console.log("id: "+i);
				console.log("IP: "+users[i].IP);
				console.log("port: "+users[i].port);
			}
			process.stdout.write("\x1b[0m"); // reset ink color
			rl.question("> ",rootInterface);
		break;
		case "refresh":
			sendMessage(users["everyone"].IP, commands.IPMSG_BR_ENTRY, users.me.nickName);
			rl.question("> ",rootInterface);
		break;
		case "message":
			rl.question("> ",messagingInterface);
		break;
		case "exit":
			quit();
		default: // help
			console.log("commands: \x1b[92mhelp\x1b[0m, \x1b[92mmessage\x1b[0m, \x1b[92musers\x1b[0m, \x1b[92mexit\x1b[0m, \x1b[92mrefresh\x1b[0m");
			rl.question("> ",rootInterface);
		break;
	}
}
function messagingInterface(destination) {
	// is the destination indicator an ID?
	if (users[destination]) {
		console.log("What to send?");
		rl.question("> ",messageSendInterface.bind({IP: users[destination].IP}));
		return;
	}
	// is the destination indicator a nick name?
	for (var i in users) {
		if(users[i].nikeName == destination) {
			console.log("What to send?");
			rl.question("> ",messageSendInterface.bind({IP: users[i].IP}));
			return;
		}
	}
	// is the destination indicator an IP?
	if (net.isIP(destination)) {
		console.log("What to send?");
		rl.question("> ",messageSendInterface.bind({IP: destination}));
		return;
	}
	// does the user want to exit?
	if (destination.toLowerCase() == "exit") {
		rl.question("> ",rootInterface);
		return;
	}
	// let's give the user assistace!
	console.log("Type a name, ID or IP. Type 'exit' to exit the messager");
	rl.question("> ",messagingInterface);
}
function messageSendInterface(message) {
	sendMessage(this.IP, commands.IPMSG_SENDMSG, message);
	rl.question("> ",rootInterface);
}

// export some functions in case someone wants to use them
exports.sendMessage = sendMessage;
exports.commands = commands;
