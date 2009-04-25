
/**
 * An exception.
 * @constructor
 * @class An exception from the {@link CBClient}
 */
function CBClientError (message, ua) {
    this.message = "CBClientError: " + message
    this.status = ua.status
    this.headers = ua.getAllResponseHeaders()
}

CBClientError.prototype = new Error("CBClientError: Unknown")

/**
 * Create a CBClient with a given callback.
 * @param {function} callback A function to be executed when a response is
 * received.
 * @constructor
 * @class A simple interface to asynchronous HTTP requests.
 */
function CBClient (observer) {
    if (typeof callback != "function")
        throw new Error(
            "CBClient requires a callback function for construction")

    var ua = new XMLHttpRequest()

    var self = this

    var readystatehandler = function () {
        if (ua.readyState == 4) {
            switch (ua.status) {
                case 302:
                case 304:
                    var url = ua.getResponseHeader("Location")
                    self.get(url)
                    break

                case 404:
                    observer.onerror(new CBClientError("file not found", ua))
                    break

                case 0:
                case 200:
                    var response

                    if (/(?:ht|x)ml/.matches(
                                ua.getResponseHeader("Content-Type"))) {
                        response = ua.responseXML
                    }
                    else {
                        response = ua.responseText
                    }

                    observer.onnotify(response)
                    break

                default:
                    observer.onerror(new CBClientError(ua.responseText, ua))
            }
        }
    }

    /**
     * Set on progress handler for this operation.
     * @member
     * @type function
     */
    this.onprogress = undefined

    /**
     * Set blocking status of this client.
     *
     * Defaults to false.  If true, client will block until response is
     * returned.
     *
     * @member
     * @type boolean
     */
    this.blocking = false

    /**
     * HTTP GET request.
     *
     * This operation requests the given URL with an HTTP GET request.
     * @param {String} url The URL to retrieve.
     */
    this.get = function (url) {
        ua.open("GET", url, !this.blocking)
        ua.send(null)
        ua.onreadystatechange = readystatehandler
        ua.onprogress = this.onprogress
    }

    /**
     * HTTP POST request.
     *
     * This operation requests the given URL with an HTTP POST request.
     * Operation sends the given data or XMLDocument as POST data.
     * @param {String} url The URL to retrieve.
     * @param {XMLDocument} data The XML Document to serialize.
     * @param {String} data The raw data to send.
     */
    this.post = function (url, data) {
        ua.open("POST", url, !this.blocking)
        ua.send(data)
        ua.onreadystatechange = readystatehandler
        ua.onprogress = this.onprogress
    }
}

function CBClientFactory () {
    this.create = function (observer) {
        return new CBClient(observer)
    }
}
