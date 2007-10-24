

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

    this.onerror  = function (message) {
        if (errorlistener) errorlistener(message)
    }

    /* XXX None of the following does anything currently, it's just to remind
     * me of how things were being done before. */
    function () {

        for (var i = 0; i < this.processors.length; i++) {
            var processor = this.processors[i]

            if (processor.target) {
                context = document.getElementById(processor.target)
                if (! context) {
                    throw new Error("Unable to locate target: \f"
                                .format(processor.target))
                }
            }
            else if (processor.context) {
                var xpathres = document.evaluate( processor.context,
                        context, NSResolver,
                        XPathResult.FIRST_ORDERED_NODE_TYPE, null )
    
                    // If there is more than one result, behavior is undefined.
                context = xpathres.singleNodeValue
    
                if (context == null) {
                   throw new Error(
                           "context expression returned no results")
                }
            }
    
            var time = new Date()
            var update = processor.xsl.transformToFragment(
                    fragment, document)
    
            window.debug("Transformation took \fms".format(new Date() - time))
    
            /* We cannot add the events immediately or they simply will
             * fail to work.  Event's on un-rendered nodes are
             * optimized away.  But these nodes will be rendered when
             * this is finished, so a microscopic delay will make sure
             * we let this thing render first.
    
             * The document fragment disappears after the
             * update/rendering.  So we cannot operate on that
             * directly.
    
             * The way this works is real obnoxious.  But it gets the
             * job done.
             */
    
            if (processor.populate) {
                for (var x = 0; x < update.childNodes.length; x++) {
                    ; (function () {
                        var child = update.childNodes[x]
                        window.debug("delaying population of \f".format(child))
                        window.setTimeout( function () {
                            var time = new Date()

                            /* NOTE: This was available from the constructor */
                            controller.populate(child)
                            window.debug("Population took \fms".format( 
                                new Date() - time))
                        }, 0 )
                    })()
                }
            }

            /* Dispatch from prototype */
            this[processor.style](context, update)
    
    /* This is how it used to work, go ahead and remove it once thie update is
     * complete.
            switch (processor.style) {
                case "replace":
                    context.parentNode.replaceChild(
                            update, context)
                    break;
                case "append":
                    context.appendChild(update)
                    break;
            }
    */
        }
    }

    /**
     * Observe an error.
     *
     * <p>This method allows the object observing the current action to observe
     * an error.  Currently, the default implementation of this only alerts the
     * user.</p>
     */
    this.onerror  = function (error) {
        /* TODO Make this more flexible than just alerting. */
        window.alert(error)
    }
}

xmvc.Observer.prototype = {
    replace: function (context, update) {
        context.parentNode.replaceChild(update, context)
    },

    append: function (context, update) {
        context.appendChild(update)
    }
}

