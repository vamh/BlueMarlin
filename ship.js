module.exports = class Ship {
    constructor(client, author, a, b, time) {
        this.client = client;
        this.author = author;

        if (b > a) {
            var c = b;
            b = a;
            a = c;
        }

        this.a = a;
        this.b = b;

        if (time)
            this.time = time;
        else
            this.time = Date.now();
    }

    getAuthor() {
        return this.author;
    }

    getA() {
        return this.a;
    }

    getB() {
        return this.b;
    }

    getTime() {
        return this.time;
    }

    getWeight() {
        return Math.round(100/(1+(Date.now() - this.time)/1000/60/60/24))/100;
    }

    getKey() {
        return this.a + '-' + this.b;
    }

    updateTime(newTime) {
        this.time = newTime;
    }

    getString() {
        return '<@' + this.a + '> \uD83D\uDEA2 <@' + this.b + '>';
    }

    toJSON() {
        return {
            author: this.author,
            a: this.a,
            b: this.b,
            time: this.time
        }
    }
}