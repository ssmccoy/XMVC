
function Bar (message) {
    this.message = message
}

function Foo (bar) {
    this.hello = function () {
        window.alert(bar.message)
    }
}

var element = document.getElementById("hello")

element.onclick = function () {
    var foo = context.load("foo")
    foo.hello()
}
