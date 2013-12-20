#!/usr/bin/nodejs

// fountain-to-celtx
// github.com/shootthemoonfilms/fountain-to-celtx
// github.com/jbuchbinder / @jbuchbinder
//
// Convert Fountain (fountain.io) script documents to the Celtx script
// format.

var VERSION = "0.1";

var ansi = require("ansi"),
    argv = require('optimist').argv,
    cursor = ansi(process.stdout),
    fountain = require('./fountain'),
    fs = require('fs'),
    htmlentities = require('html-entities').Html4Entities,
    zip = require('node-zip');

var entities = new htmlentities();

cursor.red();
console.log('fountain-to-celtx Script Converter v' + VERSION);
console.log('Written by @jbuchbinder\n');
cursor.fg.reset();

// Check for input and output arguments
if (!argv.o || !argv.i) {
	console.log("-o and -i flags for input and output must be specified");
	return;
}

console.log("Reading input file '" + argv.i + "'");
var inputData = fs.readFileSync(argv.i);
console.log("Read " + inputData.length + " bytes");

console.log("Parsing ...");
var tokens = fountain.tokenize(inputData.toString());

console.log(tokens.length + " tokens processed");

// FIXME
var title = 'TITLE';
var author = 'AUTHOR';
var contactBlock = 'CONTACT BLOCK';

var err;

console.log("Generating script HTML ... ");
var script = createScriptHtml (tokens, title, author, contactBlock);
err = fs.writeFileSync("script.html", script);
if (err) {
	console.log(err);
}

// Support functions

function createScriptHtml (tokens, title, author, contactBlock) {
	var buf = '';

	// Create stock header
	buf += '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">\n' +
'<html>\n' +
'<head>\n' +
'  <title>' + title + '</title>\n' +
'  <link rel="stylesheet" type="text/css" href="chrome://celtx/content/editor.css">\n' +
'  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\n' +
'  <style id="leftheading" type="text/css">p.sceneheading:before { display: none !important; } </style>\n' +
'  <style id="rightheading" type="text/css">p.sceneheading:after { display: none !important; } </style>\n' +
'  <meta content="left" name="CX.sceneNumbering">\n' +
'  <meta content="false" name="CX.showPageNumbers">\n' +
'  <meta content="false" name="CX.showFirstPageNumber">\n' +
'  <meta content="false" name="CX.showCharNumbers">\n' +
'  <meta content="false" name="CX.dialogNumbering">\n' +
'  <style id="pagenumbers" type="text/css">.softbreak { display: none !important; } </style>\n' +
'  <style id="charnumbers" type="text/css">\n' +
'.character:before, .sound:before, .music:before, .voice:before { display: none !important; }\n' +
'\n' +
'  </style>\n' +
'  <link href="chrome://celtx/content/style/film/USLetter/Normal.css" type="text/css" rel="stylesheet">\n' +
'  <meta content="' + author + '" name="Author">\n' +
'  <meta content="" name="DC.source">\n' +
'  <meta content="" name="DC.rights">\n' +
'  <meta content="' + contactBlock + '" name="CX.contact">\n' +
'  <meta content="By" name="CX.byline">' +
'</head>\n' +
'<body>\n';

	var scenecount = 0;

	// Loop and create by tokens
	for (var k in tokens.reverse()) {
		switch (tokens[k].type) {
			case 'action':
			case 'character':
			case 'dialogue':
			case 'parenthetical':
				buf += '<p class="' + tokens[k].type + '">' + entities.encode(tokens[k].text) + '<br></p>\n';
				break;
			case 'scene_heading':
				scenecount++;
				buf += '<p scenestr="' + scenecount + '" scenenumber="' + scenecount + '" id="scene' + scenecount + '" class="sceneheading">' + entities.encode(tokens[k].text) + '<br></p>\n';
				break;
			default:
				// Do nothing for other token types
				break;
		}
	}

	// Create stock footer
	buf += '</body></html>\n';

	return buf;
}
