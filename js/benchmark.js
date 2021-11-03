function Benchmark(bot) {
    this.bot = bot;
    this.iterations = 50;
}

Benchmark.prototype.go = function () {
    var stats = []
    for (var i = 0; i < this.iterations; i++) {
        stats.push(this._run());
    }

    var min = 1000000;
    var max = 0;
    var sum = 0;
    var avg = 0;

    for (var i = 0; i < stats.length; i++) {
        var score = stats[i].score;
        sum += score;

        if (score < min) {
            min = score;
        }

        if (score > max) {
            max = score;
        }
    }

    avg = sum / stats.length;

    console.log("min: ", min, "\nmax: ", max, "\navg: ", avg);

    return stats;
}

Benchmark.prototype._run = function () {
    var turns = 0;
    while (!this.bot.gameManager.over) {
        this.bot.run();
        turns++;
    }

    var score = this.bot.gameManager.score;

    this.bot.gameManager.restart();

    return {
        turns: turns,
        score: score,
    }
}