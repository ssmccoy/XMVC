
/**
 * @class Lazily vivified scope which matches lexical document area.
 *
 * <p>Creates a "scope" which can hold name value pairs relative to a given
 * lexical area of a document.  The <em>active</em> lexical area must be
 * selected using the {@link select(element)} method.  Once an area is
 * selected, {@link get(id, factory)} can be called to fetch objects from
 * it.</p>
 *
 * <p>This object implements the Scope API from the Joice Dependency Injection
 * Container.</p>
 *
 * @author <a href="mailto:tag@cpan.org">Scott S. McCoy</a>
 */
function DocumentScope (document) {
    this.root   = new ControllerScope()
    this.active = null
    this.live   = false

    document.documentElement.scope = this.root

    /**
     * Select the scope for the supplied element.
     *
     * <p>Makes the scope for the supplied element the active scope.  If no
     * scope is present, all parents are descended until a scope is located and
     * the scope chain is vivified for the given element.</p>
     *
     * @return true if the element had a scope, false if it had to locate a
     * parent scope.
     *
     * @throws DocumentScopeError if the element is not a child of the document
     * this scope is intended for.
     */
    this.select = function (element) {
        this.active = this.forNode(element)

        this.live = this.active != null

        if (!this.live) {
            this.active = this.findParent(element)
        }

        return this.live
    }

    /**
     * Fetch the value of the current object in the scope for the active
     * element.
     *
     * <p>Starting at whichever element was most recently selected with {@link
     * select(element)}, starts descending upward the scope chain looking for a
     * value associated with the given id.  If one is found one is returned,
     * otherwise an object is created by the given factory and placed in the
     * active scope.  In all cases, and object is returned.</p>
     *
     * @param id The id of the object to locate.
     * @param factory The object factory to use to create an object if
     * necessary.
     *
     * @return The intended object.
     */
    this.get = function (id, factory) {
        var value = this.active.valueOf(id)

        if (typeof value == "undefined") {
            if (!this.live) {
                this.active = this.vivify(element)
                this.live   = true
            }
            
            value = factory.getObject()

            this.active.set(id, value)
        }

        return value
    }

    /**
     * Find the nearest parent scope.
     *
     * <p>Descends all parent nodes until a scope is found, and returns the
     * scope found.</p>
     *
     * @return {DocumentScope} A scope if one is found, otherwise null.
     */
    this.findParent = function DocumentScope_findParent (element) {
        for (var node = element; node != null; node = node.parentNode) {
            if (node.scope) {
                return scope
            }
        }

        return null
    }

    /**
     * Vivify scope for a given element of a document.
     *
     * <p>This method ascends the document from the supplied element until a
     * node with scope associated with it is found.  It then attaches scope to
     * all elements in the ascent of the tree.  If the given element has scope
     * already, no new scopes are created.</p>
     *
     * @return The scope for the supplied element.
     * @throws DocumentScopeError If the supplied element does not belong
     * to the document this document scope is attached to.
     * @throws DocumentScopeError If the supplied element is not actually
     * <b>attached</b> to the document.
     */
    /* TODO There is some way to optimize this
     *  * Make select find the nearest releative scope (maybe not the current
     *  node) and save the distance from the selected node to the scope.
     *  * Cause set to be aware of whether or not the currently selected scope
     *  is the scope of the current element, and if it isn't add a new scope to
     *  the chain.
     *  * Make the scope nodes themselves dually linked and keep a depth.
     *  Compare the depth to the distance from the currently selected node, and
     *  when a new scope is node is required insert it before the parent if the
     *  current node is a child.
     *
     *    This is half baked because it may cause mis-matches.  There is
     *    something there though.  Lookups would be faster if they didn't
     *    require descending the entire node chain worth of scope.
     *
     *  It might also just be faster to actually make the parent-scope relation
     *  descend the node graph from the current selection looking for a "scope"
     *  node and keep the parent-child relationship out of the actual scope
     *  nodes.
     */
    this.vivify = function DocumentScope_vivify (element) {
        if (element.ownerDocument != document) {
            throw new DocumentScopeError(
                "Attempt to vifify scope for element {" + 
                element.namespaceURI + "}#" + element.localName + 
                " failed!  Element is not a part of this scope's document"
                )
        }

        var lastNode  = null
        var nodeStack = []

        /* Wheel backward up the document until we find a node that has
         * scope... */
        for (var cursor = element; cursor != null; cursor = cursor.parentNode)
        {
            if (typeof cursor.scope != "undefined") {
                var lastNode = cursor

                break
            }

            nodeStack.unshift(cursor)
        }

        if (lastNode == null) {
            throw new DocumentScopeError(
                "Unable to find a node in the parent tree which has scope " +
                "attached.  Has this element been added to the document?"
                )
        }
        
        var scope = lastNode.scope

        for (var i = 0; i < nodeStack.length; i++) {
            var cursor = nodeStack[i]

            /* I *really* do mean this */
            cursor.scope = scope = new ControllerScope(scope)
        }

        return scope
    }

    /**
     * Return the scope for the given node.
     *
     * <p>Given a node which belongs to the document this scope is attached to,
     * returns the scope associated with that node, if any.</p>
     *
     * @return {ControllerScope} The scope associated with this node, may
     * be null.
     * @throws DocumentScopeError If the supplied object is not a node of
     * this document.
     */
    this.forNode = function DocumentScope_forNode (node) {
        if (element.ownerDocument != document) {
            throw new DocumentScopeError(
                "Attempt to vifify scope for element {" + 
                element.namespaceURI + "}#" + element.localName + 
                " failed!  Element is not a part of this scope's document"
                )
        }

        return node.scope || null
    }
}

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
function ControllerScope (parent) {
    var table = {}

    /**
     * Return the scope that owns a given key.
     * <p>This method will search the scope chain and find the scope which owns
     * a given key.  When the scope is located, a reference to it is returned.
     * </p>
     *
     * @return {ControllerScope} owner if found.
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
        
        return typeof parent != "undefined" ? parent.valueOf(key) : undefined
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
     * @return {ControllerScope} parent scope.
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
