'use strict';

const Command = require('./Command');

const database = require('../database');
const discord = require('../discord');

module.exports = class MessageCommand extends Command {
    constructor() {
        super();

        this.regex = /^\s*🚢\s*msg\s*<#([0-9]*)>\s+(.*)$/;
    }

    check(msg) {
        if (!super.check(msg))
            return false;

        var matches = msg.content.match(this.regex);

        if (!matches)
            return false;

        return matches.length >= 2;
    }

    run(msg) {
        var matches = msg.content.match(this.regex);
        var channelID = matches[1];
        var message = matches.pop();

        async function post() {
            try {
                var permitted = await database.has_permission(msg.author.id, 'MSG');
            } catch (err) {
                console.error(err);
                throw err;
            }

            if (!permitted)
                throw new Error('Operation not permitted');
            
            await discord.post(channelID, message);
            await msg.react('✅');
        }

        post()
            .catch(() => msg.react('❎'));
    }
};