'use strict';

const fs = require('fs');
const Discord = require('discord.js');
const client = new Discord.Client();
const Ship = require('./ship');

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

var conf = JSON.parse(fs.readFileSync('conf.json', 'utf8').replace(/^\uFEFF/, ''));

var ships = JSON.parse(fs.readFileSync('ships.json', 'utf8').replace(/^\uFEFF/, '')).map(function (ship) {
    return new Ship(client, ship.author, ship.a, ship.b, ship.time);
});

var authors = {};
var kships = {}
for (var i = 0; i < ships.length; ++i) {
    var ship = ships[i];
    var author = ship.getAuthor();

    if (authors[author])
        authors[author].push(ship);
    else
        authors[author] = [ship];

    var key = ship.getKey();
    if (kships[key])
        kships[key].push(ship)
    else
        kships[key] = [ship];
}

function updateAnnouncement() {
    if (!conf['announcementChannel'] || !conf['announcementMessage'])
        return;

    var s = [];
    for (var k in kships) {
        var v = kships[k];
        var w = 0;
        for (var i = 0; i < v.length; ++i) {
            w += v[i].getWeight();
        }

        s.push([v[0], w])
    }

    s.sort(function (a, b) {
        return a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0;
    });

    var str = '';
    for (var i = 0; i < s.length && i < 20; ++i)
        str += '\n' + s[i][0].getString() + ': ' + s[i][1].toFixed(2);

    var announcementChannel = client.channels.find("id", conf['announcementChannel']);
    announcementChannel.fetchMessages({ around: conf['announcementMessage'], limit: 1 })
        .then(messages => {
            const fetchedMsg = messages.first();
            fetchedMsg.edit(str);
        });
}

setInterval(updateAnnouncement, 15 * 60 * 1000); // update every 15 mins without user action
setTimeout(updateAnnouncement, 3000);

var shipRegex = /\s*<@(!?[0-9]*)>\s*\uD83D\uDEA2\s*<@!?([0-9]*)>\s*/;
client.on('message', msg => {
    if (msg.author.bot)
        return;

    var args = msg.content.split(' ');
    if (args[0] == 'setupBM1') {
        var announcementChannel = client.channels.find("id", args[1]);
        announcementChannel.send("Ship announcement");

        msg.reply('BM1 setup');
        return;
    } else if (args[0] == 'setupBM2') {
        conf['announcementChannel'] = args[1];
        conf['announcementMessage'] = args[2];
        fs.writeFileSync("conf.json", JSON.stringify(conf), "utf8");

        msg.reply('BM2 setup');
        return;
    } else if (msg.content == '\uD83D\uDEA2') {
        var aships = authors[msg.author.id];

        if (!aships)
            return msg.reply('you haven\'t voted for any ships');

        if (aships.length > 20)
            return msg.reply('you have voted for a lot of people!');

        var str = 'you have voted for ' + aships[0].getString();
        for (var i = 1; i < aships.length; ++i)
            str += ', ' + aships[i].getString();
        msg.reply(str);
    } else if (msg.content == '\uD83D\uDEA2help')
        return msg.reply('Use ":ship:" to get a list of all the people you shipped, "@mention1 :ship: @mention2" to ship 2 people together. Make sure to refresh your ships often to keep the :ship: going!');
    
    var matches = msg.content.match(shipRegex);
    
    if (!matches)
        return;

    if (msg.author.id == matches[1] || msg.author.id == matches[2])
        return msg.reply('you can\'t ship yourself.');
    else if (matches[1] == matches[2])
        return msg.reply('you can\'t ship someone with themselves.');

    var ship = new Ship(client, msg.author.id, matches[1], matches[2]);

    for (var i = 0; i < ships.length; ++i) {
        if (ships[i].getAuthor() == ship.getAuthor() && ships[i].getA() == ship.getA() && ships[i].getB() == ship.getB()) {
            ships[i].updateTime(Date.now());
            fs.writeFileSync("ships.json", JSON.stringify(ships), "utf8");

            msg.reply('I have refreshed your ship.');
            updateAnnouncement();
            return;
        }
    }

    ships.push(ship);
    fs.writeFileSync("ships.json", JSON.stringify(ships), "utf8");
    
    var author = ship.getAuthor();

    if (authors[author])
        authors[author].push(ship);
    else
        authors[author] = [ship];

    var key = ship.getKey();
    if (kships[key])
        kships[key].push(ship)
    else
        kships[key] = [ship];

    msg.reply('I have registered your ship.');
    updateAnnouncement();
});

client.login('');