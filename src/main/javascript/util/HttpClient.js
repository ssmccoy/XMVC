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
    var request             = new XMLHttpRequest()
    /* TODO: Remove this, not supported by IE & not really working anyway...
    request.overrideMimeType("text/plain")
*/

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
                case 0:
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

    	request.open(method, url, this.async)
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
