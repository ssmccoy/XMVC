/**
 * @constructor
 * @class An object representing a transform action.
 *
 * <p>Not to be confused with Transformer.</p>
 *
 * @author <a href="tag@cpan.org">Scott S. McCoy</a>
 */
xmvc.Transform = function (controller, locator, style, transformer) {

    /**
     * Apply transformation to the given context.
     */
    this.apply = function (context, input) {
        var fragment = transformer.transform(input)
        var node     = locator.locate(context)
        
        if (style == xmvc.Transform.Style.append) {
            node.appendChild(fragment)
        }
        else if (style == xmvc.Transform.Style.replace) {
            node.parentNode.replaceChild(fragment, node)
        }

        controller.process(fragment)
        // TODO It's the job of the controller to deal with this detail.
        // setTimeout(controller.process(fragment), 0)
    }
}

/* Simple enumeration */
xmvc.Transform.Style = []
xmvc.Transform.Style.append  = {}
xmvc.Transform.Style.replace = {}
