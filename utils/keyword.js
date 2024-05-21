const deDict = require('@shopping24/rake-js/dist/de');
const rakejs = require('@shopping24/rake-js');
const rake = require('node-rake')

 function processKeywords(text) {
    // const { result } = rakejs.extract(text)
    // .setOptions({ articles: deDict.articles, stopWords: deDict.stopwords.concat(deDict.articles) })
    // .pipe(rakejs.extractKeyPhrases)
    // // .pipe(rakejs.extractAdjoinedKeyPhrases)
    // .pipe(rakejs.keywordLengthFilter)
    // .pipe(rakejs.distinct)
    // .pipe(rakejs.scoreWordFrequency)
    // .pipe(rakejs.sortByScore);
    const keywords = rake.generate(text)
  
    return keywords
}

let res=processKeywords(`Creating index.js file and writing "hi" in it`);
console.log(res)

module.exports ={
    processKeywords
}
