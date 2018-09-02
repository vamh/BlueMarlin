'use strict';

const Command = require('./Command');

const database = require('../database');

module.exports = class StatusCommand extends Command {
    constructor() {
        super();

        this.regex = /^\s*🚢\s*([0-9]*)\s*$/;
    }

    check(msg) {
        if(!super.check(msg))
            return false;

        var matches = msg.content.match(this.regex);

        if (!matches)
            return false;

        return matches.length === 2;
    }

    run(msg) {
        var matches = msg.content.match(this.regex);

        var page = matches.pop();
        if (page === '')
            page = 0;

        database.add_user(msg.author.id, msg.member.displayName);
        
        database.get_ships(msg.author.id, page)
            .then((rows) => {
                var message = msg.member.displayName;

                if (rows.length === 0) {
                    if (page === 0)
                        message += ', you haven’t shipped or beefed anyone, use 🚢help for help!';
                    else
                        message += ', no results on this page.';

                    return msg.channel.send(message);
                }

                for (var i = 0; i < rows.length; ++i) {
                    var row = rows[i];

                    var emoji;
                    if (row['kind'] === 'S')
                        emoji = '🚢';
                    else if (row['kind'] === 'B')
                        emoji = '🍖';
                    else
                        console.error('Invalid kind of ship.');

                    message += ', ' + row['lesserUsername'] + ' ' + emoji + ' ' + row['greaterUsername'];
                }

                message += '.';
                
                if (rows.length === database.PAGE_SIZE)
                    message += ' You might see more results on the next page, try 🚢' + (parseInt(page) + 1) + '.';

                return msg.channel.send(message);
            }).catch(() => msg.react('❎'));
    }
};