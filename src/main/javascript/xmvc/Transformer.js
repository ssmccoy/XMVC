
function Controller () {
    var selections = []

    this.addSelection = function (selection) {
        selections.push(selection)
    }

    this.process = function (element) {
        /* Add the tree-walker here if you're going to add support for
         * tree-walking selector types. */
        selections.each(function (selection) {
            selection.attach(element)
        })
    }
}

/* Everything from the event onward... */

/**
 * @class Basic visiting selection.
 *
 * <p>Selection (which encapsulates a locator of some sort) which visits each
 * newly attached or mutated document fragment and is allowed to executes the
 * given locator.  It then attaches all actions associated with this selection
 * to all notes which were returned by the locator.</p>
 */
function Selection (locator) {
    var actions = {}

    this.addAction = function (type, action) {
        var actionList = type in actions ? actions[type] : actions[type] = []
        actionList.push(action)
    }

    this.attach = function (element) {
        var nodes = locator.locate(element)

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i]
            
            for (var type in actions) {
                actions[type].each(function (action) {
                    node.addEventListener(type, action.handle)
                })
            }
        }
    }
}

function Action (objectName, methodName, observer) {
    this.handle = function (event, e) {
        var object = context.load(objectName)

        /* If the method returned a value, simulate a notification with it. */
        try {
            var result = object[method](observer, event, e)
        }
        catch (error) {
            observer.error(error)
        }

        if (typeof result != "undefined" && result != null) {
            observer.notify(result)
        }
    }
}

function AppendMutator (controller) {
    this.apply = function (context, modification) {
        context.appendChild(modification)

        this.controller.process(modification)
    }
}

function ReplaceMutator (controller) {
    this.apply = function (context, modification) {
        context.parentNode.replaceChild(modification, context)

        this.controller.process(modification)
    }
}

function XPathLocator (expression) {
    this.locate = function (context) {
        if (context == null) {
            return document.selectSingleNode(expression)
        }
        else {
            return context.selectSingleNode(expression)
        }
    }

    this.list = function (context) {
        if (context == null) {
            return document.selectNodes(expression)
        }
        else {
            return context.selectNodes(expression)
        }
    }
}

function NoopObserver () {
    this.notify = function () {}
    this.error  = function () {}
}

function TransformObserver (transformers, locator, mutator) {
    this.next   = null

    this.error  = function (error) {
        /* I don't feel like this is the right thing for this observer to do.
         * Shouldn't there be a way to route these errors somewhere? */
        window.alert(error)
    }

    this.notify = function (input) {
        var modification = this.transform(input)
        var element      = locator.locate()

        mutator.apply(element, modification)
    }

    this.transform = function (input) {
        transformers.each(function (transformer) {
            input = transformer.transform(input)
        })

        return input
    }
}

/**
 * @class An XSLT Transformer.
 *
 * <p>This simple XSLT Transformer asynchornously fetches a stylesheet, loads
 * it into the XSLTProcessor and configures it with the given set of
 * parameters.  It then uses this stylesheet for any and all
 * transformations.</p>
 *
 * @constructor
 * Create a new XSLT Transformer.
 *
 * @param stylesrc The URI of the stylesheet to load.
 * @param parameters A map of parameters.
 */
function XSLTTransformer (stylesrc, parameters) {
    /* This should use document.load("..."), but that doesn't seem to work in
     * safari.  Goddamn browser portability nonsense. */
    var request   = new HttpRequest(stylesrc)
    var processor = new XSLTProcessor()

    request.async = true
    request.callback = function (stylesheet) {
        processor.importStylesheet(stylesheet)

        for (var key in parameters) {
            processor.setParameter(null, key, parameters[key])
        }
    }

    request.get()

    /**
     * Transform the given input.
     *
     * @param input An XML document fragment.
     * @return An XML Document fragment for the current document.
     */
    this.transform = function (input) {
        return processor.transformToFragment(input, document)
    }
}

/**
 * @class A passthrough object transformer.
 *
 * <p>Simple transformer that loads an object (by name) from the global joice
 * context and calls {@link #transform()} on it.  The {@link transform()}
 * method is given the parameters of the input object, and the map of name
 * value pairs this object encapsulates.</p>
 *
 * @constructor Create a new object transformer.
 *
 * @param objectName The label of the object to load.
 * @param parameters A map of name value pairs to pass to the transform method.
 */
function ObjectTransformer (objectName, parameters) {
    /**
     * Load the given object and invoke transform.
     *
     * @param input The object to be transformed.
     * @return An XML Document fragment, or an object for another transformer.
     */
    this.transform = function (input) {
        var object = context.load(objectName)

        return object.transform(input, parameters)
    }
}
