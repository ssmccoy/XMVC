/**
 * @fileoverview
 * Strategies for loading scripts.
 */

var global = this

function SinglePassEvaluator () {
    var skipTable = {}

    this.isRequired = function (script) {
        if (script in skipTable) return false

        else return skipTable[script] = true 
    }
}

function HttpJavaScriptLoader (semaphore, globals) {
    var skipTable = {}

    this.onload  = function () {}
    this.onerror = function (error) {
        window.alert(error)
    }

    this.load = function (script) {
        /* TODO: This semaphore usage really doesn't belong here.  This is just
         * a cheap quick way to make initialization wait for static script
         * loading..
         *
         * Once I fix the initialization structure I should remove this.
         */

        if (this.isRequired(script)) {
            semaphore.acquire()

            var loader  = this
            var request = new HttpRequest(script)

            request.async = true
            request.get()

            request.callback = function (request) {
                /* TODO Remove semaphore usage. */
                semaphore.release()

                var source = request.responseText
                var code   = null

                try {
                    global.eval(source)
                }
                catch (error) {
                    loader.onerror(error)
                    throw new ScriptLoaderError(
                            "Error while executing \f: \f".format(script, error))
                }

                loader.onload()
            }
        }
    }
}

/**
 * A simple loader which makes use of the jit loader in contrib/ (by Jakob
 * Heuser).
 */
function JITLoader (semaphore) {
    this.onload = function () {}
    this.onerror = function (error) {}

    this.load = function (script) {
        if (this.isRequired(script)) {
            semaphore.acquire()

            var loader = this

            var success = function () {
                semaphore.release()
                loader.onload()
            }

            JIT.load(script, undefined, success)
        }
    }
}


var singlePassEvaluator = new SinglePassEvaluator()

HttpJavaScriptLoader.prototype = singlePassEvaluator
JITLoader.prototype            = singlePassEvaluator
