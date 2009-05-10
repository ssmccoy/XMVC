
Array.prototype.each = function (handler) {
    var size = this.length

    for (var i = 0; i < size; i++) {
        if (handler(this[i]) == false) break
    }
}
