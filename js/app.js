/*
Copyright 2012 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Author: Eric Bidelman (ericbidelman@chromium.org)
Updated: Joe Marini (joemarini@google.com)
*/

var chosenEntry = null;
var chooseFileButton = document.querySelector('#choose_file');
var saveFileButton = document.querySelector('#save_file');
var xmlTable = document.querySelector('#xmlTable');
var output = document.querySelector('output');
var textarea = document.querySelector('textarea');
var searchtext = document.querySelector('#searchtext');
var highlightbutton = document.querySelector('#highlightbutton'); 
var displaybutton = document.querySelector('#displaybutton'); 
var resetbutton = document.querySelector('#resetbutton'); 

function errorHandler(e) {
  console.error(e);
}  

function highlightSearch() { 
	  var v = searchtext.value.toLowerCase();
	  var rows = xmlTable.getElementsByTagName("tr"); 
	  for ( var i = 0; i < rows.length; i++ ) {
	    var cells = rows[i].getElementsByTagName("td");
	    if ( cells[0] != null && cells[0].tagName == "TD") {
		  var text = cells[0].innerHTML.toLowerCase() + cells[1].innerHTML.toLowerCase();
	      if ( v.length == 0 || (v.length < 3 && text.indexOf(v) == 0) || (v.length >= 3 && text.indexOf(v) > -1 ) ) {
	        rows[i].style.backgroundColor = '#f00';   
	    	  rows[i].style.display = "";
	      } else {
	        rows[i].style.backgroundColor = '#fff';  
	      }
	    }
	  }
}  
function displaySearch() { 
	  var v = searchtext.value.toLowerCase();
	  var rows = xmlTable.getElementsByTagName("tr"); 
	  for ( var i = 0; i < rows.length; i++ ) {
	    var cells = rows[i].getElementsByTagName("td");
	    if ( cells[0] != null && cells[0].tagName == "TD") {
		  var text = cells[0].innerHTML.toLowerCase() + cells[1].innerHTML.toLowerCase();
	      if ( v.length == 0 || (v.length < 3 && text.indexOf(v) == 0) || (v.length >= 3 && text.indexOf(v) > -1 ) ) {	        
	    	  rows[i].style.display = "";
	      } else { 
	          rows[i].style.display = "none";
	      }
	    }
	  }
}  

function resetSearch() { 
	  var rows = xmlTable.getElementsByTagName("tr"); 
	  for ( var i = 0; i < rows.length; i++ ) {
	        rows[i].style.backgroundColor = '#fff'; 
	    var cells = rows[i].getElementsByTagName("td");
	    if ( cells[0] != null && cells[0].tagName == "TD") {
		        rows[i].style.display = ""; 
		        rows[i].style.backgroundColor = '#fff';  
	    }
	  }
}  
function displayEntryData(theEntry) {
  if (theEntry.isFile) {
    chrome.fileSystem.getDisplayPath(theEntry, function(path) {
      document.querySelector('#file_path').value = path;
    });
    theEntry.getMetadata(function(data) {
      document.querySelector('#file_size').textContent = data.size;
    });
  }
  else {
    document.querySelector('#file_path').value = theEntry.fullPath;
    document.querySelector('#file_size').textContent = "N/A";
  }
}

function readAsText(fileEntry, callback) {
  fileEntry.file(function(file) {
    var reader = new FileReader();

    reader.onerror = errorHandler;
    reader.onload = function(e) {
      callback(e.target.result);
    };

    reader.readAsText(file);
  });
}

function writeFileEntry(writableEntry, opt_blob, callback) {
  if (!writableEntry) {
    output.textContent = 'Nothing selected.';
    return;
  }

  writableEntry.createWriter(function(writer) {

    writer.onerror = errorHandler;
    writer.onwriteend = callback;

    // If we have data, write it to the file. Otherwise, just use the file we
    // loaded.
    if (opt_blob) {
      writer.truncate(opt_blob.size);
      waitForIO(writer, function() {
        writer.seek(0);
        writer.write(opt_blob);
      });
    }
    else {
      chosenEntry.file(function(file) {
        writer.truncate(file.fileSize);
        waitForIO(writer, function() {
          writer.seek(0);
          writer.write(file);
        });
      });
    }
  }, errorHandler);
}

function waitForIO(writer, callback) {
  // set a watchdog to avoid eventual locking:
  var start = Date.now();
  // wait for a few seconds
  var reentrant = function() {
    if (writer.readyState===writer.WRITING && Date.now()-start<4000) {
      setTimeout(reentrant, 100);
      return;
    }
    if (writer.readyState===writer.WRITING) {
      console.error("Write operation taking too long, aborting!"+
        " (current writer readyState is "+writer.readyState+")");
      writer.abort();
    }
    else {
      callback();
    }
  };
  setTimeout(reentrant, 100);
}

function traverseTree(tree) {
    if(tree.hasChildNodes()) {
      tagName = tagName + (tree.localName !== undefined ? '/' + tree.localName : '');

      var nodes = tree.childNodes.length;
    
      if (nodes > 0) {
        for(var i=0; i < tree.childNodes.length; i++) {
        	if(tree.childNodes[i].attributes != null && tree.childNodes[i].attributes != undefined){
        		for (var k = 0; k < tree.childNodes[i].attributes.length; k++) {
        		    var attrib = tree.childNodes[i].attributes[k];
        		    if(attrib.name.indexOf("xmlns") == -1 ){
	        		    tableOutput = tableOutput +
	                    '<tr><td><input value=' + tagName + '/' + tree.childNodes[i].localName + '/\@' + attrib.name + '></input></td>' +
	                    '<td><input value=' + attrib.value + '></input></td></tr>';
	        		    console.log( tagName + '/@' + attrib.name + " = " + "\"" +attrib.value + "\"")
        		    }
        		}
        	}
        	 if ( tree.childNodes[i].nodeType == 2) {
                 console.log(tagName + ':' + tree.textContent);
                 tableOutput = tableOutput +
                   '<tr><td><input value=' + tagName + '></input></td>' +
                   '<td><input value=' + "\"" + tree.textContent + "\"" + '></input></td></tr>';
               }
          if (tree.children[i] !== null && tree.children[i] !== undefined) {
            traverseTree(tree.children[i]);
          } else {
        	 
        	  if (tree.childNodes.length == 1 && tree.childNodes[i].nodeType == 3) {
              console.log(tagName + ' = ' + tree.textContent);
              tableOutput = tableOutput +
                '<tr><td><input value=' + tagName + '></input></td>' +
                '<td><input value=' + "\"" + tree.textContent + "\"" + '></input></td></tr>';
            }
        	  
            if (tree.children.length == i) {
              var parts = tagName.split('/');
              tagName = parts.splice(0, parts.length - 1).join('/');
            }
          }
        }
      }
  }
}

// for files, read the text content into the textarea
var tagName = '';
var tableOutput = '';
function loadFileEntry(_chosenEntry) {
  chosenEntry = _chosenEntry;
  chosenEntry.file(function(file) {
    readAsText(chosenEntry, function(result) {
      // Read result as xml thne display to table
  //  	result=result.replace(/Disney's/gi,"Disney&aposs");
      var xmlFile = (new window.DOMParser()).parseFromString(result, "text/xml");
      tagName = '';
      tableOutput = '';
      traverseTree(xmlFile);
      xmlTable.innerHTML = '<tr><th>Xpath</th><th>Value</th></tr>'+tableOutput;
    });
    // Update display.
    saveFileButton.disabled = false; // allow the user to save the content
    displayEntryData(chosenEntry);
  });
}

function loadInitialFile(launchData) {
  if (launchData && launchData.items && launchData.items[0]) {
    loadFileEntry(launchData.items[0].entry);
  }
  else {
    // see if the app retained access to an earlier file or directory
    chrome.storage.local.get('chosenFile', function(items) {
      if (items.chosenFile) {
        // if an entry was retained earlier, see if it can be restored
        chrome.fileSystem.isRestorable(items.chosenFile, function(bIsRestorable) {
          // the entry is still there, load the content
          console.info("Restoring " + items.chosenFile);
          chrome.fileSystem.restoreEntry(items.chosenFile, function(chosenEntry) {
            if (chosenEntry) {
              chosenEntry.isFile ? loadFileEntry(chosenEntry) : loadDirEntry(chosenEntry);
            }
          });
        });
      }
    });
  }
}



highlightbutton.addEventListener('click', function(e) {
	highlightSearch();
});

displaybutton.addEventListener('click', function(e) {
	displaySearch();
});

resetbutton.addEventListener('click', function(e) {
	resetSearch();
});

chooseFileButton.addEventListener('click', function(e) {
  var accepts = [{
    mimeTypes: ['text/*'],
    extensions: ['js', 'css', 'txt', 'html', 'xml', 'tsv', 'csv', 'rtf']
  }];
  chrome.fileSystem.chooseEntry({type: 'openFile', accepts: accepts}, function(theEntry) {
    if (!theEntry) {
      output.textContent = 'No file selected.';
      return;
    }
    // use local storage to retain access to this file
    chrome.storage.local.set({'chosenFile': chrome.fileSystem.retainEntry(theEntry)});
    loadFileEntry(theEntry);
  });
});

saveFileButton.addEventListener('click', function(e) {
  fnExcelReport();
});

loadInitialFile(launchData);

// Export to Excel
function fnExcelReport()
{
    var tab_text="";
    var textRange; var j=0;
    tab = document.getElementById('xmlTable'); // id of table

    for(j = 1 ; j < tab.rows.length ; j++)
    {
    	tempText='';
    	tempText=tab.rows[j].cells[0].children[0].value+",";
    	if(tab.rows[j].cells[1].children[0] != null){
    		tempText=tempText+tab.rows[j].cells[1].children[0].value;
    	}
    	console.log(tempText);
        tab_text=tab_text+tempText + "\r\n";
    }

    var ua = window.navigator.userAgent;
    var msie = ua.indexOf("MSIE ");

 
      var link = document.getElementById('saveFile');
      if (typeof link.download === 'string') {
          link.download = 'filename.csv';
          link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(tab_text);
          link.click();
      } else {
          location.replace(uri);
      }
}