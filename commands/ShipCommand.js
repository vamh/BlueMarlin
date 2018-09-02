'use strict';

const Command = require('./Command');

const database = require('../database');
const discord = require('../discord');

module.exports = class ShipCommand extends Command {
    constructor(kind, emoji) {
        super();

        this.kind = kind;
        this.regex = new RegExp('^\\s*<@(!\?\[0-9\]*)>\\s*' + emoji + '\\s*<@!?(\[0-9\]*)>\\s*$', 'g');
    }

    check(msg) {
        if (!super.check(msg))
            return false;

        var matches = msg.content.match(this.regex);

        if (!matches)
            return false;

        var mentioned = msg.mentions.users;
        return mentioned.size === 2;
    }

    run(msg) {
        var mentioned = msg.mentions.users;
        var it = mentioned.values();

        var members = msg.guild.members;

        var userID1 = it.next().value.id;
        var userID2 = it.next().value.id;

        var user1 = members.get(userID1);
        var user2 = members.get(userID2);

        database.add_user(msg.member.id, msg.member.displayName)
            .then(() => database.add_user(user1.id, user1.displayName))
            .then(() => database.add_user(user2.id, user2.displayName))
            .then(() => database.add_ship(user1.id, user2.id, this.kind, msg.author.id))
            .then(() => msg.react('✅'))
            .catch((err) => msg.react('❎'))
            .then(() => discord.update_table())
            .catch(console.error);
    }
};