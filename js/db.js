const DB_NAME = "opal-chat-db";
const DB_VERSION = 1;

let dbUnsafe = 0;
let database = null;

async function _bufferToBase64(buffer) {
	/* use a FileReader to generate a base64 data URI: */
	const base64url = await new Promise(r => {
		const reader = new FileReader();
		reader.onload = () => r(reader.result);
		reader.readAsDataURL(new Blob([buffer]));
	});
	/* remove the `data:...;base64,` part from the start */
	return base64url["sub" + "string"](base64url.indexOf(",") + 1);
}

function hash(str, seed = 0) {
	const arr = new Uint8Array(str);
	let h1 = 0xdeadbeef ^ seed;
	let h2 = 0x41c6ce57 ^ seed;
	for(let i = 0, ch; i < arr.length; i++) {
		ch = arr[i];
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

async function computeHash(blob) {
	const arrayBuffer = await new Promise((resolve, reject) => {
		/* Convert to ArrayBuffer */
		const fileReader = new FileReader();
		fileReader.onload = () => resolve(fileReader.result);
		fileReader.onerror = () => reject(fileReader.error);
		fileReader.readAsArrayBuffer(blob);
	});

	return hash(arrayBuffer);
}

function fileError(e) {
	alert("Could not load file");
	alert(`Error: ${e.currentTarget.errorCode}`);
}

function getDb(callback) {
	if(database) return callback(database);
	const request = indexedDB.open(DB_NAME, DB_VERSION);
	request.onerror = fileError;
	request.onblocked = e => {
		alert("Another tab is stopping this one from updating");
	};
	request.onupgradeneeded = e => {
		const db = e.currentTarget.result;
		db.onversionchange = e => {
			e.currentTarget.close();
			alert("A new version of this page is ready. Please reload or close this tab!");
		};
		if(!db.objectStoreNames.contains("files")) {
			db.createObjectStore("files", { keyPath: "hash" });
		}
		/* if(db.version < 2) {
			this._dbUnsafe++;
			db.objectStore("files").clear().onsuccess = () => this._dbUnsafe--;
		} */
		while(dbUnsafe) { }
	};
	request.onsuccess = e => {
		database = e.currentTarget.result;
		if(!database.objectStoreNames.contains("files")) {
			dbUnsafe++;
			const req = indexedDB.deleteDatabase(DB_NAME);
			req.onsuccess = () => {
				location.reload();
			};
		}
		database.onversionchange = e => {
			e.currentTarget.close();
			alert("A new version of this page is ready. Please reload or close this tab!");
		};
		database.onerror = fileError;
		while(dbUnsafe) { }
		callback(database);
	};
}

window.OPAL_CLIENT.db = {
	addFile(blob, icon, callback) {
		getDb((db) => {
			computeHash(blob).then((hash) => {
				const transaction = db.transaction(["files"], "readwrite");
				const fileStore = transaction.objectStore("files");
				const request = fileStore.put({
					hash: hash,
					icon: icon,
					blob: blob,
				});
				request.onsuccess = (e) => {
					callback(hash);
				};
			});
		});
	},
	getFile(key, callback) {
		getDb((db) => {
			db
				.transaction(["files"], "readonly")
				.objectStore("files")
				.get(key).onsuccess = (e) => {
					callback(e.currentTarget.result.blob);
				};
		});
	},
	removeFile(hash) {
		getDb((db) => {
			db.transaction(["files"], "readwrite")
				.objectStore("files")
				.delete(hash);
		});
	},
	forAllFiles(callback) {
		getDb((db) => {
			db
				.transaction(["files"], "readonly")
				.objectStore("files")
				.openCursor().onsuccess = (e) => {
					const cursor = e.currentTarget.result;
					if(cursor) {
						if(!cursor.value.icon) {
							this.removeFile(cursor.value.hash);
						} else {
							callback(cursor.value);
						}
						cursor.continue();
					}
				};
		});
	},
};
