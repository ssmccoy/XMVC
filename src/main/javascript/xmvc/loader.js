/**
 * @fileoverview
 *
 * <p>Simple web program loader for the XML View-Controller framework.  This
 * loader only works in HTML documents, and relies on DOM Level 0.  This
 * includes the HttpRequest and Semaphore objects for convenience.</p>
 *
 * @author <a href="tag@cpan.org">Scott S. McCoy</a>
 */

/**
 * Create a semaphore.
 *
 * Creates a semaphore with the given number of resources.
 * @constructor
 * @class A super simple non-blocking semaphore
 * @author <a href="tag@cpan.org">Scott S. McCoy</a>
 */
function Semaphore (resources) {
    var usage = 0

    /**
     * Status of resource available.
     *
     * This value will be true of the resource is currently available.  It will
     * be false otherwise.
     *
     * @member
     * @type boolean
     */
    this.isAvailable = function () {
        return usage < resources
    }

    /**
     * Acquire one resource.
     *
     * Forcibly acquires a resource.  Resources are allocated regardless of if
     * they are available
     *
     * @return true if this was actually available.
     * @type boolean
     */
    this.acquire = function () {
        return usage++ < resources
    }

    /**
     * Releases one resource.
     *
     * @return true if this makes a new resource available
     * @type boolean
     */
    this.release = function () {
        return --usage < resources
    }
}


/**
 * @constructor Create a new HTTP Request.
 * @param {String} url The URL to make a request to.
 *
 * @class An object representing a HTTP Request.
 *
 * <p>This object is a simple wrapper around a HTTP request.</p>
 *
 * @author <a href="tag@cpan.org">Scott S. McCoy</a>
 */
function HttpRequest (url) {
    var request          = new XMLHttpRequest()

    this.callback           = function () { }
    this.errorback          = function () { }

    this.async              = false
    this.followRedirects    = true
    this.method             = undefined
    this.content            = undefined

    var httprequest         = this
    var explicitContentType = false


    var readystatechange = function () {
        if (request.readyState == 4) {
            switch (request.status) {
                case 200:
                    return httprequest.callback(request)
                    /* Do I even know that XmlHttpRequest won't handle this for
                     * me? 
                case 302:
                case 304:
                    if (httprequest.followRedirects) {
                        var url = ua.getResponseHeader("Location")

                        var follow = new HttpRequest(url)

                        follow.callback  = callback
                        follow.errorback = errorback
                        follow.async     = async

                        follow.submit(method, payload)
                    }
                     */

                default:
                    return httprequest.errorback(request)
            }
        }

        return null
    }

    this.sendForm = function (object) {
        var pairs = []
        for (var key in object) {
            pairs.push( escape(key) + "=" + escape(object[key]) )
        }

        var body = pairs.join("&")
        
        request.open("POST", url, this.async)

        request.setRequestHeader("Content-Type", 
                "application/x-www-form-urlencoded")

        request.send(body)
        request.onreadystatechange = readystatechange
        request.onprogress = this.onprogress
        
        return request.responseXML
    }

    this.setContentType = function (contentType) {
        request.setRequestHeader("Content-Type", contentType)
        explicitContentType = true
    }

    this.submit = function (method, content) {
        this.method  = method
        this.content = content

    	request.open(type, url, this.async)
    	request.send(document)
        request.onreadystatechange = readystatechange
        request.onprogress = this.onprogress

    	return request.responseXML
    }

    
    /**
     * Send the supplied document as a POST request.
     *
     * <p>Given a document, send a serialized version of it as the content body
     * of a HTTP POST request</p>
     *
     * @param document The document to serialize
     * @return The response document, if the request is synchronous.
     */
    this.post = function (document) {
        if (!explicitContentType) {
            if (document instanceof Node) {
                this.setContentType("text/xml")
            }
            if (typeof document == "string") {
                this.setContentType("text/plain")
            }
        }

        return this.submit("POST", document)
    }
    
    /**
     * Make GET request.
     *
     * <p>Sends this request as a GET request.</p>
     * @return The response document, if the request is synchronous.
     */
    this.get = function () {
        return this.submit("GET", null)
    }

    /**
     * Send HTTP DELETE.
     *
     * <p>Sends the HTTP DELETE verb to the URL for this request.</p>
     *
     * @return The response document, if the request is synchronous.
     */
    this._delete = function () {
        return this.submit("DELETE", null)
    }
}

function XMVCLoader (oldOnloadEvent) {
    var self      = this
    var semaphore = new Semaphore(1)

    this.initialize = function () {
        /* Replace the semaphore with one that will never free, so we can
         * ensure we don't initialize twice. */
        semaphore = new Semaphore(0)

        var configUrl

        var links = document.getElementsByTagName("link")

        for (var i = 0; i < links.length; i++) {
            var link = links[i]

            if (link.getAttribute("rel") == "xmvc-configuration") {
                if (link.getAttribute("type") != "text/xml") {
                    window.alert("Loader configuration error: " +
                            "Invalid content type")
                }
            }
        }

        /* Think about looking for the transformer type through reflection */
        var transfact  = new xmvc.TransfomerFactory()
        var controller = new xmvc.Controller(document)
        var config     = new xmvc.ConfigurationParser(controller, this, config)

        config.parse()
    }

    this.eval = function (response) {
        try {
            var code = new Function(text)

            code()
        }
        catch (exception) {
            window.alert("Error loading core script: " + exception)
        }

        if (semaphore.release()) {
            self.initialize()
        }
    }

    this.load = function (scriptUrl) {
        var scriptRequest = new HttpRequest(observer, scriptUrl)

        scriptRequest.get()
        scriptRequest.async = true
        scriptRequest.callback = this.eval

        scriptRequest.errorback = function (response) {
            semaphore.release()

            if (response.status == 404) {
                window.alert("Unable to find script: " + scriptUrl)
            }
            else {
                window.alert("Error " + response.status + " while loading " +
                        scriptUrl)
            }
        }

        semaphore.acquire()
    }

    this.onload = function () {
        var scripts  = document.head.getElementsByTagName("script")
        var loader   = /loader\.js$/
        var basepath = undefined

        for (var i = 0; i < scripts.length; i++) {
            var src = scripts.getAttribute("src")

            if (loader.test(src)) {
                /* strip the loader */
                basepath = src.replace(loader, "")
            }
        }

        if (basepath == undefined) {
            window.alert("CRITICAL ERROR: Unable to determine base path" +
                    " is the full XMVC distribution present?")
        }

        for (var i = 0; i < self.files.length; i++) {
            self.load(basepath + self.files[i])
        }

        if (oldOnloadEvent != undefined) {
            oldOnloadEvent.call(this, arguments)
        }
    }
}

XMVCLoader.prototype = {
    files: [
        "Action.js",
        "ConfigurationParser.js",
        "Controller.js",
        "ControllerScope.js",
        "Crawler.js",
        "ExpressionFactory.js",
        "Kernel.js",
        "Observer.js",
        "ScriptLoadingObserver.js",
        "TransfomerFactory.js",
        "Transfomer.js",
        "TransformLoadingObserver.js",
        "Updates.js",
        "XPathExpression.js"
    ]
}

window.onload = new XMVCLoader(window.onload).onload
