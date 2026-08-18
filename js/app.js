// ==========================================
// SMOOTHVSTUDIO
// APP CONTROLLER
// V0.1
// ==========================================
//
// Controlador principal da interface.
//
// O processamento de áudio permanece no
// AudioEngine.
//
// A criação do WAV permanece no
// WavExporter.
//
// A entrega do arquivo agora passa pelo
// ExportManager.
//
// ==========================================


// ==========================================
// MOTOR DE ÁUDIO
// ==========================================

const audioEngine =
    new AudioEngine();


// ==========================================
// ELEMENTOS DA INTERFACE
// ==========================================

const audioFile =
    document.getElementById(
        "audioFile"
    );


const fileName =
    document.getElementById(
        "fileName"
    );


const originalPlayer =
    document.getElementById(
        "originalPlayer"
    );


const processedPlayer =
    document.getElementById(
        "processedPlayer"
    );


const processButton =
    document.getElementById(
        "processButton"
    );


const processingStatus =
    document.getElementById(
        "processingStatus"
    );


const processedSection =
    document.getElementById(
        "processedSection"
    );


const bypassButton =
    document.getElementById(
        "bypassButton"
    );


const reprocessButton =
    document.getElementById(
        "reprocessButton"
    );


const downloadButton =
    document.getElementById(
        "downloadButton"
    );


const shareButton =
    document.getElementById(
        "shareButton"
    );


const downloadStatus =
    document.getElementById(
        "downloadStatus"
    );


const originalCurrent =
    document.getElementById(
        "originalCurrent"
    );


const originalDuration =
    document.getElementById(
        "originalDuration"
    );


const processedCurrent =
    document.getElementById(
        "processedCurrent"
    );


const processedDuration =
    document.getElementById(
        "processedDuration"
    );


// ==========================================
// ESTADO
// ==========================================

let originalURL =
    null;


let processedURL =
    null;


let currentFile =
    null;


let currentWavFile =
    null;


let currentWavBlob =
    null;


let bypassActive =
    false;


// ==========================================
// FORMATAR TEMPO
// ==========================================

function formatTime(
    seconds
) {

    if (
        !Number.isFinite(
            seconds
        )
    ) {

        return "00:00";

    }


    const minutes =
        Math.floor(
            seconds / 60
        );


    const secs =
        Math.floor(
            seconds % 60
        );


    return (

        String(minutes)
            .padStart(
                2,
                "0"
            )

        +

        ":"

        +

        String(secs)
            .padStart(
                2,
                "0"
            )

    );

}


// ==========================================
// SELEÇÃO DO ARQUIVO
// ==========================================

audioFile.addEventListener(
    "change",
    async event => {

        const file =
            event.target.files &&
            event.target.files[0];


        if (!file) {

            return;

        }


        try {

            currentFile =
                file;


            currentWavFile =
                null;


            currentWavBlob =
                null;


            fileName.textContent =
                file.name;


            processingStatus.textContent =
                "Carregando áudio...";


            downloadStatus.textContent =
                "";


            processButton.disabled =
                true;


            downloadButton.disabled =
                true;


            shareButton.classList.add(
                "hidden"
            );


            processedSection.classList.add(
                "hidden"
            );


            processedPlayer.pause();


            processedPlayer.removeAttribute(
                "src"
            );


            processedPlayer.load();


            if (
                processedURL
            ) {

                URL.revokeObjectURL(
                    processedURL
                );


                processedURL =
                    null;

            }


            if (
                originalURL
            ) {

                URL.revokeObjectURL(
                    originalURL
                );

            }


            originalURL =
                URL.createObjectURL(
                    file
                );


            originalPlayer.src =
                originalURL;


            originalPlayer.load();


            await audioEngine.decodeFile(
                file
            );


            processButton.disabled =
                false;


            processingStatus.textContent =
                "Áudio carregado. Pronto para processar.";

        } catch (error) {

            console.error(
                "Erro ao carregar áudio:",
                error
            );


            fileName.textContent =
                "Não foi possível carregar este arquivo.";


            processingStatus.textContent =
                "Erro ao decodificar o áudio.";


            processButton.disabled =
                true;

        }

    }
);


// ==========================================
// PROCESSAMENTO
// ==========================================

async function processAudio() {

    if (
        !audioEngine.originalBuffer
    ) {

        processingStatus.textContent =
            "Nenhum áudio carregado.";

        return;

    }


    try {

        processButton.disabled =
            true;


        reprocessButton.disabled =
            true;


        downloadButton.disabled =
            true;


        shareButton.classList.add(
            "hidden"
        );


        downloadStatus.textContent =
            "";


        processingStatus.textContent =
            "Processando offline...";


        await new Promise(
            resolve => {

                setTimeout(
                    resolve,
                    30
                );

            }
        );


        const processedBuffer =
            await audioEngine.process();


        /*
         * Criamos o WAV somente depois
         * do processamento.
         */

        currentWavBlob =
            WavExporter.createBlob(
                processedBuffer
            );


        if (
            !currentWavBlob ||
            currentWavBlob.size <= 0
        ) {

            throw new Error(
                "O WAV processado foi gerado vazio."
            );

        }


        let outputName =
            "smoothvstudio-vocal.wav";


        if (
            currentFile
        ) {

            const originalName =
                currentFile.name;


            const withoutExtension =
                originalName.replace(
                    /\.[^/.]+$/,
                    ""
                );


            outputName =
                `${withoutExtension}-smoothvstudio.wav`;

        }


        currentWavFile =
            new File(
                [
                    currentWavBlob
                ],
                outputName,
                {
                    type:
                        "audio/wav"
                }
            );


        if (
            processedURL
        ) {

            URL.revokeObjectURL(
                processedURL
            );

        }


        processedURL =
            URL.createObjectURL(
                currentWavBlob
            );


        processedPlayer.src =
            processedURL;


        processedPlayer.load();


        processedSection.classList.remove(
            "hidden"
        );


        downloadButton.disabled =
            false;


        reprocessButton.disabled =
            false;


        processButton.disabled =
            false;


        bypassActive =
            false;


        bypassButton.textContent =
            "Bypass: Original";


        /*
         * O compartilhamento nativo continua
         * disponível somente se o ambiente
         * realmente fornecer a API.
         */

        if (
            typeof FileDownloader !==
            "undefined" &&

            FileDownloader.canShareFile &&

            FileDownloader.canShareFile(
                currentWavFile
            )
        ) {

            shareButton.classList.remove(
                "hidden"
            );

        }


        processingStatus.textContent =
            "Processamento concluído.";

    } catch (error) {

        console.error(
            "Erro durante processamento:",
            error
        );


        processingStatus.textContent =
            "Erro durante o processamento.";


        processButton.disabled =
            false;


        reprocessButton.disabled =
            false;

    }

}


processButton.addEventListener(
    "click",
    processAudio
);


reprocessButton.addEventListener(
    "click",
    processAudio
);


// ==========================================
// EXPORTAÇÃO WAV
// ==========================================

downloadButton.addEventListener(
    "click",
    async () => {

        if (
            !currentWavBlob
        ) {

            downloadStatus.textContent =
                "Nenhum WAV processado disponível.";

            return;

        }


        if (
            typeof ExportManager ===
            "undefined"
        ) {

            downloadStatus.textContent =
                "Erro: módulo de exportação não carregado.";

            return;

        }


        try {

            downloadButton.disabled =
                true;


            downloadStatus.textContent =
                "Preparando WAV 24-bit...";


            const result =
                await ExportManager.exportWav(
                    currentWavBlob,
                    currentWavFile.name
                );


            console.log(
                "Resultado da exportação:",
                result
            );


            if (
                result &&
                result.success
            ) {

                if (
                    result.method ===
                    "file-system-access"
                ) {

                    downloadStatus.textContent =
                        "WAV salvo com sucesso.";

                } else if (
                    result.method ===
                    "anchor-download"
                ) {

                    downloadStatus.textContent =
                        "Download solicitado. Verifique os arquivos do Android.";

                } else if (
                    result.method ===
                    "blob-navigation"
                ) {

                    downloadStatus.textContent =
                        "O WAV foi aberto pelo ambiente de preview.";

                } else {

                    downloadStatus.textContent =
                        "Exportação iniciada.";

                }

            } else {

                downloadStatus.textContent =
                    "Não foi possível exportar o WAV.";

            }

        } catch (error) {

            console.error(
                "Erro durante exportação:",
                error
            );


            if (
                error &&
                error.name ===
                "AbortError"
            ) {

                downloadStatus.textContent =
                    "Salvamento cancelado.";

            } else {

                downloadStatus.textContent =
                    "Erro ao salvar o WAV.";

            }

        } finally {

            downloadButton.disabled =
                false;

        }

    }
);


// ==========================================
// COMPARTILHAMENTO
// ==========================================

shareButton.addEventListener(
    "click",
    async () => {

        if (
            !currentWavFile
        ) {

            return;

        }


        try {

            downloadStatus.textContent =
                "Abrindo compartilhamento do Android...";


            await FileDownloader.shareFile(
                currentWavFile
            );


            downloadStatus.textContent =
                "Arquivo enviado ao compartilhamento do Android.";

        } catch (error) {

            console.error(
                "Erro no compartilhamento:",
                error
            );


            if (
                error &&
                error.name ===
                "AbortError"
            ) {

                downloadStatus.textContent =
                    "Compartilhamento cancelado.";

            } else {

                downloadStatus.textContent =
                    "Não foi possível abrir o compartilhamento.";

            }

        }

    }
);


// ==========================================
// BYPASS
// ==========================================

bypassButton.addEventListener(
    "click",
    () => {

        if (
            !audioEngine.originalBuffer ||
            !audioEngine.processedBuffer
        ) {

            return;

        }


        const wasPlaying =
            !processedPlayer.paused;


        const currentTime =
            processedPlayer.currentTime;


        bypassActive =
            !bypassActive;


        if (
            bypassActive
        ) {

            processedPlayer.src =
                originalURL;


            processedPlayer.load();


            processedPlayer.currentTime =
                Math.min(
                    currentTime,
                    processedPlayer.duration ||
                    currentTime
                );


            bypassButton.textContent =
                "Bypass: Processado";

        } else {

            processedPlayer.src =
                processedURL;


            processedPlayer.load();


            processedPlayer.currentTime =
                Math.min(
                    currentTime,
                    processedPlayer.duration ||
                    currentTime
                );


            bypassButton.textContent =
                "Bypass: Original";

        }


        if (
            wasPlaying
        ) {

            processedPlayer
                .play()
                .catch(
                    () => {}
                );

        }

    }
);


// ==========================================
// PLAYER ORIGINAL
// ==========================================

originalPlayer.addEventListener(
    "loadedmetadata",
    () => {

        originalDuration.textContent =
            formatTime(
                originalPlayer.duration
            );

    }
);


originalPlayer.addEventListener(
    "timeupdate",
    () => {

        originalCurrent.textContent =
            formatTime(
                originalPlayer.currentTime
            );

    }
);


// ==========================================
// PLAYER PROCESSADO
// ==========================================

processedPlayer.addEventListener(
    "loadedmetadata",
    () => {

        processedDuration.textContent =
            formatTime(
                processedPlayer.duration
            );

    }
);


processedPlayer.addEventListener(
    "timeupdate",
    () => {

        processedCurrent.textContent =
            formatTime(
                processedPlayer.currentTime
            );

    }
);


// ==========================================
// LIMPEZA
// ==========================================

window.addEventListener(
    "beforeunload",
    () => {

        if (
            originalURL
        ) {

            URL.revokeObjectURL(
                originalURL
            );

        }


        if (
            processedURL
        ) {

            URL.revokeObjectURL(
                processedURL
            );

        }

    }
);