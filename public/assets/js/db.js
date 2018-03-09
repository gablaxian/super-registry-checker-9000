
'use strict';

let DB = {
    init(name='app', version=1, store='default') {
        // config
        this.dbName     = name;
        this.dbVersion  = version;
        this.storeName  = store;

        this.db;

        return new Promise( (resolve, reject) => {
            let request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.log(`failed to load DB: ${this.dbName}`);
                reject();
            }
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log(`successfully connected to DB: ${this.dbName}`);
                resolve();
            }
            request.onupgradeneeded = (event) => {
                let db = event.target.result;

                if( !db.objectStoreNames.contains(this.storeName) ) {
                    db.createObjectStore(this.storeName);
                }
            }
        });

    },

    // IndexedDB is a (mostly) asynchronous API, so provide the option for a callback.
    setItem(key, value, callback=null) {
        let transaction = this.db.transaction([this.storeName], 'readwrite');
        let store       = transaction.objectStore(this.storeName);

        let request = store.put(value, key);

        request.onsuccess = (e) => {
            console.log('DB saved!');
        }
    },

    getItem(key) {
        return new Promise( (resolve, reject) => {
            let transaction = this.db.transaction(this.storeName, 'readonly');
            let store       = transaction.objectStore(this.storeName);

            let request = store.get(key);

            request.onerror = (e) => {
                console.log(`failed to find item: ${key}`);
                reject(e);
            }
            request.onsuccess = (e) => {
                console.log(`found: ${key} - ${e.target.result}`);
                resolve(e.target.result);
            }
        });
    },

    clear() {
        let transaction = this.db.transaction(this.storeName, 'readwrite');
        let store       = transaction.objectStore(this.storeName);

        store.clear();
    }
}
