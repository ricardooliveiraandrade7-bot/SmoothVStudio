// ==========================================
// SMOOTHVSTUDIO
// EXPORT MANAGER
// V0.1
// ==========================================
//
// Camada independente responsável por entregar
// o WAV gerado pelo SmoothVStudio.
//
// O motor de áudio NÃO conhece esta camada.
//
// Ordem de tentativa:
//
// 1. File System Access API
// 2. Download tradicional
// 3. Navegação para Blob
//
// O objetivo é manter a exportação isolada
// do DSP e permitir futuramente adicionar
// um adaptador nativo Android/Spck sem
// modificar o restante do projeto.
// ==========================================


class ExportManager {


    // ======================================
    // DIAGNÓSTICO
    // ======================================

    static getEnvironment() {

        return {

            secureContext:
                window.isSecureContext === true,

            fileSystemAccess:
                typeof window.showSaveFilePicker ===
                "function",

            blob:
                typeof Blob ===
                "function",

            objectURL:
                typeof URL.createObjectURL ===
                "function",

            androidBridge:
                typeof window.android !==
                "undefined",

            navigatorShare:
                typeof navigator.share ===
                "function"

        };

    }


    // ======================================
    // VALIDAR ARQUIVO
    // ======================================

    static validateBlob(blob) {

        if (!blob) {

            throw new Error(
                "Nenhum arquivo foi fornecido para exportação."
            );

        }


        if (
            !(blob instanceof Blob)
        ) {

            throw new Error(
                "O objeto fornecido não é um Blob válido."
            );

        }


        if (
            blob.size <= 0
        ) {

            throw new Error(
                "O arquivo possui tamanho zero."
            );

        }


        return true;

    }


    // ======================================
    // FILE SYSTEM ACCESS API
    // ======================================

    static async saveWithFileSystem(
        blob,
        fileName
    ) {

        if (
            typeof window.showSaveFilePicker !==
            "function"
        ) {

            throw new Error(
                "showSaveFilePicker não está disponível."
            );

        }


        const handle =
            await window.showSaveFilePicker({

                suggestedName:
                    fileName,

                types: [

                    {

                        description:
                            "Arquivo WAV",

                        accept: {

                            "audio/wav":
                                [
                                    ".wav"
                                ]

                        }

                    }

                ]

            });


        const writable =
            await handle.createWritable();


        try {

            await writable.write(
                blob
            );

            await writable.close();

        } catch (error) {

            try {

                await writable.abort();

            } catch (_) {}

            throw error;
        }


        return {

            success:
                true,

            method:
                "file-system-access"

        };

    }


    // ======================================
    // DOWNLOAD TRADICIONAL
    // ======================================

    static async saveWithAnchor(
        blob,
        fileName
    ) {

        if (
            typeof URL.createObjectURL !==
            "function"
        ) {

            throw new Error(
                "URL.createObjectURL não está disponível."
            );

        }


        const url =
            URL.createObjectURL(
                blob
            );


        try {

            const anchor =
                document.createElement(
                    "a"
                );


            anchor.href =
                url;


            anchor.download =
                fileName;


            anchor.rel =
                "noopener";


            anchor.style.display =
                "none";


            document.body.appendChild(
                anchor
            );


            /*
             * Primeiro tentamos click()
             * porque é o mecanismo mais
             * compatível com WebViews.
             */

            anchor.click();


            /*
             * Pequeno atraso antes da
             * remoção do elemento.
             */

            await new Promise(
                resolve => {

                    setTimeout(
                        resolve,
                        300
                    );

                }
            );


            anchor.remove();


            return {

                success:
                    true,

                method:
                    "anchor-download"

            };

        } finally {

            /*
             * Não revogar imediatamente.
             * Alguns WebViews precisam
             * de tempo para consumir a URL.
             */

            setTimeout(
                () => {

                    try {

                        URL.revokeObjectURL(
                            url
                        );

                    } catch (_) {}

                },
                10000
            );

        }

    }


    // ======================================
    // NAVEGAÇÃO PARA BLOB
    // ======================================

    static async saveWithBlobNavigation(
        blob
    ) {

        const url =
            URL.createObjectURL(
                blob
            );


        /*
         * Navegação direta é usada como
         * último recurso.
         *
         * Não abrimos uma nova janela porque
         * WebViews móveis frequentemente
         * bloqueiam window.open().
         */

        window.location.href =
            url;


        /*
         * Não revogar aqui.
         *
         * A página pode estar navegando
         * para o recurso.
         */

        return {

            success:
                true,

            method:
                "blob-navigation"

        };

    }


    // ======================================
    // EXPORTAÇÃO PRINCIPAL
    // ======================================

    static async exportWav(
        blob,
        fileName
    ) {

        this.validateBlob(
            blob
        );


        const environment =
            this.getEnvironment();


        console.log(
            "SmoothVStudio Export Environment:",
            environment
        );


        /*
         * ----------------------------------
         * MÉTODO 1
         * File System Access API
         * ----------------------------------
         */

        if (
            environment.fileSystemAccess &&
            environment.secureContext
        ) {

            try {

                return await this.saveWithFileSystem(
                    blob,
                    fileName
                );

            } catch (error) {

                console.warn(
                    "File System Access falhou:",
                    error
                );

                /*
                 * AbortError significa que o
                 * usuário fechou/cancelou o
                 * seletor.
                 *
                 * Nesse caso continuamos
                 * tentando outro método.
                 */

            }

        }


        /*
         * ----------------------------------
         * MÉTODO 2
         * Download tradicional
         * ----------------------------------
         */

        try {

            return await this.saveWithAnchor(
                blob,
                fileName
            );

        } catch (error) {

            console.warn(
                "Download tradicional falhou:",
                error
            );

        }


        /*
         * ----------------------------------
         * MÉTODO 3
         * Blob navigation
         * ----------------------------------
         */

        try {

            return await this.saveWithBlobNavigation(
                blob
            );

        } catch (error) {

            console.error(
                "Navegação Blob falhou:",
                error
            );

        }


        /*
         * ----------------------------------
         * FALHA TOTAL
         * ----------------------------------
         */

        throw new Error(
            "Nenhum método de exportação disponível neste ambiente."
        );

    }

}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.ExportManager =
    ExportManager;