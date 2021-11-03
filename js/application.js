var bench;

// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  var gameManager = new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager, History);
  var bot = new Bot(gameManager);
  bench = new Benchmark(bot);
});
