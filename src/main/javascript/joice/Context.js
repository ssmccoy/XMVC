/**
 * @fileoverview
 *
 * <p>The Joice application container.  This is a simple javascript dependency
 * injection container which resolves dot-noted identifiers into constructors
 * for objects and assembles objects (and their dependencies) using a simple
 * XML format.  It's meant to be plugged into (somewhat crudely) by simply
 * ignoring any type of element which doesn't fit in the Joice namespace of
 * <code>http://www.blisted.org/ns/joice</code>.</p>
 *
 * @author <a href="mailto:tag@cpan.org">Scott S. McCoy</a>
 */

var JOICENS = "http://www.blisted.org/ns/joice/"
var JOICENS_OBJECT   = "object"
var JOICENS_PROPERTY = "property"
var JOICENS_ARGUMENT = "argument"

/**
 * An error occured within a joice context.
 */
function ContextError (message) {
    this.message = message
}
ContextError.prototype = new Error()

/**
 * @constructor Create a new property specification.
 *
 * <p>Given a type and value, create a property specification.  If the type is
 * <code>object</code> expected that the given value is an {@link
 * ObjectSpecification}.  If the type is <code>value</code> an actual value
 * such as a {@link String}, {@link Number} or {@link Array} is expected.</p>
 *
 * @param {String} type The type of property.
 * @param {Object} value The value of the property.
 *
 * @class The specification of a property.
 *
 * <p>A specification of a property or argument.  This simply wraps either an
 * {@link ObjectSpecification} or an actual value.</p>
 * @author <a href="mailto:tag@cpan.org">Scott S. McCoy</a>
 */
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
        params.push("arguments[\f]".format(i))
    }

    var code = "return new \f(\f)".format(methodName, params.join(","))

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
        specification.id   = id

        if (typeof name != "undefined") labels[name] = id
    }

    this.getSpecification = function (id) {
        return specifications[id]
    }

    this.getIdForLabel = function (label) {
        return labels[label]
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
            throw new ContextError("Cannot redefine scope \f".format(name))
        }

        scopes[name] = scope
    }
}
