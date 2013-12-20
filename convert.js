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
    rand = require("generate-key"),
    zip = require('node-zip')();

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

var err;

console.log("Generating id tokens ... ");
var keys = {
	installId: rand.generateKey(5),
	projectId: rand.generateKey(10),
	scriptId:  rand.generateKey(10),
	about: [
		rand.generateKey(5),
		rand.generateKey(5),
		rand.generateKey(5)	
	],
	tagnames: rand.generateKey(5),
	characters: {}
};

console.log("Generating script HTML ... ");
var script = createScriptHtml (tokens,
	       	extractFirstToken(tokens, 'title'), 
		extractFirstToken(tokens, 'author'), 
		extractFirstToken(tokens, 'notes'), 
		extractFirstToken(tokens, 'copyright'), 
		extractFirstToken(tokens, 'credit')
		);
err = fs.writeFileSync("script.html", script);
if (err) {
	console.log(err);
	return;
}

console.log("Extracting characters ... ");
var characters = extractCharacters(tokens);
console.log("Generating ids ... ");
for (var c in characters) {
	keys.characters[characters[c]] = rand.generateKey(10);
}

console.log("Generating local.rdf... ");
var localRdf = createLocalRdf(tokens);

console.log("Generating project.rdf... ");
var projectRdf = createProjectRdf(tokens);


// Write all resulting files to archive
zip.file('local.rdf', localRdf);
zip.file('project.rdf', projectRdf);
zip.file('script.html', script);
var zipdata = zip.generate({base64:false,compression:'DEFLATE'});
fs.writeFileSync(argv.o, zipdata, 'binary');
console.log("Wrote output CeltX file '" + argv.o + "'");

// Support functions

function extractCharacters (tokens) {
	var ch = {};
	for (var k in tokens.reverse()) {
		if (tokens[k].type == 'character') {
			var thisch;
			if (tokens[k].text.match(/\(/)) {
				thisch = tokens[k].text.split('(')[0].trim();
			} else {
				thisch = tokens[k].text.trim();
			}
			ch[thisch] = thisch;
		}
	}
	return Object.keys(ch);
} // end extractCharacters

function extractFirstToken (tokens, tokenName) {
	for (var k in tokens.reverse()) {
		if (tokens[k].type == tokenName) {
			return tokens[k].text;
		}
	}
	return '';
} // end extractFirsttoken

function extractScenes (tokens) {
	var s = [];
	for (var k in tokens.reverse()) {
		if (tokens[k].type == 'scene_heading') {
			s.push(tokens[k].text.trim());
		}
	}
	return s;
} // end extractScenes

function createLocalRdf (tokens) {
	var buf = '<?xml version="1.0"?>\n' +
		'<RDF:RDF xmlns:dc="http://purl.org/dc/elements/1.1/"\n' +
		'  xmlns:cx="http://celtx.com/NS/v1/"\n' +
		'  xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"\n' +
		'  xmlns:NC="http://home.netscape.com/NC-rdf#"\n' +
		'  xmlns:RDF="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
		'<RDF:Description RDF:about="http://celtx.com/project/' + keys.projectId + '">\n' +
		'<cx:opentabs RDF:resource="rdf:#' + keys.installId + '"/>\n' +
		'</RDF:Description>\n' +
		'<RDF:Seq RDF:about="rdf:#' + keys.installId + '">\n' +
		'<RDF:li RDF:resource="http://celtx.com/res/' + keys.scriptId + '"/>\n' +
		'</RDF:Seq>\n' +
		'</RDF:RDF>\n';
	return buf;
} // end createLocalRdf

function createProjectRdf (tokens) {
	var buf = '';
	buf += '<?xml version="1.0"?>\n'
		'<RDF:RDF xmlns:dc="http://purl.org/dc/elements/1.1/"\n' +
		'  xmlns:cx="http://celtx.com/NS/v1/"\n' +
		'  xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"\n' +
		'  xmlns:NC="http://home.netscape.com/NC-rdf#"\n' +
		'  xmlns:RDF="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
		'<RDF:Seq RDF:about="rdf:#' + keys.about[0] + '">\n' +
		'<RDF:li RDF:resource="rdf:#' + keys.about[0] + '"/>\n' +
		'</RDF:Seq>\n' +
		'<RDF:Seq RDF:about="rdf:#' + keys.about[0] + '">\n';

	// Loop through characters
	for (var k in characters) {
		buf += '<RDF:li RDF:resource="http://celtx.com/res/' + keys.characters[characters[k]] + '"/>\n';
	}

	buf += '</RDF:Seq>\n' +
		'<cx:DepartmentList RDF:about="rdf:#' + keys.about[0] + '"\n' +
		'  cx:size="3">\n' +
		'  <cx:department RDF:resource="http://celtx.com/NS/v1/Cast"/>\n' +
		'</cx:DepartmentList>\n' +
		'<RDF:Seq RDF:about="rdf:#' + keys.tagnames + '">\n' +
		'  <RDF:li>Plot A</RDF:li>\n' +
		'  <RDF:li>Plot B</RDF:li>\n' +
		'  <RDF:li>Plot C</RDF:li>\n' +
		'  <RDF:li>Plot D</RDF:li>\n' +
		'  <RDF:li>Plot E</RDF:li>\n' +
		'  <RDF:li>Plot F</RDF:li>\n' +
		'  <RDF:li>Plot G</RDF:li>\n' +
		'</RDF:Seq>\n';

	return buf;
} // end createProjectRdf

function createScriptHtml (tokens, title, author, contactBlock, copyright, byline) {
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
		'  <meta content="' + copyright + '" name="DC.rights">\n' +
		'  <meta content="' + contactBlock + '" name="CX.contact">\n' +
		'  <meta content="' + byline + '" name="CX.byline">\n' +
		'</head>\n' +
		'<body>\n';

	var scenecount = 0;

	// Loop and create by tokens
	for (var k in tokens.reverse()) {
		// DEBUG : console.log(tokens[k]);
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
	buf += '</body>\n</html>\n';

	return buf;
} // end createScriptHtml

