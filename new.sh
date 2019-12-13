#!/bin/bash
if [ "$#" -ne 2 ]; then
    echo "bash make.sh <path-to-website> <website-name>"
    exit 1
fi

path=$1
if [ "${path: -1}" = "/" ]; then
	path="${path:0:${#path}-1}"
fi
pathsize=${#path}
filebase=$2

recurse() {
 for i in "$1"/*; do
    if [ -d "$i" ]; then
        if [ -f "$i/index.html" ]; then 
        	fift -s addlink.fif "$filebase" "${i:pathsize}" "${i:pathsize}/index.html"
        fi
        recurse "$i"
    elif [ -f "$i" ]; then
        fift -s addfile.fif "$filebase" "$i" "${i:pathsize}"
        if [ "${i:pathsize}" = "/index.html" ]; then
        	fift -s addlink.fif "$filebase" "/" "${i:pathsize}"
        fi
    fi
 done
}

recurse $path
echo
fift -s total.fif "$filebase"
fift -s new-website.fif "$filebase"