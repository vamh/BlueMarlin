'use strict';

const Command = require('./Command');

const SONG_URL = 'http://mysserv.ddns.net:8888/songs/';
const SONG_FOLDER = 'songs/';

const fs = require('fs');
const youtubedl = require('youtube-dl');

module.exports = class DownloadCommand extends Command {
    constructor() {
        super();

        this.regex = /^\s*🚢\s*yt2mp3\s+(.*)$/;
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
        var link = matches[1];
        
        youtubedl.getInfo(link, [], (err, info) => {
            if (err) {
                msg.react('❎');
                return;
            }

            msg.react('⏰');
            
            var name = info._filename.substr(0, info._filename.lastIndexOf("-"));
            var size = info.size;

            youtubedl.exec(link, ['-x', '--audio-format=mp3', '-o', SONG_FOLDER + name + '.%(ext)s', '-r', '100k'], {}, function (err, output) {
                if (err) {
                    console.error(err);
                    msg.react('❎');
                    return;
                }

                msg.channel.send('<@' + msg.author.id + '>, I have finished downloading your file: ' + encodeURI(SONG_URL + name + '.mp3') + ' (' + name + ')');
            });

        });
    }
};