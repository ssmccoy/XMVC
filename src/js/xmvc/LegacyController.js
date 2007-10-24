/**
 * @class This exists for legacy support only.
 */
xmvc.LegacyController = function () {
    var controller = new xmvc.Controller()

    /** Configure controller. */
    this.configure = function (uri) {
        controller.configure(uri)
    }

    /**
     * @class This exists for legacy support only.
     */
    window.xmvc.ControllerAction = function (name, handler) {
        controller.register(name, xmvc.ActionType.method, handler)
    }
}
