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

function ResolverError (name) {
}

function Resolver (scope) {

    /**
     * Reflectively resolve a given name into a reference.
     *
     * <p>Breaks up dot-notation of the supplied identifier name and transcends
     * the current resolver scope for a reference to the given object.</p>
     *
     * @return {Object} reference if any is found.
     * @throws ResolverError if any undefined reference is located.
     */
    this.resolve = function (namespace) {
        var ref = scope

        var tokens = namespace.split(/\./)

        for (var i = 0; i < tokens.length; i++) {
            ref = ref[tokens[i]]

            if (ref == undefined) break
        }

        if (ref == undefined) {
            var currentName = tokens.splice(0, i).join(".")

            throw new ResolverError("Unable to resolve supplied name: " +
                    namespace + " (undefined found at: " + currentName)
        }

        return ref
    }
}

function SingletonScope () {
    this.name = "singleton"

    var beans = {}

    this.get = function (id, factory) {
        if (id in beans) {
            return beans[id]
        }
        else {
            return beans[id] = factory.createObject()
        }
    }

    this.remove = function (id) {
        return delete beans[id]
    }
}

function PrototypeScope () {
    this.name = "prototype"

    this.get = function (id, factory) {
        return factory.createObject()
    }

    this.remove = function (id) {
        return true
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
function Context (config) {
    var initialized = false
    var specs       = {}
    var resolver    = new Resolver(window)
    var lastId      = 0

    var scopes      = {
        "singleton": new SingletonScope(),
        "prototype": new PrototypeScope()
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
            return specs[id] = {}
        }
    }

    function Context_parseObject (element) {
        var id    = element.getAttribute("id")
        var obj   = id != null ? vivifyObject(id) : {}

        var ref   = resolver.resolve(element.getAttribute("constructor"))
        var args  = []
        var props = {}

        var children = element.getChildNodes

        for (var i = 0; i < children.length; i++) {
            var specElement = children[i]
            var propSpec = {}

            if (specElement.localName == "property") {
                var name = specElement.getAttribute("name")

                if (name == null) {
                    throw new DefinitionError("All properties must have a " +
                        "name attribute")
                }

                /* Place reference for time being, even though propSpec is empty */
                props[name] = propSpec
            }

            if (specElement.localName == "argument") {
                args.push(propSpec)
            }

            if (specElement.hasAttribute("value")) {
                propSpec.type  = "value"
                propSpec.value = specElement.getAttribute("value")
            }
            else if (specElement.hasAttribute("object")) {
                /* For object references, vivify the specification of the object
                 * and then store a reference to the specification as the
                 * value. */
                propSpec.type  = "object"
                propSpec.value = vivifyObject(propSpec.getAttribute("object"))
            }
            else if (specElement.hasChildren) {
                propSpec.type  = "object"
                propSpec.value = Context_parseObject(element.firstChild)
            }
        }

        /* An internal unique identifier for the object.  This is used in
         * scopes, scopes have no reference to the bean name.  This is a big
         * deviation from the spring container, but it prevents bean name
         * generation and thus prevents the possibility of making references to
         * beans with generated names. */
        obj.id    = lastId++
        obj.props = props
        obj.args  = args
        obj.ref   = ref
        obj.scope = element.getAttribute("scope") || "singleton"

        return obj
    }

    function Context_parseConfig (config) {
        var possibleObjects = config.documentElement.childNodes

        for (var i = 0; i < possibleObjects.length; i++) {
            var possibleObject = possibleObjects[i]

            if (possibleObjects.namespaceURI == JOICENS &&
                    possibleObjects.localName == JOICENS_OBJECT) {
                Context_parseObject(object)
            }
        }
    }

    var initializer = {
        "object": Context_initializeObject,
        "value": function (id, value) { return value }
    }

    function ObjectFactory (id, spec) {
        this.createObject = function () {
            var ctor  = spec.ref
            var args  = []

            for (var i = 0; i < spec.args.length; i++) {
                var arg = spec.args[i]
                args.push( initializer[arg.type](id, arg.value) )
            }

            var obj = ctor.call(scope, args)

            for (var key in spec.props) {
                var prop = spec.props[key]
                obj[key] = initializer[prop.type](id, prop.value)
            }
        }

        return obj
    }

    function Context_initializeObject (id, spec) {
        var scope = spec.scope

        return scope.get(id, spec)
    }

    this.load = function (name) {
        if (!initialized) {
            Context_parseConfig(config)
        }

        var objspec = specs[name]

        if (typeof objspec != undefined) {
            return Context_initializeObject(objspec.id, objspec)
        }
        else {
            return null
        }
    }
}
