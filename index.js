const express = require('express');
const cors = require('cors');
const request = require('request');
const app = express();
const colour = require('./colours');
const pp = require('./pp');
const {
	exec
} = require('child_process');

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
		res.json(JSON.parse(body));
	});

});

app.get('/api/beatmap', (req, res) => {
	var osuKey = req.query.osukey;
	var beatmapsetId = req.query.bsetid;

	request(`https://osu.ppy.sh/api/get_beatmaps?k=${osuKey}&s=${beatmapsetId}`, (err, response, body) => {
		var data = JSON.parse(body);
		exec(`curl -s https://osu.ppy.sh/osu/${JSON.parse(body)[0].beatmap_id} | node pp.js`, (err, stdout, stderr) => {
		console.log(stdout)
		var strains = stdout.split(',');
		var aim = [];
		var speed = [];
		var deltaTime = [];
		for (var i = 0;i < strains.length;i+=3) {
			speed.push(parseFloat(strains[i]));
			aim.push(parseFloat(strains[i+1]));
			deltaTime.push(parseFloat(strains[i+2]));
		}
		var reducedDeltaTime = [];
		deltaTime.reduce(function(a,b,i) { return reducedDeltaTime[i] = a+b; },0);

		var newAim = [];
		var newSpeed = [];
		var newDeltaTime = [];
		for (var j = 0;j < aim.length;j+=25) {
			newAim.push(aim[j]);
			newSpeed.push(speed[j]);
			newDeltaTime.push(reducedDeltaTime[j]);
		}
		data[0].speed = newSpeed;
		data[0].aim = newAim;
		data[0].deltaTime = newDeltaTime;
		// console.log(data);
		res.json(data);
		});
		
	});
});

app.get('/api/colours', (req, res) => {
	var imgLink = req.query.link;
	colour.getColours(imgLink, (colours) => {
		colours = colour.toReadable(colour.toRGB(colours.foreground), colour.toRGB(colours.background));
		colours.foreground = colour.toHex(colours.foreground);
		colours.background = colour.toHex(colours.background);
		res.json(colours);
	});
})


