
/**
 * @constructor.
 * @class An object to represent a level of scope.
 *
 * <p><b><u>Note</u></b> <i>This is typically not used as a part of the XMVC
 * API.</i></p>
 *
 * <p>This object represents a level of scope in a document fragment being
 * parsed, this scope chain is not stored directly.  References to the scope
 * chain are stored implicitly by event handler attachment, meaning any scope
 * levels will be garbage collected.</p>
 *
 * <p>Each level of scope represented by this object is simple and hierarchial
 * in nature.  A level of scope has access to it's parent, which may have a
 * parent, and so on until the top level (the scope with an undefined parent)
 * is reached.</p>
 *
 * <p>Scope is used constructor handlers, which instantiate objects of a given
 * name.  The scope follows the document structure, so elements contained
 * within the instantiating element can call methods on this object when events
 * of a given type happens.</p>
 *
 * @author <a href="tag@cpan.org">Scott S. McCoy</a>
 */
xmvc.ControllerScope = function (parent) {
    var table = {}

    /**
     * Return the scope that owns a given key.
     * <p>This method will search the scope chain and find the scope which owns
     * a given key.  When the scope is located, a reference to it is returned.
     * </p>
     *
     * @return {xmvc.ControllerScope} owner if found.
     * @return undefined when unavailable.
     */
    this.contains = function (key) {
        if (table[key] != undefined) {
            return this
        }

        //return parent != undefined ? parent.contains(key) : undefined
        return parent && parent.contains(key)
    }

    /**
     * Return the value of a given key.
     * <p>Searches scope chain for the key and returns it's value.</p>
     * @return {Object} the value if located in this or a parent scope.
     * @return undefined if the given key is not found in the chain.
     */
    this.valueOf = function (key) {
        if (table[key] != undefined) {
            return table[key]
        }
        
        return parent != undefined ? parent.valueOf(key) : undefined
    }

    /**
     * Give a key a value within the appropriate level of scope.
     *
     * <p>If the key is defined in this scope, then a value is set.  Otherwise,
     * the parent scope is searched.  If an owning parent scope is found, the
     * value is set there, otherwise the value will again be set in this
     * scope.</p>
     *
     * @see allocate to allocate a key in this scope intentionally.
     */
    this.set = function (key, value) {
        if (table[key] != undefined) {
            table[key] = value

            return true
        }

        if (!this.top()) {
            var scope = parent.contains(key)

            if (scope != undefined) 
                return scope.set(key, value)
        }

        table[key] = value
        return false
    }

    /**
     * Allocate a key in this scope directly.
     *
     * <p>Some times, the semantics of {@link set(key, value)} are unfavorable
     * and this method will allow you to ensure, before calling {@link set}
     * a key will actually belong to the scope.  This would be used for actions
     * which instantiate new instances of an object.</p>
     */
    this.allocate = function (key) {
        /* This cannot be undefined or null.  We use a completely empty object
         * in it's place */
        table[key] = new Object()
    }

    /**
     * Return a reference to the parent scope.
     * @return {xmvc.ControllerScope} parent scope.
     * @return undefined if this is the top level scope.
     */
    this.parent = function () { return parent }

    /**
     * Test for the top level of scope.
     * @return true if this is the top level of scope.
     * @return false otherwise.
     */
    this.top = function () { return parent == undefined }
}
