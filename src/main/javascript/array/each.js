
Array.prototype.each = function (handler, context) {
    var size = this.length

    if (typeof context == "undefined") context = this

    for (var i = 0; i < size; i++) {
        if (handler.call(context, this[i], i) == false) break
    }
}
