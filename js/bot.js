function Bot(gameManager) {
    this.gameManager = gameManager;

    this.interval = null;
    this.delay = 50;

    this.gameManager.inputManager.on("stepForward", this.run.bind(this));
    this.gameManager.inputManager.on("toggleBot", this.toggle.bind(this));
    this.toggleButton = document.querySelector(".toggle-bot-button");
}

Bot.prototype.isRunning = function () {
    return this.interval !== null;
}

Bot.prototype.toggle = function () {
    this.isRunning() ? this.stop() : this.start();
}

Bot.prototype.start = function () {
    if (this.isRunning()) {
        return;
    }

    if (this.gameManager.over) {
        this.gameManager.restart();
    }

    this.toggleButton.textContent = "Stop";
    this.interval = setInterval(this.run.bind(this), this.delay);
}

Bot.prototype.stop = function () {
    this.toggleButton.textContent = "Start";
    clearInterval(this.interval);
    this.interval = null;
}

Bot.prototype.run = function () {
    if (this.gameManager.over) {
        this.stop();
        return;
    }

    if (this.gameManager.won && !this.gameManager.keepPlaying) {
        this.gameManager.keepPlaying();
    }

    var direction = this.nextMoveNaive();
    this.gameManager.move(direction);
}

Bot.prototype.randomDirection = function () {
    return Math.floor(Math.random() * 4);
}

// Prefer moves that keep the top-left corner occupied
Bot.prototype.nextMoveTopLeft = function () {
    var gridUp = this.gameManager.grid.copy();
    var upResult = gridUp.move(UP);

    var gridLeft = this.gameManager.grid.copy();
    var leftResult = gridLeft.move(LEFT);

    // First, check our favorite moves: UP and LEFT.
    if (upResult.moved || leftResult.moved) {
        // Top-left is empty and UP fills it? Do it!
        if (this.gameManager.grid.cells[0][0] === null && gridUp.cells[0][0] !== null) {
            return UP;
        }

        // Top-left is empty and LEFT fills it? Do it!
        if (this.gameManager.grid.cells[0][0] === null && gridLeft.cells[0][0] !== null) {
            return LEFT;
        }

        // Top-left is covered? Prefer moving UP.
        if (upResult.moved) {
            return UP;
        } else {
            return LEFT;
        }
    }

    var gridRight = this.gameManager.grid.copy();
    var rightResult = gridRight.move(RIGHT);

    var gridDown = this.gameManager.grid.copy();
    var downResult = gridDown.move(DOWN);

    // Top-left still occupied after moving RIGHT? Do it!
    if (rightResult.moved && gridRight.cells[0][0] !== null) {
        return RIGHT;
    }

    // Top-left still occupied after moving DOWN? Do it!
    if (downResult.moved && gridDown.cells[0][0] !== null) {
        return DOWN;
    }

    // Doesn't matter. Move RIGHT or DOWN and hope for the best.
    if (rightResult.moved) {
        return RIGHT;
    } else {
        return DOWN;
    }
}

// Finds a move that produces the highest game score (not some smart grid
// scoring system). Ties are broken by direction priority.
Bot.prototype.nextMoveNaive = function () {
    var directions = [UP, LEFT, RIGHT, DOWN];
    var highScore = 0;
    var bestDirection = UP;

    for (var i = 0; i < directions.length; i++) {
        var direction = directions[i];
        var grid = this.gameManager.grid.copy();
        var results = grid.move(direction);

        if (!results.moved) {
            // Prevent getting stuck in a loop when all scores are equal and
            // the best direction doesn't move the grid. I can't think of a
            // game state that requires wrapping around to the beginning of the
            // `directions` array, but we'll keep it just to be extra cautious.
            if (direction == bestDirection) {
                var next = (directions.indexOf(bestDirection) + 1) % directions.length;
                var bestDirection = directions[next];
            }

            continue;
        }

        if (results.score > highScore) {
            highScore = results.score;
            bestDirection = direction;
        }
    }

    return bestDirection;
}

Bot.prototype.nextMoveSmart = function () {
    function scoreGrid(grid) {
        return 0;
    }

    var directions = [UP, LEFT, RIGHT, DOWN];
    var highScore = 0;
    var bestDirection = UP;

    for (var i = 0; i < directions.length; i++) {
        var direction = directions[i];
        var grid = this.gameManager.grid.copy();
        var results = grid.move(direction);
        var score = scoreGrid(grid);

        if (!results.moved) {
            // Prevent getting stuck in a loop when all scores are equal and
            // the best direction doesn't move the grid. I can't think of a
            // game state that requires wrapping around to the beginning of the
            // `directions` array, but we'll keep it just to be extra cautious.
            if (direction == bestDirection) {
                var next = (directions.indexOf(bestDirection) + 1) % directions.length;
                var bestDirection = directions[next];
            }

            continue;
        }

        if (score > highScore) {
            highScore = score;
            bestDirection = direction;
        }
    }

    return bestDirection;
}
