const fs = require('fs');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');

var tempdir = './tmp/';
if (!fs.existsSync(tempdir))
	fs.mkdirSync(tempdir);

if (process.argv.includes('ssl') || process.argv.includes('--ssl')) {
	https.createServer({
		key: fs.readFileSync('key.pem'),
		cert: fs.readFileSync('cert.pem')
	}, mainHandler).listen(443);
	http.createServer(redirectHandler).listen(80);
} else {
	http.createServer(mainHandler).listen(80);
}

function mainHandler(req, res) {
	if (req.url == '/')
		return redirect(res, '/-1:d9bb6fde2410a2445f4e213013f5a0ac584a580a67478fa2992be4bae24c3079/');

	let url = req.url.slice(1);
	let address, path;
	if (url.indexOf('/') == -1) {
		address = url;
		path = "/";
	} else {
		address = url.substring(0, url.indexOf('/'));
		path = url.substring(url.indexOf('/'));
	}

	address = parseAddress(address);
	if (address == null) {
		res.statusCode = 400;
		res.end("Bad address.");
		return;
	}

	let yetwaiting = true;
	setTimeout(function () {
		if (yetwaiting) {
			res.statusCode = 500;
			res.end("timeout :C");
		}
	}, 5000);

	function error(statusCode, statusText) {
		res.statusCode = statusCode;
		res.end(statusText);
		yetwaiting = false;
	}
	function save(alias, address, state, callback) {
		fs.writeFile(tempdir+address+'.'+alias,
					 Buffer.from(state[alias], 'base64'),
					 function (err) {
			if (!yetwaiting)
				return;
			if (err)
				error(500, 'failed to save ' + alias + ' at server');
			else callback();
		});
	}
	function run(address, path, callback) {
		let fullbuff = '';
		let outbuff = '';
		let proc = spawn('fift', ['-s', 'run.fif', tempdir+address+'.code', tempdir+address+'.data', path, ~~(Date.now()/1000)+'']);
		proc.stderr.on('data', msg => {
			fullbuff += msg;
		});
		proc.on('close', (exitCode) => {
			if (exitCode !== 0 && yetwaiting) {
				res.statusCode = 500;
				res.end(fullbuff);
				yetwaiting = false;
			} else if (exitCode == 0) {
				if (!yetwaiting)
					return;
				callback(outbuff);
			}
		});
		proc.stdout.on('data', msg => {
			fullbuff += msg;
			outbuff += msg;
		});
	}
	loadAccountState(address, function (status, state) {
		if (!status)
			return error(500, "failed to obtain account state");
		if (!yetwaiting)
			return;

		if (state.code == null) {
			return error(404, "account state: missing code");
		} else if (state.data == null) {
			return error(404, "account state: missing data");
		}

		save('code', address, state, function () {
			save('data', address, state, function () {
				run(address, path, function (str) {
					let firstline = str.substring(0, str.indexOf('\n') < 0 ? str.length : str.indexOf('\n'));
					let statuscode = parseInt(firstline);
					let content;
					res.statusCode = statuscode;
					if (firstline[firstline.length-1] == '+') {
						// headers
						let headersString = str.substring(str.indexOf('\n')+1, str.indexOf('\n\n') < 0 ? str.length : str.indexOf('\n\n'));
						let headers = headersString.split('\n');
						for (let header of headers) {
							if (header.indexOf(': ') < 0)
								continue;
							let key = header.substring(0, header.indexOf(': '));
							let value = header.substring(header.indexOf(': ')+2);
							if (key.toLowerCase() == 'location' && value[0] == '/')
								value = '/'+address+value;
							res.setHeader(key, value);
						}
						if (str.indexOf('\n\n') >= 0)
							content = str.substring(str.indexOf('\n\n')+2);
					} else
						content = str.substring(str.indexOf('\n')+1);
					res.end(content);
				});
			});
		});
	});
}
function redirectHandler(req, res) {
	redirect(res, 'https://tonweb.site' + req.url);
}
function redirect(res, url) {
	res.statusCode = 301;
	res.setHeader('Location', url);
	res.end();
}

function parseAddress(address) {
	if (address.indexOf(':') > 0 &&
		address.substring(address.indexOf(':')+1).length == 64)
		return address.toLowerCase();
	return null;
}
function loadAccountState(address, callback) {
	let req = https.request({
		method: 'POST',
		hostname: 'us-east-1.large.testnet.ton.dev',
		path: '/graphql',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'Connection': 'keep-alive',
			'DNT': '1', // do not track!
			'Origin': 'https://us-east-1.large.testnet.ton.dev'
		}
	}, function (res) {
		res.on('error', function (err) {
			console.error(err);
			callback(false, err);
		});
		let chunks = [];
		res.on('data', chunk => chunks.push(chunk));
		res.on('end', () => {
			let res = Buffer.concat(chunks).toString();
			try {
				res = JSON.parse(res);
				callback(true, res.data.accounts.length == 0 ? null : res.data.accounts[0]);
			} catch (err) {
				callback(false);
			}
			
		})
	});
	req.on('error', function (err) {
		console.error(err);
		callback(false, err);
	});
	req.write('{"query":"query{accounts(filter:{id:{eq:\\"'+address+'\\"}}){id,balance,code,data}}"}');
	req.end();
}