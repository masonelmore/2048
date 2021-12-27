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
        this.gameManager.inputManager.emit("keepPlaying");
    }

    var direction = this.nextMoveTreeMatrixCustomGrid();
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

Bot.prototype.nextMoveMatrix = function () {
    function scoreGrid(grid) {
        var scoringMatrix = [
            [0.121, 0.090, 0.059, 0.027],
            [0.113, 0.082, 0.051, 0.020],
            [0.105, 0.074, 0.043, 0.012],
            [0.098, 0.066, 0.035, 0.004],
        ]
        var score = 0;
        for (var x = 0; x < grid.size; x++) {
            for (var y = 0; y < grid.size; y++) {
                var tile = grid.cellContent({x: x, y: y});
                var value = tile === null ? 0 : tile.value;
                var weight = scoringMatrix[x][y];
                score += value * weight;
            }
        }
        return score;
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

// Search a tree of possible future grids to find the "best" move. A matrix is
// used to score the grid. Ideally the matrix would favor grids that prolong
// the game.
Bot.prototype.nextMoveTreeMatrix = function () {
    function Node(direction, grid, score) {
        this.direction = direction;
        this.grid = grid;
        this.score = score;
        this.children = [];
    }

    Node.prototype.addChild = function (child) {
        this.children.push(child);
    }

    Node.prototype.addChildren = function (children) {
        for (var i = 0; i < children.length; i++) {
            this.addChild(children[i]);
        }
    }

    Node.prototype.getChildren = function () {
        return this.children;
    }

    function score(grid) {
        var scoringMatrix = [
            // [1.000, 0.017, 0.011, 0.001],
            // [0.750, 0.026, 0.007, 0.001],
            // [0.500, 0.063, 0.004, 0.001],
            // [0.250, 0.125, 0.003, 0.002],
            // [2.000, 1.500, 0.750, 0.125],
            // [1.500, 0.750, 0.125, 0.063],
            // [0.750, 0.125, 0.063, 0.031],
            // [0.125, 0.063, 0.031, 0.012],
            [2.000, 0.250, 0.125, 0.001],
            [1.750, 0.500, 0.063, 0.003],
            [1.500, 0.750, 0.031, 0.006],
            [1.250, 1.000, 0.016, 0.012],
        ]
        var score = 0;
        for (var x = 0; x < grid.size; x++) {
            for (var y = 0; y < grid.size; y++) {
                var tile = grid.cellContent({x: x, y: y});
                var value = tile === null ? 0 : tile.value;
                var weight = scoringMatrix[x][y];
                score += value * weight;
            }
        }
        return score;
    }

    var directions = [UP, LEFT, RIGHT, DOWN];

    function buildTree(parent, depth) {
        if (depth <= 0) {
            return;
        }

        for (var i = 0; i < directions.length; i++) {
            var direction = directions[i];
            var grid = parent.grid.copy();
            var results = grid.move(direction);
            if (!results.moved) {
                continue;
            }

            // var s = results.score;
            // var node = new Node(direction, grid, s);
            // parent.addChild(node);
            // var nodes = possibleNodes(direction, grid, score(grid));
            var nodes = possibleNodes(direction, grid, results.score);
            for (var j = 0; j < nodes.length; j++) {
                parent.addChild(nodes[j]);
                buildTree(nodes[j], depth - 1);
            }
        }
    }

    function possibleNodes(direction, grid, score) {
        var nodes = [];
        grid.eachCell(function (x, y, tile) {
            if (!tile) {
                var newGrid = grid.copy();
                newGrid.cells[x][y] = new Tile({x: x, y: y}, 2);
                nodes.push(new Node(direction, newGrid, score));
                // nodes.push(new Node(direction, newGrid, score * 0.9));

                // var newGrid = grid.copy();
                // newGrid.cells[x][y] = new Tile({x: x, y: y}, 4);
                // nodes.push(new Node(direction, newGrid, score * 0.1));
            }
        });
        return nodes;
    }

    function bestDirection(tree, depth) {
        function dfs(tree, scores, path, maxDepth) {
            var nodes = tree.getChildren();
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                if (node.getChildren().length > 0) {
                    path.push(node.direction)
                    var rootDirection = path[0];
                    scores[rootDirection].score += node.score;
                    scores[rootDirection].count += 1;
                    scores = dfs(node, scores, path, maxDepth);
                }
            }
            path.pop();
            return scores;
        }

        var scores = [];
        scores[UP] = {score: 0, count: 0}
        scores[DOWN] = {score: 0, count: 0}
        scores[LEFT] = {score: 0, count: 0}
        scores[RIGHT] = {score: 0, count: 0}
        dfs(tree, scores, [], depth);

        var max = -1;
        var bestDir = -1;
        for (var i = 0; i < scores.length; i++) {
            if (scores[i].score > max) {
                max = scores[i].score;
                bestDir = i;
            }
        }
        return bestDir;
    }
    var start = new Date().getTime();

    var root = new Node(-1, this.gameManager.grid.copy(), -1);
    var depth = 4;
    buildTree(root, depth);
    var endBuild = new Date().getTime();

    var direction = bestDirection(root, depth);
    var endSearch = new Date().getTime();

    var end = new Date().getTime();
    console.log('total:', end - start, 'build:', endBuild - start, 'search:', endSearch - endBuild);

    return direction;
}

// Search a tree of possible future grids to find the "best" move. A matrix is
// used to score the grid. Ideally a matrix could encapsulate a decent strategy
// to prolong the game instead of writing complex rules for deciding which
// direction to choose every turn.
//
// This version uses a 1d array for the grid to help reduce array/object
// allocations. With depth=3 the time goes from 200-300ms to <100ms. depth=4
// was also impossible with the class based grid--it crashed my browser tab.
Bot.prototype.nextMoveTreeMatrixCustomGrid = function () {

    // A Node is used to build a tree of potential future grids.
    function Node(direction, grid, score) {
        this.direction = direction;
        this.grid = grid;
        this.score = score;
        this.children = [];
    }

    Node.prototype.addChild = function (child) {
        this.children.push(child);
    }

    Node.prototype.addChildren = function (children) {
        for (var i = 0; i < children.length; i++) {
            this.addChild(children[i]);
        }
    }

    Node.prototype.getChildren = function () {
        return this.children;
    }

    // Convert 2d array indicies to a 1d array index.
    function norm(x, y) {
        var stride = 4;
        return x * stride + y;
    }

    function gridGet(grid, x, y) {
        return grid[norm(x, y)];
    }

    function gridSet(grid, x, y, value) {
        grid[norm(x, y)] = value;
    }

    // Convert a class-based Grid to a 1d array.
    function gridConvert(grid) {
        var newGrid = new Array(16);
        grid.eachCell(function (x, y, tile) {
            if (!tile) {
                newGrid[norm(x, y)] = 0
            } else {
                newGrid[norm(x, y)] = tile.value;
            }
        });
        return newGrid;
    }

    function gridCopy(grid) {
        var newGrid = new Array(grid.length);
        for (var i = 0; i < grid.length; i++) {
            newGrid[i] = grid[i];
        }
        return newGrid;
    }

    // Grid.move() modified for a 1d array based grid.
    function gridMove(grid, direction) {
        function getVector(direction) {
            // Vectors representing tile movement
            var map = {
                0: { x: 0,  y: -1 }, // Up
                1: { x: 1,  y: 0 },  // Right
                2: { x: 0,  y: 1 },  // Down
                3: { x: -1, y: 0 }   // Left
            };
            return map[direction];
        }

        function buildTraversals(vector) {
            var traversals = { x: [], y: [] };

            for (var pos = 0; pos < 4; pos++) {
              traversals.x.push(pos);
              traversals.y.push(pos);
            }

            // Always traverse from the farthest cell in the chosen direction.
            if (vector.x === 1) traversals.x = traversals.x.reverse();
            if (vector.y === 1) traversals.y = traversals.y.reverse();

            return traversals;
        }

        var vector     = getVector(direction);
        var traversals = buildTraversals(vector);
        var moved      = false;
        var score      = 0;

        // Loop through rows or columns based on direction. The original `move`
        // used a `findFarthestPosition` function for each cell, and I figured
        // I could save a few cycles by keeping track of open cells and cells
        // that can be merged into. The order in which we loop through the x
        // y coordinates is important because we use a single variable to track
        // the open cells and merge candidates. If a cell was moving left or
        // right, for example, and we were looping through rows, we would need
        // something more complex to keep track of the open cells and merge
        // candidates.
        if (direction === LEFT || direction === RIGHT) {
            traversals.y.forEach(function (y) {
                var mergeCandidate = { x: -1, y: -1, value: -1 };
                var openCell = { x: -1, y: -1 };
                traversals.x.forEach(function (x) {
                    move(x, y, mergeCandidate, openCell);
                });
            });
        } else {
            traversals.x.forEach(function (x) {
              var mergeCandidate = { x: -1, y: -1, value: -1 };
              var openCell = { x: -1, y: -1 };
                traversals.y.forEach(function (y) {
                    move(x, y, mergeCandidate, openCell);
                });
            });
        }

        function move(x, y, mergeCandidate, openCell) {
            var cell  = { x: x, y: y };
            var value = gridGet(grid, x, y);

            // Initialize the open cell.
            if (openCell.x === -1 && value === 0) {
                openCell.x = x;
                openCell.y = y;
            }

            // Move the current cell if there's an open cell available.
            if (openCell.x !== -1 && value > 0) {
                gridSet(grid, openCell.x, openCell.y, value);
                gridSet(grid, cell.x, cell.y, 0);

                cell.x = openCell.x;
                cell.y = openCell.y;

                // The open cell can be moved one space forward in the opposite
                // direction of travel.
                // TODO: `vector` is from outer scope.
                openCell.x -= vector.x;
                openCell.y -= vector.y;

                // TODO: `moved` is from outer scope.
                moved = true;
            }

            if (value === mergeCandidate.value) {
                gridSet(grid, mergeCandidate.x, mergeCandidate.y, value * 2);
                gridSet(grid, cell.x, cell.y, 0);

                score += value * 2;

                // The cell was moved next to the merge candidate above, which
                // means it is the new open cell.
                openCell.x = cell.x;
                openCell.y = cell.y;

                mergeCandidate.x = -1;
                mergeCandidate.y = -1;
                mergeCandidate.value = -1;

                // TODO: `moved` is from outer scope.
                moved = true;
            } else if (value > 0) {
                // This cell wasn't merged. It becomes the new merge candidate.
                mergeCandidate.x = cell.x;
                mergeCandidate.y = cell.y;
                mergeCandidate.value = value;
            }
        }

        return {
            moved: moved,
            score: score,
        }
    }

    function gridScore(grid) {
        // Somewhat arbitrary scoring matrix in an attempt to convince the bot
        // brain to favor tiles in descending order (in a snake like path). My
        // intuition says that it's easier to get high scores if the grid is
        // organized this way. For example:
        //      0 1 2
        //      5 4 3
        //      6 7 8
        // TODO: Slap some machine learning on this and let the computer figure
        //       out what a good matrix looks like.
        var scoringMatrix = [
            1.000, 0.563, 0.500, 0.063,
            0.938, 0.625, 0.438, 0.125,
            0.875, 0.688, 0.375, 0.188,
            0.813, 0.750, 0.313, 0.250,
        ]
        var score = 0;
        for (var i = 0; i < grid.length; i++) {
            score += grid[i] * scoringMatrix[i];
        }
        return score;
    }

    var directions = [UP, LEFT, RIGHT, DOWN];

    function buildTree(parent, depth) {
        if (depth <= 0) {
            return;
        }

        for (var i = 0; i < directions.length; i++) {
            var direction = directions[i];
            var grid = gridCopy(parent.grid);
            var results = gridMove(grid, direction);
            if (!results.moved) {
                continue;
            }

            // Give less weight to scores deeper in the tree.
            // TODO: Don't hardcode the max depth (3).
            var score = gridScore(grid) * (depth / 3);
            var nodes = potentialGrids(direction, grid, score);
            for (var j = 0; j < nodes.length; j++) {
                parent.addChild(nodes[j]);
                buildTree(nodes[j], depth - 1);
            }
        }
    }

    // Build a list of potential grid states after moving a cell.
    function potentialGrids(direction, grid, score) {
        var nodes = [];
        for (var i = 0; i < grid.length; i++) {
            if (grid[i] === 0) {
                var newGrid = gridCopy(grid);
                // TODO: What to do about the 10% chance for a value of 4?
                //       Give grids with a new value of 2 a weight of 0.90, and
                //       4 a weight of 0.10?
                newGrid[i] = 2;
                nodes.push(new Node(direction, newGrid, score));
            }
        }
        return nodes;
    }

    // Search a tree of future grids to find the best direction.
    // TODO: Revisit the search strategy. Summing up the scores for each
    //       direction may not be an optimal solution.
    function bestDirection(tree) {
        function dfs(tree, scores, path) {
            var nodes = tree.getChildren();
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                if (node.getChildren().length > 0) {
                    path.push(node.direction)
                    var rootDirection = path[0];
                    scores[rootDirection].score += node.score;
                    scores[rootDirection].count += 1;
                    scores = dfs(node, scores, path);
                } else if (path.length === 0) {
                    // We are at the top of the tree and this direction results
                    // in a game over. If we don't add the score here and all
                    // directions lead to a game over, then the bot will be
                    // stuck in an infinite loop.
                    scores[node.direction].score += node.score;
                    scores[node.direction].count += 1;
                }
            }
            path.pop();
            return scores;
        }

        // Search the tree
        var scores = [];
        scores[UP] = {score: 0, count: 0}
        scores[DOWN] = {score: 0, count: 0}
        scores[LEFT] = {score: 0, count: 0}
        scores[RIGHT] = {score: 0, count: 0}
        dfs(tree, scores, []);

        // Figure out which direction has the best score
        var max = -1;
        var bestDir = -1;
        for (var i = 0; i < scores.length; i++) {
            if (scores[i].score > max) {
                max = scores[i].score;
                bestDir = i;
            }
        }
        return bestDir;
    }
    var start = new Date().getTime();

    var root = new Node(-1, gridConvert(this.gameManager.grid), -1);
    var depth = 3;
    buildTree(root, depth);
    var endBuild = new Date().getTime();

    var direction = bestDirection(root);
    var endSearch = new Date().getTime();

    var end = new Date().getTime();
    console.log('total:', end - start, 'build:', endBuild - start, 'search:', endSearch - endBuild);

    return direction;
}
