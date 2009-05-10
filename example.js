
function Bar (message) {
    this.message = message
}

function Foo (bar) {
    this.hello = function () {
        window.alert(bar.message)
    }
}

