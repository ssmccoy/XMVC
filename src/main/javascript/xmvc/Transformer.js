
/**
 * @class The eXtensible Markup View Controller.
 *
 * <p>This is a basic input event controller based on the <a
 * href="http://www.w3.org/TR/DOM-Level-2-Events/">DOM Level 2 Event
 * API</a> and built on top of the <a
 * href="http://www.blisted.org/wiki/joice/">Joice Dependency Injection
 * Framework</a>.</p>
 *
 * @author <a href="mailto:tag@cpan.org">Scott S. McCoy</a>
 *
 * @constructor Create a new controller
 *
 * <p>Provided a document (optionally) create a new document controller.  If no
 * document is provided for context, a browser context will be assumed and
 * window.document will be used.</p>
 *
 * @param document The document to control events for, may be null.
 */
function Controller (document) {
    if (typeof document == "undefined") document = window.document

    var documentScope = new DocumentScope(document)
    var selections    = []
    var mustWalk      = false
    var walkObservers = []

    /* Register the scope with the global context as type "document" */
    context.addScope("document", documentScope)

    /**
     * Adds a tree-walk observer. 
     *
     * <p>Adding tree-walk observers will cause the controller to notify all
     * walk observers for each node added to the document.</p>
     *
     * @param observer.
     */
    this.addWalkObserver = function (walkObserver) {
        mustWalk = true

        walkObservers.push(walkObserver)
    }

    this.walk = function (element) {
        var children = element.childNodes

        for (var i = 0; i < children.length; i++) {
            this.walk(children[i])
        }

        walkObservers.each(function (observer) {
            observer.visit(element)
        })
    }

    var handleProcessing = function (element) {
        /* Walk the node if we have stuff to do... */
        if (walkObservers.length) {
            this.walk(element)
        }

        selections.each(function (selection) {
            selection.attach(element)
        })
    }

    /**
     * Process a given element (and it's descendants).
     */
    this.process = function (element) {
        var controller = this
        
        /* Cycle in and out of the browser context to allow for rendering.
         * This sets the timeout to 1ms so it won't contend with the "ready"
         * state handlers used to initialize some other frameworks (including
         * joice).  We want those to go first, just incase they create objects
         * or something (like joice). */
        window.setTimeout(function () {
            handleProcessing.call(controller, element)
        }, 1)
    }

    this.createSelection = function (locator) {
        var selection = new Selection(locator)

        this.addSelection(selection)
    }

    this.addSelection = function (selection) {
        selections.push(selection)
    }

    this.createAction = function (objectName, methodName, observer) {
        return new Action(documentScope, objectName, methodName, observer)
    }

    this.process(document)
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
function Selection (locator, documentScope) {
    var actions = {}

    /**
     * Add a new action to this selection.
     *
     * <p>Given an event type and an action, add the action to this selection
     * for the given event type.  All elements seen from this point on will
     * have the given action attached to them for this event type.
     *
     * @param {String} type The type of event.
     * @param {Action} action The action to invoke.
     *
     * @return {Selection} This selection object (for method chaining)
     */
    this.addAction = function (type, action) {
        var actionList = type in actions ? actions[type] : actions[type] = []

        /* Create a simple wrapper for "function" actions. */

        if (typeof action == "function") {
            actionList.push({handle:action})
        }
        else {
            actionList.push(action)
        }

        /* Allow chained calls, e.g::
         * 
         * controller.createSelection( 
         *  controller.createLocator("jquery", * "p.foo")
         * ).addAction("click", 
         *  controller.createAction("objectName", "methodName")
         *  ).addAction("click",
         *  controller.createAction("objectName", "methodName")
         *            .addObserver(new NoopObserver())
         *  ).addAction(
         *  controller.createAction("objectName", "methodName",
         *      new NoopObserver()))
         *  
         */
        return this
    }

    /**
     * Execute a callback for each action for each element the selector
     * matches.
     *
     * @param element The element to try and match.
     * @param callback The code to execute.
     */
    function allActions (element, callback) {
        var nodes = locator.list(element)

        var hits = nodes.length;

        for (var i = 0; i < hits; i++) {
            var node = nodes[i]
            
            for (var type in actions) {
                actions[type].each(callback)
            }
        }

        return hits > 0
    }

    /**
     * Attach any applicable events to children of the given element.
     *
     * <p>Visits a given element and tests the locator on it to determine if
     * any of the children of the element are matches according to the locator
     * for this selection.  For each match, it attaches all action handlers for
     * all event types this selection maintains.</p>
     *
     * @return true if there were any matches, false otherwise.
     */
    this.attach = function (element) {
        return allActions(element, function (action) {
                node.addEventListener(type, action.handle)
                })
    }

    /**
     * Detach any applicable events from children of the given element.
     *
     * @param element
     *
     * @return true if there were any matches.
     */
    this.detach = function (element) {
        return allActions(element, function (action) {
                node.removeEventListener(type, action.handle)
                })
    }
}

function Action (scope, objectName, methodName, observer) {
    var listable = new ListableObserver([])

    if (typeof observer != "undefined")
        listable.addObserver(observer)

    this.addObserver = function (observer) {
        listable.addObserver(observer)

        return this
    }

    /**
     * Handle an event.
     *
     * <p>Handle an actual DOM event and perform the appropriate action for the
     * event, execute the appropriate method on the appropriate object and
     * provide it the appropriate observer.  This method is called directly
     * from the DOM Event API.</p>
     *
     * @param event The event object (implementation specific)
     * @param e (optional) Event Target or similar element (implementation
     * specific)
     *
     * @result Implementation specific, comes from action result.
     */
    /* XXX This method is called from the context of a DOM element.  It *must*
     * not rely on local "this" references that do not point to the current
     * target element for the given event.
     */
    this.handle = function (event, e) {
        scope.select(this)

        var object = context.load(objectName)

        /* If the method returned a value, simulate a notification with it. */
        try {
            var result = object[method](observer, 
                { element: this, event: event, extra: e, scope: scope })
        }
        catch (error) {
            observer.error(error)
        }

        /* XXX This doesn't seem right, we might want to stop events by
         * returning "false" etc... 
        if (typeof result != "undefined" && result != null) {
            observer.notify(result)
        }
         */

        return result
    }
}

function MutatorWrapper (controller, mutator) {
    this.apply = function (context, modification) {
        mutator.apply(context, modification)

        controller.process(modification)
    }
}

function AppendMutator () {
    this.controller = null

    this.apply = function (context, modification) {
        context.appendChild(modification)
    }
}

function ReplaceMutator () {
    this.controller = null

    this.apply = function (context, modification) {
        context.parentNode.replaceChild(modification, context)
    }
}

/**
 * An XPath selector.
 *
 * <p>Relies on there being element and document level <code>selectNodes</code>
 * and <code>selectSingleNode</code> methods as provided by Internet Explorer
 * and Sarissa.</p>
 *
 * @constructor Create a new XPath based Locator.
 * @param expression The xpath expression.
 */
function XPathLocator (expression) {
    this.locate = function (context) {
        if (context == null || typeof context == "undefined") {
            context = document
        }
        
        return context.selectSingleNode(expression)
    }

    this.list = function (context) {
        if (context == null) {
            context = document
        }
        
        return context.selectNodes(expression)
    }
}

function FastIdLocator (id) {
    this.locate = function (context) {
        var element = document.getElementById(id)

        if (context == null || typeof context == "undefined") {
            return element
        }


        for (var cursor = element; cursor != null; cursor = cursor.parentNode)
        {
            if (cursor == context) {
                return element;
            }
        }

        return null;
    }

    this.list = function (context) {
        var element = this.locate(context)

        return element != null ? [ element ] : []
    }
}

function NoopObserver () {
    this.notify = function () {}
    this.error  = function () {}
}

/**
 * A listable observer.
 */
/* XXX: I don't believe this is any longer necessary, since we actually have
 * the ability to chain the transform observer below.
 */
function ListableObserver (observers) {
    if (typeof observers == "undefined") observers = []

    this.addObserver = function (observer) {
        observers.push(observer)
    }

    /**
     * Notify all observers of the input.
     *
     * <p>Given an input object, pass it along to all observers in the
     * list.</p>
     *
     * @param input The input object to pass along.
     */
    this.notify = function (input) {
        observers.each(function (observer) {
            observer.notify(input)
        })
    }

    /**
     * Notify all encapsulated observers of the exception.
     */
    this.error = function (exception) {
        observers.each(function (observer) {
            observer.error(exception)
        })
    }
}

function TransformObserver (transformers, locator, mutator) {
    this.error  = function (error) {
        /* I don't feel like this is the right thing for this observer to do.
         * Shouldn't there be a way to route these errors somewhere? */
        window.alert(error)
    }

    this.notify = function (input) {
        var modification = this.transform(input)
        var element      = locator.locate()

        if (element == null) {
            /* TODO THROW EXCEPTION */
        }
        else {
            mutator.apply(element, modification)
        }
    }

    this.transform = function (input) {
        var result = input

        /* Pipeline all transformers in the list, in order from start to end.
         */
        transformers.each(function (transformer) {
            result = transformer.transform(result)
        })

        return result
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
