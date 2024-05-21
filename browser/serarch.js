const { getJson } = require("serpapi");

class GoogleSearch {
    constructor() {
        this.engine = "google";
        this.apiKey = "2f5a310e22815f5e2bccfcb6c2ff50eed148f62907617c44f745bdee6d426e23+3333";
        this.result=[];
    }

    async search(query) {
        this.result=[{
            position: 1,
            title: 'Advanced Techniques for Secure Authentication and ...',
            link: 'https://dev.to/rowsanali/authentication-and-authorization-in-nodejs-a-comprehensive-guide-4jl6',
            redirect_link: 'https://www.google.com/url?sa=t&source=web&rct=j&opi=89978449&url=https://pandaquests.medium.com/advanced-techniques-for-secure-authentication-and-authorization-in-node-js-applications-446e55cd18d&ved=2ahUKEwiJiP-ezJaGAxWnRzABHc9QAkQQFnoECBoQAQ',
            displayed_link: '1 year ago',
            favicon: 'https://serpapi.com/searches/66484db61baebbd4a68cec09/images/b93f9b45a1162d63961e04c2e18611f613d7d15345aab2953a5c71432f145ce7.png',
            snippet: 'To implement basic authentication and authorization in Node.js, we can use a middleware like passport, which provides a range of strategies for ...',
            snippet_highlighted_words: [Array],
            source: 'Medium · pandaquests'
          }]
        // getJson({
        //     engine: this.engine,
        //     q: query,
        //     api_key: this.apiKey
        // }, (json) => {
        //     console.log(json);
        //     console.log(json["organic_results"]);
        //     this.result=json["organic_results"];
        //     return this.result
        // });
    }

    getFirstLink() {
        // this.result[0].link
        return 'https://dev.to/rowsanali/authentication-and-authorization-in-nodejs-a-comprehensive-guide-4jl6'
    }
}

module.exports = {GoogleSearch};


// (async()=>{
//     let web = new GoogleSearch()
//    await web.search("advanced JWT authentication strategies Node.js");
// })()

