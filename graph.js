const fs = require('fs');

const HEADER = 'html/d3_header.html';
const HEADER_CONTENTS = fs.readFileSync(HEADER, { encoding: 'utf8' }).replace(/^\uFEFF/, '');

const FOOTER = 'html/d3_footer.html';
const FOOTER_CONTENTS = fs.readFileSync(FOOTER, { encoding: 'utf8' }).replace(/^\uFEFF/, '');

const FOLDER = 'graphs';

function roundTimeQuarterHour(time) {
    var timeToReturn = new Date(time);

    timeToReturn.setMilliseconds(Math.round(time.getMilliseconds() / 1000) * 1000);
    timeToReturn.setSeconds(Math.round(timeToReturn.getSeconds() / 60) * 60);
    timeToReturn.setMinutes(Math.round(timeToReturn.getMinutes() / 15) * 15);
    return timeToReturn;
}

function rows_to_json(rows) {
    var highest = 0;
    rows.forEach(row => {
        var ascore = Math.abs(row['score']);
        if (ascore > highest)
            highest = ascore;
    });

    var links = rows.map(row => {
        return {
            source: row['lesserUsername'],
            target: row['greaterUsername'],
            value: Math.round(255 * row['score'] / highest)

        };
    });

    var nodes = new Set();

    links.forEach(value => {
        nodes.add(value.source);
        nodes.add(value.target);
    });

    return {
        nodes: [...nodes].map(str => { return { id: str }; }),
        links: links
    };
}

exports.generate_graph = async function (rows) {
    return new Promise((resolve, reject) => {
        var date = roundTimeQuarterHour(new Date()).toISOString().replace(':', '-').replace(':', '-');
        var filename = date + '.html';
        var path = FOLDER + '/' + filename;

        const contents = JSON.stringify(rows_to_json(rows)).replace(/\'/g, '\\\'');
        const data = HEADER_CONTENTS + contents + FOOTER_CONTENTS;

        fs.writeFile(path, data, err => {
            if (err)
                reject(err);
            else
                resolve(filename);
        });
    });
};