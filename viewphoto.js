function Photo () {
    this.id      = null
    this.owner   = null
    this.element = null

    this.attach = function (observer, action) {
        this.element = action.element
        var linktext = this.element.getAttribute("href")
        var input    = linktext.substring(linktext.indexOf("#") + 1).split(",")

        this.id      = input[0]
        this.owner   = input[1]
    }

    this.displayId = function () {
        window.alert("This is photo #" + this.id)
    }
}

function ArticleRequest (photo) {
    var areaSelector = new AreaSelection(photo)

    var selection = controller.createSelection(
        controller.createLocator("id", "photo")
    ).addAction("mousedown", areaSelector.start)
     .addAction("mousemove", areaSelector.move)
     .addAction("mouseup", areaSelector.finish)

    selection.attach(photo.element)

    areaSelector.onselect = function () {
    }

    this.setText = function (text) {
        this.text = text
    }
}

function ArticleRequestSubmission (url, photo, request) {
    var request = new HttpRequest(url)

    request.open

    this.send = function (observer, action) {
    }
}
