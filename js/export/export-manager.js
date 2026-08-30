"use strict";


class ExportManager {


    // ======================================================
    // VALIDAR ENTRADA
    // ======================================================

    static validateExport(
        blob,
        fileName
    ) {

        if (
            !blob
        ) {

            throw new Error(
                "Nenhum WAV foi fornecido para exportação."
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
                "O WAV está vazio ou possui tamanho inválido."
            );
        }


        const normalizedName =
            ExportManager.normalizeFileName(
                fileName
            );


        return {
            blob,
            fileName:
                normalizedName
        };
    }


    // ======================================================
    // NORMALIZAR NOME
    // ======================================================

    static normalizeFileName(
        fileName
    ) {

        const fallback =
            "smoothvstudio-vocal.wav";


        if (
            typeof fileName !==
            "string"
        ) {

            return fallback;
        }


        const trimmed =
            fileName.trim();


        if (
            !trimmed
        ) {

            return fallback;
        }


        if (
            /\.wav$/i.test(
                trimmed
            )
        ) {

            return trimmed;
        }


        return (
            trimmed +
            ".wav"
        );
    }


    // ======================================================
    // VERIFICAR DISPONIBILIDADE
    // ======================================================

    static canExport() {

        if (
            typeof FileDownloader ===
            "undefined"
        ) {

            return false;
        }


        if (
            typeof FileDownloader.deliver !==
            "function"
        ) {

            return false;
        }


        return true;
    }


    // ======================================================
    // CRIAR ARQUIVO
    // ======================================================

    static createFile(
        blob,
        fileName
    ) {

        const validated =
            ExportManager.validateExport(
                blob,
                fileName
            );


        if (
            typeof File ===
            "undefined"
        ) {

            throw new Error(
                "A API File não está disponível neste ambiente."
            );
        }


        return new File(
            [
                validated.blob
            ],
            validated.fileName,
            {
                type:
                    validated.blob.type ||
                    "audio/wav"
            }
        );
    }
        // ======================================================
    // EXPORTAR WAV
    // ======================================================
    //
    // Recebe o Blob já criado pelo WavExporter.
    //
    // O ExportManager não cria o WAV.
    // Apenas coordena sua entrega.
    // ======================================================

    static async exportWav(
        blob,
        fileName
    ) {

        const validated =
            ExportManager.validateExport(
                blob,
                fileName
            );


        if (
            !ExportManager.canExport()
        ) {

            return {

                success:
                    false,

                method:
                    "unavailable",

                error:
                    new Error(
                        "Módulo de entrega de arquivos não está disponível."
                    )
            };
        }


        try {

            const result =
                await FileDownloader.deliver(
                    validated.blob,
                    validated.fileName,
                    "download"
                );


            if (
                !result ||
                result.success !== true
            ) {

                return {

                    success:
                        false,

                    method:
                        "failed",

                    error:
                        new Error(
                            "Não foi possível entregar o WAV."
                        )
                };
            }


            return {

                success:
                    true,

                method:
                    result.action ||
                    "download",

                fileName:
                    validated.fileName,

                size:
                    validated.blob.size
            };


        } catch (
            error
        ) {

            console.error(
                "SmoothVStudio: erro na exportação do WAV.",
                error
            );


            throw error;
        }
    }


    // ======================================================
    // COMPARTILHAR WAV
    // ======================================================
    //
    // Mantido aqui como ponto de coordenação futura.
    // A operação real continua no FileDownloader.
    // ======================================================

    static async shareWav(
        blob,
        fileName
    ) {

        const validated =
            ExportManager.validateExport(
                blob,
                fileName
            );


        if (
            typeof FileDownloader ===
            "undefined" ||
            typeof FileDownloader.shareFile !==
            "function"
        ) {

            return {

                success:
                    false,

                method:
                    "unavailable",

                error:
                    new Error(
                        "Compartilhamento de arquivos não está disponível."
                    )
            };
        }


        const file =
            ExportManager.createFile(
                validated.blob,
                validated.fileName
            );


        const shared =
            await FileDownloader.shareFile(
                file,
                validated.fileName
            );


        return {

            success:
                shared === true,

            method:
                "share",

            fileName:
                validated.fileName
        };
    }
        // ======================================================
    // VALIDAR WAV
    // ======================================================
    //
    // Esta função valida somente a presença do arquivo.
    //
    // A validação estrutural do WAV pertence ao WavExporter.
    // ======================================================

    static validateWav(
        blob
    ) {

        if (
            typeof WavExporter !==
            "undefined" &&
            typeof WavExporter.validateBlob ===
            "function"
        ) {

            try {

                WavExporter.validateBlob(
                    blob
                );

            } catch (
                error
            ) {

                throw error;
            }
        }


        ExportManager.validateExport(
            blob,
            "smoothvstudio-vocal.wav"
        );


        return true;
    }


    // ======================================================
    // INFORMAÇÕES DA EXPORTAÇÃO
    // ======================================================

    static getExportInfo(
        blob,
        fileName
    ) {

        const validated =
            ExportManager.validateExport(
                blob,
                fileName
            );


        const info = {

            fileName:
                validated.fileName,

            mimeType:
                validated.blob.type ||
                "audio/wav",

            size:
                validated.blob.size,

            sizeMB:
                Number(
                    (
                        validated.blob.size /
                        1024 /
                        1024
                    ).toFixed(2)
                )
        };


        if (
            typeof WavExporter !==
            "undefined" &&
            typeof WavExporter.getWavInfo ===
            "function"
        ) {

            try {

                const wavInfo =
                    WavExporter.getWavInfo(
                        blob
                    );


                return {

                    ...info,

                    wav:
                        wavInfo
                };

            } catch (_) {

                // Mantém as informações básicas.
            }
        }


        return info;
    }


    // ======================================================
    // CRIAR NOME A PARTIR DO ORIGINAL
    // ======================================================

    static createOutputName(
        originalFileName
    ) {

        if (
            typeof originalFileName !==
            "string" ||
            !originalFileName.trim()
        ) {

            return (
                "smoothvstudio-vocal.wav"
            );
        }


        const original =
            originalFileName.trim();


        const withoutExtension =
            original.replace(
                /\.[^/.]+$/,
                ""
            );


        if (
            !withoutExtension
        ) {

            return (
                "smoothvstudio-vocal.wav"
            );
        }


        return (
            withoutExtension +
            "-smoothvstudio.wav"
        );
    }
        // ======================================================
    // RESULTADO PADRÃO DE FALHA
    // ======================================================

    static createFailureResult(
        error,
        method = "failed"
    ) {

        const normalizedError =
            error instanceof Error
                ? error
                : new Error(
                    String(
                        error ||
                        "Falha na exportação."
                    )
                );


        return {

            success:
                false,

            method:
                method,

            error:
                normalizedError
        };
    }


    // ======================================================
    // RESULTADO PADRÃO DE SUCESSO
    // ======================================================

    static createSuccessResult(
        method,
        fileName,
        blob
    ) {

        return {

            success:
                true,

            method:
                method,

            fileName:
                fileName,

            size:
                blob &&
                Number.isFinite(
                    blob.size
                )
                    ? blob.size
                    : 0
        };
    }


    // ======================================================
    // EXPORTAÇÃO SEGURA
    // ======================================================
    //
    // Variante que não lança erro de exportação para
    // a camada da interface.
    // ======================================================

    static async tryExportWav(
        blob,
        fileName
    ) {

        try {

            return await ExportManager.exportWav(
                blob,
                fileName
            );

        } catch (
            error
        ) {

            console.error(
                "SmoothVStudio: exportação segura falhou.",
                error
            );


            return ExportManager.createFailureResult(
                error
            );
        }
    }


    // ======================================================
    // VERIFICAR COMPARTILHAMENTO
    // ======================================================

    static canShare(
        blob,
        fileName
    ) {

        if (
            typeof FileDownloader ===
            "undefined"
        ) {

            return false;
        }


        if (
            typeof FileDownloader.canShareFile !==
            "function"
        ) {

            return false;
        }


        try {

            const file =
                ExportManager.createFile(
                    blob,
                    fileName
                );


            return FileDownloader.canShareFile(
                file
            );

        } catch (_) {

            return false;
        }
    }
        // ======================================================
    // PREPARAR EXPORTAÇÃO
    // ======================================================

    static prepare(
        blob,
        fileName
    ) {

        const validated =
            ExportManager.validateExport(
                blob,
                fileName
            );


        return {

            blob:
                validated.blob,

            fileName:
                validated.fileName,

            file:
                ExportManager.createFile(
                    validated.blob,
                    validated.fileName
                )
        };
    }


    // ======================================================
    // OBTER TAMANHO
    // ======================================================

    static getSize(
        blob
    ) {

        if (
            !blob ||
            !Number.isFinite(
                blob.size
            )
        ) {

            return 0;
        }


        return blob.size;
    }


    // ======================================================
    // OBTER TAMANHO EM MB
    // ======================================================

    static getSizeMB(
        blob
    ) {

        const size =
            ExportManager.getSize(
                blob
            );


        return Number(
            (
                size /
                1024 /
                1024
            ).toFixed(2)
        );
    }


    // ======================================================
    // OBTER TIPO
    // ======================================================

    static getMimeType(
        blob
    ) {

        if (
            blob &&
            typeof blob.type ===
            "string" &&
            blob.type
        ) {

            return blob.type;
        }


        return "audio/wav";
    }


    // ======================================================
    // VERIFICAR DISPONIBILIDADE COMPLETA
    // ======================================================

    static getCapabilities() {

        const downloader =
            typeof FileDownloader !==
            "undefined";


        return {

            export:
                downloader &&
                typeof FileDownloader.deliver ===
                "function",

            download:
                downloader &&
                typeof FileDownloader.download ===
                "function",

            share:
                downloader &&
                typeof FileDownloader.shareFile ===
                "function",

            shareFile:
                downloader &&
                typeof FileDownloader.canShareFile ===
                "function"
        };
    }
        // ======================================================
    // EXPORTAÇÃO COM ARQUIVO
    // ======================================================
    //
    // Mantém uma entrada simples para futuras chamadas
    // que já possuam um File.
    // ======================================================
    
    static async exportFile(
        file
    ) {
        
        if (
            !file
        ) {
            
            return ExportManager.createFailureResult(
                new Error(
                    "Nenhum arquivo foi fornecido."
                )
            );
        }
        
        
        const fileName =
            ExportManager.normalizeFileName(
                file.name
            );
        
        
        return ExportManager.exportWav(
            file,
            fileName
        );
    }
    
    
    // ======================================================
    // LIMPEZA
    // ======================================================
    //
    // O ExportManager não mantém Object URLs.
    // Portanto, não há recursos próprios para liberar.
    // ======================================================
    
    static cleanup() {
        
        return true;
    }
    }
    
    
    // ==========================================================
    // DISPONIBILIZAÇÃO GLOBAL
    // ==========================================================
    
    window.ExportManager =
        ExportManager;