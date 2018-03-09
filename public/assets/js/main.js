
/**
    TODO: Implement DB storage and retrieval to speed up registry lookups.
**/
DB.init('snyk', 1, 'registries');


// helper function
function _(str) { return document.querySelector(str) }


const RegistryChecker9000 = {

    init() {
        // vars
        this._searchResults = _('.SearchResults');

        // events
        this.setupEvents();
    },

    setupEvents() {
        _('.Search-form').addEventListener('submit', e => {
            e.preventDefault();

            let moduleName = _('.Search-formText').value;

            if( moduleName ) {
                this._searchResults.innerHTML = '';
                this.getAllModules(moduleName, 'latest', this._searchResults);
            }
        });

    },

    requestModuleDependencies(moduleName='', version='latest') {
        return new Promise( (resolve, reject) => {
            fetch('/searchJSON', {
                method: 'POST',
                headers: new Headers({ 'Content-type': 'application/json' }),
                body: JSON.stringify({
                    module: moduleName,
                    version: version
                })
            })
            .then( response => {
                return response.json();
            })
            .then( json => {
                // console.log({ module: moduleName, version: version, dependencies: json});
                resolve(json);
            })
            .catch( err => {
                console.log( err );
                reject(err);
            });
        });
    },

    getAllModules(name='', version='latest', node) {

        let child = document.createElement('ul');
        node.appendChild( child );

        // get module dependencies
        this.requestModuleDependencies(name, version).then( json => {

            // if it has dependencies, get its dependencies
            if( Object.entries(json.dependencies).length ) {

                console.log({ name: json.name, version: json.version, dependencies: json.dependencies });

                // create the node for the current module
                let li = this.createModuleDOM(json.name, json.version);
                child.appendChild(li);

                // loop through its dependencies
                for(const [module, version] of Object.entries(json.dependencies)) {
                    this.getAllModules(module, version, li);
                }
            }
            // otherwise add it to the dom and return
            else {
                let li = this.createModuleDOM(json.name, json.version, 1);
                child.appendChild(li);

                return;
            }
        });

    },

    createModuleDOM(module='', version='') {
        let li      = document.createElement('li');
        let div     = document.createElement('div');
        let strong  = document.createElement('strong');
        let text1   = document.createTextNode(module);
        let text2   = document.createTextNode(version);

        div.setAttribute('class', 'Module');

        strong.appendChild(text1);
        div.appendChild(strong);
        div.appendChild(text2);
        li.appendChild(div);

        return li;
    },

}


RegistryChecker9000.init();
