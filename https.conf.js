/*
To generate a new cert:
    $ openssl req -x509 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem -days 365
To remove the passphrase requirement:
    $ openssl rsa -in ssl/key.pem -out ssl/newkey.pem && mv ssl/newkey.pem ssl/key.pem
*/

var fs = require('fs');
var ip = require('ip');

const url = `https://${ip.address()}:5500`;
console.log(`Serving \"${__dirname}\" at: \x1b[36m${url}\x1b[0m`);

module.exports = {
    key: fs.readFileSync(__dirname + '/ssl/key.pem', 'utf8'),
    cert: fs.readFileSync(__dirname + '/ssl/cert.pem', 'utf8'),
};
