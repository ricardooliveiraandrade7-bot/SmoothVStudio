// ==========================================
// SMOOTHVSTUDIO
// EXPORT MANAGER
// V0.2
// ==========================================
//
// Camada independente responsável por entregar
// o WAV gerado pelo SmoothVStudio.
//
// O motor de áudio NÃO conhece esta camada.
//
// V0.2:
//
// - validação reforçada do Blob;
// - diagnóstico detalhado;
// - registro das tentativas;
// - tratamento explícito de cancelamento;
// - limpeza segura de Object URLs;
// - fallback controlado;
// - nenhum processamento DSP.
//
// ==========================================


class ExportManager {


    // ======================================
    // DIAGNÓSTICO DO AMBIENTE
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
                typeof URL !==
                "undefined" &&

                typeof URL.createObjectURL ===
                "function",

            revokeObjectURL:
                typeof URL !==
                "undefined" &&

                typeof URL.revokeObjectURL ===
                "function",

            anchorDownload:
                typeof document !==
                "undefined",

            androidBridge:
                typeof window.android !==
                "undefined",

            navigatorShare:
                typeof navigator.share ===
                "function",

            navigatorCanShare:
                typeof navigator.canShare ===
                "function"
        };
    }


    // ======================================
    // CRIAR DIAGNÓSTICO BASE
    // ======================================

    static createDiagnostic(
        fileName,
        blob,
        environment
    ) {

        return {

            version:
                "0.2",

            fileName:
                fileName || null,

            mimeType:
                blob && blob.type
                    ? blob.type
                    : null,

            size:
                blob && Number.isFinite(blob.size)
                    ? blob.size
                    : 0,

            sizeMB:
                blob && Number.isFinite(blob.size)
                    ? Number(
                        (
                            blob.size /
                            1024 /
                            1024
                        ).toFixed(2)
                    )
                    : 0,

            environment:
                environment,

            attempts:
                [],

            finalMethod:
                null,

            success:
                false,

            error:
                null
        };
    }


    // ======================================
    // VALIDAR BLOB
    // ======================================

    static validateBlob(
        blob
    ) {

        if (
            !blob
        ) {

            throw new Error(
                "Nenhum arquivo foi fornecido para exportação."
            );
        }


        if (
            typeof Blob ===
            "undefined"
        ) {

            throw new Error(
                "A API Blob não está disponível neste ambiente."
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
            !Number.isFinite(
                blob.size
            ) ||
            blob.size <= 0
        ) {

            throw new Error(
                "O arquivo possui tamanho zero ou tamanho inválido."
            );
        }


        if (
            blob.type &&
            blob.type !==
            "audio/wav"
        ) {

            console.warn(
                "SmoothVStudio: MIME inesperado:",
                blob.type
            );
        }


        return true;
    }


    // ======================================
    // FILE SYSTEM ACCESS
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


        if (
            !handle
        ) {

            throw new Error(
                "O seletor de arquivo não retornou um destino válido."
            );
        }


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
            typeof URL ===
            "undefined" ||

            typeof URL.createObjectURL !==
            "function"
        ) {

            throw new Error(
                "URL.createObjectURL não está disponível."
            );
        }


        if (
            typeof document ===
            "undefined"
        ) {

            throw new Error(
                "Documento HTML indisponível."
            );
        }


        const url =
            URL.createObjectURL(
                blob
            );


        let anchor =
            null;


        try {

            anchor =
                document.createElement(
                    "a"
                );


            if (
                !anchor
            ) {

                throw new Error(
                    "Não foi possível criar o elemento de download."
                );
            }


            anchor.href =
                url;


            anchor.download =
                fileName;


            anchor.setAttribute(
                "download",
                fileName
            );


            anchor.rel =
                "noopener";


            anchor.style.position =
                "fixed";


            anchor.style.left =
                "-9999px";


            anchor.style.top =
                "-9999px";


            anchor.style.width =
                "1px";


            anchor.style.height =
                "1px";


            document.body.appendChild(
                anchor
            );


            /*
             * O clique precisa acontecer
             * enquanto ainda estamos dentro
             * da ação iniciada pelo usuário.
             */

            anchor.click();


            /*
             * Damos tempo para o navegador
             * processar o evento antes de
             * remover o elemento.
             */

            await new Promise(
                resolve => {

                    setTimeout(
                        resolve,
                        300
                    );
                }
            );


            return {

                success:
                    true,

                method:
                    "anchor-download",

                note:
                    "Download solicitado ao navegador."
            };


        } finally {

            if (
                anchor
            ) {

                try {

                    anchor.remove();

                } catch (_) {}
            }


            /*
             * Não revogar imediatamente.
             *
             * Alguns WebViews precisam
             * consumir a Blob URL depois
             * do clique.
             */

            setTimeout(
                () => {

                    try {

                        if (
                            typeof URL !==
                            "undefined" &&

                            typeof URL.revokeObjectURL ===
                            "function"
                        ) {

                            URL.revokeObjectURL(
                                url
                            );
                        }

                    } catch (_) {}

                },
                15000
            );
        }
    }


    // ======================================
    // NAVEGAÇÃO PARA BLOB
    // ======================================

    static async saveWithBlobNavigation(
        blob
    ) {

        if (
            typeof URL ===
            "undefined" ||

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


        /*
         * Este método pode substituir a
         * página atual.
         *
         * Por isso ele permanece como
         * último recurso.
         */

        window.location.href =
            url;


        /*
         * Não revogar imediatamente.
         *
         * A navegação precisa continuar
         * tendo acesso à URL.
         */

        return {

            success:
                true,

            method:
                "blob-navigation",

            note:
                "O navegador recebeu uma navegação para o Blob."
        };
    }


    // ======================================
    // EXPORTAÇÃO PRINCIPAL
    // ======================================

    static async exportWav(
        blob,
        fileName
    ) {

        const environment =
            this.getEnvironment();


        const diagnostic =
            this.createDiagnostic(
                fileName,
                blob,
                environment
            );


        try {

            // ==============================
            // VALIDAÇÃO
            // ==============================

            this.validateBlob(
                blob
            );


            // ==============================
            // LOG INICIAL
            // ==============================

            console.log(
                "SmoothVStudio Export Environment:",
                environment
            );


            console.log(
                "SmoothVStudio Export File:",
                {

                    name:
                        fileName,

                    type:
                        blob.type,

                    size:
                        blob.size,

                    sizeMB:
                        diagnostic.sizeMB
                }
            );


        } catch (error) {

            diagnostic.error =
                error.message;


            console.error(
                "SmoothVStudio: validação da exportação falhou:",
                error
            );


            return {

                success:
                    false,

                method:
                    "validation-failed",

                error:
                    error,

                diagnostic:
                    diagnostic
            };
        }


        // ==================================
        // MÉTODO 1
        // FILE SYSTEM ACCESS
        // ==================================

        if (
            environment.fileSystemAccess &&
            environment.secureContext
        ) {

            try {

                diagnostic.attempts.push(
                    "file-system-access"
                );


                const result =
                    await this.saveWithFileSystem(
                        blob,
                        fileName
                    );


                diagnostic.finalMethod =
                    result.method;


                diagnostic.success =
                    true;


                return {

                    ...result,

                    diagnostic:
                        diagnostic
                };


            } catch (error) {

                /*
                 * AbortError significa
                 * normalmente cancelamento
                 * do seletor pelo usuário.
                 */

                diagnostic.attempts.push(
                    "file-system-access-failed"
                );


                diagnostic.lastError =
                    error.message;


                console.warn(
                    "File System Access falhou:",
                    error
                );
            }
        }


        // ==================================
        // MÉTODO 2
        // DOWNLOAD TRADICIONAL
        // ==================================

        if (
            environment.anchorDownload &&
            environment.objectURL
        ) {

            try {

                diagnostic.attempts.push(
                    "anchor-download"
                );


                const result =
                    await this.saveWithAnchor(
                        blob,
                        fileName
                    );


                diagnostic.finalMethod =
                    result.method;


                diagnostic.success =
                    true;


                return {

                    ...result,

                    diagnostic:
                        diagnostic
                };


            } catch (error) {

                diagnostic.attempts.push(
                    "anchor-download-failed"
                );


                diagnostic.lastError =
                    error.message;


                console.warn(
                    "Download tradicional falhou:",
                    error
                );
            }
        }


        // ==================================
        // MÉTODO 3
        // BLOB NAVIGATION
        // ==================================

        if (
            environment.objectURL
        ) {

            try {

                diagnostic.attempts.push(
                    "blob-navigation"
                );


                const result =
                    await this.saveWithBlobNavigation(
                        blob
                    );


                diagnostic.finalMethod =
                    result.method;


                diagnostic.success =
                    true;


                return {

                    ...result,

                    diagnostic:
                        diagnostic
                };


            } catch (error) {

                diagnostic.attempts.push(
                    "blob-navigation-failed"
                );


                diagnostic.lastError =
                    error.message;


                console.error(
                    "Navegação Blob falhou:",
                    error
                );
            }
        }


        // ==================================
        // FALHA TOTAL
        // ==================================

        diagnostic.success =
            false;


        diagnostic.finalMethod =
            "failed";


        const finalError =
            new Error(
                "Nenhum método de exportação disponível neste ambiente."
            );


        diagnostic.error =
            finalError.message;


        console.error(
            "SmoothVStudio: falha total na exportação.",
            diagnostic
        );


        return {

            success:
                false,

            method:
                "failed",

            error:
                finalError,

            diagnostic:
                diagnostic
        };
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.ExportManager =
    ExportManager;