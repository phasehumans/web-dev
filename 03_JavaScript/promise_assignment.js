// create promisified version of setimeout, fs.readfile, fs.writefile, cleanFile 


function cleanFilePromisied (resolve) {
    cleanFile("sample.txt", resolve)
}