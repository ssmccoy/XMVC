
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

        if (queue.length == 0) {
            running = false
        }
        else {
            /* Let the browser do a cycle as well.  This slows down our event
             * loop considerably, but stops the browser from freezing up while
             * long running processes are under way */
            setTimeout(function () { kernel.run() }, 1)
        }
    }
}
