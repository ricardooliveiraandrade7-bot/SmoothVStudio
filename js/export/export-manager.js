"use strict";


class ExportManager {


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


        return {

            blob,

            fileName:
                ExportManager.normalizeFileName(
                    fileName
                )
        };
    }


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


    static canExport() {

        return (
            typeof FileDownloader !==
            "undefined" &&

            typeof FileDownloader.deliver ===
            "function"
        );
    }


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
        static validateWav(
        blob
    ) {

        if (
            typeof WavExporter !==
            "undefined" &&
            typeof WavExporter.validateBlob ===
            "function"
        ) {

            WavExporter.validateBlob(
                blob
            );
        }


        ExportManager.validateExport(
            blob,
            "smoothvstudio-vocal.wav"
        );


        return true;
    }


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

                return {

                    ...info,

                    wav:
                        WavExporter.getWavInfo(
                            blob
                        )
                };

            } catch (_) {

                return info;
            }
        }


        return info;
    }


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
                    "failed",

                error:
                    normalizedError
            };
        }
    }


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
}


window.ExportManager =
    ExportManager;