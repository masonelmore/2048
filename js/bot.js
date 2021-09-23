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

    var direction = this.nextMoveTopLeft();
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
