'use strict';

const Command = require('./Command');

var util = require('util');
var fs = require('fs');

var markov = require('markov');
var m = markov(10);

var s = fs.createReadStream('input/copypasta.txt');
var warmingUp = true;
m.seed(s, () => { warmingUp = false; });

module.exports = class CopyPastaCommand extends Command {
    constructor() {
        super();

        this.regex = /^\s*🚢\s*copypasta\s*$/;
    }

    check(msg) {
        if (!super.check(msg))
            return false;

        var matches = msg.content.match(this.regex);

        if (!matches)
            return false;

        return true;
    }

    run(msg) {
        if (warmingUp) {
            msg.channel.send(msg.member.displayName + ', copypastas are still warming up.');
            return;
        }

        var key = m.pick();
        var copypasta = m.fill(key, 20).join(' ');
        msg.channel.send(copypasta);
    }
};