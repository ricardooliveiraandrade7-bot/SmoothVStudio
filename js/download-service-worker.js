// ==========================================
// SMOOTHVSTUDIO
// DOWNLOAD SERVICE WORKER
// V0.1
// ==========================================
//
// Responsável por transformar um arquivo
// gerado pelo JavaScript em uma resposta
// HTTP local com Content-Disposition.
//
// Objetivo:
//
// Blob WAV
//    ↓
// IndexedDB
//    ↓
// Service Worker
//    ↓
// resposta HTTP
//    ↓
// attachment
//
// Não contém DSP.
// Não contém processamento de áudio.
// ==========================================


const DB_NAME =
    "SmoothVStudioDownloadDB";


const DB_VERSION =
    1;


const STORE_NAME =
    "files";


const DOWNLOAD_PATH =
    "/smoothvstudio-download.wav";


// ==========================================
// INSTALAÇÃO
// ==========================================

self.addEventListener(
    "install",
    event => {

        self.skipWaiting();

    }
);


// ==========================================
// ATIVAÇÃO
// ==========================================

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(
            self.clients.claim()
        );

    }
);


// ==========================================
// ABRIR INDEXEDDB
// ==========================================

function openDatabase() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const request =
                indexedDB.open(
                    DB_NAME,
                    DB_VERSION
                );


            request.onupgradeneeded =
                event => {

                    const database =
                        event.target.result;


                    if (
                        !database.objectStoreNames.contains(
                            STORE_NAME
                        )
                    ) {

                        database.createObjectStore(
                            STORE_NAME
                        );

                    }

                };


            request.onsuccess =
                event => {

                    resolve(
                        event.target.result
                    );

                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );

                };

        }
    );

}


// ==========================================
// LER ARQUIVO
// ==========================================

async function readFile() {

    const database =
        await openDatabase();


    return new Promise(
        (
            resolve,
            reject
        ) => {

            const transaction =
                database.transaction(
                    STORE_NAME,
                    "readonly"
                );


            const store =
                transaction.objectStore(
                    STORE_NAME
                );


            const request =
                store.get(
                    "current"
                );


            request.onsuccess =
                () => {

                    resolve(
                        request.result ||
                        null
                    );

                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );

                };

        }
    );

}


// ==========================================
// APAGAR ARQUIVO
// ==========================================

async function deleteFile() {

    const database =
        await openDatabase();


    return new Promise(
        (
            resolve,
            reject
        ) => {

            const transaction =
                database.transaction(
                    STORE_NAME,
                    "readwrite"
                );


            const store =
                transaction.objectStore(
                    STORE_NAME
                );


            const request =
                store.delete(
                    "current"
                );


            request.onsuccess =
                () => {

                    resolve();

                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );

                };

        }
    );

}


// ==========================================
// INTERCEPTAR DOWNLOAD
// ==========================================

self.addEventListener(
    "fetch",
    event => {

        const url =
            new URL(
                event.request.url
            );


        if (
            url.pathname !==
            DOWNLOAD_PATH
        ) {

            return;

        }


        event.respondWith(
            createDownloadResponse()
        );

    }
);


// ==========================================
// CRIAR RESPOSTA HTTP
// ==========================================

async function createDownloadResponse() {

    try {

        const stored =
            await readFile();


        if (!stored) {

            return new Response(
                "Nenhum arquivo disponível.",
                {
                    status:
                        404,

                    headers: {

                        "Content-Type":
                            "text/plain; charset=utf-8"

                    }

                }
            );

        }


        let body =
            stored.data;


        /*
         * IndexedDB pode devolver
         * ArrayBuffer ou Blob.
         *
         * Ambos são aceitos pelo
         * Response.
         */


        return new Response(
            body,
            {

                status:
                    200,

                headers: {

                    "Content-Type":
                        "audio/wav",

                    "Content-Length":
                        String(
                            stored.size ||
                            0
                        ),

                    "Content-Disposition":
                        `attachment; filename="${stored.fileName}"`,

                    "Cache-Control":
                        "no-store, no-cache, must-revalidate",

                    "Pragma":
                        "no-cache"

                }

            }
        );

    } catch (error) {

        return new Response(
            "Erro ao gerar arquivo.",
            {

                status:
                    500,

                headers: {

                    "Content-Type":
                        "text/plain; charset=utf-8"

                }

            }
        );

    }

}


// ==========================================
// COMUNICAÇÃO COM A PÁGINA
// ==========================================

self.addEventListener(
    "message",
    event => {

        const data =
            event.data;


        if (!data) {

            return;

        }


        if (
            data.type ===
            "STORE_WAV"
        ) {

            event.waitUntil(
                storeWav(
                    data
                )
            );

        }


        if (
            data.type ===
            "CLEAR_WAV"
        ) {

            event.waitUntil(
                deleteFile()
            );

        }

    }
);


// ==========================================
// ARMAZENAR WAV
// ==========================================

async function storeWav(
    data
) {

    const database =
        await openDatabase();


    return new Promise(
        (
            resolve,
            reject
        ) => {

            const transaction =
                database.transaction(
                    STORE_NAME,
                    "readwrite"
                );


            const store =
                transaction.objectStore(
                    STORE_NAME
                );


            const request =
                store.put(
                    {
                        data:
                            data.data,

                        fileName:
                            data.fileName,

                        size:
                            data.size,

                        type:
                            data.type

                    },
                    "current"
                );


            request.onsuccess =
                () => {

                    resolve();

                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );

                };

        }
    );

}