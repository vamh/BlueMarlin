'use strict';

const Command = require('./Command');

const database = require('../database');
const discord = require('../discord');

module.exports = class HelpCommand extends Command {
    constructor() {
        super();

        this.regex = /^\s*🚢\s*help\s*$/;
    }

    check(msg) {
        if(!super.check(msg))
            return false;

        var matches = msg.content.match(this.regex);

        if (!matches)
            return false;

        return true;
    }

    run(msg) {
        database.add_user(msg.author.id, msg.member.displayName);

        var message = '🚢 Blue Marlin v2 - shipping ships since 2017. Commands:\n';
        message += '\t@mention1 🚢 @mention2 - ships 2 users together.\n';
        message += '\t@mention1 🍖 @mention2 - beefs 2 users together.\n';
        message += '\t🚢[page] - shows all your ships, [page] being optional, and used to specify the page.\n';
        message += '\t🚢copypasta - generates a copypasta.\n';
        message += '\t🚢race - starts/joins a turtle race.\n';
        message += '\t🚢ping - pings the bot to see if there are latency issues.\n';
        message += '\t🚢yt2mp3 <URL> - converts an youtube video to an mp3.\n';
        message += '\t🚢help - shows this help text.\n';

        database.has_permission(msg.author.id, 'MSG')
            .then((permitted) => {
                if (permitted) // MSG
                    message += '\t🚢msg #channel <message> - messages as Blue Marlin <message> to <channel>.\n';
                return database.has_permission(msg.author.id, 'CONF');
            }).then((permitted) => {
                if (permitted) // CONF
                    message += '\t🚢conf <key> <value> - reads/sets configuration values.\n';
                return database.has_permission(msg.author.id, 'STOP');
            }).then((permitted) => {
                if (permitted) // STOP
                    message += '\t🚢stop - emergency stops the bot.\n';
                message += 'Make sure to refresh your ships often to keep the 🚢 going!';
                return msg.channel.send(message);
            }).catch(() => msg.react('❎'));
    }
};