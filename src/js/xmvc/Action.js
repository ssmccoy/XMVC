
/**
 * A generic action.
 * <p></p>
 */
xmvc.Action = function (handler, method, register, type, transforms) {
    var action      = this
    this.transforms = function () { return transforms }
    this.type       = function () { return type       }

    this.onaction = function (event, observer) {
        return callback.call(this, event, observer)
    }

    this.event    = function (scope) {
        switch (register) {
            default:
            case "function": return function (event) {
                var observer = new xmvc.Observer(action)
                var callback = scope.get(handler)
                callback(event, observer)
            }

            case "method": return function (event) {
                var observer = new xmvc.Observer(action)
                var object   = scope.get(handler)
                object[method](event, observer)
            }

            case "object": return function (event) {
                scope.set(handler, registry.lookup(handler))
            }

            case "constructor": return function (event) {
                var observer = new xmvc.Observer(action)
                scope.set(handler, registry.lookup(handler)(event, observer)
            }
        }
    }
}
