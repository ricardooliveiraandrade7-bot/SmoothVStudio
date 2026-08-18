// ==========================================
// SMOOTHVSTUDIO
// FILE DOWNLOADER
// V0.4
// ==========================================
//
// Entrega de arquivos para Android/WebView.
//
// Estratégia:
// 1. Download via <a download>
// 2. Blob URL mantida viva
// 3. Fallback por navegação Blob
// 4. File System Access apenas como último
//    recurso.
//
// ==========================================


class FileDownloader {


    // ======================================
    // CRIAR BLOB URL
    // ======================================

    static createBlobURL(blob) {

        if (!blob) {

            throw new Error(
                "Blob inválido."
            );
        }


        return URL.createObjectURL(
            blob
        );
    }


    // ======================================
    // DOWNLOAD VIA ANCHOR
    // ======================================

    static downloadWithAnchor(
        blob,
        fileName
    ) {

        const url =
            FileDownloader.createBlobURL(
                blob
            );


        const anchor =
            document.createElement(
                "a"
            );


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
         * O clique acontece imediatamente.
         */

        try {

            anchor.click();

        } catch (error) {

            try {

                anchor.dispatchEvent(

                    new MouseEvent(
                        "click",
                        {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        }
                    )

                );

            } catch (dispatchError) {

                anchor.remove();

                URL.revokeObjectURL(
                    url
                );

                throw dispatchError;
            }
        }


        /*
         * O WebView pode precisar da URL
         * por vários segundos.
         */

        setTimeout(
            () => {

                try {

                    anchor.remove();

                } catch (error) {}

            },
            3000
        );


        setTimeout(
            () => {

                try {

                    URL.revokeObjectURL(
                        url
                    );

                } catch (error) {}

            },
            30000
        );


        return {

            method:
                "anchor",

            success:
                true

        };
    }


    // ======================================
    // FALLBACK: NAVEGAÇÃO PARA BLOB
    // ======================================

    static openBlob(
        blob
    ) {

        const url =
            FileDownloader.createBlobURL(
                blob
            );


        /*
         * Criamos uma página mínima que
         * referencia o áudio.
         *
         * Alguns WebViews Android conseguem
         * tratar a navegação melhor que o
         * atributo download.
         */

        const newWindow =
            window.open(
                url,
                "_blank"
            );


        if (!newWindow) {

            /*
             * Não forçamos imediatamente
             * window.location.
             *
             * Isso poderia tirar o usuário
             * do aplicativo.
             */

            URL.revokeObjectURL(
                url
            );


            throw new Error(
                "O WebView bloqueou a abertura do Blob."
            );
        }


        setTimeout(
            () => {

                try {

                    URL.revokeObjectURL(
                        url
                    );

                } catch (error) {}

            },
            30000
        );


        return {

            method:
                "blob-open",

            success:
                true

        };
    }


    // ======================================
    // FILE SYSTEM ACCESS
    // ======================================

    static async saveWithFileSystemAccess(
        blob,
        fileName
    ) {

        if (
            typeof window.showSaveFilePicker !==
            "function"
        ) {

            throw new Error(
                "File System Access API indisponível."
            );
        }


        const handle =
            await window.showSaveFilePicker({

                suggestedName:
                    fileName,

                types: [

                    {
                        description:
                            "WAV Audio",

                        accept: {

                            "audio/wav": [
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

            } catch (abortError) {}

            throw error;
        }


        return {

            method:
                "filesystem",

            success:
                true

        };
    }


    // ======================================
    // SHARE
    // ======================================

    static canShareFile(
        file
    ) {

        if (
            typeof navigator.share !==
            "function" ||

            typeof navigator.canShare !==
            "function"
        ) {

            return false;
        }


        try {

            return navigator.canShare({

                files: [
                    file
                ]

            });

        } catch (error) {

            return false;
        }
    }


    static async shareFile(
        file
    ) {

        if (
            !FileDownloader.canShareFile(
                file
            )
        ) {

            throw new Error(
                "Compartilhamento não disponível."
            );
        }


        await navigator.share({

            title:
                "SmoothVStudio",

            text:
                "Vocal processado pelo SmoothVStudio.",

            files: [
                file
            ]

        });


        return {

            method:
                "share",

            success:
                true

        };
    }


    // ======================================
    // ENTREGA PRINCIPAL
    // ======================================

    static async deliver(
        blob,
        fileName
    ) {

        if (!blob) {

            return {

                method:
                    "failed",

                success:
                    false,

                error:
                    new Error(
                        "Nenhum WAV disponível."
                    )

            };
        }


        /*
         * ==================================
         * MÉTODO 1
         * ANCHOR DOWNLOAD
         * ==================================
         */

        try {

            return FileDownloader
                .downloadWithAnchor(
                    blob,
                    fileName
                );

        } catch (error) {

            console.warn(
                "Anchor download falhou:",
                error
            );

        }


        /*
         * ==================================
         * MÉTODO 2
         * SHARE
         * ==================================
         */

        try {

            const file =
                new File(

                    [
                        blob
                    ],

                    fileName,

                    {
                        type:
                            "audio/wav"
                    }

                );


            if (
                FileDownloader.canShareFile(
                    file
                )
            ) {

                return await
                    FileDownloader.shareFile(
                        file
                    );

            }

        } catch (error) {

            console.warn(
                "Share falhou:",
                error
            );

        }


        /*
         * ==================================
         * MÉTODO 3
         * BLOB OPEN
         * ==================================
         */

        try {

            return FileDownloader
                .openBlob(
                    blob
                );

        } catch (error) {

            console.warn(
                "Blob open falhou:",
                error
            );

        }


        /*
         * ==================================
         * MÉTODO 4
         * FILE SYSTEM ACCESS
         * ==================================
         */

        try {

            return await
                FileDownloader
                    .saveWithFileSystemAccess(
                        blob,
                        fileName
                    );

        } catch (error) {

            console.error(
                "File System Access falhou:",
                error
            );


            return {

                method:
                    "failed",

                success:
                    false,

                error:
                    error

            };
        }

    }

}