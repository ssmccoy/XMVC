
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

