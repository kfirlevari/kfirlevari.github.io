#! /bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
STREET_FILES=$DIR/street_fulls/*
for i in $STREET_FILES
do
    filename=$(basename "$i")
    extension="${filename##*.}"
    filename="${filename%.*}"
    convert -define jpeg:size=200x200 "$i" -thumbnail 360x360^ -gravity center -extent 360x360 "./street_thumbs/$filename.$extension";
done;

CITYSCAPE_FILES=$DIR/cityscape_fulls/*
for i in $CITYSCAPE_FILES
do
    filename=$(basename "$i") 
    extension="${filename##*.}"
    filename="${filename%.*}"
    convert -define jpeg:size=200x200 "$i" -thumbnail 360x360^ -gravity center -extent 360x360 "./cityscape_thumbs/$filename.$extension";
done;
