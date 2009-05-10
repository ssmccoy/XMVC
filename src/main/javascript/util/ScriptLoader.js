/**
 * @fileoverview
 * Strategies for loading scripts.
 */

var global = this

function HttpJavaScriptLoader (globals) {
    this.onload  = function () {}
    this.onerror = function (error) {
        window.alert(error)
    }

    this.load = function (script) {
        var loader  = this
        var request = new HttpRequest(script)

        request.async = true
        request.get()

        request.callback = function (request) {
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
