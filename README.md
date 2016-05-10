# NMR-STAR Viewer

A JavaScript library for viewing, validating, and editing NMR-STAR files.
The library can be ran in standalone mode without an internet connection to
validate NMR-STAR files. After cloning the repository simply load index.shtml
in your web browser of choice to use the validator.

## Features

* Local JavaScript parsing of NMR-STAR files. (Files you select are not uploaded
anywhere; they are processed locally in your browser.)
* Immediate tag and value validation with color coding to show problems.
  * Red means that the tag value does not follow the allowed data type.
  * Deep red means that the tag is not present in the schema.
  * Orange means that a tag value is NULL where that is not allowed.
  * Yellow means that you have unicode data in a tag (which is not allowed).
* Support for editing tag and loop values and then "downloading" the resulting
file from the browser and saving it as a file.
* Tag descriptions and tag value data types are displayed on mouse hover.
* Saveframes and loops are collapsible.
* When editing tag values enumerations from the BMRB are fetched and suggested.
(This feature does not work in offline mode and requires you to use the BMRB
hosted STAR viewer located [here](http://www.bmrb.wisc.edu/dictionary/starviewer/)).
* Loop data is colored to enhance viewability.
* Saveframe references display a link allowing you to go directly to the
saveframe. You can also link to individual saveframes by adding #saveframe_name
to an entry STAR viewer URL [as such](http://www.bmrb.wisc.edu/dictionary/starviewer/?entry=15000#F5-Phe-cVHP).
