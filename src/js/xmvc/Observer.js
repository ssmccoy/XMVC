/**
 * An observer for asynchronous updates.
 * @constructor
 * @author <a href="tag@cpan.org">Scott S. McCoy</a>
 * @class This object represents the observational pattern of XMVC.
 * 
 * <p>This constructor builds an object which represents the observational
 * pattern employed by XMVC.  Effectively, this is the mechanism the model
 * layer is supposed to use to notify the controller of updates or errors from
 * the model so that the view may be updated accordingly.  The purpose for the
 * observational pattern to create disconnection between action handling and
 * actions actual responses, in order to enable asynchronous operations at the
 * model layer.</p>
 */
xmvc.Observer = function (action, errorlistener) {
    /**
     * Notify the observer of an update.
     *
     * <p>Non-error updates are to invoke this method.</p>
     *
     * @param {XMLDocumentFragment} fragment
     */
    this.onnotify = function (fragment) {
        /* Wait what the fuck is going on here, the transform shit is for
         * the observer to do. */
        for (var transform in action.transforms()) {
            transform.apply(fragment)
        }
    }

    /**
     * Observe an error.
     *
     * <p>This method allows the object observing the current action to observe
     * an error.  Currently, the default implementation of this only alerts the
     * user.</p>
     */
    this.onerror  = function (message) {
        if (errorlistener) errorlistener(message)
    }
}
