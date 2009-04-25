
/**
 * @constructor
 * @class
 * A Wrapper for XPath Expressions.
 * 
 * <p>Implementations of {@link XPathExpressionFactory} should return instances
 * of this object or objects that implement it's interface.  This
 * implementation can be used to wrap W3C-compatible XPathExpression
 * objects.</p>
 * 
 * XPathExpression Interface.
 * @author <a href="tag@cpan.org">Scott S. McCoy</a>
 */
xmvc.XPathExpressionLocator = function (expression) {
    /**
     * This operation is expected to return the first node matched, and no
     * more.
     */
    this.locate = function (context) {
        var result = expression.evaluate(context, 
            XPathResult.FIRST_ORDERED_NODE_TYPE, null)

        return result.singleNodeValue
    }
}

xmvc.ElementIdLocator = function (doc, id) {
    this.locate = function (context) {
        return doc.getElementById(id)
    }
}
