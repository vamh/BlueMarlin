const Discord = require('discord.js');
const client = new Discord.Client();

const database = require('./database');
const graph = require('./graph');
const proxy = require('./proxy');
const cron = require('./cron');

const GRAPH_URL = 'http://mysserv.ddns.net:8888/graph/';

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    exports.update_table()
        .catch(console.error);

    setInterval(function () {
        exports.update_table()
            .catch(console.error);
    }, 5 * 60 * 1000);

    cron.reload_cron_jobs()
        .catch(err => { console.error('Error reloading cron jobs\n' + err); });
});

var commands = [
    new (require('./commands/HelpCommand'))(),
    new (require('./commands/StatusCommand'))(),
    new (require('./commands/ShipCommand'))('S', '🚢'),
    new (require('./commands/ShipCommand'))('B', '🍖'),
    new (require('./commands/MessageCommand'))(),
    new (require('./commands/ConfCommand'))(),
    new (require('./commands/CopyPastaCommand'))(),
    new (require('./commands/PingCommand'))(),
    new (require('./commands/RaceCommand'))(),
    new (require('./commands/DownloadCommand'))()
];

client.on('message', msg => {

    if (!msg.member || !msg.guild || msg.author.bot)
        return;

    proxy.broadcastJSON({
        id: msg.member.id,
        author: msg.member.displayName,
        avatar: msg.member.user.avatarURL,
        msg: msg.cleanContent,
        channel: msg.channel.name
    });

    for(var i = 0; i < commands.length; ++i)
        if(commands[i].check(msg)) {
            commands[i].run(msg);
            break;
        }
});

client.on('userUpdate', (oldUser, newUser) => {
    if (oldUser.avatarURL === newUser.avatarURL)
        return;

    exports.msg_conf('STALKER', _ => newUser.tag + ' has changed their avatar to ' + newUser.avatarURL + '!');
});

client.login('');

exports.msg_conf = async function (key, msgFunc) {
    const userlist = await database.get_conf(key);

    if (userlist === '' || userlist === 'null')
        return;

    const users = userlist.split(',');

    for (var i = 0; i < users.length; ++i) {
        const user = await client.fetchUser(users[i]);
        user.send(msgFunc(user));
    }
};

exports.get_channel = async function (channelID) {
    var channel = client.channels.find('id', channelID);

    if (channel === null)
        throw new Error('Channel could not be found.');

    return channel;
};

exports.get_message = async function (channelID, messageID) {
    var channel = await exports.get_channel(channelID);
    var messages = await channel.fetchMessages({ around: messageID, limit: 1 });
    return messages.first();
};

exports.post = async function (channelID, message) {
    var channel = await exports.get_channel(channelID);

    try {
        await channel.send(message);
    } catch (err) {
        throw err;
    }
};

exports.edit = async function (channelID, messageID, newMessage) {
    var message = await exports.get_message(channelID, messageID);

    await message.edit(newMessage);
};

const TABLE_ELEMENTS = 20;
const GRAPH_ELEMENTS = 250;
exports.update_table = async function () {
    var value = await database.get_conf('TABLE');

    var table = value.split(',');
    if (table.length !== 2)
        throw new Error('Invalid TABLE configuration.');

    var channelID = table[0];
    var messageID = table[1];

    var rows = await database.get_table(GRAPH_ELEMENTS);

    var tableContent = '';

    if (rows.length === 0)
        tableContent = 'There are no ships :frowning2:.';

    if (rows.length > 0) {
        var filename = await graph.generate_graph(rows);
        tableContent += GRAPH_URL + filename + '\n';

        for (var i = 0; i < Math.min(rows.length, TABLE_ELEMENTS); ++i) {
            var row = rows[i];

            var kind;
            if (row['score'] > 0)
                kind = '🚢';
            else if (row['score'] < 0)
                kind = '🍖';
            else
                kind = '❤'; // when score is exactly 0, should happen almost never

            tableContent += row['lesserUsername'] + kind + row['greaterUsername'] + ': ' + row['score'].toFixed(2) + '\n';
        }
    }


    await exports.edit(channelID, messageID, tableContent);

};