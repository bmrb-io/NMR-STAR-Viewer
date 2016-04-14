<?php

include_once $_SERVER["DOCUMENT_ROOT"] . "/php_includes/Globals.inc";

global $PDO_USER_PG;
global $PDO_PASSWD;

global $PDO_BMRBDSN_PG; // Get the psql parameters
parse_str( $_SERVER['QUERY_STRING'], $params );

header('Content-type: application/json; charset=utf-8');

if( isset( $params["tag"] ) ) {
    $tag = trim( $params["tag"] );
    if( strlen( $tag ) < 1 )
        send_empty();
}

// Build the result array
$a_json = array();
$a_json_row = array();

// Used when an error happens or for some other reason there are no results
function send_empty() {
    $json = json_encode(array());
    print $json;
    exit(0);
}

function contains($haystack, $needle) {
    if ($needle == ""){
        return true;
    }

    // Make the comparison case insensitive
    $haystack = strtolower($haystack);
    $needle = strtolower($needle);
    if (strpos($haystack, $needle) === false){
        return false;
    } else {
        return true;
    }
}

try {
    $dbh = new PDO( $PDO_BMRBDSN_PG, $PDO_USER_PG, $PDO_PASSWD );
    $dbh->setAttribute( PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION );

    $sql = "select enumeratedflg,itemenumclosedflg,dictionaryseq from dict.adit_item_tbl where originaltag=?";
    $query = $dbh->prepare( $sql );
    if( ! $query->execute( array( $tag ) ) ){
        send_empty();
    }

    if( ! ($row = $query->fetch( PDO::FETCH_ASSOC )) )
        send_empty();
    else {

        // Try to see if there are allowed values first
        if( strtoupper( trim( $row["itemenumclosedflg"] ) ) == "Y" ) {
            $qry2 = $dbh->prepare( "select val,seq from dict.enumerations where seq=? order by val" );
            if( ! ($qry2->execute( array( $row["dictionaryseq"] ) )) )
                send_empty();
            else {
                // Create the result list
                while( ($row2 = $qry2->fetch( PDO::FETCH_ASSOC )) ){
                    if (contains($row2["val"], $_GET['term'])){
                        $a_json_row["value"] = $row2["val"];
                        $a_json_row["label"] = $row2["val"];
                        array_push($a_json, $a_json_row);
                    }
                }
            }
        }
        // See if there are common values
        else if( strtoupper( trim( $row["enumeratedflg"] ) ) == "Y" ) {
            $qry2 = $dbh->prepare( "select val,seq from dict.enumerations where seq=? order by val" );
            if( ! ($qry2->execute( array( $row["dictionaryseq"] ) )) )
                send_empty();
            else {
                // Create the result list
                while( ($row2 = $qry2->fetch( PDO::FETCH_ASSOC )) ){
                    if (contains($row2["val"], $_GET['term'])){
                        $a_json_row["value"] = $row2["val"];
                        $a_json_row["label"] = $row2["val"];
                        array_push($a_json, $a_json_row);
                    }
                }
            }
        } else {
            send_empty();
        }

    }
    // Json encode and return
    $json = json_encode($a_json);
    print $json;
}
catch( PDOException $e ) {
    send_empty();
}
?>
