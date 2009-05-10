/**
 * @fileoverview
 *
 * <p>A simple web program bootstrap for the Joice container.</p>
 */

function JoiceLoader (global) {
    var propertiesLoading = 0
    var configs           = []
    var properties        = []
    
    /* TODO Use the semaphore to track whether or not we're actually allowed to
     * start parsing.  Fetch & queue all XML fragments and properties files
     * until all are available, and then parse (in order) properties &
     * configurations.
     *
     * TODO Think about optimizing the script loader so that non-tokenized
     * scripts get loaded immediately (this way they'll be available as soon as
     * possible, and can be factored into the semaphore behavior).
     */
    var semaphore        = new Semaphore(1)
    var propertiesParser = new PropertiesParser()

    this.context     = new Context()
    var configurator = new XMLContextConfiguration(this.context)
    var filter       = new XMLConfigurationFilter(configurator)

    this.fetch = function (url, callback) {
        var request = new XMLHttpRequest()

        request.open("GET", url, true)
        request.send(null)

        request.onreadystatechange = function () {
            /* TODO: Fix this is done in too many places, consolidate */
            if (request.readyState == 4) {
                switch (request.status) {
                    case 403:
                    case 404:
                    case 500:
                        throw new Error("Error " + request.status + 
                                " while fetching " + url)

                    case 200:
                    case 0:
                        callback(request.responseXML, request.responseText)
                }
            }
        }
    }

    this.initialize = function () {
        /* If there are no leases, then everything we've dispatched should have
         * returned.  Otherwise we'll be waiting for a lease to be returned.
         */
        if (semaphore.isAvailable()) {
            properties.each(function (text) {
                var parser = new PropertiesParser()

                parser.parseProperties(text)
                filter.addProperties(parser)
            })

            configs.each(function (config) {
                filter.parseConfig(config)
            })

            context.initialize()
        }
    }

    this.loadProperties = function (url) {
        semaphore.acquire()

        var loader = this
        var parseProperties = function (xml, text) {
            /* TODO: Fix this! */
            properties.push(text)

            semaphore.release()
            loader.initialize()
        }

        this.fetch(url, parseProperties)
    }

    this.loadConfig = function (url) {
        semaphore.acquire()

        var loader = this
        var parseConfig = function (xml, text) {
            configs.push(xml.documentElement)

            semaphore.release()
            loader.initialize()
        }

        this.fetch(url, parseConfig)
    }

    this.loadGlobalConfigs = function () {
        var links           = document.getElementsByTagName("link")

        for (var i = 0; i < links.length; i++) {
            var link = links[i]

            if (link.getAttribute("rel") == "properties") {
                if (link.getAttribute("type") != "text/plain") {
                    window.alert("Loader configuration error: " + 
                        "expected text plain for properties")
                }
                else {
                    this.loadProperties(link.getAttribute("href"))
                }
            }

            if (link.getAttribute("rel") == "context") {
                var type = link.getAttribute("type")

                if (!/(application|text)\/xml/.test(type)) {
                    window.alert("Loader configuration error: " +
                            "Invalid content type")
                }
                else {
                    this.loadConfig(link.getAttribute("href"))
                }
            }
        }
    }

    this.load = function () {
        this.loadGlobalConfigs()
    }

    if (typeof global != "undefined") {
        /* Use DOM Level 0 */
        var oldOnload = global.onload
        var loader = this

        global.onload = function () {
            loader.load()
            if (oldOnload) oldOnload.apply(this, arguments)
        }

        /* Make the context available in the supplied object scope */
        global.context = this.context
    }
}
