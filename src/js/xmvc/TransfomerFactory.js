/**
 * @constructor
 * @class
 * Default XSLTPrcessor Factory.
 *
 * <p>This factory creates {@link XSLTProcessor} objects.  A similar factory
 * may be implemented which creates wrapper objects that implement the
 * following interface:
 * <pre>
 * {
 *     importStyleSheet: function (stylesheet)
 *     transformToFragment: function (source, parentDocument)
 *     transformToDocument: function (source)
 * }
 * </pre>
 * </p>
 *
 * <p>Its of no coincidence that this is the same interface that <a
 * href="http://developer.mozilla.org/en/docs/XSLTProcessor">Mozilla's
 * XSLTProcesor</a> implements.  For <a
 * href="http://www.mozilla.org/">Mozilla</a> and <a
 * href="http://sarissa.sf.net/">Sarissa</a> users this factory does not need
 * to change.</p>
 */
xmvc.XSLTTransformerFactory = function (doc) {
    this.createTransformer = function () {
        return new xmvc.XSLTTransformer(new XSLTProcessor(). doc)
    }
}

xmvc.XSLTTransformer = function (processor, doc) {
    var params = {}

    this.set = function (key, value) {
        params[key] = value
    }

    this.stylesheet = function (stylesheet) {
        processor.importStylesheet(stylesheet)
    }

    this.transform = function (input) {
        return processor.transformToFragment(input, doc)
    }
}
