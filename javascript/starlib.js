
// Change to modify behavior
var skip_empty_loops = false;
var dont_validate = false;
var debug = false;
var show_hidden_tags = false;

// Don't change these yourself
var star;
var current_chunk = "";
var to_process = "";
var token = "";
var timeouts = [];
var whitespace = " \t\n";

// Include jQuery if we don't have it and set offline to true
if (typeof jQuery == 'undefined') {
    document.write('<script type="text/javascript" src="javascript/jquery.min.js"></script>');

    // Keep track of whether we are embedded in the BMRB page or not
    offline = true;
} else {
    offline = false;
}

/*
 *
 * Class definitions
 *
 */

/* NMR-STAR */

// NMR-STAR definition
var NMRSTAR = function (name) {
    this.dataname = name;
    this.saveframes = [];
};

// Create a STAR from JSON
NMRSTAR.prototype.fromJSON = function(jdata){

    this.dataname = jdata['bmrb_id'];
    this.saveframes = [];
    for (var i=0; i<jdata['saveframes'].length; i++){
        var new_frame = new SAVEFRAME(jdata['saveframes'][i]['name'], i);
        new_frame.tag_prefix = jdata['saveframes'][i]['tag_prefix'];
        new_frame.tags = jdata['saveframes'][i]['tags'];
        new_frame.category = jdata['saveframes'][i]['category'];
        new_frame.ordinal = i;
        new_frame.loops = [];
        for (var n=0; n<jdata['saveframes'][i]['loops'].length; n++){
            var new_loop = new LOOP(n, i);
            new_loop.columns = jdata['saveframes'][i]['loops'][n]['tags'];
            new_loop.data = jdata['saveframes'][i]['loops'][n]['data'];
            new_loop.category = jdata['saveframes'][i]['loops'][n]['category'];
            new_frame.loops.push(new_loop);
        }
        this.saveframes.push(new_frame);
    }
}

// Adds a new saveframe to an NMR-STAR entry
NMRSTAR.prototype.addSaveframe = function(saveframe){
    this.saveframes.push(saveframe);
}

// Downloads the NMR-STAR file
NMRSTAR.prototype.download = function(){
    try {
        download(this.dataname + "_3.str" , this.print());
    } catch (err){
        alert("Could not create NMR-STAR text file! Errors encountered: " + err);
    }

}

// Method to convert the NMR-STAR object to text representation
NMRSTAR.prototype.print = function() {
    var result =  "data_" + this.dataname + "\n\n";

    this.saveframes.forEach(function(saveframe) {
        result += saveframe.print() + "\n";
    });

    return result;
};

// Creates a HTML DOM representation of an entry
NMRSTAR.prototype.toHTML = function() {
    // Clear all existing timouts (if a previous entry was still generating)
    for (var i=0; i<timeouts.length; i++) {
        clearTimeout(timeouts[i]);
        timeouts = [];
    }

    // Clear all the children of the anchor
    var myNode = document.getElementById("dynamic_anchor");
    for (var i = myNode.childNodes.length - 1; i >= 0; i--) {
        myNode.removeChild(myNode.childNodes[i]);
    }

    var root = $("#dynamic_anchor").append(createLineDiv().append(createUneditableSpan("data_" + star.dataname))).addClass("star");
    for (var s=0; s < star.saveframes.length; s++){
        timeouts.push(setTimeout(this.saveframes[s].toHTML.bind(this.saveframes[s], root), s*100));
    }

    // This ensures that if a location hash was provided that we try to scroll
    //  to it - but only once everything is loaded...
    timeouts.push(setTimeout(function(){
        var hash = location.hash.substring(1);
        if (document.getElementById(hash) !== null){
            document.getElementById(hash).scrollIntoView(true);
        }
    }, star.saveframes.length*100+100));

    return root;
}

// Saveframe definition
var SAVEFRAME = function (name, ordinal) {
    this.name = name;
    this.ordinal = ordinal;
    this.tag_prefix = "";
    this.category = "";
    this.tags = [];
    this.loops = [];
};

// Add a loop to a saveframe
SAVEFRAME.prototype.addLoop = function(loop){
    this.loops.push(loop);
}

// Add a tag to a saveframe
SAVEFRAME.prototype.addTag = function(tag, value){
    // Only set the tag prefix for the first tag we see
    if (this.tag_prefix == ""){
        this.tag_prefix = tag.substring(0, tag.indexOf("."));
    } else if (this.tag_prefix != tag.substring(0, tag.indexOf("."))){
        throw "Illegal tag in saveframe '" + this.name + "' with different tag prefix than first tag: " + tag;
    }

    var tag_name = tag.substring(tag.indexOf(".")+1);
    if (tag_name == "Sf_category"){
        this.category = value;
    }
    this.tags.push([tag_name, value]);
}

// Create a textual representation of a saveframe
SAVEFRAME.prototype.print = function() {

    var width = 0;

    this.tags.forEach(function(tag) {
        if (tag[0].length > width){
            width = tag[0].length;
        }
    });
    width += this.tag_prefix.length + 2;

    // Print the saveframe
    var ret_string = sprintf("save_%s\n", this.name);
    var pstring = sprintf("   %%-%ds  %%s\n", width);
    var mstring = sprintf("   %%-%ds\n;\n%%s;\n", width);

    var tag_prefix = this.tag_prefix;

    this.tags.forEach(function(tag){
        var cleaned_tag = cleanValue(tag[1]);

        if (cleaned_tag.indexOf("\n") == -1){
            ret_string +=  sprintf(pstring, tag_prefix + "." + tag[0], cleaned_tag)
        } else {
            ret_string +=  sprintf(mstring, tag_prefix + "." + tag[0], cleaned_tag)
        }
    });

    this.loops.forEach(function(loop) {
        ret_string += loop.print();
    });

    return ret_string + "save_\n";
};

// Creates a HTML DOM representation of a saveframe
SAVEFRAME.prototype.toHTML = function(attach_to){

    var outer_saveframe_div = $("<div><div>");
    // Create the shrink button
    var shrink = $('<img name="minimize" src="images/minimize.png" title="' + this.name + '">');
    shrink.attr('onclick', 'toggleButtonHandler(this, "saveframe_' + this.ordinal + '");');

    // Create the encapsulating <div>
    var saveframe_div = $("<div><div>").attr("id", "saveframe_" + this.ordinal).addClass("saveframe");

    // Add the save_name line
    outer_saveframe_div.append(createLineDiv().append(shrink,
        createUneditableSpan(" save_"),
        createEditableSpan(this.name, "star.saveframes[" + this.ordinal + "].name").attr('id', this.name)));

    // Add the tags
    var tag_table = $("<table></table>").addClass("oneindent").css("maxWidth", "95%");
    for (var t=0; t < this.tags.length; t++){

        // Tag values
        var name = this.tag_prefix + '.' + this.tags[t][0];
        var value = this.tags[t][1];
        var link_to = sprintf("star.saveframes[%d].tags[%d][1]", this.ordinal, t);

        // Create the row
        var table_row = $("<tr></tr>").attr("id", name).addClass(validateTag(name, value)).addClass("highlight");

        // Create the tag td
        var tag_td = $("<td></td>").append(createUneditableSpan(name).prop("title", getTitle(name)));

        // Create the value td
        var value_span = createEditableSpan(value, link_to).prop("title", getType(name));
        value_span.attr("onblur", sprintf("%s updateTag('%s', this.innerHTML);", value_span.attr("onblur"), name));
        value_span.attr("tag", name);

        // Only set up autocomplete if we are online
        if (!offline){
            value_span.focus(function(){
                $(this).autocomplete({
                    source: "//webapi.bmrb.wisc.edu/v2/enumerations/".concat($(this).attr("tag")),
                    delay: 100,
                    minLength: 0
                });
            });
        }

        // This works, but is it worth it?
        value_span.keypress(function(evt) {
            if(evt.which == 13) {
                return insertUnicodeNewline($(this));
            }
        });

        var value_td = $("<td></td>");
        if (value.startsWith("$")){
            value_td.append($("<a>Jump to: </a>").attr("href", "#" + value.substring(1)));
        }
        value_td.append(value_span);

        table_row.append(tag_td, value_td);
        // Keep track of empty tags
        if (value == "."){
            table_row.addClass("empty");
            if (!show_hidden_tags){table_row.hide();}
        }
        tag_table.append(table_row);
    }
    saveframe_div.append(tag_table);

    // Add the loops
    for (var l=0; l < this.loops.length; l++){
        //setTimeout(this.loops[l].toHTML.bind(this.loops[l], saveframe_div), l);
        saveframe_div.append(this.loops[l].toHTML());
    }

    // Add the "save_"
    setTimeout(function (){
        saveframe_div.append(createLineDiv().append(createUneditableSpan("save_")));
    }, this.loops.length + 1);

    outer_saveframe_div.append(saveframe_div);

    // For asynchronous additions
    if (attach_to != null){
        attach_to.append(outer_saveframe_div);
    } else {
        return outer_saveframe_div;
    }
}

// Loop definition
var LOOP = function (ordinal, saveframe_ordinal) {
    this.ordinal = ordinal;
    this.saveframe_ordinal = saveframe_ordinal;
    this.columns = [];
    this.data_in_column = [];
    this.data = [];
    this.category = null;
};

// Adds a tag (a column descriptor) to a loop
LOOP.prototype.addColumn = function(column_name){
    var column = column_name.substring(column_name.indexOf(".")+1)
    var category = column_name.substring(0,column_name.indexOf("."))
    if ((this.category != undefined) && (this.category != category)){
        throw "Error - mismatching columns: " + this.category + " " + category;
    }
    this.category = category;
    if (this.columns.indexOf(column) == -1){
        this.columns.push(column);
    }
}

LOOP.prototype.checkNull = function(){

    // Go through the columns
    for (var x=0; x < this.columns.length; x++){
        this.data_in_column[x] = false;

        // Check the data for a given column
        for (var n=0; n < this.data.length; n++){
            if (this.data[n][x] != "."){
                this.data_in_column[x] = true;
                break;
            }
        }
    }
}

// Just add a data bit to the next appropriate place
LOOP.prototype.addDatum = function(value){

    // Make sure the columns are defined
    if (this.columns.length == 0){
        throw "Cannot add data to a loop without columns using this method. Please make sure to specify the columns using addColumn() first.";
    }

    // Create the first row if neccessary
    if (this.data.length == 0){
        this.data.push([]);
    }

    // Add the data
    var last_row = this.data[this.data.length-1];
    // We need a new row
    if (last_row.length == this.columns.length){
        this.data.push([]);
        last_row = this.data[this.data.length-1];
    }
    last_row.push(value);
}

// Create a textual representation of a loop
LOOP.prototype.print = function() {

    // Check for empty loops
    if (this.data.length == 0){
        if (skip_empty_loops){
            return "";
        } else if (this.columns.length == 0){
            return "\n   loop_\n\n   stop_\n";
        }
    }

    // Can't print data without columns
    if (this.columns.length == 0){
        throw sprintf("Impossible to print data if there are no associated tags. Loop: '%s'.", self.category);
    }

    // Make sure that if there is data, it is the same width as the column tags
    if (this.data.length > 0){
        for (var n=0; n < this.data.length; n++){
            if (this.columns.length != this.data[n].length){
                throw sprintf("The number of column tags must match width of the data. Row: %d Loop: '%s'.", n, this.category);
            }
        }
    }

    // Start the loop
    var ret_string = "\n   loop_\n";
    // Print the columns
    var pstring = "      %-s\n";

    // Check to make sure our category is set
    if (this.category == undefined){
        throw "The category was never set for this loop. Either add a column with the category intact, specify it when generating the loop, or set it using setCategory.";
    }

    // Print the categories
    var loop_category = this.category;
    this.columns.forEach(function(column){
        ret_string += sprintf(pstring, loop_category + "." + column);
    });

    ret_string += "\n";

    // If there is data to print, print it
    if (this.data.length != 0){

        var widths = Array(this.data[0].length).fill(0);

        // Figure out the maximum row lengths
        this.data.forEach(function(row){
            for (var n=0; n < row.length; n++){
                // Don't count data that goes on its own line
                if (row[n].indexOf("\n") != -1){
                    continue;
                }
                if (row[n].length + 3 > widths[n]){
                    widths[n] = row[n].length + 3;
                }
            }
        });

        // Go through and print the data
        this.data.forEach(function(row){

            // Each row starts with whitespace
            ret_string += "     ";

            // Get the data ready for printing
            for (var n=0; n < row.length; n++){

                var datum_copy = cleanValue(row[n]);
                if (datum_copy.indexOf("\n") != -1){
                    datum_copy = sprintf("\n;\n%s;\n", datum_copy);
                }

                // Add the data to the return string
                ret_string += sprintf("%-" + widths[n] + "s", datum_copy);
            }

            // End the row
            ret_string += " \n";
        });
    }

    // Close the loop
    ret_string += "   stop_\n";
    return ret_string
};

LOOP.prototype.getDataTable = function(){
    var table = $("<table></table>").addClass("twoindent alternatingcolor").css("maxWidth", "95%");
    for (var d = 0; d < this.data.length; d++) {
        var the_row = $("<tr></tr>");

        for (var n = 0; n < this.data[d].length; n++) {
            var tag_name = this.category + "." + this.columns[n];
            var our_id = "star.saveframes[" + this.saveframe_ordinal + "].loops[" + this.ordinal + "].data[" + d + "][" + n + "]";
            var datum = createEditableSpan(this.data[d][n], our_id).addClass("highlight");
            datum.addClass(validateTag(tag_name, this.data[d][n]));
            datum.prop("title", getTitle(tag_name, true));
            datum.attr("onblur", datum.attr("onblur") + " updateDatum('" + tag_name + "', '" + our_id + "', this.innerHTML);");
            datum.attr("id", our_id).attr("tag", tag_name);

            if (this.data_in_column[n] == false) {
                datum.addClass("empty");
                if (!show_hidden_tags) {
                    datum.hide();
                }
            }

            datum.keypress(function (evt) {
                if (evt.which == 13) {
                    return insertUnicodeNewline($(this));
                }
            });
            if (!offline) {
                datum.focus(function () {
                    $(this).autocomplete({
                        source: "//webapi.bmrb.wisc.edu/v2/enumerations/".concat($(this).attr("tag")),
                        delay: 100,
                        minLength: 0
                    });
                });
            }

            var the_td = $("<td></td>");

            if (this.data[d][n].startsWith("$")) {
                the_td.append($("<a>Jump to: </a>").attr("href", "#" + this.data[d][n].substring(1)));
            }

            the_td.append(datum);
            the_row.append(the_td);
        }
        table.append(the_row);
    }
    return table;
}

// Creates a HTML DOM representation of a loop
LOOP.prototype.toHTML = function(attach_to){

    this.checkNull();

    var loop_id = sprintf("saveframe_%d_loop_%d", this.saveframe_ordinal, this.ordinal);
    var loop_unique = star.saveframes[this.saveframe_ordinal].name + "." + this.category;
    var outer_loop_div = $("<div><div>").attr("id", loop_unique);

    // Create the shrink button
    var shrink = $('<img name="minimize" src="images/minimize.png">');
    shrink.attr('onclick', 'toggleButtonHandler(this, "' + loop_id + '");');

    var loop_div = $("<div><div>").attr("id", loop_id);
    var loop_row = createLineDiv().attr("title", this.category).addClass("oneindent");

    loop_row.append(shrink, createUneditableSpan(" loop_"), createUneditableSpan(this.category.substring(1)).attr("id", loop_id + "_name").hide());
    outer_loop_div.append(loop_row, loop_div);

    // Add the loop columns
    for (var l=0; l < this.columns.length; l++){
        lc = createLoopColumn(this.category + '.' + this.columns[l]);
        // Hide columns with no data by default
        if (this.data_in_column[l] == false){
            lc.addClass("empty");
            if (!show_hidden_tags){lc.hide();}
        }
        loop_div.append(lc);
    }

    // Don't show huge tables
    if (this.data.length * this.data[0].length < 5000) {
        loop_div.append(this.getDataTable());
    } else {
        var closure_reference = this;
        var warning_span = createUneditableSpan("Loop contains too much data to visualize. ").addClass("twoindent");

        var override = $("<a href='javascript:void(0)'>Click to load anyways.</a>").click(function() {
            warning_span.parent().find(warning_span).replaceWith(closure_reference.getDataTable());
        });

        warning_span.append(override);
        warning_span.prepend($("<br>"));
        loop_div.append(warning_span);
    }

    loop_div.append(createLineDiv().append(createUneditableSpan("stop_")).addClass("oneindent"));
    if (attach_to != null){
        attach_to.append(outer_loop_div);
    } else {
        return outer_loop_div
    }
}


// Replace all function for strings
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

/*
 *
 * DOM creation and editor functions
 *
 */

// Function to check for illegal unicode characters in the file
function containsIllegalNonLatinCodepoints(s) {
    return /[^\u0000-\u00ff]/.test(s.replace(/⏎/g, "\n"));
}

/* Automatically quotes the value in the appropriate way. Don't quote
   values you send to this method or they will show up in another set
   of quotes as part of the actual data. E.g.:

cleanValue('"e. coli"') returns '\'"e. coli"\''

while

cleanValue("e. coli") returns "'e. coli'"

This will automatically be called on all values when you use a str()
method (so don't call it before inserting values into tags or loops).

Be mindful of the value of str_conversion_dict as it will effect the
way the value is converted to a string.*/
function cleanValue(value) {

    // If the user inserts a newline in the web editor replace it with a newline
    value = value.replace(/<br>/g, "\n");
    value = value.replace(/⏎/g, "\n");

    // Values that go on their own line don't need to be touched
    if (value.indexOf("\n") != -1){
        if (value.substring(value.length-1) != "\n"){
            return value + "\n";
        } else {
            return value
        }
    }

    // No empty values
    if (value == undefined){
        throw "Empty strings are not allowed as values. Use a '.' or a '?' if needed.";
    }

    // Normally we wouldn't autoconvert null values for them but it may be appropriate here
    if (value == ""){
        value = ".";
    }

    if ((value.indexOf('"') != -1) && (value.indexOf("'") != -1)) {
        return sprintf('%s\n', value);
    }

    if ((value.indexOf(" ") != -1) || (value.indexOf("\t") != -1) || (value.indexOf("#") != -1) || (value.startsWith("_")) || ((value.length > 4) && (value.startsWith("data_")) || (value.startsWith("save_")) || (value.startsWith("loop_")) || (value.startsWith("stop_")))) {

        if (value.indexOf('"') != -1){
            return sprintf("'%s'", value);
        } else if (value.indexOf("'") != -1){
            return sprintf('"%s"', value);
        } else {
            return sprintf("'%s'", value);
        }
    }

    return value
}

// Creates an editable span
function createEditableSpan(content, link_to){
    var content = content.replace(/\n/g, "⏎");
    var span = $("<span></span>").addClass("editable").html(content).attr('contentEditable', true)
    if (link_to != null){ span.attr("onblur", "this.innerHTML = this.innerHTML.replace(/<br>/g,'⏎'); " + link_to + " = this.innerHTML;"); }
    return span;
}

// Creates a new "line" div element
function createLineDiv(){
    return $("<div></div>").addClass("line highlight");
}

// Create a loop tag
function createLoopColumn(name){
    var tag_div = createLineDiv().attr("id", name).addClass("looptag");
    var tag_name = createUneditableSpan(name).addClass("twoindent").prop("title", getTitle(name));
    tag_div.append(tag_name);
    return tag_div;
}

// Creates a new uneditable span
function createUneditableSpan(content){
    return $("<span></span>").addClass("uneditable").html(content);
}

// Called when the user attempts to add a newline; replaces it with the unicode
//  newline symbol that we use instead: ⏎
function insertUnicodeNewline(element){
    var el = element[0];
    var position = getCaretCharacterOffsetWithin(el);
    var newtext = element.html().substring(0,position) + "⏎" + element.html().substring(position);
    element.html(newtext);

    // Set the cursor position?
    el.focus();
    var range = document.createRange();
    var sel = window.getSelection();
    range.setStart(el.childNodes[0], position + 1);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    return false;
}

// Used to insert newline symbol rather than newline
function getCaretCharacterOffsetWithin(element) {
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            var range = win.getSelection().getRangeAt(0);
            var preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
    } else if ( (sel = doc.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        var preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
}

// Returns the description for a tag
function getTitle(tag, loop){
    if (tags[tag] == null){
        return "Tag not present in dictionary.";
    } else {
        if (loop != null){
            return tag + ": " + tags[tag]['description'];
        } else {
            return tags[tag]['description'];
        }
    }
}

// Returns what data type a given tag should be
function getType(tag){
    if (tags[tag] == null){
        return "Tag not present in dictionary.";
    } else {
        var not_null = "";
        if (!tags[tag]['null_valid']){
            not_null = " NOT NULL.";
        }

        if (tags[tag]['length'] != null){
            return tags[tag]['type'] + " with length " + tags[tag]['length'] + not_null;
        } else {
            return tags[tag]['type'] + not_null;
        }
    }
}

// Validate a tag and update it's classes
function updateTag(tag, value){
    document.getElementById(tag).className = "line " + validateTag(tag, value);
}

// Validate a loop datum and update its tags
function updateDatum(tag, id, value){
    document.getElementById(id).className = "editable " + validateTag(tag, value);
}

function validateTag(tag, value){

    // Always make sure it doesn't have unicode
    if (containsIllegalNonLatinCodepoints(value)){
        return "containsunicode";
    }

    // If we aren't validating, don't do anything
    if (dont_validate){
        return "";
    }

    // If the tag isn't in the dict it is invalid
    if (tags[tag] == null){
        return "nodict";
    }

    // Get the tag dict
    var dict = tags[tag];

    // Null tag is not allowed
    if (((value == null) || ( value == "") || ( value == ".") || ( value == "?"))
            && (dict["null_valid"] == false)){
        return "illegalnull";
    }
    // Null is valid, so don't check the type if the type is null
    else {
        if ((value == ".") || (value == "?")){
            return "valid";
        }
    }

    var our_type = null;
    // Check the data type
    if(Number(value) == parseInt(value)) {
        // This prevents 27.000 from being interpreted as an INT
        if (value.indexOf(".") != -1){
            our_type = "FLOAT";
        }
        else {
            our_type = "INTEGER";
        }
    }
    else if(Number(value) == parseFloat(value)) {
        our_type = "FLOAT";
    }

    // Check for too long if string
    if ((dict['type'] == "VARCHAR") || (dict['type'] == "CHAR")){
        if (value.length > dict['length']){
            return "warn";
        }
    }
    // Check it if integer
    else if (dict['type'] == "INTEGER"){
        if (our_type != "INTEGER"){
            return "warn";
        }
    }
    // Check if float
    else if (dict['type'] == "FLOAT"){
        if ((our_type != "FLOAT") && (our_type != "INTEGER")){
            return "warn";
        }
    // Check if date
    } else if (dict['type'] == "DATETIME year to day"){
        var pattern = new RegExp("^[0-9]{4}-[0-9]{2}-[0-9]{2}$");
        if (pattern.test(value) != true){
            return "warn";
        }
        // We passed the regex, but is the month and day valid?
        var chunks = value.split('-');
        var d = new Date(chunks[0], chunks[1] - 1, chunks[2]);
        if (!( d && (d.getMonth() + 1) == chunks[1] && d.getDate() == Number(chunks[2]))){
            return "warn";
        };
    } else {
        // We don't know the type so we can't validate
        return "";
    }

    // It appears valid
    return "";
}

// Toggle between the expand and minimize button and show or hide the
//  linked loop or saveframe
function toggleButtonHandler(img_button, id){
    if (img_button.src.indexOf("images/minimize.png") != -1){
        img_button.src = "images/maximize.png";
        $("#"+id).hide();
        $("#"+id+"_name").css("display", "inline-block");
    } else {
        img_button.src = "images/minimize.png";
        $("#"+id).show();
        $("#"+id+"_name").hide();
    }
}

/*
 *
 *
 *  Parser functions
 *
 *
 */

// See if a token is a reserved token that shouldn't be found in a data spot
function checkReservedToken(to_check){
    if ((to_check.startsWith("_")) || (to_check.startsWith("save_")) || (to_check == "loop_") || (to_check == "stop_") || (to_check.startsWith("data_"))){
        return true;
    }
    return false;
}

function chompWhitespace(item){
    var pos = 0;

    while ((item.length > pos) && (whitespace.indexOf(item[pos]) != -1)){
        pos++;
    }
    return item.substring(pos);
}

function nextWhitespace(item){
    var pos = 0;

    while ((item.length > pos) && (whitespace.indexOf(item[pos]) == -1)){
        pos++;
    }
    return pos;
}

// Returns the next block of text to be processed as well as the remaining text to process
function getToken(){

    // Nothing left
    if (to_process == null){
        token = null;
        return token;
    }

    // Tokenize

    //Trim
    var tmp = chompWhitespace(to_process);

    // Handle comments
    if (tmp.startsWith("#")){
        // At the last line
        if (tmp.indexOf("\n") == -1){
            token = tmp;
            to_process = null;
            return token;
        }
        // Any other line
        token = tmp.substring(0,tmp.indexOf("\n"));
        to_process = tmp.substring(tmp.indexOf("\n")+1);
        return token;
    }

    // Handle multi-line values
    if (tmp.startsWith(";\n")){
        tmp = tmp.substring(2);
        // Search for end of multi-line value
        var until = tmp.indexOf("\n;");
        if (until != -1){

            // Check for improperly terminated lines
            var valid = tmp.indexOf("\n;\n");

            // The line is terminated properly
            if (valid == until){
                token = tmp.substring(0, until+1);
                to_process = tmp.substring(until+2);
                return token;
            } else {
                if (nextWhitespace(tmp.substring(until+2)) == 0){
                    console.log("Warning: Technically invalid line found in file. Multiline values should terminate with \\n;\\n but in this file only \\n; with non-return whitespace following was found.");
                    token = tmp.substring(0, until);
                    to_process = tmp.substring(until+2);
                    return token;
                } else {
                    throw 'Invalid file. A multi-line value ended with a "\\n;" and then a non-whitespace value. Multi-line values should end with "\\n;\\n".';
                }
            }
        } else {
            throw "Invalid file. Multi-line comment never ends. Multi-line comments must terminate with a line that consists ONLY of a ';' without characters before or after. (Other than the newline.)";
        }
    }

    // Handle values quoted with '
    if (tmp.startsWith("'")){
        var until = tmp.indexOf("'",1);
        if (until == -1){
            throw "Invalid file. Single quoted value was never terminated.";
        } else {
            // Make sure we don't stop for quotes that are not followed by whitespace
            while (nextWhitespace(tmp.substring(until+1,until+2)) != 0){
                until = tmp.indexOf("'", until+1);
                if (tmp.substring(0,until).indexOf("\n") != -1){
                    throw "Invalid file. Unterminated single quoted value: " + tmp.substring(0,30) + "...";
                }
            }

            token = tmp.substring(1, until);
            to_process = tmp.substring(until+1);
            return token;
        }
    }

    // Handle values quoted with "
    if (tmp.startsWith('"')){
        var until = tmp.indexOf('"',1);
        if (until == -1){
            throw "Invalid file. Double quoted value was never terminated.";
        } else {
            // Make sure we don't stop for quotes that are not followed by whitespace
            while (nextWhitespace(tmp.substring(until+1,until+2)) != 0){
                until = tmp.indexOf('"', until+1);
                if (tmp.substring(0,until).indexOf("\n") != -1){
                    throw "Invalid file. Unterminated double quoted value: " + tmp.substring(0,30) + "...";
                }
            }

            token = tmp.substring(1, until);
            to_process = tmp.substring(until+1);
            return token;
        }
    }

    var white = nextWhitespace(tmp);
    if (nextWhitespace(tmp) == tmp.length){
        token = null;
        to_process = null;
        return token;
    }

    to_process = tmp.substring(white);
    token = tmp.substring(0,white);
    return token;

}

// Parse a NMR-STAR file but catch parse exceptions and display them
function starCatcher(star){
    try {
        return parseSTAR(star);
    } catch (err){
        $("#parser_messages").html("<font color='red'>Parse error: " + err + "</font>");
    }
}

// Parse a STAR file - return NMRSTAR object
function parseSTAR(star){

    $("#parser_messages").html("");
    to_process = star.replaceAll("\r\n", "\n").replaceAll("\r","\n");

    // Create the NMRSTAR object
    var mystar = null;
    var curframe = null;
    var curloop = null;
    var state = "ready";
    var curtag = null;

    // Parse all the saveframes
    do {
        // See if we are done and get the next token
        if (getToken() == null){ break; }

        if (debug.indexOf("verbose") != -1){ console.log(token);}

        // Drop comments
        if ((token.startsWith("#")) && (token.indexOf("\n") == -1)) {
            continue;
        }

        // First look for the data_ token
        if (state == "ready"){
            // Make sure this is actually a STAR file
            if (!token.startsWith("data_")){
                throw "Invalid file. NMR-STAR files must start with 'data_'. Did you accidentally select the wrong file?";
            }
            // Make sure there is a data name
            else if (token.length < 6){
                throw "'data_' must be followed by data name. Simply 'data_' is not allowed.";
            }
            mystar = new NMRSTAR(token.substring(5));
            state = "star";
        }
        // We are expecting to find a saveframe
        else if (state == "star"){
            if (!token.startsWith("save_")){
                throw "Only 'save_NAME' is valid after 'data_" + mystar.dataname + "'. Found '" + token + "'.";
            }
            if (token.length < 6){
                throw "'save_' must be followed by saveframe name. You have a 'save_' tag which is illegal without a specified saveframe name.";
            }
            if (token.indexOf("_nef_") != -1){
                dont_validate = true;
            }
            state = "saveframe";
            curframe = new SAVEFRAME(token.substring(5), mystar.saveframes.length);
            mystar.addSaveframe(curframe);
        }

        // We are in a saveframe
        else if (state == "saveframe"){
            if (token == "loop_"){
                state = "loop";
                curloop = new LOOP(curframe.loops.length, mystar.saveframes.length - 1);
                curframe.addLoop(curloop);
            }
            // Close saveframe
            else if (token == "save_"){
                curframe = null;
                state = "star";
            }
            // Invalid content in saveframe
            else if (!token.startsWith("_")){
                throw "Invalid token found in saveframe '" + curframe.category +  "': '" + token + "'";
            }
            // Add a tag
            else {
                curtag = token;
                state = "saveframetag";
            }
        }

        // We are in a saveframe and waiting for the saveframe tag
        else if (state == "saveframetag"){
            /* To do this properly we need to check if the raw token is
               illegal. Unfortunately since getToken strips the quotes this
               gives false positives. It's only illegal to have the checked
               values in unquoted positions. This would need a refactor to
               fix. Future TODO? It is a rare error type - and we properly
               sanitize before printing tags or loops with reserved tags.

               checkReservedToken(token) method is available.
               */

                curframe.addTag(curtag, token);
                state = "saveframe";
        }

        // We are in a loop
        else if (state == "loop"){
            // Add a column
            if (token.startsWith("_")){
                curloop.addColumn(token);
            }
            else if (token == "stop_"){
                curloop = null;
                state = "saveframe";
            }
            // On to data
            else {
                curloop.addDatum(token);
                state = "data";
            }
        }

        // We are in the data block of a loop
        else if (state == "data"){
            if (token == "stop_"){
                curloop = null;
                state = "saveframe";
            } else {
                curloop.addDatum(token);
            }
        }
    } while (true);

    return mystar;
}

/*
 *
 * Web page functions
 *
 */

function openFile() {
    var input = document.getElementById("nmrstar_file");

    var reader = new FileReader();
    reader.onload = function(){
        var text = reader.result;

        if (debug != null){
            var t0 = performance.now();
            star = starCatcher(text);
            var t1 = performance.now();
            console.log("Call to starCatcher took " + (t1 - t0) + " milliseconds.");
        } else {
            star = starCatcher(text);
        }

        if (star != null){
            if (debug.indexOf("noload") == -1){
                star.toHTML();
            }
        }
    };

    reader.readAsText(input.files[0]);
};

function loadEntryFromAPI(entry_id){
    $.ajax( {
        url: "//webapi.bmrb.wisc.edu/v2/entry/" + entry_id,
        success: function( url_data ){

            // See if the API has an error condition
            if (url_data['error'] != undefined){
                $("#parser_messages").html("<font color='red'>" + url_data['error'] + "</font>");
                return;
            }

            // Create the STAR entry and then fill it with data
            star = new NMRSTAR('tmp_name');
            star.fromJSON(url_data[entry_id]);

            /*
            // Time profiling example
            var t0 = performance.now();
            var t1 = performance.now();
            console.log("Call to loadJSON took " + (t1 - t0) + " milliseconds.");
            */

            if (star != null){
                if (debug.indexOf("noload") == -1){
                    star.toHTML();
                }
            }
        }
    }).error(function (){
        $("#parser_messages").html("<font color='red'>No such entry.</font>");
    });
}

// Update the hidden tags and show/hide button
function toggle_hidden_tags(){
    if (show_hidden_tags){
        show_hidden_tags = false;
        $(".empty").hide();
        $("#toggle_hidden").val("Show tags without values")
    } else {
        show_hidden_tags = true;
        $(".empty").show();
        $("#toggle_hidden").val("Hide tags without values")
    }
}

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null
}
