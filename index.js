const express = require('express');
const cors = require('cors');
const request = require('request');
const app = express();
const colour = require('./colours');
const pp = require('./pp');
const {
	exec,
	execSync 
} = require('child_process');
const fs = require('fs');
const stream = require('stream')

app.listen(process.env.PORT || 5000, () => {
	console.log('Running | Port: ' + (process.env.PORT || 5000));
});

app.use(cors())

// app.get('/api',(req,res) => {
// 	var key = req.query.k;
// 	res.status(404);
// 	res.json({
// 		valid:true,
// 		error:''
// 	})
// })

app.get('/api/user', (req, res) => {
	var osuKey = req.query.osukey;
	var user = req.query.username;
	request(`https://osu.ppy.sh/api/get_user?k=${osuKey}&u=${user}`, (err, response, body) => {
		if (JSON.parse(body).user_id) {
		res.json(JSON.parse(body));
		} else {
			res.json({error:'Invalid Username'})
		}
	});

});

app.get('/api/beatmap', (req, res) => {
	var osuKey = req.query.osukey;
	var beatmapsetId = req.query.bsetid;

	request(`https://osu.ppy.sh/api/get_beatmaps?k=${osuKey}&s=${beatmapsetId}`, (err, response, body) => {
		var data = JSON.parse(body);
		console.log(body)
		if (data.length == 0) {
			res.json({error:'Invalid Beatmap URL'});
			return;
		}
		exec(`curl -s https://osu.ppy.sh/osu/${JSON.parse(body)[0].beatmap_id} | node pp.js`, (err, stdout, stderr) => {

			colours(`https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/cover@2x.jpg`, (coloursExtracted) => {
				console.log(stdout)
				var strains = stdout.split(',');
				var aim = [];
				var speed = [];
				var deltaTime = [];
				for (var i = 0; i < strains.length; i += 3) {
					speed.push(parseFloat(strains[i]));
					aim.push(parseFloat(strains[i + 1]));
					deltaTime.push(parseFloat(strains[i + 2]));
				}
				var reducedDeltaTime = [];
				deltaTime.reduce(function (a, b, i) {
					return reducedDeltaTime[i] = a + b;
				}, 0);

				var newAim = [];
				var newSpeed = [];
				var newDeltaTime = [];
				for (var j = 0; j < aim.length; j += 25) {
					newAim.push(aim[j]);
					newSpeed.push(speed[j]);
					newDeltaTime.push(reducedDeltaTime[j]);
				}
				data[0].speed = newSpeed;
				data[0].aim = newAim;
				data[0].deltaTime = newDeltaTime;
				// console.log(data);
				for (var i = 0; i < data.length; i++) {
					data[i].colours = coloursExtracted;
				}
				res.json(data);
			});
		});

	});
});

function colours(link, callback) {
	colour.getColours(link, (colours) => {
		colours = colour.toReadable(colour.toRGB(colours.foreground), colour.toRGB('#141927'));
		colours.foreground = colour.toHex(colours.foreground);
		colours.background = colour.toHex(colours.background);
		callback(colours);
	});
}

app.get('/api/changelog', (req, res) => {
	request({
		url: 'https://api.github.com/repos/moorad/the-beautiful-bot/commits',
		headers: {
			'User-Agent': 'Moorad',
			// 'Authorization':''
		}
	}, (err, response, body) => {
		request({
			url: 'https://api.github.com/repos/moorad/the-beautiful-bot-web/commits',
			headers: {
				'User-Agent': 'Moorad',
				// 'Authorization':''
			}
		}, (err, response, bodyWeb) => {
			request({
				url: 'https://api.github.com/repos/moorad/the-beautiful-bot-api/commits',
				headers: {
					'User-Agent': 'Moorad',
					// 'Authorization':''
				}
			}, (err, response, bodyAPI) => {
				body = JSON.parse(body);
				bodyWeb = JSON.parse(bodyWeb);
				bodyAPI = JSON.parse(bodyAPI);

				// body = [{
				// 	commit: {
				// 		message: 'Merge Something\n\n1.We did it boooys\n2. wE DID IT AGAIN BOIIIS',
				// 		committer: {
				// 			date: '2020-01-09T21:04:26.617Z'
				// 		}
				// 	},
				// 	committer: {
				// 		login: 'web-flow'
				// 	},
				// 	author: {
				// 		login: 'Moorad'
				// 	},
				// 	html_url: 'some url',
				// 	sha: '1212'
				// }]
				if (body.message) {
					res.json({
						error: 'The API is rate limited by Github'
					})
					return;
				}
				let index = req.query.index || 0;
				let message = body[index].commit.message.slice(0, body[index].commit.message.indexOf('\n\n') == -1 ? body[index].commit.message.length : body[index].commit.message.indexOf('\n\n'));
				let description = body[index].commit.message.slice(body[index].commit.message.indexOf('\n\n') == -1 ? body[index].commit.message.length : body[index].commit.message.indexOf('\n\n'), body[index].commit.message.length);
				let json = [{
					commit: message,
					commitType: body[index].committer.login == 'web-flow' ? 1 : 0,
					details: description.replace('\n\n', '').split('\n'),
					date: body[index].commit.committer.date,
					ago: timeSince(Date.parse(body[index].commit.committer.date)) + ' ago',
					by: body[index].author.login,
					url: body[index].html_url,
					sha: body[index].sha
				}]
				message = bodyWeb[index].commit.message.slice(0, bodyWeb[index].commit.message.indexOf('\n\n') == -1 ? bodyWeb[index].commit.message.length : bodyWeb[index].commit.message.indexOf('\n\n'));
				description = bodyWeb[index].commit.message.slice(bodyWeb[index].commit.message.indexOf('\n\n') == -1 ? bodyWeb[index].commit.message.length : bodyWeb[index].commit.message.indexOf('\n\n'), bodyWeb[index].commit.message.length);
				json.push({
					commit: message,
					commitType: bodyWeb[index].committer.login == 'web-flow' ? 1 : 0,
					details: description.replace('\n\n', '').split('\n'),
					date: bodyWeb[index].commit.committer.date,
					ago: timeSince(Date.parse(bodyWeb[index].commit.committer.date)) + ' ago',
					by: bodyWeb[index].author.login,
					url: bodyWeb[index].html_url,
					sha: bodyWeb[index].sha
				});
				message = bodyAPI[index].commit.message.slice(0, bodyAPI[index].commit.message.indexOf('\n\n') == -1 ? bodyAPI[index].commit.message.length : bodyAPI[index].commit.message.indexOf('\n\n'));
				description = bodyAPI[index].commit.message.slice(bodyAPI[index].commit.message.indexOf('\n\n') == -1 ? bodyAPI[index].commit.message.length : bodyAPI[index].commit.message.indexOf('\n\n'), bodyAPI[index].commit.message.length);
				json.push({
					commit: message,
					commitType: bodyAPI[index].committer.login == 'web-flow' ? 1 : 0,
					details: description.replace('\n\n', '').split('\n'),
					date: bodyAPI[index].commit.committer.date,
					ago: timeSince(Date.parse(bodyAPI[index].commit.committer.date)) + ' ago',
					by: bodyAPI[index].author.login,
					url: bodyAPI[index].html_url,
					sha: bodyAPI[index].sha
				});
				res.send(json);
			});
		});
	});
});

app.get('/api/player', (req, res) => {
	var osuKey = req.query.osukey;
	var user = req.query.user;

	request(`https://osu.ppy.sh/api/get_user?k=${osuKey}&u=${user}`, (err, response, body) => {
		var playerData = JSON.parse(body);
		if (playerData.length == 0) {
			res.json({error:'Invalid Username'});
			return;
		}
		request(`https://osu.ppy.sh/api/get_user_best?k=${osuKey}&u=${user}&limit=100`, (err, response, body) => {
			colours(`https://a.ppy.sh/${playerData[0].user_id}`, (coloursExtracted) => {
				var data = JSON.parse(body);
				var computedData = {
					chokes: 0,
					FCs: 0,
					other: 0,
					averageCombo: 0,
					unweightedPP: 0,
					mods: []
				};
				for (var i = 0; i < data.length; i++) {
					let accuracy = Math.floor((50 * parseInt(data[i].count50) + 100 * parseInt(data[i].count100) + 300 * parseInt(data[i].count300)) / (300 * (parseInt(data[i].count50) + parseInt(data[i].count100) + parseInt(data[i].count300) + parseInt(data[i].countmiss))) * 10000) / 100;
					if (data[i].countmiss == 1 || (data[i].countmiss > 2 && accuracy > 98)) {
						computedData.chokes++;
					}

					if ((data[i].rank == 'S' || data[i].rank == 'SH' || data[i].rank == 'X' || data[i].rank == 'XH')) {
						computedData.FCs++;
					}

					if (data[i].rank == 'A' || data[i].rank == 'B') {
						computedData.other++;
					}
					computedData.averageCombo += parseInt(data[i].maxcombo);
					computedData.unweightedPP += parseInt(data[i].pp);
					computedData.mods.push(getMods(parseInt(data[i].enabled_mods)));
				}
				// var uniqueMods = computedData.mods.filter((value, index, self) => {return self.indexOf(value) === index;});
				var mods = {}
				computedData.mods.forEach(function (x) {
					mods[x] = (mods[x] || 0) + 1;
				});
				computedData.mods = mods;
				computedData.averageCombo = computedData.averageCombo / 100;
				computedData.other -= computedData.chokes;
				playerData[0].computedData = computedData;
				playerData[0].colours = coloursExtracted;
				res.json(playerData[0]);
			});
		});

	});
});

// app.get('/api/best', (req, res) => {
// 	var osuKey = req.query.osukey;
// 	var user = req.query.user;

// 	request(`https://osu.ppy.sh/api/get_user_best?k=${osuKey}&u=${user}&limit=100`, (err, response, body) => {
// 		var data = JSON.parse(body);
// 		var computedData = {
// 			chokes:0,
// 			FCs:0,
// 			other:0,
// 			averageCombo: 0,
// 			unweightedPP:0,
// 			mods:[]
// 		};
// 		for (var i = 0;i < data.length;i++) {
// 			let accuracy = Math.floor((50 * parseInt(data[i].count50) + 100 * parseInt(data[i].count100) + 300 * parseInt(data[i].count300)) / (300 * (parseInt(data[i].count50) + parseInt(data[i].count100) + parseInt(data[i].count300) + parseInt(data[i].countmiss))) * 10000) / 100;
// 			if (data[i].countmiss == 1 || accuracy >= 98) {
// 				computedData.chokes ++;
// 			}

// 			if ((data[i].rank == 'S' || data[i].rank == 'SH' || data[i].rank == 'X' || data[i].rank == 'XH')) {
// 				computedData.FCs ++;
// 				console.log(data[i].rank)
// 			}

// 			if (data[i].rank == 'A' || data[i].rank == 'B') {
// 				computedData.other ++;
// 			}
// 			computedData.averageCombo += parseInt(data[i].maxcombo);
// 			computedData.unweightedPP += parseInt(data[i].pp);
// 			computedData.mods.push(getMods(parseInt(data[i].enabled_mods)));
// 		}
// 		// var uniqueMods = computedData.mods.filter((value, index, self) => {return self.indexOf(value) === index;});
// 		var mods = {} 
// 		computedData.mods.forEach(function(x) { mods[x] = (mods[x] || 0)+1; });
// 		computedData.mods = mods;
// 		computedData.averageCombo = computedData.averageCombo / 100;
// 		computedData.other -= computedData.chokes;
// 		data.push(computedData);
// 		res.json(data);
// 	});
// });


app.get('/api/flag', (req, res) => {
	var flagCode = req.query.code;
	const readableStream = fs.createReadStream('./Flags/' + flagCode + '.png')
	const passThrough = new stream.PassThrough();
	stream.pipeline(
		readableStream,
		passThrough,
		(err) => {
			if (err) {
				console.log(err)
				return res.sendStatus(400);
			}
		})
	passThrough.pipe(res);
});

function timeSince(date) {

	var seconds = Math.floor((new Date() - date) / 1000);

	var interval = Math.floor(seconds / 31536000);

	if (interval > 1) {
		return interval + ' years';
	}
	interval = Math.floor(seconds / 2592000);
	if (interval > 1) {
		return interval + ' months';
	}
	interval = Math.floor(seconds / 86400);
	if (interval > 1) {
		return interval + ' days';
	}
	interval = Math.floor(seconds / 3600);
	if (interval > 1) {
		return interval + ' hours';
	}
	interval = Math.floor(seconds / 60);
	if (interval > 1) {
		return interval + ' minutes';
	}
	return Math.floor(seconds) + ' seconds';
}

function getMods(number) { // Rewrite using a two lists and a for loop
	if (number == 0) {
		return ('NM');
	}
	var modsNames = ['PF', 'SO', 'FL', 'NC', 'HT', 'RX', 'DT', 'SD', 'HR', 'HD', 'EZ', 'NF'];
	var modsValues = [16416, 4096, 1024, 576, 256, 128, 64, 32, 16, 8, 2, 1];
	var mods = [];
	for (var i = 0; i < modsNames.length; i++) {
		if (number >= modsValues[i]) {
			number -= modsValues[i];
			mods.push(modsNames[i]);
		}
	}
	return (mods.reverse().join(''));
}