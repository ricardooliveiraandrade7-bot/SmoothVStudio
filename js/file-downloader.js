"use strict";


class FileDownloader {
    
    
    // ======================================================
    // VALIDAR ARQUIVO
    // ======================================================
    
    static validateFile(
        file
    ) {
        
        if (!file) {
            
            throw new Error(
                "Nenhum arquivo foi fornecido."
            );
        }
        
        
        if (
            typeof file !== "object"
        ) {
            
            throw new Error(
                "Arquivo inválido."
            );
        }
        
        
        if (
            typeof file.size === "number" &&
            file.size <= 0
        ) {
            
            throw new Error(
                "O arquivo está vazio."
            );
        }
        
        
        return true;
    }
    
    
    // ======================================================
    // CRIAR BLOB URL
    // ======================================================
    
    static createBlobURL(
        file
    ) {
        
        FileDownloader.validateFile(
            file
        );
        
        
        if (
            typeof URL ===
            "undefined" ||
            
            typeof URL.createObjectURL !==
            "function"
        ) {
            
            throw new Error(
                "Blob URL não é suportada neste ambiente."
            );
        }
        
        
        return URL.createObjectURL(
            file
        );
    }
    
    
    // ======================================================
    // LIBERAR BLOB URL
    // ======================================================
    
    static revokeBlobURL(
        url
    ) {
        
        if (
            !url
        ) {
            
            return;
        }
        
        
        if (
            typeof URL ===
            "undefined" ||
            
            typeof URL.revokeObjectURL !==
            "function"
        ) {
            
            return;
        }
        
        
        URL.revokeObjectURL(
            url
        );
    }
    
    
    // ======================================================
    // VALIDAR NOME
    // ======================================================
    
    static normalizeFileName(
        fileName,
        fallback =
        "smoothvstudio-vocal.wav"
    ) {
        
        if (
            typeof fileName !==
            "string"
        ) {
            
            return fallback;
        }
        
        
        const normalized =
            fileName.trim();
        
        
        if (
            !normalized
        ) {
            
            return fallback;
        }
        
        
        return normalized;
    }
        // ======================================================
    // DOWNLOAD POR ANCHOR
    // ======================================================

    static downloadWithAnchor(
        file,
        fileName
    ) {

        FileDownloader.validateFile(
            file
        );


        const normalizedName =
            FileDownloader.normalizeFileName(
                fileName
            );


        const url =
            FileDownloader.createBlobURL(
                file
            );


        const anchor =
            document.createElement(
                "a"
            );


        anchor.href =
            url;


        anchor.download =
            normalizedName;


        anchor.style.display =
            "none";


        document.body.appendChild(
            anchor
        );


        try {

            anchor.click();

        } finally {

            document.body.removeChild(
                anchor
            );


            setTimeout(
                () => {

                    FileDownloader.revokeBlobURL(
                        url
                    );

                },
                100
            );
        }


        return true;
    }


    // ======================================================
    // VERIFICAR SHARE API
    // ======================================================

    static canShareFile(
        file
    ) {

        if (
            !file
        ) {

            return false;
        }


        if (
            typeof navigator ===
            "undefined"
        ) {

            return false;
        }


        if (
            typeof navigator.share !==
            "function"
        ) {

            return false;
        }


        if (
            typeof navigator.canShare !==
            "function"
        ) {

            return true;
        }


        try {

            return navigator.canShare(
                {
                    files: [file]
                }
            );

        } catch (
            error
        ) {

            return false;
        }
    }


    // ======================================================
    // COMPARTILHAR ARQUIVO
    // ======================================================

    static async shareFile(
        file,
        fileName
    ) {

        FileDownloader.validateFile(
            file
        );


        if (
            !FileDownloader.canShareFile(
                file
            )
        ) {

            return false;
        }


        const normalizedName =
            FileDownloader.normalizeFileName(
                fileName
            );


        try {

            await navigator.share(
                {
                    files: [file],
                    title:
                        normalizedName
                }
            );


            return true;

        } catch (
            error
        ) {

            if (
                error &&
                error.name ===
                "AbortError"
            ) {

                return false;
            }


            throw error;
        }
    }
        // ======================================================
    // DOWNLOAD
    // ======================================================
    //
    // Este método representa exclusivamente a entrega
    // tradicional do arquivo ao navegador.
    //
    // Não decide sobre processamento ou exportação.
    // ======================================================

    static download(
        file,
        fileName
    ) {

        return FileDownloader.downloadWithAnchor(
            file,
            fileName
        );
    }


    // ======================================================
    // ENTREGA
    // ======================================================
    //
    // mode:
    //
    // "download"
    // "share"
    // "auto"
    //
    // "auto" tenta compartilhamento primeiro quando
    // disponível e utiliza download como alternativa.
    // ======================================================

    static async deliver(
        file,
        fileName,
        mode = "auto"
    ) {

        FileDownloader.validateFile(
            file
        );


        const normalizedName =
            FileDownloader.normalizeFileName(
                fileName
            );


        if (
            mode ===
            "share"
        ) {

            const shared =
                await FileDownloader.shareFile(
                    file,
                    normalizedName
                );


            if (
                !shared
            ) {

                throw new Error(
                    "Compartilhamento de arquivo não está disponível."
                );
            }


            return {
                action:
                    "share",

                success:
                    true
            };
        }


        if (
            mode ===
            "download"
        ) {

            FileDownloader.download(
                file,
                normalizedName
            );


            return {
                action:
                    "download",

                success:
                    true
            };
        }


        if (
            mode !==
            "auto"
        ) {

            throw new Error(
                "Modo de entrega inválido."
            );
        }
                // ==================================================
        // AUTO
        // ==================================================

        if (
            FileDownloader.canShareFile(
                file
            )
        ) {

            try {

                const shared =
                    await FileDownloader.shareFile(
                        file,
                        normalizedName
                    );


                if (
                    shared
                ) {

                    return {
                        action:
                            "share",

                        success:
                            true
                    };
                }

            } catch (
                error
            ) {

                // Se o compartilhamento falhar,
                // o download tradicional será tentado.
            }
        }


        FileDownloader.download(
            file,
            normalizedName
        );


        return {
            action:
                "download",

            success:
                true
        };
    }


    // ======================================================
    // VERIFICAR SUPORTE A DOWNLOAD
    // ======================================================

    static canDownload() {

        if (
            typeof document ===
            "undefined"
        ) {

            return false;
        }


        return (
            typeof document.createElement ===
            "function"
        );
    }


    // ======================================================
    // VERIFICAR SUPORTE A BLOB URL
    // ======================================================

    static canCreateBlobURL() {

        return (

            typeof URL !==
            "undefined"

            &&

            typeof URL.createObjectURL ===
            "function"
        );
    }


    // ======================================================
    // VERIFICAR AMBIENTE
    // ======================================================

    static getCapabilities() {

        return {

            download:
                FileDownloader.canDownload(),

            blobURL:
                FileDownloader.canCreateBlobURL(),

            share:
                typeof navigator !==
                "undefined" &&

                typeof navigator.share ===
                "function",

            fileShare:
                typeof navigator !==
                "undefined" &&

                typeof navigator.share ===
                "function" &&

                typeof navigator.canShare ===
                "function"
        };
    }
        // ======================================================
    // CRIAR FILE A PARTIR DE BLOB
    // ======================================================
    //
    // Utilitário simples para manter a conversão de Blob
    // para File centralizada.
    // ======================================================

    static blobToFile(
        blob,
        fileName =
            "smoothvstudio-vocal.wav"
    ) {

        if (
            !blob
        ) {

            throw new Error(
                "Blob inválido."
            );
        }


        if (
            !(blob instanceof Blob)
        ) {

            throw new Error(
                "O objeto fornecido não é um Blob."
            );
        }


        const normalizedName =
            FileDownloader.normalizeFileName(
                fileName
            );


        return new File(
            [
                blob
            ],
            normalizedName,
            {
                type:
                    blob.type ||
                    "application/octet-stream"
            }
        );
    }


    // ======================================================
    // OBTER TAMANHO
    // ======================================================

    static getFileSize(
        file
    ) {

        FileDownloader.validateFile(
            file
        );


        return Number(
            file.size
        );
    }


    // ======================================================
    // OBTER TIPO
    // ======================================================

    static getFileType(
        file
    ) {

        FileDownloader.validateFile(
            file
        );


        if (
            typeof file.type ===
            "string"
        ) {

            return file.type;
        }


        return "";
    }


    // ======================================================
    // OBTER NOME
    // ======================================================

    static getFileName(
        file,
        fallback =
            "smoothvstudio-vocal.wav"
    ) {

        if (
            file &&
            typeof file.name ===
            "string" &&
            file.name.trim()
        ) {

            return file.name.trim();
        }


        return FileDownloader.normalizeFileName(
            "",
            fallback
        );
    }
        // ======================================================
    // DOWNLOAD DE BLOB
    // ======================================================
    
    static downloadBlob(
        blob,
        fileName
    ) {
        
        if (
            !(blob instanceof Blob)
        ) {
            
            throw new Error(
                "O objeto fornecido não é um Blob."
            );
        }
        
        
        const normalizedName =
            FileDownloader.normalizeFileName(
                fileName
            );
        
        
        return FileDownloader.downloadWithAnchor(
            blob,
            normalizedName
        );
    }
    
    
    // ======================================================
    // COMPARTILHAR BLOB
    // ======================================================
    
    static async shareBlob(
        blob,
        fileName
    ) {
        
        if (
            !(blob instanceof Blob)
        ) {
            
            throw new Error(
                "O objeto fornecido não é um Blob."
            );
        }
        
        
        const file =
            FileDownloader.blobToFile(
                blob,
                fileName
            );
        
        
        return FileDownloader.shareFile(
            file,
            file.name
        );
    }
    
    
    // ======================================================
    // LIBERAR RECURSOS
    // ======================================================
    
    static revoke(
        url
    ) {
        
        FileDownloader.revokeBlobURL(
            url
        );
    }
    }
    
    
    // ==========================================================
    // DISPONIBILIZAÇÃO GLOBAL
    // ==========================================================
    
    window.FileDownloader =
        FileDownloader;