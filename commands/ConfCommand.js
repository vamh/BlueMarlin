'use strict';

const Command = require('./Command');

const database = require('../database');
const discord = require('../discord');
const cron = require('../cron');

module.exports = class ConfCommand extends Command {
    constructor() {
        super();

        this.regex = /^\s*🚢\s*conf\s*(\w+)\s*([\S\s]*)$/;
    }

    check(msg) {
        if (!super.check(msg))
            return false;
        
        var matches = msg.content.match(this.regex);

        if (!matches)
            return false;

        return matches.length >= 3;
    }

    run(msg) {
        var matches = msg.content.match(this.regex);

        async function conf() {
            try {
                var permitted = await database.has_permission(msg.author.id, 'CONF');
            } catch (err) {
                console.error(err);
                throw err;
            }

            if (!permitted)
                throw new Error('Operation not permitted');

            if (matches[2] === '') { // get
                var value = await database.get_conf(matches[1]);
                await discord.post(msg.channel.id, msg.member.displayName + ', "' + value + '"');
            } else if (matches[2].length > 0) { // set
                await database.set_conf(matches[1], matches[2]);

                if (matches[1] === 'CRONTAB')
                    cron.reload_cron_jobs()
                        .catch(err => { console.error('Error reloading cron jobs\n' + err); });

                msg.react('✅');
            }
        }

        conf()
            .catch((err) => msg.react('❎'));
    }
};