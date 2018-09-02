'use strict';

const Command = require('./Command');

module.exports = class PingCommand extends Command {
    constructor() {
        super();

        this.regex = /^\s*🚢\s*ping\s*$/;
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
        var time = Date.now();
        msg.channel.send(msg.member.displayName + ', 🏓')
            .then((reply) => {
                var dt = Date.now() - time;
                reply.edit(msg.member.displayName + ', 🏓 ' + Math.round(dt) + ' ms.');
        });
    }
};