
var JOICENS = "http://www.blisted.org/ns/joice/"
var JOICENS_SCRIPT   = "script"
var JOICENS_OBJECT   = "object"
var JOICENS_VALUE    = "value"
var JOICENS_ARRAY    = "array"
var JOICENS_XML      = "xml"
var JOICENS_PROPERTY = "property"
var JOICENS_ARGUMENT = "argument"


/**
 * @constructor Create a new configuration filter.
 *
 * @param {Properties} The given properties object to use for value lookups.
 *
 * @class Interpolates variables with the value of a property.
 * @author <a href="mailto:tag@cpan.org">Scott S. McCoy</a>
 */
function XMLConfigurationFilter (configurator) {
    var properties = new Properties()

    /* The \ isn't needed within a character class, I know, but it stops vim
     * from matching it. */
    var variable = /\$\{([^\}]*)\}/g

    var lookupPropertyReplacement = function (match, token, position, string) {
        return properties.getProperty(token)
    }

    this.addProperties = function (newProperties) {
        properties.mergeProperties(newProperties)
    }
    
    /**
     * Configure the given string through interpolation.
     *
     * <p>Given a string which may contain variable references to properties,
     * substitute all variable identifiers with the value of the property they
     * refer to.</p>
     *
     * @return A string which has had all variables references replaced.
     * @throws ConfigurationError If a reference to an undefined property is
     * located.
     */
    this.configure = function (value) {
        return value.replace(variable, lookupPropertyReplacement)
    }

    /**
     * Test the given value for tokens which require replacement.
     *
     * <p>Given a string, test it for strings which would typically be
     * interpolated and return the results of the test.</p>
     *
     * @return {Boolean} true if the value has interpolated properties in it,
     * false otherwise.
     */
    this.hasProperties = function (value) {
        return variable.test(value)
    }

    /**
     * Interpolate variables in attribute values.
     *
     * <p>Recursively descend the given element and replace all attribute
     * values with an interpolated version of the given attribute value.
     * Interpolation performs a regular expression based replacement for
     * property names enclosed in <code>${</code> and <code>}</code>.  Modifies
     * the attribute nodes in place.</p>
     *
     * @throws ConfigurationError If a reference to an undefined property is
     * located.
     */
    this.filter = function (element) {
        if (element.hasChildNodes) {
            var children = element.childNodes

            for (var i = 0; i < children.length; i++) {
                this.filter(children[i])
            }
        }

        if (element.hasAttributes()) {
            var attributes = element.attributes

            for (var i = 0; i < attributes.length; i++) {
                var attribute = attributes[i]

                attribute.value = this.configure(attribute.value)
            }
        }
    }

    this.parseConfig = function (element) {
        this.filter(element)

        configurator.parseConfig(element)
    }
}

/**
 * @class Context Configuration Error.
 *
 * <p>An extension of {@link Error} thrown when an error occurs in a given
 * configuration.</p>
 * @author <a href="mailto:tag@cpan.org">Scott S. McCoy</a>
 */
function ContextConfigurationError (message) {
    this.message = message
}
ContextConfigurationError.prototype = new Error()

/**
 * @constructor Create an XML Context Configuration.
 * @param context The context to configure.
 *
 * @class An XML configuration for a joice context.
 *
 * <p>Configure a joice context using DOM.  This class wraps a context and
 * initializes it using object specifications constructed from the supplied DOM
 * structure.</p>
 * @author <a href="mailto:tag@cpan.org">Scott S. McCoy</a>
 */
function XMLContextConfiguration (context, semaphore) {
    var specs       = {}
    var loaders     = {
        "text/javascript": new HttpJavaScriptLoader(semaphore) 
    }

    /**
     * Vivify an object of the given id.
     *
     * @private
     */
    function vivifyObject (id) {
        if (id == null) {
            return new ObjectSpecification()
        }
        else if (id in specs) {
            return specs[id]
        }
        else {
            /* If it doesn't exist in our local defs (as in it wasn't defined
             * here or previously used), then try pulling it from the Joice
             * context.  If that fails, assume it's a new definition we haven't
             * parsed yet.
             */
            var jid  = context.getIdForLabel(id)
            var spec = null

            if (typeof jid != "undefined") {
                spec = context.getSpecification(jid)
            }
            else {
                spec = new ObjectSpecification()
            }

            specs[id] = spec
            spec.name = id

            return spec
        }
    }

    /* TODO This is a bit of a quick hack to add array support.  It really
     * shouldn't use each element as a constructor argument since it creates
     * somewhat garbage generated code that's unnecessary.  But it's not an
     * enormous concern right now.
     */
    function Context_parseArray (element) {
        /* TODO: If you're going to keep this, it might be better done with
         * XSLT.  Same with the anonymous object syntax.
         *
         * Simply transform <array><value/><value/><value/></array> into
         *
         * <object constructor="Array">
         *  <argument><value/></argument>
         *  <argument><value/></argument>
         *  <argument><value/></argument>
         * </object>
         */
        var doc = element.ownerDocument
        var arrayObject = doc.createElementNS(JOICENS, JOICENS_OBJECT)

        arrayObject.setAttribute("constructor", "Array")

        var children = element.childNodes

        for (var i = 0; i < children.length; i++) {
            var child = children[i]

            /* If we don't filter out non-namespace values we end up with a
             * bunch of elements that only have text nodes in them.  Another
             * way to do this would be to check the node type. ;-) */
            if (child.namespaceURI == JOICENS) {
                var argument = doc.createElementNS(JOICENS, JOICENS_ARGUMENT)

                if (child.hasAttribute("object")) {
                    argument.setAttribute("object",
                            child.getAttribute("object"))
                }
                else {
                    /* Append a deeply cloned node.  You can't attach a node to
                     * a document twice. */
                    argument.appendChild(child.cloneNode(true))
                }

                arrayObject.appendChild(argument)
            }
        }

        return Context_parseObject(arrayObject)
    }

    function Context_parseProperty (element) {
        if (element.hasAttribute("value")) {
            return new PropertySpecification("value",
                element.getAttribute("value"))
        }
        else if (element.hasAttribute("object")) {
            return new PropertySpecification("object",
                vivifyObject(element.getAttribute("object")))
        }
        else if (element.hasChildNodes()) {
            var children = element.childNodes
            var matches  = 0
            var result   = null
            
            for (var i = 0; i < children.length; i++) {
                var child = children[i]

                if (child.namespaceURI == JOICENS) switch (child.localName) {
                    case JOICENS_OBJECT:
                        /* {} is just new Object(), I'm assuming that's true on
                         * all implementations it very well should be.  This
                         * means <object><property name="foo"/></object> would
                         * always create a new empty object.
                         */
                        child.setAttribute("constructor", "Object")

                        matches++
                        result = new PropertySpecification("object", 
                                Context_parseObject(child))

                        break

                    case JOICENS_VALUE:
                        var text = null

                        if (child.hasChildNodes()) {
                            text = child.firstChild.nodeValue
                        }

                        matches++
                        result = new PropertySpecification("value", text)

                        break

                    case JOICENS_XML:
                        matches++
                        result = new PropertySpecification("value",
                                child)

                        break

                    case JOICENS_ARRAY:
                        matches++
                        result = new PropertySpecification("object",
                                Context_parseArray(child))
                        break
                }
            }

            if (matches != 1) {
                throw new ContextConfigurationError("Properties may only " +
                    "have a single child.  If multiple values are desired, " +
                    "try the <array/> element instead.")
            }

            return result
        }
        else {
            /* TODO Throw a configuration error... */
            throw new ContextConfigurationError("Properties must either have" +
                "a value attribute, an object attribute, or children")
        }
    }

    function Context_parseObject (element) {
        var id    = element.getAttribute("id")
        var spec  = vivifyObject(id)

        var children = element.childNodes

        for (var i = 0; i < children.length; i++) {
            var property = children[i]

            if (property.localName == JOICENS_PROPERTY) {
                var name = property.getAttribute("name")

                if (name == null) {
                    throw new ContextConfigurationError("All properties must " +
                            " have a name attribute")
                }

                spec.setProperty(name, Context_parseProperty(property))
            }
            else if (property.localName == JOICENS_ARGUMENT) {
                spec.addArgument(Context_parseProperty(property))
            }
            else {
                /* TODO Throw a configuration error... */
            }
        }

        spec.init  = element.getAttribute("initialization")
        spec.ctor  = element.getAttribute("constructor")
        spec.scope = element.getAttribute("scope") || "singleton"

        /* An internal unique identifier for the object.  This is used in
         * scopes, scopes have no reference to the bean name.  This is a big
         * deviation from the spring container, but it prevents bean name
         * generation and thus prevents the possibility of making references to
         * beans with generated names. */
        spec.name  = id

        return spec
    }

    this.parseScript = function Context_parseScript (script) {
        var type = script.getAttribute("type")
        var src  = script.getAttribute("src")

        var loader = loaders[type]

        if (typeof loader == "undefined") {
            throw new ContextConfigurationError(
                    "Unable to load \f type \f: \f".format(
                        src, type, "No appropriate script loader for type"))
        }

        loader.load(src)
    }

    /**
     * Parse a configuration.
     *
     * <p>Given a top level joice configuration element, parse the
     * the element as a joice configuration and create a series of {@link
     * ObjectSpecification} objects.  When all {@link ObjectSpecification}
     * elements are created and their interdependancies resolved, register them
     * with the {@link Context}.</p>
     *
     * @param {Element} config The top level configuration element.
     */
    this.parseConfig = function (config) {
        var possibleObjects = config.childNodes

        for (var i = 0; i < possibleObjects.length; i++) {
            var possibleObject = possibleObjects[i]

            if (possibleObject.namespaceURI == JOICENS &&
                    possibleObject.localName == JOICENS_SCRIPT) {
                Context_parseScript(possibleObject)
            }

            if (possibleObject.namespaceURI == JOICENS &&
                    possibleObject.localName == JOICENS_OBJECT) {
                Context_parseObject(possibleObject)
            }
        }

        for (var key in specs) {
            var ctor = specs[key].ctor

            if (typeof ctor == "undefined") {
                throw new ContextConfigurationError(
                    "Unable to find object definition with id \"\f\"".format(
                      key))
            }

            context.addSpecification(specs[key])
        }
    }
}
