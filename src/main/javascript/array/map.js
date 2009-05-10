Array.prototype.map = function (handler) {
    var result = []

    for (var i = 0; i < this.length; i++) {
        result.push(handler(this[i]))
    }

    return result
}
