/**
 * @constructor Create a new configuration filter.
 *
 * @param {Properties} The given properties object to use for value lookups.
 *
 * @class Interpolates variables with the value of a property.
 * @author <a href="mailto:tag@cpan.org">Scott S. McCoy</a>
 */
function XMLConfigurationFilter (properties) {
    /* The \ isn't needed within a character class, I know, but it stops vim
     * from matching it. */
    var variable = /\$\{([^\}]*)\}/g

    var lookupPropertyReplacement = function (match, token, position, string) {
        return properties.getProperty(token)
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

        if (element.hasAttributes) {
            var attributes = element.attributes

            for (var i = 0; i < attributes.length; i++) {
                attribute.value = this.configure(attribute.value)
            }
        }
    }

    this.parseConfig = function (element) {
        this.filter(element)

        context.parseConfig(element)
    }
}

function ContextConfigurationError (message) {
    this.message = message
}
ContextConfigurationError.prototype = new Error()

function XMLContextConfiguration (context) {
    var specs       = {}

    /**
     * Vivify an object of the given id.
     *
     * @private
     */
    function vivifyObject (id) {
        if (typeof specs[id] != "undefined") {
            return specs[id]
        }
        else {
            var spec = new ObjectSpecification()

            specs[id] = spec
            spec.name = id

            return spec
        }
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
        else if (element.hasChildren) {
            return new PropertySpecification("object", 
                Context_parseObject(element.firstChild))
        }
        else {
            /* TODO Throw a configuration error... */
        }
    }

    function Context_parseObject (element) {
        var id    = element.getAttribute("id")
        var spec  = id != null ? vivifyObject(id) : new ObjectSpecification()

        obj.scope = element.getAttribute("scope") || "singleton"
        var children = element.getChildNodes

        for (var i = 0; i < children.length; i++) {
            var property = children[i]

            if (property.localName == "property") {
                var name = specElement.getAttribute("name")

                if (name == null) {
                    throw new DefinitionError("All properties must have a " +
                        "name attribute")
                }

                spec.setProperty(name, Context_parseProperty(property))
            }
            else if (property.localName == "argument") {
                spec.addArgument(Context_parseProperty(property))
            }
            else {
                /* TODO Throw a configuration error... */
            }
        }

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

    function Context_parseConfig (config) {
        var possibleObjects = config.documentElement.childNodes
        var specs = []

        for (var i = 0; i < possibleObjects.length; i++) {
            var possibleObject = possibleObjects[i]

            if (possibleObjects.namespaceURI == JOICENS &&
                    possibleObjects.localName == JOICENS_OBJECT) {
                Context_parseObject(object)
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

    this.parseConfig = Context_parseConfig
}
