/* The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with the
 * License. You may obtain a copy of the License at http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for
 * the specific language governing rights and limitations under the License.
 *
 * The Original Code is Copyright 2007, Marchex INC.
 *
 * The Initial Developer of the Original Code is Scott S. McCoy.
 *
 * All Rights Reserved.
 */

/* XXX: These dependencies must be removed for release! */
use("util.cbclient"); 
use("titus.constants");

var XMLNS = "http://www.w3.org/2000/xmlns/"

/**
 * @fileoverview
 * @depends cbclient.js
 * @depends sarissa.js
 * The eXtensible Markup View Controller.
 *
 * <p>This framework is effectively a means for building a controller, as per
 * an MVC type of design paradigm.  It does not follow this paradigm precisely,
 * but instead models it for a means appropriate to building graphical user
 * interfaces that use eXtensible Markup Language (XML) documents as their user
 * interface medium.  This controller is design for deligating and describing
 * actions which may take place within the user interface, routing them to
 * their prospective owners, accepting their responses and transforming the
 * given responses to markup suitable for the user interface display.</p>
 *
 * <p>This framework is designed around several assumptions for markup driven
 * graphical user interfaces.  The first as that the application itself
 * provides little of it's actual functionality, and in tern, is typically
 * little more than an interface to a larger system communicated to via some
 * form of services.  The second, is that typically these services would
 * additionally use markup as their transfer method.  The third, is that
 * calling these services will typically be asynchronous and the result of such
 * calls often will not be available until after the handling of the action has
 * been completed.</p>
 *
 * <p>At one time, this framework had heavy dependency on being in a mozilla
 * chrome environment.  This is no longer true, however, optimizations and
 * additional features are availablde when used in an environment.  This
 * framework defines a mechanism for dependency loading that is simple and
 * uniform, for instance, and will use the javascript subscript loader XPCOM
 * component when it is available.  This makes for easier debugging, as it
 * displays the actual file names, line numbers, and currently executing
 * functions when errors occur and makes available in both explicit system
 * exceptions a full stack trace.</p>
 *
 * <p>In addition to these features, this framework comes with a generic SOAP
 * Client implementation.</p>
 *
 * @see soap.js
 */

window.xmvc = {}

/**
 * An enumeration of action types.
 */
xmvc.ActionType = {
    /** A contextual callback.  The handler type is a function which will
     * be executed as an attached event. */
    callback: {},
    /* possible future types.
    object: {},
    class: {}
    */
}

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
xmvc.Observer = function (target, action, controller) {

    this.controller = controller
    this.target     = target
    /**
     * Processors to be applied to this response.
     * @type Array
     */
    this.processors = action.transforms

    /**
     * Notify the observer of an update.
     *
     * <p>Non-error updates are to invoke this method.</p>
     *
     * @param {XMLDocumentFragment} fragment
     */
    this.onnotify = function (fragment) {
        for (var i = 0; i < this.processors.length; i++) {
            var processor = this.processors[i]

            if (processor.target) {
                context = document.getElementById(processor.target)
                if (! context) {
                    throw new Error("Unable to locate target: " + 
                                processor.target)
                }
            }
            else if (processor.context) {
                try {
                    var xpathres = document.evaluate( processor.context,
                            context, NSResolver,
                            XPathResult.FIRST_ORDERED_NODE_TYPE, null )
        
                        // If there is more than one result, behavior is undefined.
                    context = xpathres.singleNodeValue
                }
                catch (error) {
                    throw new Error( "Unable to locate context given xpath " +
                         " expression: " + processor.context + " executed at " +
                         context)
                }
    
                if (context == null) {
                   throw new Error(
                           "context expression returned no results")
                }
            }
    
            var time = new Date()
            var update = processor.xsl.transformToFragment(
                    fragment, document)
    
            window.debug("Transformation took " + new Date() - time + "ms")
    
            /* We cannot add the events immediately or they simply will
             * fail to work.  Event's on un-rendered nodes are
             * optimized away.  But these nodes will be rendered when
             * this is finished, so a simple delay to allow a rendering cycle
             * will make sure
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
                        window.debug("delaying population of " + child)
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
    /**
     * Handle contextual replacement.
     */
    replace: function (context, update) {
        context.parentNode.replaceChild(update, context)
    },

    /**
     * Handle contextual appending.
     */
    append: function (context, update) {
        context.appendChild(update)
    }
}

/* Until the rest of this code is cleaned up, NSResolver has to be global. */

function NSResolver (prefix) {
    return NSResolver.prototype[prefix] ||
        "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
}

NSResolver.prototype = []

/**
 * Build a controller object.
 * @constructor
 * @class The core of the eXtensible Markup View Controller.
 *
 * <p>This implements a configuration file parser and action registration
 * API.</p>
 * @author <a href="smccoy@marchex.com">Scott S. McCoy</a>
 */
xmvc.Controller = function () {
    var controller = this

    if (CBClient == undefined) 
        throw new Error("Missing dependency: CBClient.js")

    function loadHandlers (entity) {
        var handlers = entity.childNodes

        for (var i = 0; i < handlers.length; i++) {
            switch (handlers[i].localName) {
                case "script":
                    var type = handlers[i].getAttribute("type")

                    if (type.toLowerCase() != "text/javascript") 
                        return window.debug("Unknown script type \f"
                            .format(type))

                    var src = handlers[i].getAttribute("src")

                    window.debug("Loading \f".format(src))
                    load(src)
            }
        }
    }

    function extractTemplateParams (element) {
        var result = []
        var childNodes = element.childNodes

        for (var i = 0; i < childNodes.length; i++) {
            if (childNodes[i].localName == "param") {
                var name = childNodes[i].getAttribute("name")
                var value = childNodes[i].getAttribute("value")

                result[ name ] = value
            }
        }

        return result
    }

    function extractTransforms (element) {
        var transforms = element.childNodes
        var result = []

        for (var i = 0; i < transforms.length; i++) {
            if (transforms[i].localName != "transform") continue;

            var stylesheet  = transforms[i].getAttribute("src")
            var target      = transforms[i].getAttribute("target")
            var context     = transforms[i].getAttribute("context")
            var style       = transforms[i].getAttribute("style")

            if (style == null) {
                style = "replace" /* default */
            }

            var populate = 
                  transforms[i].getAttribute("populate") != "false"

            if (target && context) {
                window.error("Unable to process transform \f (\f)"
                        .format(stylesheet, "target and " +
                            "context are mutually exclusive"))
                continue
            }

            /* Fetch the XSLT stylesheet asynchronously and when it's
             * complete build a processor and import the necessary
             * style sheet
             */

            var params = extractTemplateParams(transforms[i])

            var cb = new CBClient(
                controller.addProcessor(style, populate, result, params,
                    target, context)
            )

            cb.get(stylesheet)
        }

        // Note: This will be an empty array when it's handed back, so the
        // same array object needs to be kept around because it'll be
        // populated later (after these asynchronous calls complete and
        // their callback handlers are executed)
        return result
    }

    function parseEventsTransforms (map, id, actions) {
        if (typeof map[id] == "undefined") map[id] = []

        for (var i = 0; i < actions.length; i++) {
            if (actions[i].localName == "action") {
                var type = actions[i].getAttribute("type")
                var handler = actions[i].getAttribute("handler")

                map[id][type] = map[id][type] || []

                map[id][type].push({
                    handler: handler,
                    transforms: extractTransforms(actions[i])
                })
            }
        }
    }

    function parseView (entity) {
        var id = entity.getAttribute("id")

        var actions = entity.childNodes

        parseEventsTransforms(controller.handlerMap, id, actions)
    }

    function parseUpdate (entity) {
        var cls = entity.getAttribute("class")
        var actions = entity.childNodes

        parseEventsTransforms(controller.updateMap, cls, actions)
    }

    function parseConfig (response) {
        if (response.status != 200) {
            throw new Error("ControllerError: Unable to load configuration")
        }

        var top = response.document.documentElement

        if (top.localName != "controller" ||
            top.namespaceURI != "http://www.blisted.org/MVD") {
            window.error("Invalid configuration file")
        }

        for (var i = 0; i < top.attributes.length; i++) {
            if (top.attributes[i].namespaceURI == XMLNS) {
                window.debug("Registering " + top.attributes[i].localName +
                    " as " + top.attributes[i].value)
                NSResolver.prototype[ top.attributes[i].localName ] =
                    top.attributes[i].value
            }
        }

        var entities = top.childNodes

        for (var i = 0; i < entities.length; i++) {
            switch (entities[i].localName) {
                case "view":
                    parseView(entities[i])
                    break;
                case "update":
                    parseUpdate(entities[i])
                    break;
                case "handlers":
                    loadHandlers(entities[i])
                    break;
            }
        }

        controller.populate(document)
    }

    var useragent = new CBClient(parseConfig)

    this.configure = function (uri) {
        window.debug("Configure called!")
        useragent.get(uri)
    }
}

xmvc.Controller.prototype = {
    processors: [],
    actions: [],
    updateMap: [],
    handlerMap: [],

    /** Return a callback for creating a processor */
    addProcessor: function (style, populate, stylesheets, params, target,
        context) {
        return function (response) {
            if (response.status != 200) {
                throw new Error("Unable to locate stylesheet: \f"
                        .format(stylesheet))
            }

            var xsltprocessor = new XSLTProcessor
    
            stylesheets.push({
                xsl: xsltprocessor,
                target: target,
                context: context,
                style: style,
                populate: populate
            })

            for (var key in params) {
                xsltprocessor.setParameter(null, key, params[key])
            }

            xsltprocessor.importStylesheet(
                response.document
            )
        }
    },
    
    stubEventsFor: function (node, map, label) {
        if (typeof label != "undefined" &&
            typeof map[label] != "undefined") {
            for (var type in map[label]) {
                node.addEventListener(type, this.event, false)

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
    },

    /**
     * Recursively populate a document fragment with event stubs.
     *
     * <p>This method will parse the given element and all of it's children,
     * looking for matching class names or element ids, and upon finding them,
     * will register events for all actions matching the controllers current
     * configuration.  These events are little more than stubs, which look up
     * the appropate action handler later.  This allows potentially
     * asynchornous loading of action handlers prior to having configured this
     * object.</p>
     *
     * <p>During normal operation, there is no need to call this method
     * yourself.  It is invocated as a part of the controllers initialization
     * process on the document's root element.  The entire document as present
     * during start up is parsed and all required events are attached.  One
     * would invoke this themselves when a need arises to arbitrarily populate
     * some part of the document.</p>
     */
    populate: function (element) {
        if (element.nodeType == Node.ELEMENT_NODE) {
            var id = element.getAttribute("id")
            this.stubEventsFor(element, this.handlerMap, id)

            var cls = element.getAttribute("class")
            this.stubEventsFor(element, this.updateMap, cls)
        }

        for (var i = 0; i < element.childNodes.length; i++) {
            this.populate(element.childNodes[i])
        }
    },

    /**
     * Default handler for all events.
     *
     * <p>This is an intermediate event handler which will is used to handle
     * all events.</p>
     */
    event: function (event) {
        var controller = xmvc.Controller.prototype
        var id = this.getAttribute("id")
        var type = event.type
        var actions 
        
        if (id && controller.handlerMap[id]) 
            actions = controller.handlerMap[id][type]

        if (!actions) {
            var cls = this.getAttribute("class")

            if (cls && controller.updateMap[cls]) 
                actions = controller.updateMap[cls][type]

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

            var actionhandler = controller.actions[handler]

            /* If we want to stop the event we need to return false, we'll let the
             * action handler do this if it wants.
             */
            if (typeof actionhandler == "undefined") {
                window.error("Unable to locate handler: \f".format(handler))
            }
            
            else if (controller.actions[handler].call(this, event, observer) 
                    === false) return false
        }

        return true
    },

    register: function (action, type, handler) {
        /* Type is always callback for now, other types aren't supported. */
        if (type == undefined) {
            type = xmvc.ActionType.callback
        }

        this.actions[action] = handler
    }
}

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
        controller.register(name, xmvc.ActionType.callback, handler)
    }
}
