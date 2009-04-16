

/**
 * @constructor
 * @class
 * The eXtensible Markup View Controller.
 * 
 * @author <a href="tag@cpan.org">Scott S. McCoy</a>
 */
xmvc.Controller = function (document, xpathFactory, xsltFactory) {
    if (xpathFactory == undefined) 
        xpathFactory = new xmvc.ContextLocatorFactory()
    if (xsltFactory == undefined)
        xsltFactory  = new xmvc.XSLTProcessorFactory()
    var controller = this

    /**
     * Fetch the given configuration file and initialize XMVC.
     *
     * <p><b><u>Note</u></b> <i>This operation is asynchronous.  Population of
     * the given document will not begin until the file is fetched
     * asynchronously and parsed.</i></p>
     *
     * @param {String} uri - Absolute or relative URI of configuration file.
     */
    this.configure = function (uri) {
        new xmvc.ConfigurationParser(this, uri).parse()
    }

    /**
     * A factory method for event handlers.
     * <p>Given a set of {@link xmvc.Action}, provide a function which when
     * executed in the context of a node will create an observer for each
     * action, provide the observer to the action invoking it, and exit early
     * if a value of <code>false</code> is returned by any of the action
     * handlers.</p> 
     *
     * @return function
     */
    this.createEventHandler = function (actions) {
        return function (event, target) {
            for (var i = 0; i < actions.length; i++) {
                var action   = actions[i]        /* someday more than alert */
                var observer = new xmvc.Observer(this, action, window.alert)
                var result   = action.onaction(this, event, observer)

                if (result == false) return false
            }
        }
    }

    /**
     * Default handler for all events.
     * 
     * <p>This is an intermediate event handler which will is used to handle
     * all events.  It's registered with the event API, and is expected to be
     * called with the target event as it's actual object.  It uses locally
     * scoped references to access necessary data within the controller
     * instance it belongs to.</p>
     *
     * @param {Event} event The event the operation happened on.
     */
    this.event = function (event) {
        var id = this.getAttribute("id")
        var type = event.type
        var actions 
        
        if (id && handlerMap[id]) 
            actions = handlerMap[id][type]

        if (!actions) {
            var cls = this.getAttribute("class")

            if (cls && updateMap[cls]) 
                actions = updateMap[cls][type]

            if (actions == undefined) 
                throw new Error("ControllerError: unable to locate event" +
                    "(id=\"\f\":class=\"\f\":type=\"\f\"".format(id, cls, type))
            else
                id = cls // Do we need this?
        }

        for (var i = 0; i < actions.length; i++) {
            var action = actions[i]
            var observer = new xmvc.Observer(this, action, controller)

            var handler = action.handler

            window.debug("recieved event \f[\f] dispatching to \f"
                    .format(id, type, handler))

            /* If we want to stop the event we need to return false, we'll let the
             * action handler do this if it wants.
            if (typeof  == "undefined") {
                window.error("Unable to locate handler: \f".format(handler))
            }
            
            else if (controller.actions[handler].call(this, event, observer) 
                    === false) return false
             */
        }

        return true 
    }

    function addEventTo (node, type, callback, capture) {
        if (node.addEventListener) {
            node.addEventListener(type, callback, capture)
            return true
        }
        else if (node.attachEvent) {
            return node.attachEvent("on" + type, callback)
        } 
        
        throw new Error("xmvc.Controller(): Internal Error: " +
                "event " + type + " could not be attached to " + node)
    }

    function removeEventFrom (node, type, callback, capture) {
        if (node.removeEventListener) {
            node.removeEventListener
        }
        throw new Error("xmvc.Controller(): Internal Error: " +
                "event " + type + " could not be removed from " + node)
    }

    function eventHandler (scope, type, key, method) {
        return function (event) {
            var context = scope.valueOf(key)

            var observer = new xmvc.Observer(controller)

            if (method == undefined) {
                if (typeof context == "function") {
                    context.call(this, event, observer)
                }
                else
                    throw new xmvc.ControllerError(
                    "Action \f on \f has no method but is not a function")
            }
            else {
                /* Dispatch to the method on the provided object */
                context[method](this, event, observer)
            }

            if (context == undefined) {
                throw new Error(
                    "Action " + type + " on " + key + " for " + method +
                    " has no defined context (object not defined?)")
            }
        }
    }

    /* Throws event stubs into the node given */
    function stubEventsFor (node, map, label) {
        if (typeof label != "undefined" &&
            typeof map[label] != "undefined") {
            for (var type in map[label]) {
                /* XXX: Depends on DOM Level 3 Events.  For working in IE,
                 * requires use IE2W3C. */
                node.addEventListener(type, controller.event, false)

                /* Special case...load is happening now - or already
                 * happened - or the programmer made a mistake.  In all
                 * cases, we should probably just hand over the load
                 * event rightaway.  We may not even have to hold on
                 * to the stub...but we do for good measure.

                 * This also means load is happening when an update is
                 * stuffed in the UI.
                 */
                if (type == "load") {
                    var event = document.createEvent("Event")
                    /* XXX Don't let this bubble, or it will infinite
                     * loop!
                     */
                    event.initEvent("load", false, false)

                    node.dispatchEvent(event)
                }
            }
        }
    }

    /* Let DOJO pick this up */
    var dispatchEvent = function (event) {
        if (event.type == undefined) 
            throw new EventException(EventException.UNSPECIFIED_EVENT_TYPE_ERR)

        event.target = event.currentTarget = this;
        handleEvent(this, event);
    }

    function connectDOMLevel2EventAPI (node) {
        node.dispatchEvent       = dispatchEvent
        node.addEventListener    = addEventListener
        node.removeEventListener = removeEventListener
    }

    /**
     * Recursively populate a document fragment with event stubs.
     *
     * <p>This method will parse the given element and all of it's children,
     * looking for matching class names or element ids, and upon finding them,
     * will register events for all actions matching the controllers current
     * configuration.  These events are little more than stubs, which look up
     * the appropate action handler later.  This allows potential asynchornous
     * loading of action handlers prior to having configured this object.  Note
     * also that handlers described in the XMVC configuration will be fetched
     * asynchronously in this fashion.</p>
     *
     * <p>Calling this method is required during initialization of the
     * controller.  Typically, one would simply call:
     *
     * <pre>
     *   controller.populate(document)
     * </pre>
     *
     * It's quite performant in the majority of scenarios.  However there are
     * occasions where one might not want to use the entire document.  Also,
     * this call may sometimes need to be invoked after initialization.</p>
     *
     * <p>During normal operation, there is typically need to call this method
     * after initialization.  All transformation results are populated using
     * this method, so events are attached typically immediately a new UI
     * update is rendered.p>
     *
     * @param {Element} element the element to begin from.
     */

    this.process  = function (node) {
        /* Let the browser do a cycle, since most browsers need to at this
         * point (mozilla included).  Following that cycle, start the recursive
         * population... */
        setTimeout(function () { controller.populate(node, node.scope) }, 0)
    }

     /* TODO Figure out if there is some tricky way where we can actually
      * iterate over document.all if we're given a root level element of a
      * document and document.all exists.  This of course gets even more tricky
      * since we've recently introduced scopes, but it'd be faster than this
      * recursive descent. */
    this.populate = function (element, scope) {
        var currentScope = new xmvc.ControllerScope(scope)
        element.scope = currentScope

        if (element.nodeType == Node.ELEMENT_NODE) {
            /* XXX IEtoW3C */
            if (!element.addEventListener) hookupDOMEventsOn(node)

            for (update in updates) {
                update.applyEvents(element, scope)
            }
        }

        for (var i = 0; i < element.childNodes.length; i++) {
            this.populate(element.childNodes[i], currentScope)
        }
    }

    function stubEventsFor (node, scope, id) {
        var events = registry.eventsForId(id) 

        for (var i = 0; i < events.length; i++) {
            var event = events[i]

            if (event.type == "load") {
                var loadEvent = document.createEvent("Event")
                /* XXX Don't let this bubble, or it will infinite loop!
                 */
                loadEvent.initEvent("load", false, false)
                /* node.dispatchEvent(loadEvent) XXX: Instead, just pretend, so
                 * we don't have to hold on to this reference.  Load shouldn't
                 * happen on it more than once.
                 */
                event.handler.call(node, loadEvent)
            }
            else {
                node.addEventListener(event.type, event.handler, event.bubbles)
            }
        }
    }

    /** 
     * Register an action handler.
     * 
     * <p>This method registers an action handler of a given name to an object.
     * The object may be a function, or a normal object.  If it has a type of
     * function, then that function will be invoked when said action happens.
     * If the method is not, and the third argument is defined, then the list
     * of method names provided in the third argument will be published as
     * methods to the given object for the supplied name.  In the third case,
     * the object will be expected to have an "onaction" which will be invoked.
     * </p>
     *
     * @param {String} name The name of the action.
     * @param {Object} handler The handler object.
     * @param {Array} methods The list of available method names.
     */
    this.register = function (name, handler, methods) {
        var isPublish  = typeof methods != "undefined" && methods != null
        var isFunction = typeof handler == "function"

        if (isPublish) {
            if (isFunction) {
                /* Throw an error */
            }
            for (var i = 0; i < methods.length; i++) {
                var method = methods[i]

                /* publish handler.method */
            }
        }
        else if (isFunction) {
            /* publish handler */
        }
        else {
            /* publish handler.onaction */
        }
    }

    /**
     * @class Legacy class for supporting a poor API.
     * @author <a href="smccoy@marchex.com">Scott S. McCoy</a>
     * <p>This exists for legacy support purposes only.  Ignore it.</p>
     */
    window.xmvc.ControllerAction = function () {
        controller.register.call(arguments)
    }
}
