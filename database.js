'use strict';

const fs = require('fs');
const assert = require('assert');
const sqlite3 = require('sqlite3').verbose();

const DATABASE_FILE = 'bluemarlin.db';

var firstRun = false;
if (!fs.existsSync(DATABASE_FILE))
    firstRun = true;

const db = new sqlite3.Database(DATABASE_FILE);

if (firstRun) {
    db.serialize(function () {
        db.run(`
            CREATE TABLE ships (
                lesser INTEGER NOT NULL,
                greater INTEGER NOT NULL,
                owner INTEGER NOT NULL,
                refreshed INTEGER NOT NULL DEFAULT (STRFTIME('%s', 'now')),
                kind TEXT NOT NULL,
                PRIMARY KEY (lesser, greater, owner),
                CHECK(kind IN ("S", "B")),
                CHECK(greater > lesser),
                CHECK(owner != greater),
                CHECK(owner != lesser)
        )`);

        db.run(`
            CREATE TABLE users (
                userid INTEGER NOT NULL PRIMARY KEY,
                username TEXT NOT NULL
        )`);

        db.run(`
            CREATE TABLE config (
                key TEXT NOT NULL,
                value TEXT NOT NULL
        )`);

        var stmt = db.prepare(`INSERT INTO config VALUES (?, '')`);

        stmt.run('CHANS');
        stmt.run('TABLE');
        stmt.run('STALKER');
        stmt.run('CRONTAB');
        stmt.run('CRONNOTIF');
        stmt.run('PERM_MSG');
        stmt.run('PERM_STOP');
        stmt.run('PERM_CONF');
    });
}

/*
 * Adds a new ship
*/
exports.add_ship = async function (user1, user2, kind, owner) {
    return new Promise((resolve, reject) => {
        assert(user1 > 0);
        assert(user2 > 0);
        assert(owner > 0);
        assert(kind === 'S' || kind === 'B', 'Invalid ship kind');

        if (user1 === user2)
            throw new Error('user1 and user2 are equal');

        var lesser, greater;
        if (user1 < user2) {
            lesser = user1;
            greater = user2;
        } else {
            lesser = user2;
            greater = user1;
        }

        db.run(`
            INSERT OR REPLACE INTO ships
            (lesser, greater, owner, kind) VALUES
            (?, ?, ?, ?)`,
            [lesser, greater, owner, kind],
            function (err) {
                if (err)
                    reject(err);
                else
                    resolve();
            });
    });
};

exports.get_table = function (rows) {
    return new Promise((resolve, reject) => {
        assert(rows > 0, 'Invalid number of rows');

        db.all(`
        SELECT
            lesserUser.username AS lesserUsername,
            greaterUser.username AS greaterUsername,
            TOTAL(score) AS score,
            ABS(TOTAL(score)) AS absScore
        FROM (SELECT lesser, greater,
                case when kind = "S" then 1 else -1 end *
                    ((refreshed - STRFTIME('%s', 'now') - 172800.0) /
                    (refreshed - STRFTIME('%s', 'now') - 86400) - 1)
                AS score
            FROM ships)
        INNER JOIN users AS lesserUser ON lesser = lesserUser.userid
        INNER JOIN users AS greaterUser ON greater = greaterUser.userid
        GROUP BY lesser, greater
        ORDER BY absScore DESC
        LIMIT ?
        `, [rows],
            function (err, rows) {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
    });
};

exports.add_user = async function (userid, username) {
    return new Promise((resolve, reject) => {
    db.run(`
        INSERT OR REPLACE INTO users
        (userid, username) VALUES
        (?, ?)`,
        [userid, username],
        function (err) {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
};

exports.PAGE_SIZE = 20;
exports.get_ships = function (owner, page) {
    return new Promise((resolve, reject) => {
        db.all(`
        SELECT
            lesserUser.username AS lesserUsername,
            greaterUser.username AS greaterUsername,
            kind
        FROM ships
        INNER JOIN users AS lesserUser ON lesser = lesserUser.userid
        INNER JOIN users AS greaterUser ON greater = greaterUser.userid
        WHERE owner = ?
        ORDER BY lesser, greater
        LIMIT ?
        OFFSET ?
    `, [owner, exports.PAGE_SIZE, page * exports.PAGE_SIZE], function (err, rows) {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
    });
};

exports.get_conf = async function (key) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT value
            FROM config
            WHERE key = ?
        `, [key], function (err, row) {
            if (err)
                reject(err);
            else if (row === undefined)
                throw new Error('No row found with key "' + key + '"');
            else
                resolve(row['value']);
        });
    });
};

exports.set_conf = async function (key, value) {
    return new Promise((resolve, reject) => {
        db.run(`
            UPDATE config
            SET value = ?
            WHERE key = ?
        `, [value, key], function (err) {
                if (err)
                    reject(err);
                else if (this.changes === 0)
                    throw new Error('No row found with key "' + key + '"');
                else if (this.changes > 1)
                    throw new Error('Multiple keys changed.');
                else
                    resolve(err);
        });
    });
};

exports.has_permission = async function (userID, perm) {
    var permKey = 'PERM_' + perm;

    var value = await exports.get_conf(permKey);

    var userIDs = value.split(',');
    for (var i = 0; i < userIDs.length; ++i)
        if (userIDs[i] === userID)
            return true;

    return false;
};