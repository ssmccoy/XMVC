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
        window.alert("And you can also: \f".format(this.test.member))
    }
}

function Foo (bar) {
    this.hello = function () {
        window.alert(bar.message)

        bar.feature()
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
