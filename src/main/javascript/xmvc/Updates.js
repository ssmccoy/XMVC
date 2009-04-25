/*
 * For how it's going to work....
 * for view in views 
 *     if view.appliesTo element 
 *         for action in view.actions
 *             element.attachEvent action.type, action.event scope
 * 
 * But this seems like it *might* be kind of slow.  XPath on the other hand,
 * might be rather quick...fuck.  Design flaw numero many-eo.
 *
 * For now we'll do it the slow way.
 */

xmvc.View = function (id, clazz, actions) {
    this.actions = function () { return actions }
    this.id      = function () { return id      }
    this.class   = function () { return clazz   }

    /**
     * Apply actions for this view to the supplied node, if applicable.  Note
     * that it will not always be applicable!  Also note, that this is going to
     * be incredibly slow and should probably be reworked to use XPath.  As I
     * think about it, XPath (or any other Path language) should be fast as
     * hell as it the path for looking up containing elements will be very
     * fast.  Additionally, it is capable of being quite generic and doing lots
     * of the leg work for us.  For example, an expression of
     * "a[@class='example']" would call getElementsByTagName("a") and then
     * subsequently look up <i>all</i> "a" elements.  Because of this it might
     * be worthwhile to look into a lookup-within-context approach.  The
     * problem of course, is the simple fact that XPath is poorly implemented
     * across the board.  So now lookups are dependent upon this...and we end
     * up processing all these elements anyway (as a side note) for making
     * consistency out of the DOM event model.
     *
     * NOTE if we do switch models, everything inside of here could pretty much
     * stay the same, the item that needs to change would be this and/or it's
     * caller.
     */
    this.applyEvents = function (node, scope) {
        if (node.getAttribute("id") == id || 
            node.getAttribute("class") == clazz) {
            
            for (var action in actions) {
                node.addEventListener(action.type(), action.event(scope))
            }
        }
    }
}
