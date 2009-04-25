function Sequence () {
    var curval = 0

    this.getCurrentValue = function () {
        return curval
    }

    this.getNextValue = function () {
        return curval++
    }
}
