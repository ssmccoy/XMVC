
/**
 * @constructor
 * @class
 * Default Document ExpressionFactory.
 *
 * <p>This XPathExpressionFactory will use a native document.createExpression,
 * it assumes that the document.createExpression method exists, and will error
 * in it's absence.</p>
 *
 * <p>This constructor function provides a prototype for utilizing custom XPath
 * implementations, such as <a
 * href="http://goog-ajaxslt.sourceforge.net/">Google's AJAXSLT</a>, <a
 * href="http://mcc.id.au/xpathjs/">Cameron McCormack's XPath</a> or <a
 * href="http://js-xpath.sourceforge.net/">js-xpath</a>.  XMVC is not a
 * cross-browser compatability framework, so it is up to the consumer to
 * determine when and how to utilize which implementation of XPath.  Several
 * implemenations are packaged with the base XMVC distribution however.</p>
 *
 * <p>If at all possible, it's advisable any non-standard
 * XPathExpressionFactories should compile the expression as a part of the
 * createExpression method.  This allows caching of the expressions defined
 * within the controller configuration, speeding up the process.</p>
 * 
 * @author <a href="tag@cpan.org">Scott S. McCoy</a>
 * @see http://www.rubendaniels.com/2007/02/23/safari-wrench/
 */
xmvc.ContextLocatorFactory = function () {
    /**
     * Create an XPath Expression.
     *
     * <p>This property will be given as the document in which the XPath
     * Expression will be evaluated.</p>
     * 
     * @param {DOMDocument} the document the expression is to be run on.
     * @param {String} The expression to be compiled.
     */
    this.createExpression = function (doc, expression) {
        var expression = doc.createExpression(expression, doc.createNSResolver)

        return new xmvc.XPathExpression(expression)
    }
}
