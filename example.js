function Baz (list) {
    this.print = function () {
        var content = document.getElementById("content")

        list.each(function (node) {
            content.appendChild(document.createTextNode(node))
            content.appendChild(document.createTextNode("\n"))
        })
    }
}

function Bar (message) {
    this.message = message

    this.feature = function () {
        window.alert("And you can also: \f".format("click"))
    }
}

function Foo (bar) {
    this.hello = function () {
        window.alert(bar.message)

        bar.feature()

        return false
    }
}

var hello = document.getElementById("hello")

hello.onclick = function () {
    var foo = context.load("foo")
    foo.hello()
}

var list = document.getElementById("list")

list.onclick = function () {
    var baz = context.load("baz")
    baz.print()
}

function Greeter () {
    this.hello = function (observer, ctx) {
        var fragment = document.createElement("nothing")
        observer.notify(fragment)
    }

    this.goodbye = function (observer, ctx) {
        /* Traverse up to the dialog root node, and remove it:
         * TODO A way to remove children from the controller xml.
         */
        var dialog = ctx.element.parentNode

        dialog.parentNode.removeChild(dialog)

        return false
    }
}
