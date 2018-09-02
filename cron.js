'use strict';

const CronJob = require('cron').CronJob;

const database = require('./database');
const discord = require('./discord');

var cronjobs = [];

function overwrite(overwrites, command) {
    var cmdStrings = command.split(',');

    for (var i = 0; i < cmdStrings.length; ++i) {
        var cmdString = cmdStrings[i];
        var overwrite = cmdString.split(':');
        var permission = overwrite[0];
        var option = overwrite[1];
        
        if (option === '-')
            overwrites[permission] = false;
        else if (option === '+')
            overwrites[permission] = true;
        else if (option === '/') {
            overwrites[permission] = null;
        } else {
            throw new Error('Undefined option: ' + option);
        }
    }

    return overwrites;
}

async function executeJob(job) {
    var args = /<#([0-9]+)> ([\S\s]+)/;
    var matches = job.match(args);

    if (!matches || matches.length !== 3)
        return 'Error running job ' + job;

    const channelID = matches[1];
    const command = matches[2];

    const channel = await discord.get_channel(channelID);

    const everyone = channel.guild.roles.find("name", "@everyone");
    var overwrites = channel.permissionOverwrites.get(everyone.id);

    if (overwrites === undefined)
        overwrites = {};

    overwrites = overwrite(overwrites, command);

    await channel.overwritePermissions(everyone, overwrites);
    
    return 'Ran ' + command + ' on channel #' + channel.name + '.';
}

function cronRunner(job, retryTime) {
    executeJob(job)
        .then(msg => {
            console.log(msg);
            discord.msg_conf('CRONNOTIF', _ => msg)
                .catch(err => { console.error('Error notifying cron users: \n' + err); });
        }).catch(err => {
            const nextRetryTime = retryTime * 2;

            setTimeout(() => { cronRunner(job, nextRetryTime); }, retryTime * 1000);

            const msg = 'Error when running cronjob "' + job + '", retrying in ' + nextRetryTime + 's.';
            console.error(msg + '\n' + err);
            discord.msg_conf('CRONNOTIF', _ => msg)
                .catch(err => { console.error('Error notifying cron users: \n' + err); });
        });
}

exports.reload_cron_jobs = async function () {
    // Barely verified split method from https://stackoverflow.com/a/29998501
    function _split(str, sep, n) {
        var out = [];

        while (n--) out.push(str.slice(sep.lastIndex, sep.exec(str).index));

        out.push(str.slice(sep.lastIndex));
        return out;
    }

    for (let i = 0; i < cronjobs.length; ++i)
        cronjobs[i].stop();

    cronjobs = [];

    const crontab = await database.get_conf('CRONTAB');

    if (crontab === '' || crontab === 'null')
        return;

    var cronlines = crontab.split('\n');
    for (let i = 0; i < cronlines.length; ++i) {
        var args = _split(cronlines[i], / /g, 6); // uses _split method above

        if (args.length !== 7) {
            console.error('Invalid cron line: ' + args);
            continue;
        }
                
        const cmd = args.pop();
        const line = args.join(' ');

        try {
            const cronjob = new CronJob(line, () => cronRunner(cmd, 8));
            cronjob.start();
            cronjobs.push(cronjob);
        } catch (ex) {
            console.error('cron pattern not valid');
        }
    }
};