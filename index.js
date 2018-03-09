
'use strict';

// modules
const fs        = require('fs');
const http      = require('http');
const https     = require('https');
const net       = require('net');
const { URL }   = require('url');

// app
const SuperRegistryChecker9000 = {

    init() {
        // vars
        this.port = 7001;

        // promises all the way down
        this.loadViews()
        .then( () => this.createServer() )
        .then( () => this.setupEvents() )
    },

    loadViews() {
        return new Promise( (resolve, reject) => {
            fs.readFile('views/layouts/skeleton.html', (err, data) => {
                if (err) {
                     reject(err);
                }

                this.template = data.toString();
                resolve();
            });
        });

        return Promise.resolve();
    },

    createServer() {
        return new Promise( (resolve, reject) => {
            this.server = http.createServer();

            if( !this.server ) {
                reject();
            }

            resolve();
        });
    },

    setupEvents() {

        this.server.on('request', (request, response) => {
            Router.route(request, response);
        });

        if( this.server.listen(this.port) ) {
            console.log(`Server listening on localhost:${this.port}`);
        }
        else {
            console.error('Server failed to initialise');
        }

        return Promise.resolve();
    },

    getModuleJSON(url='') {
        console.log('getting module...', url);

        return new Promise( (resolve, reject) => {
            https.get(url, res => {
                const { statusCode } = res;

                if( statusCode !== 200 ) {
                    console.log('Could not find module');
                    resolve({});
                }

                let rawData = '';
                res.on('data', (chunk) => { rawData += chunk; });
                res.on('end', () => {
                    const parsedData = JSON.parse(rawData);
                    resolve(parsedData);
                });

            }).on('error', (e) => {
                console.log(`Got error: ${e.message}`);
                reject({ err:`Got error: ${e.message}`});
            });
        });
    },
}


const Router = {

    route(request, response) {

        if( !request ) {
            throw new Error();
        }

        const { headers, method, url } = request;

        const urlObj            = new URL(headers.host + url);
        const pathName          = urlObj.pathname.replace('7001', ''); // remove the port number first
        const isStaticResource  = pathName.match(/\.(?:css|jpg|jpeg|js|png|svg)$/) ? true : false;

        if(isStaticResource) {
            fs.readFile('public'+pathName, (err, data) => {
                if( err ) {
                    response.statusCode = 404;
                    response.end();
                }
                else {
                    let ext = pathName.split('.')[1];
                    let mimeTypes = {
                        css:    'text/css',
                        jpg:    'image/jpg',
                        jpeg:   'image/jpeg',
                        js:     'application/javascript',
                        png:    'image/png',
                        svg:    'image/svg',
                    }

                    response.statusCode = 200;
                    response.setHeader('Content-Type', mimeTypes[ext] ? mimeTypes[ext] : 'text/html');
                    response.write(data);
                    response.end();
                }
            });
        }
        else {
            let body = [];

            request.on('error', err => {
                console.error(err);
            }).on('data', chunk => {
                body.push(chunk);
            }).on('end', () => {
                body = Buffer.concat(body).toString();

                response.on('error', err => console.error(err) );

                let out     = '';
                let content = '';

                switch (url) {
                    case '/':

                        // get a fresh version of the template in case anything has changed.
                        fs.readFile('views/layouts/skeleton.html', (err, data) => {
                            if (err) throw err;

                            this.template = data.toString();
                            content = '';
                            out     = this.template.replace('{{ content }}',  content);
                            response.statusCode = 200;
                            response.setHeader('Content-Type', 'text/html');
                            response.write(out);
                            response.end();
                        });


                        break;

                    /************************************************************************************
                        This is where I wasted SO. MUCH. TIME.
                        If the user posted the form to /search, Node was meant to do all the heavy lifting and spit out
                        a full HTML tree. But I couldn't figure out how to asynchronously build a dependency object and then
                        spit out HTML only once it was done.

                        Instead, use /searchJSON just to make calls to the NPM registry and handle everything in the browser.

                        This remains here for posterity.
                    ************************************************************************************/
                    case '/search':
                        if( request.method == 'POST' ) {
                            // parse the form data
                            let tokens  = body.split('&');
                            let fields  = {};

                            for(var token of tokens) {
                                let [name, value] = token.split('=');
                                fields[name] = value;
                            }

                            if( fields['module'] == '' || fields['module'] == undefined || fields['module'] == null ) {
                                out = this.template.replace('{{ content }}',  'No module supplied');

                                response.statusCode = 200;
                                response.setHeader('Content-Type', 'text/html');
                                response.write(out);
                                response.end();

                                return;
                            }

                            let dependencyTree  = [];

                            // now get the module from NPM
                            SuperRegistryChecker9000.getModuleJSON('https://registry.npmjs.org/'+fields['module']+'/latest')
                            .then( json => {
                                console.log('parsing dependencies...');
                                return new Promise( (resolve, reject) => {
                                    if( json.dependencies ) {
                                        for(const [key, value] of Object.entries(json.dependencies)) {
                                            dependencyTree.push({ module: key, version: value, dependencies: [] });
                                        }
                                    }
                                    resolve();
                                });
                            })
                            .then( () => {
                                console.log('outputting...');

                                if( dependencyTree.length == 0 ) {
                                    content = 'No modules found.';
                                }
                                else {

                                    content += '<ul>';
                                    for (let dependency of dependencyTree) {
                                        content += `<li><span>${dependency.module}</span> - <span>${dependency.version}</span></li>`;
                                    }
                                    content += '</ul>';
                                }

                                out = this.template.replace('{{ content }}',  content);

                                response.statusCode = 200;
                                response.setHeader('Content-Type', 'text/html');
                                response.write(out);
                                response.end();

                                return;
                            })
                            .catch( e => { console.log(e) });

                            // https.get('https://registry.npmjs.org/'+fields['module']+'/latest', res => {
                            //     const { statusCode } = res;
                            //
                            //     if( statusCode == 404 ) {
                            //         out = this.template.replace('{{ content }}',  'That module does not exist on the NPM registry');
                            //     }
                            //     else if (statusCode !== 200) {
                            //         out = this.template.replace('{{ content }}',  'There was a problem when requesting that module from the NPM registry');
                            //     }
                            //
                            //     let rawData = '';
                            //     res.on('data', (chunk) => { rawData += chunk; });
                            //     res.on('end', () => {
                            //
                            //         const parsedData = JSON.parse(rawData);
                            //         if( parsedData.dependencies ) {
                            //             for(const [key, value] of Object.entries(parsedData.dependencies)) {
                            //
                            //             }
                            //             dependencyTree.push({ module: key, version: value, dependencies: [] });
                            //         }
                            //         try {
                            //
                            //
                            //             if( !parsedData.dependencies ) {
                            //                 out = this.template.replace('{{ content }}',  'No dependencies found on for that module');
                            //             }
                            //             else {
                            //                 content += '<ul>';
                            //                 for(const [key, value] of Object.entries(parsedData.dependencies)) {
                            //                     content += `<li><span>${key}</span><span>${value}</span></li>`;
                            //                 }
                            //                 content += '</ul>';
                            //
                            //                 out = this.template.replace('{{ content }}',  content);
                            //             }
                            //
                            //         } catch (e) {
                            //             console.error(e.message);
                            //         }
                            //     });
                            //
                            //     response.statusCode = 200;
                            //     response.setHeader('Content-Type', 'text/html');
                            //     response.write(out);
                            //     response.end();
                            //
                            //     return;
                            //
                            // }).on('error', (e) => {
                            //       console.error(`Got error: ${e.message}`);
                            // });
                        }
                        else {
                            response.writeHead(302, {'Location': '/' });
                            response.end();

                            return;
                        }

                        break;

                    case '/searchJSON':
                        if( request.method == 'POST' ) {

                            let parsedBody = JSON.parse(body);

                            SuperRegistryChecker9000.getModuleJSON('https://registry.npmjs.org/'+parsedBody.module+'/'+parsedBody.version)
                            .then( json => {

                                let obj = { name: json.name, version: json.version, dependencies: (json.dependencies ? json.dependencies : {}) };

                                response.setHeader('Content-Type', 'application/json');
                                response.setHeader('Access-Control-Allow-Origin', '*');
                                response.write(JSON.stringify(obj));
                                response.end();
                            })
                            .catch(e => {
                                response.statusCode = 404;
                                response.end();
                            });
                        }

                        break;

                    default:
                        response.statusCode = 404;
                        response.end();
                        break;
                }

            });
        }
    }
}


// Run app
SuperRegistryChecker9000.init();
