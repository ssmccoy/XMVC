

/**
 * Configuration Parser for XMVC.
 * @constructor
 * @param {String} uri
 * @author <a href="tag@cpan.org">Scott S. McCoy</a>
 * @class This object parses XMVC configuration files.
 * 
 * <p>The purpose of this object is only to provide separation of roles,
 * keeping parser logic out of the controller itself.</p>
 *
 * @author <a href="tag@cpan.org">Scott S. McCoy</a>
 */
xmvc.ConfigurationParser = function (controller, sourceFetcherFactory, uri) {
    var updates  = []
    this.updates = function () { return updates }
    /**
     * XML Namespace Resolver for use with XPath API
     *
     * @private
     */

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
                    var observer = new xmvc.ScriptLoadingObserver(controller)

                    sourceFetcherFactory.create( observer ).get( src )

                    window.debug("Loading \f".format(src))
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
            /* We're expecting nothing but transforms, we don't know how to
             * handle these */
            if (transforms[i].localName != "transform") continue;

            var stylesheet  = transforms[i].getAttribute("src")
            var target      = transforms[i].getAttribute("target")
            var context     = transforms[i].getAttribute("context")
            var style       = transforms[i].getAttribute("style")

            if (style == null) {
                style = "replace" /* default */
            }

            /* defaults to true */
            var populate = 
                  transforms[i].getAttribute("populate") != "false"

            if (target && context) {
                /* TODO Relay errors.  This is an issue that needs to be dealt
                 * with.
                window.error("Unable to process transform \f (\f)"
                        .format(stylesheet, "target and " +
                            "context are mutually exclusive"))
                 */
                continue
            }

            /* Fetch the XSLT stylesheet asynchronously and when it's
             * complete build a processor and import the necessary
             * style sheet
             */

            var transformer = transformerFactory.createTransformer(),
                params      = extractTemplateParams(transforms[i]),
                observer    = new xmvc.TransformLoadingObserver(transformer),
                client      = clientFactory.create(observer)

            client.get(stylesheet)

            for (var key in params) transformer.set(key, params[key])

            if (context != undefined) {
                var locator =
                    expressionFactory.createExpression(startpoint, context)
            }
            else if (target != undefined) {
                /* NOTE getElementById isn't currently considered an optional
                 * definition of "id" in the configuration document. */
                var locator = new xmvc.ElementIdLocator(startpoint, target)
            }
            else {
                /* TODO throw some kind of error */
            }

            if (style in xmvc.Transform.Style) {
                var transform = new xmvc.Transform(controller, locator,
                        xmvc.Transform.Style[style], transformer)

                result.push(transform)
            }
            else {
                /* TODO throw some kind of error */
            }

        }

        /* None of these transforms will be ready until the stylesheets have
         * been connected */
        return result
    }

    function parseEventsTransforms (map, id, actions) {
        var result = []

        for (var i = 0; i < actions.length; i++) {
            if (actions[i].localName == "action") {
                var type     = actions[i].getAttribute("type")
                var handler  = actions[i].getAttribute("handler")
                var method   = actions[i].getAttribute("method")
                var register = actions[i].getAttribute("register")

                if (register == null) register = "function" /* default */

                if (!(register in registerHandler)) {
                    /* XXX ERROR */
                }

                var action   = new xmvc.Action(handler, method, register, type,
                        extractTransforms(actions[i]))

                /* TODO [20071021 16:51] We need to figure out how we're going
                 * to handle event registries.  It seems completely reasonable
                 * to allow for actions to not be available until they're
                 * called upon, by creating objects to represent them (based on
                 * name and usage context).  However, this would require a
                 * queue for load events.  Enqueing load events seems like it
                 * would be rather simple, in reality.  It's certainly been
                 * done before...in Titus.  In fact, all events could be
                 * enqueued until action handlers are actually loaded and
                 * registered.
                 */

                result.push(action)
            }
        }
        
        return result
    }

    function parseUpdate (entity) {
        return new xmvc.Update(entity.getAttribute("id"),
                               entity.getAttribute("class"),
                               extractTransforms(entity.childNodes))

    }

    function parseConfig (response) {
        if (response.status != 200) {
            throw new Error("ControllerError: Unable to load configuration")
        }

        var top = response.document.documentElement

        if (top.localName != "controller" ||
            top.namespaceURI != "http://www.blisted.org/ns/xmvc/") {
            window.error("Invalid configuration file")
        }

        var entities = top.childNodes

        for (var i = 0; i < entities.length; i++) {
            switch (entities[i].localName) {
                case "view":
                    updates.push(parseUpdate(entities[i]))
                    break;
                case "update":
                    updates.push(parseUpdate(entities[i]))
                    break;
                case "handlers":
                    loadHandlers(entities[i])
                    break;
            }
        }
    }

    var useragent = new CBClient(parseConfig)

    /**
     * Fetch and parse the provided configuration.
     */
    this.parse = function () {
        useragent.get(uri)
    }
}
