// ==========================================
// SMOOTHVSTUDIO
// APP CONTROLLER
// V0.2
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
// A entrega do arquivo passa pelo
// ExportManager.
//
// V0.2:
//
// - ciclo de vida de memória mais controlado;
// - File de compartilhamento criado sob demanda;
// - limpeza centralizada de Object URLs;
// - limpeza de resultados anteriores;
// - preservação do processamento original.
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


let currentOutputName =
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
// LIBERAR URL ORIGINAL
// ==========================================

function releaseOriginalURL() {

    if (
        originalURL
    ) {

        try {

            URL.revokeObjectURL(
                originalURL
            );

        } catch (_) {}


        originalURL =
            null;
    }
}


// ==========================================
// LIBERAR URL PROCESSADA
// ==========================================

function releaseProcessedURL() {

    if (
        processedURL
    ) {

        try {

            URL.revokeObjectURL(
                processedURL
            );

        } catch (_) {}


        processedURL =
            null;
    }
}


// ==========================================
// LIMPAR RESULTADO PROCESSADO
// ==========================================
//
// Esta função centraliza a liberação dos
// objetos relacionados ao resultado.
//
// O Blob é mantido somente enquanto o
// resultado ainda for necessário.
// ==========================================

function clearProcessedOutput() {

    releaseProcessedURL();


    currentWavFile =
        null;


    currentWavBlob =
        null;


    currentOutputName =
        null;


    bypassActive =
        false;


    processedPlayer.pause();


    processedPlayer.removeAttribute(
        "src"
    );


    processedPlayer.load();


    processedSection.classList.add(
        "hidden"
    );


    downloadButton.disabled =
        true;


    shareButton.classList.add(
        "hidden"
    );


    bypassButton.textContent =
        "Bypass: Original";
}


// ==========================================
// GERAR NOME DO WAV
// ==========================================

function createOutputName() {

    if (
        !currentFile
    ) {

        return "smoothvstudio-vocal.wav";
    }


    const originalName =
        currentFile.name;


    const withoutExtension =
        originalName.replace(
            /\.[^/.]+$/,
            ""
        );


    return (
        `${withoutExtension}-smoothvstudio.wav`
    );
}


// ==========================================
// CRIAR FILE PARA COMPARTILHAMENTO
// ==========================================
//
// O File não é mantido permanentemente.
//
// Ele só é criado quando o usuário realmente
// solicita o compartilhamento.
// ==========================================

function getCurrentWavFile() {

    if (
        !currentWavBlob
    ) {

        return null;
    }


    if (
        currentWavFile
    ) {

        return currentWavFile;
    }


    if (
        !currentOutputName
    ) {

        currentOutputName =
            createOutputName();
    }


    currentWavFile =
        new File(
            [
                currentWavBlob
            ],
            currentOutputName,
            {
                type:
                    "audio/wav"
            }
        );


    return currentWavFile;
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

            // ==============================
            // LIMPAR RESULTADO ANTERIOR
            // ==============================

            clearProcessedOutput();


            // ==============================
            // ATUALIZAR ARQUIVO ATUAL
            // ==============================

            currentFile =
                file;


            fileName.textContent =
                file.name;


            processingStatus.textContent =
                "Carregando áudio...";


            downloadStatus.textContent =
                "";


            processButton.disabled =
                true;


            // ==============================
            // LIMPAR URL ORIGINAL ANTERIOR
            // ==============================

            releaseOriginalURL();


            // ==============================
            // CRIAR URL ORIGINAL
            // ==============================

            originalURL =
                URL.createObjectURL(
                    file
                );


            originalPlayer.src =
                originalURL;


            originalPlayer.load();


            // ==============================
            // DECODIFICAR
            // ==============================

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

        // ==============================
        // BLOQUEAR CONTROLES
        // ==============================

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


        // ==============================
        // LIBERAR RESULTADO ANTERIOR
        // ==============================

        clearProcessedOutput();


        // ==============================
        // DAR AO NAVEGADOR UM PEQUENO
        // INTERVALO ANTES DO PROCESSAMENTO
        // ==============================

        await new Promise(
            resolve => {

                setTimeout(
                    resolve,
                    30
                );

            }
        );


        // ==============================
        // PROCESSAR SEMPRE A PARTIR
        // DO ORIGINAL
        // ==============================

        const processedBuffer =
            await audioEngine.process();


        // ==============================
        // CRIAR WAV SOMENTE DEPOIS
        // DO PROCESSAMENTO
        // ==============================

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


        // ==============================
        // DEFINIR NOME SEM CRIAR FILE
        // ==============================

        currentOutputName =
            createOutputName();


        // ==============================
        // CRIAR URL PARA O PLAYER
        // ==============================

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


        // ==============================
        // HABILITAR CONTROLES
        // ==============================

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


        // ==============================
        // COMPARTILHAMENTO
        // ==============================
        //
        // O File só será criado se a
        // função de compartilhamento
        // precisar dele.
        //
        // Para testar disponibilidade,
        // criamos temporariamente o File.
        // Se não for compartilhável,
        // liberamos a referência.
        // ==============================

        if (
            typeof FileDownloader !==
            "undefined" &&

            FileDownloader.canShareFile
        ) {

            const shareFile =
                getCurrentWavFile();


            if (
                FileDownloader.canShareFile(
                    shareFile
                )
            ) {

                shareButton.classList.remove(
                    "hidden"
                );

            } else {

                currentWavFile =
                    null;
            }
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


// ==========================================
// BOTÃO PROCESSAR
// ==========================================

processButton.addEventListener(
    "click",
    processAudio
);


// ==========================================
// BOTÃO REPROCESSAR
// ==========================================

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
                    currentOutputName ||
                    "smoothvstudio-vocal.wav"
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

        /*
         * Criar o File somente agora.
         */

        const wavFile =
            getCurrentWavFile();


        if (
            !wavFile
        ) {

            downloadStatus.textContent =
                "Nenhum WAV processado disponível.";

            return;

        }


        if (
            typeof FileDownloader ===
            "undefined"
        ) {

            downloadStatus.textContent =
                "Módulo de compartilhamento não carregado.";

            return;

        }


        try {

            downloadStatus.textContent =
                "Abrindo compartilhamento do Android...";


            await FileDownloader.shareFile(
                wavFile
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
// LIMPEZA AO SAIR
// ==========================================

window.addEventListener(
    "beforeunload",
    () => {

        releaseOriginalURL();

        releaseProcessedURL();

        currentFile =
            null;

        currentWavFile =
            null;

        currentWavBlob =
            null;

        currentOutputName =
            null;

    }
);