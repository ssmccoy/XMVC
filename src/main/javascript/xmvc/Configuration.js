
function XMVCConfigParser (controller) {
    this._buildTransformer = function (transform) {
        var source   = transform.getAttribute("src")
        var type     = transform.getAttribute("type")

        var transformer = controller.getTransformer(type, source)
    }

    this._nextTransformNode = function (transform) {
        for (var node = transform.firstChild;
                 node != null;
                 node = node.nextSibling) {
            if (node.tagName == "transform") {
                return node
            }
        }

        return null
    }

    this._buildTransformObserver = function (transform) {
        var mutation = "replace"

        if (transform.hasAttribute("behavior")) {
            mutation = transform.getAttribute("behavior")
        }

        var transformers = []

        for (var node = transform;
                 node != null;
                 node = this._nextTransformNode(node)) 
        {
            var transformer = this._buildTransformer(transform)

            /* Prepend to the list, they need to be processed from lowest
             * descendant to parent */
            transformers.unshift(transformer)
        }

        var locator     = this._buildLocator(transform)
        var mutator     = controller.getMutator(mutation)

        var transformObserver = new TransformObserver(
            transformers, locator, mutator)

        return transformObserver
    }

    this._buildAction = function (observer) {
        return controller.createAction(
            action.getAttribute("object"),
            action.getAttribute("method"),
            observer)
    }

    this._buildLocator = function (node) {
        var locateType = null
        var locatePath = null 

        /* TODO: I think this is all out of date... */
        if (node.hasAttribute("id")) {
            window.alert("ID node")
            locateType = "id"
            locatePath = node.getAttribute("id")
        }
        else if (node.hasAttribute("context")) {
            window.alert("context node")
            locateType = "xpath"
            locatePath = node.getAttribute("context")
        }
        else if (node.hasAttribute("type")) {
            window.alert("type node")
            locateType = node.getAttribute("locator")
            locatePath = node.getAttribute("path")
        }

        return controller.createLocator(locateType, locatePath)
    }

    this._buildSelection = function (node) {
        var locator   = this._buildLocator(node)
        var selection = controller.createSelection(locator)

        for (var child = node.firstChild;
                 child != null;
                 child = child.nextSibling)
        {
            if (child.tagName == "action") {
                /* TODO: Support multiple transform observers through the
                 * listable transform interface. */
                var transform = this._nextTransformNode(child)
                var observer  = null

                if (transform != null) {
                    observer = this._buildTransformObserver(transform)
                }
                else {
                    observer = new NoopObserver()
                }

                selection.addAction(
                        child.getAttribute("type"),
                        this._buildAction(child, observer)
                        )
            }
        }

        return selection
    }

    this._parseNodes = function (element) {
        var selections = []

        for (var node = element.firstChild; 
             node != null; 
             node = node.nextSibling)
        {
            if (node.type == Node.ELEMENT_NODE) {
                if (node.tagName == "node") {
                    selections.push(this._buildSelection(node))
                }
            }
        }

        return selections
    }

    this.parse = function (element) {
        if (element.type == Node.DOCUMENT_NODE) {
            element = element.documentElement
        }

        var selections = this._parseNodes(element)
    }
}
