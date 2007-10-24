
/**
 * @constructor Create an Observer for populating the provided stylesheet.
 * @param {xmvc.Transformer} A transformer to popoulate.
 * @class An observer for stylesheet into a transformer when it becomes
 * available.
 * 
 * <p>This observer provides the stylesheet for the {@link xmvc.Transformer}
 * object provided.  When the observer is notified, the provided document is
 * used as a stylesheet.</p>
 *
 * @author <a href="tag@cpan.org">Scott S. McCoy</a>
 */
xmvc.TransformLoadingObserver = function (transformer) {
    this.onnotify = function (stylesheet) {
        transformer.stylesheet(stylesheet)
    }

    this.onerror  = function (error) {
        /* TODO Notify of error */
    }
}
