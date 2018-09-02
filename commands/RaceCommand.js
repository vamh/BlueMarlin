'use strict';

const Command = require('./Command');

const STATE_SETUP = 'setup';
const STATE_JOINING = 'joining';
const STATE_PLAYING = 'playing';
const STATE_FINISHED = 'finished';
const STATE_CANCELLED = 'cancelled';

const RACE_COUNTDOWN_TIME = 60;
const RACE_TICK_TIME = 2500;
const RACE_MAX_MEMBERS = 4;

const ERROR_FULL = 'full';
const ERROR_WRONG_STATE = 'wrong state';
const ERROR_ALREADY_IN = 'already in';
const SUCCESS = 'success';

var race = null;

class Race {
    constructor(hostMember, channel) {
        this.channel = channel;
        this.members = [hostMember];
        this.host = hostMember;
        this.state = STATE_SETUP;
        this.countdown = RACE_COUNTDOWN_TIME;

        var self = this;
        this.channel.send(this._get_message())
            .then(msg => {
                self.msg = msg;
                self.state = STATE_JOINING;
                self.interval = setInterval(self._tick.bind(self), RACE_TICK_TIME);
            });
    }

    // returns ERROR_* or SUCCESS
    addUser(member) {
        if (this.state !== STATE_JOINING)
            return ERROR_WRONG_STATE;

        if (this.members.length >= RACE_MAX_MEMBERS)
            return ERROR_FULL;

        if (this.members.indexOf(member) > -1)
            return ERROR_ALREADY_IN;

        this.members.push(member);
        return SUCCESS;
    }

    _get_turtle_message(i) {
        var position = this.turtles[i];

        var end = ' ' + this.members[i].displayName + '\n';

        if (position === 0)
            return '🐢|--------------------' + end;

        if (position === 1)
            return '-🐢--------------------' + end;

        var str = '-|';

        for (var j = 2; j < position; ++j)
            str += '-';

        str += '🐢';

        for (var k = position + 1; k < 22; ++k)
            str += '-';

        return str + end;
    }

    _get_message() {
        switch (this.state) {
            case STATE_SETUP:
            case STATE_JOINING:
                return this.host.displayName + ' has started a turtle race! Type "🚢race" to join it! ' + Math.ceil(this.countdown) + ' seconds left.';
            case STATE_FINISHED:
            case STATE_PLAYING:
                var str = this.host.displayName + '\'s turtle race\n';

                for (var i = 0; i < this.members.length; ++i)
                    str += this._get_turtle_message(i);

                if (this.state === STATE_FINISHED) {
                    for (var j = 0; j < this.turtles.length; ++j)
                        if (this.turtles[j] === 0)
                            str += this.members[j].displayName + ' has won the race!';
                }

                return str;
            case STATE_CANCELLED:
                return this.host.displayName + '\'s race has been cancelled, due to a lack of participants!';
            default:
                console.error('Race error!', this);
                this._cancel_race();
                return 'Race had an error.';
        }
    }

    _finish_race() {
        this.state = STATE_FINISHED;
        race = null;
        clearInterval(this.interval);
    }

    _cancel_race() {
        this.state = STATE_CANCELLED;
        race = null;
        clearInterval(this.interval);
    }

    _begin_race() {
        this.state = STATE_PLAYING;
        this.turtles = Array(this.members.length).fill(21);
    }

    _tick() {
        switch (this.state) {
            case STATE_JOINING:
                this.countdown -= RACE_TICK_TIME/1000;
                if (this.countdown <= 0) {
                    if (this.members.length > 1)
                        this._begin_race();
                    else
                        this._cancel_race();
                }
                break;
            case STATE_PLAYING:
                var random = Math.floor(Math.random() * this.turtles.length);
                --this.turtles[random];

                for (var i = 0; i < this.turtles.length; ++i)
                    if (this.turtles[i] === 0)
                        this._finish_race();
                break;
        }

        this.msg.edit(this._get_message());
    }
}

module.exports = class RaceCommand extends Command {
    constructor() {
        super();

        this.regex = /^\s*🚢\s*race\s*$/;
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
        if (race === null) {
            race = new Race(msg.member, msg.channel);
            return;
        }

        if (race.channel !== msg.channel)
            return;

        var status = race.addUser(msg.member);

        if (status === SUCCESS) {
            msg.react('✅');
            return;
        }

        msg.react('❎')
            .then(() => {
                if (status !== ERROR_FULL)
                    return;

                msg.react('🌕');
            });

        
    }
};