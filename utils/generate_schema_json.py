#!/usr/bin/env python3

import os
import csv
import json
from subprocess import call

#Dictionary sequence,SFCategory,ADIT category mandatory,ADIT category view type,ADIT super category ID,ADIT super category,ADIT category group ID,ADIT category view name,Tag,BMRB current,Query prompt,Query interface,SG Mandatory,,ADIT exists,User full view,User structure view,User non-structure view,User NMR param. View,Annotator full view,Item enumerated,Item enumeration closed,Enum parent SFcategory,Enum parent tag,Derived enumeration mantable,Derived enumeration,ADIT item view name,Data Type,Nullable,Non-public,ManDBTableName,ManDBColumnName,Row Index Key,Saveframe ID tag,Source Key,Table Primary Key,Foreign Key Group,Foreign Table,Foreign Column,Secondary index,Sub category,Units,Loopflag,Seq,Adit initial rows,Enumeration ties,Mandatory code overides,Overide value,Overide view value,ADIT auto insert,Example,Prompt,Interface,bmrbPdbMatchID,bmrbPdbTransFunc,STAR flag,DB flag,SfNamelFlg,Sf category flag,Sf pointer,Natural primary key,Natural foreign key,Redundant keys,Parent tag,public,internal,small molecule,small molecule,metabolomics,Entry completeness,Overide public,internal,small molecule,small molecule,metabolomic,metabolomic,default value,Adit form code,Tag category,Tag field,Local key,Datum count flag,pdbx D&A insertion flag,mmCIF equivalent,Meta data,Tag delete,BMRB data type,STAR vs Curated DB,Key group,Reference table,Reference column,Dictionary description,variableTypeMatch,entryIdFlg,outputMapExistsFlg,lclSfIdFlg,Met ADIT category view name,Met Example,Met Prompt,Met Description,SM Struct ADIT-NMR category view name,SM Struct Example,SM Struct Prompt,SM Struct Description,Met default value,SM default value

this_dir = os.path.dirname(os.path.realpath(__file__))
dict_dir = os.path.join(this_dir, "nmr-star-dictionary")
dict_remote = "https://github.com/bmrb-io/nmr-star-dictionary.git"

if not os.path.isdir(dict_dir):
    print("Downloading the NMR-STAR schema.")
    call(["git", "clone", dict_remote, dict_dir], stdout=open("/dev/null", "w"))
else:
    print("Updating the NMR-STAR schema.")
    call(["git", "-C", dict_dir, "pull", "--ff-only"], stdout=open("/dev/null", "w"))

csvfile = open(os.path.join(dict_dir, 'NMR-STAR/internal_106_distribution/xlschem_ann.csv'), 'r', newline='')
jsonfile = open(os.path.join(this_dir, "../javascript/schema.js"), 'w')

dictionary = {}
reader = csv.DictReader( csvfile )
for row in reader:
    if "." in row["Tag"]:
        if "(" in row["Data Type"]:
            type_string, length = row["Data Type"].split("(")
            length = length[0:-1]

            dictionary[row["Tag"]] = {"description": row["Dictionary description"],
            "type": type_string, "length": length,
            "null_valid": {"NOT NULL": False, "": True}[row["Nullable"]]}
        else:
            type_string = row["Data Type"]
            dictionary[row["Tag"]] = {"description": row["Dictionary description"],
            "type": type_string, "null_valid": {"NOT NULL": False, "": True}[row["Nullable"]]}



jsonfile.write("var tags = " + json.dumps(dictionary) + ";")

print("Done!")
