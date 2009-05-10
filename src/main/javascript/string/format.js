/* Excuse the archaic code, it was borrowed from
 * http://interglacial.com/hoj/hoj.html
 */

String.prototype.format = function () {
    if (!arguments.length) return this.toString()

    var result = new String ()
    var tokens = this.split( /(\f\x00*)/ )
    // arguments.copy() doesn't work
    // concat(arguments) doesn't work...
    var eggs   = []
    for (var i = 0; i < arguments.length; i++) eggs[i] = arguments[i]

    /* Replace missing \f tokens values with empty strings */
    while (tokens.length > eggs.length) eggs.push("")

    for (var i = 0; i < tokens.length; i++) {
        if (tokens[i].substring(0, 1) == "\f") {
            if (tokens[i].length > 1) {
                var pad = tokens[i].length - String(eggs[0]).length
                if (pad < 0) pad = 0

                result += String((typeof eggs[0] == "number" ?
                        "0".repeat(pad) :
                        " ".repeat(pad) )
                       + eggs.shift())
            }
            else {
                result += eggs.shift()
            }
        }
        else result += tokens[i]
    }

    return result
}

/*

=head1 NAME

String.format - Simple and fast string formatting

=head1 SYNOPSIS

 load("String/format.js")
 window.alert("An example of \f".format("formatting"))

=head1 DESCRIPTION

This is a very simple extension of the ECMA-262 String object, which adds a
method called "format" to its definition.  This object, and thus this
extension, is is applied to all string value type and String object instances.

=head1 RATIONALE

Implementing sprintf is neither trivial or is it terribly efficient, here we
attempt to build a simple replacement for it that is suitable for most of
sprintf's uses, yet efficient enough to run in even the worst ES
implementations.

=head1 METHODS

=over 4

=item format FORMAT_ARGUMENTS

The format method is the only method this library provides at this time.  It
accepts a varible length argument list, and will replace each formatting token
with the value of the subsequent identifier.

=back

=head1 FORMAT STRINGS

Format strings for String.format are considerably different than that of
sprintf or otherwise.  They provide limited functionality and only provide a
very limited interface for interpolation and left side padding.  It provides no
float or advanced type padding or other formatting.

Format strings are designed mainly to replace each instance of the linefeed
character ("\f") with an arbitrary value.  Padding is accomplished by suffixing
the linefeed character with null characters (which can be expressed as "\0").
The behavior of padding is as follows:

=over 4

=over 2

=item *

Each null character will be replaced with a padding character for the
difference between null characters and the length of the argument in string
value

=item *

Strings are padded with white space

=item *

Numbers are padded with zeroes

=item *

Padding occurs on the left side of the values interpolation

=back

=back

=head1 AUTHOR

Scott S. McCoy (scottmc@housevalues.com)

=cut

 */
