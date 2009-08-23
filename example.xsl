<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="2.0"
    xmlns="http://www.w3.org/1999/xhtml"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:param name="message"/>

    <xsl:template match="/">
        <div class="dialog">
            <p>Hello!</p>
            <input type="submit" name="Close"/>
        </div>
    </xsl:template>
</xsl:stylesheet>

