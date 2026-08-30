"use strict";


class FileDownloader {
    
    
    static validateFile(
        file
    ) {
        
        if (
            !file
        ) {
            
            throw new Error(
                "Arquivo inválido."
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
            !(file instanceof Blob)
        ) {
            
            throw new Error(
                "O objeto fornecido não é um arquivo ou Blob válido."
            );
        }
        
        
        if (
            !Number.isFinite(
                file.size
            ) ||
            file.size <= 0
        ) {
            
            throw new Error(
                "O arquivo está vazio."
            );
        }
        
        
        return true;
    }
    
    
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
        
        
        try {
            
            URL.revokeObjectURL(
                url
            );
            
        } catch (_) {}
    }
    
    
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
                    files: [
                        file
                    ]
                }
            );

        } catch (_) {

            return false;
        }
    }
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
                fileName ||
                file.name
            );


        let shareFile =
            file;


        if (
            !(file instanceof File) ||
            file.name !==
            normalizedName
        ) {

            shareFile =
                new File(
                    [
                        file
                    ],
                    normalizedName,
                    {
                        type:
                            file.type ||
                            "application/octet-stream"
                    }
                );
        }


        try {

            await navigator.share(
                {
                    files: [
                        shareFile
                    ],
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


    static download(
        file,
        fileName
    ) {

        return FileDownloader.downloadWithAnchor(
            file,
            fileName
        );
    }
        static async deliver(
        file,
        fileName,
        mode =
            "auto"
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

            } catch (_) {}
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