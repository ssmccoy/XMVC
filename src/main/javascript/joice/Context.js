/**
 * @fileoverview
 *
 * <p>The Joice application container.  This is a simple javascript dependency
 * injection container which resolves dot-noted identifiers into constructors
 * for objects and assembles objects (and their dependencies) using a simple
 * XML format.  It's meant to be plugged into (somewhat crudely) by simply
 * ignoring any type of element which doesn't fit in the Joice namespace of
 * <code>http://www.blisted.org/ns/joice</code>.</p>
 */

var JOICENS = "http://www.blisted.org/ns/joice/"
var JOICENS_OBJECT = "object"
var JOICENS_PROPERTY = "property"
var JOICENS_ARGUMENT = "argument"

/**
 * A scope.
 *
 * <p>This object is placeholder for documentation.  A scope, in Joice, is a
 * storage point for a type of context where objects might be created and
 * stored.  Every object definition in Joice has a unique identifier, and the
 * presence of an identifier in a given scope (as reported by the Scope
 * implementation) defines whether a reference to an object specification
 * creates a new instance of an object when it's being referenced, or not.</p>
 *
 * <p>Scopes are intended to be largely (with the exception of {@link
 * SingletonScope}) external to Joice.  Example scopes would be a thread scope
 * in a multithreadded environment which keys all of it's storage off of the
 * local thread id, or a transactional scope which is aware of a database
 * connection.</p>
 *
 * <p>This scope is <em>not</em> implemented and <strong>will</strong> error
 * when used.</p>
 *
 * @author <a href="mailto:tag@cpan.org">Scott S. McCoy</a>
 */
function Scope () {
    /** 
     * The name of the given scope.
     * @type String
     */
    this.name = "scope"

    /**
     * Fetch or create an object of a given id.
     *
     * <p>Given an id for an object, and a factory for creating the object,
     * either fetch the object from the active scope or create one.  Must never
     * return null.</p>
     * 
     * @param {Number} id The unique identifier of the object definition.
     * @param {ObjectFactory} factory The factory for the object.
     * @return The object created by the given {@link ObjectFactory}
     */
    this.get = function Scope_get (id, factory) {
        throw new Error("SCOPE NOT IMPLEMENTED")
    }

    /**
     * Remove the given object from this scope.
     *
     * <p>Called during cleanups and when a dependent scope exits.  This object
     * should remove the object of the given id from the active context.</p>
     *
     * @param {Number} id The unique identifier of the given object definition.
     * @return The object removed from the active scope.
     */
    this.remove = function Scope_remove (id) {
        throw new Error("SCOPE NOT IMPLEMENTED")
    }
}

/**
 * @class A create-once scope.
 *
 * <p>This {@link Scope} implementation provides a simple stateful bean scope
 * which lives for the duration of the object.</p>
 *
 * @see Scope
 * @author <a href="mailto:tag@cpan.org">Scott S. McCoy</a>
 */
function SingletonScope () {
    this.name = "singleton"

    var beans = {}

    this.get = function SingletonScope_get (id, factory) {
        if (id in beans) {
            return beans[id]
        }
        else {
            return beans[id] = factory.createObject()
        }
    }

    this.remove = function SingletonScope_remove (id) {
        return delete beans[id]
    }
}
SingletonScope.prototype = new Scope()

/**
 * @class A create always scope.
 *
 * <p>This scope simply always creates the given object and never stores a
 * reference to it.</p>
 * @author <a href="mailto:tag@cpan.org">Scott S. McCoy</a>
 */
function PrototypeScope () {
    this.name = "prototype"

    this.get = function PrototypeScope_get (id, factory) {
        return factory.createObject()
    }

    this.remove = function PrototypeScope_remove (id) {
        return true
    }
}
PrototypeScope.prototype = new Scope()

function Sequence () {
    var curval = 0

    this.getCurrentValue = function () {
        return curval
    }

    this.getNextValue = function () {
        return curval++
    }
}

function PropertySpecification (type, value) {
    this.type  = type
    this.value = value
}

/**
 * @constructor Create a new object specification.
 *
 * @param scope A reference to the encapsulating scope object.
 * @param ctor The constructor to use.
 * @param args An array of arguments to pass to the constructor.
 * @param props A map ({}) of properties to set.
 */
function ObjectSpecification (scope, ctor, args, props) {
    /**
     * @type {Number} The unique identifier for this specification in the
     * context it's registered to.
     */
    this.id = null
    /**
     * @type {String} The scope object.
     */
    this.scope = scope
    /**
     * @type {String} The object constructor
     */
    this.ctor  = ctor
    /**
     * @type {Array} A list of constructor argument specifications.
     */
    this.args  = args
    /**
     * @type {Object} A map of property specifications.
     */
    this.props = props

    this.setProperty = function (key, value) {
        this.props[key] = value
    }

    this.addArgument = function (value) {
        this.args.push(value)
    }
}

/**
 * @constructor Create a new configuration filter.
 *
 * @param {Properties} The given properties object to use for value lookups.
 *
 * @class Interpolates variables with the value of a property.
 * @author <a href="mailto:tag@cpan.org">Scott S. McCoy</a>
 */
function DOMConfigurationFilter (properties) {
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

/**
 * @constructor Generate a constructor and an interface to invoke it.
 *
 * @param methodName The name of the method to call in constructor context.
 * @param argumentCount The <em>maximum</em> number of arguments expected
 * to be passed to the constructor.
 * 
 * @class A simple code generator for constructor function wrappers.
 *
 * <p>This wraps the construction of functions.  This is a work-around for
 * the fact that javascript does not <em>actually</em> have reflective
 * constructor invocation.  This works by using code generation to generate
 * a function which wraps a call to a constructor and returns the object
 * which is created.</p>
 *
 * @author <a href="mailto:tag@cpan.org">Scott S. McCoy</a>
 */
function GeneratedConstructor (methodName, argumentCount) {
    var params = []

    for (var i = 0; i < argumentCount; i++) {
        params.push("arguments[" + i + "]")
    }

    var code = "return new " + methodName + "(" + params.join(",") +  ")"

    var ctor = new Function(code)

    this.newInstance = function (params) {
        return ctor.apply(this, params)
    }
}

/**
 * @class A simple factory for objects generated from a context.
 *
 * <p>This is a simple factory for an object.  It maintains references to
 * object, parameter and argument specifications.  
 */
function ObjectFactory (context, spec) {
    this.context = context
    this.ctor    = new GeneratedConstructor(spec.ctor, spec.args.length)

    this.createObject = function () {
        var args  = []

        for (var i = 0; i < spec.args.length; i++) {
            var arg = spec.args[i]
            args.push( this.initializer[arg.type](id, arg.value) )
        }

        var obj = this.ctor.newInstance(args)

        for (var key in spec.props) {
            var prop = spec.props[key]
            obj[key] = this.initializer[prop.type](id, prop.value)
        }

        return obj
    }
}
ObjectFactory.prototype = {
    initializer: {
        "object": function (property) {
            this.context.getObject(property.value.id)
        },
        "value": function (property) {
            /* For now, values ignore scope */
            return property.value
        }
    }
}

/**
 * @constructor
 * Create a new context.
 *
 * @param config The DOM structure which works as the configuration file.
 *
 * @class
 *
 * Dependency injection context.  The context in Joice is the root of the
 * dependency injection container.  It resovles object names to their
 * specification and assembles them accrodingly.
 */
function Context () {
    var initialized    = false
    var sequence       = new Sequence()
    var specifications = []
    var labels         = {}
    var factories      = []
    /* Default scopes */
    var scopes         = {
        "singleton": new SingletonScope(),
        "prototype": new PrototypeScope()
    }

    this.addSpecification = function (specification) {
        /* Skip specifications we've already seen. */
        if (specification.id != null) return

        var id     = sequence.getNextValue()
        var name   = specification.name
        var args   = specification.args
        var params = specification.params

        for (var i = 0; i < args.length; i++) {
            if (args[i].type == "object") {
                this.addSpecification(args[i])
            }
        }

        specifications[id] = specification
        factories[id]      = new ObjectFactory(this, specification)
        labels[name]       = id

        specification.id   = id
    }

    this.getSpecification = function (id) {
        return specifications[id]
    }

    this.getObject = function (id) {
        var specification = specifications[id]

        if (typeof specifications != "undefined") {
            var scope = scopes[ specification.scope ]

            return scope.get(id, factories[id])
        }
        else {
            return null
        }
    }

    this.load = function (name) {
        return this.getObject(labels[name])
    }

    /**
     * Add a scope to this context.
     *
     * @param name The name of the scope.
     * @param scope The object which implements the scope.
     *
     * @see PrototypeScope, SingletonScope
     */
    this.addScope = function (name, scope) {
        if (name in scopes) {
            throw new Error("Cannot add scope " + name + " to container, a " +
                "scope with such name already exists")
        }

        scopes[name] = scope
    }
}
