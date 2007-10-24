
xmvc.Kernel = function () {
    var queue   = []
    var running = false
    var kernel  = this
    
    this.yield = function (action) {
        if (running) queue.push(action)
    }

    this.doOneEvent = function () {
        queue.shift()()
    }

    this.run   = function () {
        running = true

        this.doOneEvent()
        /* I can only do this without wrapping because this is all private data
         */
        setTimeout(function () { kernel.run }, 0)
        if (queue.length == 0) running = false
    }
}
