function History(capacity, previousState) {
    this.capacity = capacity;

    if (previousState) {
        this.undoStack = new RingStack(capacity, previousState.undoStack);
        this.redoStack = new RingStack(capacity, previousState.redoStack);
    } else {
        this.undoStack = new RingStack(capacity);
        this.redoStack = new RingStack(capacity);
    }
}

// Add game state to the history
History.prototype.add = function (state) {
    this.undoStack.push(state);

    // We are starting a new "timeline". Future states must be wiped out.
    if (!this.redoStack.isEmpty()) {
        this.redoStack.clear();
    }
}

// Return the previous game state from the undo stack. The current game state
// is pushed onto the redo stack.
History.prototype.undo = function () {
    // Do not allow emptying the undo stack. The top of the stack is the current
    // state and the game doesn't support loading an empty state.
    if (this.undoStack.size <= 1) {
        return;
    }

    this.redoStack.push(this.undoStack.pop());

    // Return the state at the top of the stack because the game isn't
    // interested in the state we just popped off (the current state).
    return this.undoStack.peek();
}

// Return the next state from the redo stack. The state is moved back to the
// undo stack.
History.prototype.redo = function () {
    if (this.redoStack.isEmpty()) {
        return;
    }

    var state = this.redoStack.pop();
    this.undoStack.push(state);

    return state;
}

History.prototype.clear = function () {
    this.undoStack.clear();
    this.redoStack.clear();
}

History.prototype.serialize = function () {
    return {
        capacity: this.capacity,
        undoStack: this.undoStack.serialize(),
        redoStack: this.redoStack.serialize(),
    }
}

// RingStack is a circular buffer that behaves like a stack. Items at the
// bottom of the stack are overwritten when the stack reaches capacity.
function RingStack(maxSize, previousState) {
    if (previousState) {
        this.items = previousState.items;
        this.head = previousState.head;
        this.size = previousState.size;
        this.maxSize = previousState.maxSize;
    } else {
        this.items = new Array(maxSize);
        this.head = -1;
        this.size = 0;
        this.maxSize = maxSize;
    }
}

RingStack.prototype.push = function (item) {
    if (item === undefined) {
        throw "item is undefined";
    }

    this.head = this.nextIndex(this.head);
    this.items[this.head] = item;

    if (this.size < this.maxSize) {
        this.size++;
    }
}

RingStack.prototype.pop = function () {
    if (this.isEmpty()) {
        throw "stack is empty";
    }

    var item = this.items[this.head];
    delete this.items[this.head];
    this.head = this.prevIndex(this.head);
    this.size--;

    return item;
}

RingStack.prototype.nextIndex = function (i) {
    return (i + 1) % this.items.length;
}

RingStack.prototype.prevIndex = function (i) {
    i -= 1;
    if (i < 0) {
        i = this.items.length - 1;
    }
    return i;
}

RingStack.prototype.peek = function () {
    return this.items[this.head];
}

RingStack.prototype.isEmpty = function () {
    return this.size === 0;
}

RingStack.prototype.clear = function () {
    while (!this.isEmpty()) {
        this.pop();
    }
}

RingStack.prototype.serialize = function () {
    return {
        items: this.items,
        head: this.head,
        size: this.size,
        maxSize: this.maxSize
    }
}
