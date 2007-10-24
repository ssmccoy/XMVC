
/**
 * @constructor Create a loader with the given controller.
 * @class A Script Loader implementing the Observer pattern.
 * 
 * <p>Create a new function, parse it, execute it, let it get cleaned up.
 * Notice that this exposes the calling controller to the evaluated
 * code by providing it as an argument called "controller".  This is
 * interesting behavior that is luckily not deprecated (unlike
 * object.eval) and allows us to expose the controller somehow atleast.
 * Any code that does not create permanent references by attaching
 * itself to an existing object will get garbage collected.</p>
 *
 * <p>This means code loaded by this mechanism cannot create permanent
 * references available in other scripts.  This of course limits the
 * usability of the loading mechanism to actual event handlers or
 * anything that feels like trumping that behavior by registering
 * itself with the global window object, or anything similar.  This
 * appears to be preferable behavior, as there is no reason to redefine
 * how scripts are loaded or provide a framework for dependency
 * handling.  Other frameworks do this, and they probably do it well.</p>
 *
 * @author <a href="tag@cpan.org">Scott S. McCoy</a>
 */
xmvc.ScriptLoadingObserver = function (controller) {
    this.onnotify = function (script) {
        /* TODO Catch errors and relay them?   Might be useful for those that
         * want to push errors back to the server */
        new Function("controller", script)(controller)
    }

    this.onerror  = function (error) {
        /* Let's expose an error handler through the controller, or make it
         * factory oriented, or whatever...but these are program errors, so
         * it's acceptable for it to croak. */
    }
}
