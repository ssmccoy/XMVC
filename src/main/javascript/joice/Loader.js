/**
 * @fileoverview
 *
 * <p>A simple web program bootstrap for the Joice container.</p>
 */

function JoiceLoader (global) {
    var propertiesLoading = 0
    var configsLoading    = 0
    var configs           = []
    var properties        = []

    var propertiesParser = new PropertiesParser()

    this.context     = new Context()
    var configurator = new XMLContextConfiguration(this.context)
    var filter       = new XMLConfigurationFilter(configurator)

    this.fetch = function (url, callback) {
        var request = new XMLHttpRequest()

        if (!/\.xml$/.test(url)) {
            request.overrideMimeType('text/plain; charset=x-user-defined')
        }

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

    this.loadProperties = function (url) {
        propertiesLoading++
        var loader = this

        var parseProperties = function (xml, text) {
            /* TODO: Fix this! */
            propertiesParser.parseProperties(text)

            filter.addProperties(propertiesParser)

            if (--propertiesLoading == 0) {
                loader.loadConfigs()
            }
        }

        this.fetch(url, parseProperties)
    }

    this.loadConfigs = function () {
        var parseConfig = function (xml, text) {
            filter.parseConfig(xml.documentElement)
        }

        for (var i = 0; i < configs.length; i++) {
            this.fetch(configs[i], parseConfig)
        }
    }

    this.findGlobalConfigs = function () {
        var links           = document.getElementsByTagName("link")

        for (var i = 0; i < links.length; i++) {
            var link = links[i]

            if (link.getAttribute("rel") == "properties") {
                if (link.getAttribute("type") != "text/plain") {
                    window.alert("Loader configuration error: " + 
                        "expected text plain for properties")
                }

                properties.push(link.getAttribute("href"))
            }

            if (link.getAttribute("rel") == "context") {
                var type = link.getAttribute("type")

                if (!/(application|text)\/xml/.test(type)) {
                    window.alert("Loader configuration error: " +
                            "Invalid content type")
                }

                configs.push(link.getAttribute("href"))
            }
        }

        if (properties.length) {
            for (var i = 0; i < properties.length; i++) {
                this.loadProperties(properties[i])
            }
        }
        else {
            this.loadConfigs()
        }
    }

    this.load = function () {
        var configLocations = this.findGlobalConfigs()
    }

    if (typeof global != "undefined") {
        /* Use DOM Level 0 */
        var oldOnload = global.onload
        var loader = this

        global.onload = function () {
            loader.load()
            oldOnload.apply(this, arguments)
        }

        /* Make the context available in the supplied object scope */
        global.context = this.context
    }
}
