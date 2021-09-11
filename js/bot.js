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

    var direction = this.randomDirection();
    this.gameManager.move(direction);
}

Bot.prototype.randomDirection = function () {
    return Math.floor(Math.random() * 4);
}
