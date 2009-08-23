
/**
 * @class A simple enqueuing observer.
 */
function EnqueuingObserver (observer) {
    var queue       = []
    var initialized = false

    this.notify = function () {
        if (initialized) {
            this.delegate(observer, "notify", arguments)
        }
        else {
            queue.push([ observer, "notify", arguments ])
        }
    }

    this.error = function () {
        if (initialized) {
            this.delegate(observer, "error", arguments)
        }
        else {
            queue.push([ observer, "error", arguments ])
        }
    }

    this.delegate = function (object, method, arguments) {
        var methodRefence = object[method]

        methodRefence.apply(object, arguments)
    }

    this.initialize = function () {
        initialized = true

        for (var i = 0; i < queue.length; i++) {
            this.delegate(queue[i][0], queue[i][1], queue[i][2])
        }
    }
}
