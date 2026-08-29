// ==========================================================
// PARTE 1/8
// SMOOTHVSTUDIO
// APP CONTROLLER
// ==========================================================
//
// Responsabilidade:
//
// - controlar a interface;
// - receber o arquivo escolhido;
// - solicitar a decodificação ao AudioEngine;
// - solicitar o processamento;
// - atualizar os players;
// - controlar bypass e reprocessamento;
// - solicitar a exportação;
// - solicitar compartilhamento.
//
// O processamento de áudio não pertence a este arquivo.
// A criação do WAV não pertence a este arquivo.
// A entrega do arquivo não pertence a este arquivo.
//
// ==========================================================


"use strict";


// ==========================================================
// MOTOR
// ==========================================================

const audioEngine =
    new AudioEngine();


// ==========================================================
// ELEMENTOS DA INTERFACE
// ==========================================================

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


// ==========================================================
// ESTADO DA INTERFACE
// ==========================================================

let originalURL =
    null;

let processedURL =
    null;

let currentFile =
    null;

let currentWavBlob =
    null;

let currentWavFile =
    null;

let currentOutputName =
    null;

let bypassActive =
    false;

let processing =
    false;


// ==========================================================
// FORMATAÇÃO DE TEMPO
// ==========================================================

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


    const totalSeconds =
        Math.max(
            0,
            Math.floor(
                seconds
            )
        );


    const minutes =
        Math.floor(
            totalSeconds / 60
        );


    const remainingSeconds =
        totalSeconds % 60;


    return (
        String(minutes)
            .padStart(
                2,
                "0"
            )

        +

        ":"

        +

        String(
            remainingSeconds
        ).padStart(
            2,
            "0"
        )
    );
}


// ==========================================================
// LIBERAR URL ORIGINAL
// ==========================================================

function releaseOriginalURL() {

    if (
        !originalURL
    ) {

        return;
    }


    try {

        URL.revokeObjectURL(
            originalURL
        );

    } catch (_) {}


    originalURL =
        null;
}


// ==========================================================
// LIBERAR URL PROCESSADA
// ==========================================================

function releaseProcessedURL() {

    if (
        !processedURL
    ) {

        return;
    }


    try {

        URL.revokeObjectURL(
            processedURL
        );

    } catch (_) {}


    processedURL =
        null;
}


// ==========================================================
// LIMPAR RESULTADO
// ==========================================================

function clearProcessedOutput() {

    releaseProcessedURL();


    currentWavBlob =
        null;

    currentWavFile =
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


    downloadStatus.textContent =
        "";
}


// ==========================================================
// NOME DO ARQUIVO DE SAÍDA
// ==========================================================

function createOutputName() {

    if (
        !currentFile ||
        !currentFile.name
    ) {

        return "smoothvstudio-vocal.wav";
    }


    const name =
        currentFile.name.replace(
            /\.[^/.]+$/,
            ""
        );


    return (
        `${name}-smoothvstudio.wav`
    );
}


// ==========================================================
// ATUALIZAR DURAÇÃO DO PLAYER ORIGINAL
// ==========================================================

function updateOriginalDuration() {

    originalDuration.textContent =
        formatTime(
            originalPlayer.duration
        );
}


// ==========================================================
// ATUALIZAR DURAÇÃO DO PLAYER PROCESSADO
// ==========================================================

function updateProcessedDuration() {

    processedDuration.textContent =
        formatTime(
            processedPlayer.duration
        );
}
// ==========================================================
// PARTE 2/8
// CONTROLE DOS PLAYERS
// ==========================================================


// ==========================================================
// TEMPO ATUAL — ORIGINAL
// ==========================================================

originalPlayer.addEventListener(
    "timeupdate",
    () => {

        originalCurrent.textContent =
            formatTime(
                originalPlayer.currentTime
            );
    }
);


// ==========================================================
// DURAÇÃO — ORIGINAL
// ==========================================================

originalPlayer.addEventListener(
    "loadedmetadata",
    updateOriginalDuration
);


// ==========================================================
// TEMPO ATUAL — PROCESSADO
// ==========================================================

processedPlayer.addEventListener(
    "timeupdate",
    () => {

        processedCurrent.textContent =
            formatTime(
                processedPlayer.currentTime
            );
    }
);


// ==========================================================
// DURAÇÃO — PROCESSADO
// ==========================================================

processedPlayer.addEventListener(
    "loadedmetadata",
    updateProcessedDuration
);


// ==========================================================
// RESETAR TEMPOS
// ==========================================================

function resetPlayerTimes() {

    originalCurrent.textContent =
        "00:00";

    originalDuration.textContent =
        "00:00";

    processedCurrent.textContent =
        "00:00";

    processedDuration.textContent =
        "00:00";
}


// ==========================================================
// ATUALIZAR PLAYER ORIGINAL
// ==========================================================

function loadOriginalPlayer(
    file
) {

    releaseOriginalURL();


    originalURL =
        URL.createObjectURL(
            file
        );


    originalPlayer.src =
        originalURL;

    originalPlayer.load();


    resetPlayerTimes();
}


// ==========================================================
// ATUALIZAR PLAYER PROCESSADO
// ==========================================================

function loadProcessedPlayer(
    blob
) {

    releaseProcessedURL();


    processedURL =
        URL.createObjectURL(
            blob
        );


    processedPlayer.src =
        processedURL;

    processedPlayer.load();
}


// ==========================================================
// OBTER FILE DO WAV
// ==========================================================

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


// ==========================================================
// ATUALIZAR DISPONIBILIDADE DE COMPARTILHAMENTO
// ==========================================================

function updateShareAvailability() {

    shareButton.classList.add(
        "hidden"
    );


    if (
        !currentWavBlob
    ) {

        return;
    }


    if (
        typeof FileDownloader ===
        "undefined"
    ) {

        return;
    }


    if (
        typeof FileDownloader.canShareFile !==
        "function"
    ) {

        return;
    }


    const file =
        getCurrentWavFile();


    if (
        !file
    ) {

        return;
    }


    try {

        if (
            FileDownloader.canShareFile(
                file
            )
        ) {

            shareButton.classList.remove(
                "hidden"
            );
        }

    } catch (_) {}
}


// ==========================================================
// ESTADO INICIAL
// ==========================================================

function initializeInterface() {

    processButton.disabled =
        true;

    reprocessButton.disabled =
        true;

    downloadButton.disabled =
        true;


    processedSection.classList.add(
        "hidden"
    );


    shareButton.classList.add(
        "hidden"
    );


    processingStatus.textContent =
        "Aguardando áudio.";


    downloadStatus.textContent =
        "";


    resetPlayerTimes();
}


// ==========================================================
// INICIALIZAÇÃO
// ==========================================================

initializeInterface();
// ==========================================================
// PARTE 3/8
// SELEÇÃO E CARREGAMENTO DO ÁUDIO
// ==========================================================


// ==========================================================
// SELEÇÃO DO ARQUIVO
// ==========================================================

audioFile.addEventListener(
    "change",
    async event => {
        
        const file =
            event.target.files &&
            event.target.files[0];
        
        
        if (
            !file
        ) {
            
            return;
        }
        
        
        try {
            
            processing =
                false;
            
            
            clearProcessedOutput();
            
            
            currentFile =
                file;
            
            
            currentOutputName =
                createOutputName();
            
            
            fileName.textContent =
                file.name;
            
            
            processingStatus.textContent =
                "Carregando áudio...";
            
            
            downloadStatus.textContent =
                "";
            
            
            processButton.disabled =
                true;
            
            
            reprocessButton.disabled =
                true;
            
            
            loadOriginalPlayer(
                file
            );
            
            
            await audioEngine.decodeFile(
                file
            );
            
            
            processButton.disabled =
                false;
            
            
            processingStatus.textContent =
                "Áudio carregado. Pronto para processar.";
            
            
        } catch (error) {
            
            console.error(
                "SmoothVStudio: erro ao carregar áudio.",
                error
            );
            
            
            currentFile =
                null;
            
            currentOutputName =
                null;
            
            
            releaseOriginalURL();
            
            
            originalPlayer.removeAttribute(
                "src"
            );
            
            originalPlayer.load();
            
            
            resetPlayerTimes();
            
            
            fileName.textContent =
                "Não foi possível carregar este arquivo.";
            
            
            processingStatus.textContent =
                "Erro ao decodificar o áudio.";
            
            
            processButton.disabled =
                true;
            
            
            reprocessButton.disabled =
                true;
        }
    }
);


// ==========================================================
// PROCESSAMENTO
// ==========================================================

async function processAudio() {
    
    if (
        processing
    ) {
        
        return;
    }
    
    
    if (
        !audioEngine.originalBuffer
    ) {
        
        processingStatus.textContent =
            "Nenhum áudio carregado.";
        
        return;
    }
    
    
    processing =
        true;
    
    
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
        "Processando áudio...";
    
    
    clearProcessedOutput();
    
    
    try {
        
        /*
         * O AudioEngine é responsável por
         * executar o processamento.
         *
         * O app não conhece nem implementa
         * o tratamento de áudio.
         */
        
        const processedBuffer =
            await audioEngine.process();
        
        
        if (
            !processedBuffer
        ) {
            
            throw new Error(
                "O AudioEngine não retornou um resultado."
            );
        }
        
        
        /*
         * O WavExporter é responsável
         * exclusivamente pela criação
         * e validação do WAV.
         */
        
        currentWavBlob =
            WavExporter.createBlob(
                processedBuffer
            );
        
        
        if (
            !currentWavBlob
        ) {
            
            throw new Error(
                "O WAV não foi gerado."
            );
        }
        
        
        currentOutputName =
            createOutputName();
        
        
        loadProcessedPlayer(
            currentWavBlob
        );
        
        
        processedSection.classList.remove(
            "hidden"
        );
        
        
        downloadButton.disabled =
            false;
        
        
        reprocessButton.disabled =
            false;
        
        
        bypassActive =
            false;
        
        
        bypassButton.textContent =
            "Bypass: Original";
        
        
        updateShareAvailability();
        
        
        processingStatus.textContent =
            "Processamento concluído.";
        
        
    } catch (error) {
        
        console.error(
            "SmoothVStudio: erro durante processamento.",
            error
        );
        
        
        clearProcessedOutput();
        
        
        processingStatus.textContent =
            "Erro durante o processamento.";
        
        
        reprocessButton.disabled =
            false;
    }
    
    
    processButton.disabled =
        false;
    
    
    processing =
        false;
}
// ==========================================================
// PARTE 4/8
// PROCESSAMENTO E REPROCESSAMENTO
// ==========================================================


// ==========================================================
// BOTÃO PROCESSAR
// ==========================================================

processButton.addEventListener(
    "click",
    async () => {
        
        await processAudio();
    }
);


// ==========================================================
// BOTÃO REPROCESSAR
// ==========================================================

reprocessButton.addEventListener(
    "click",
    async () => {
        
        if (
            !audioEngine.originalBuffer
        ) {
            
            processingStatus.textContent =
                "Nenhum áudio carregado.";
            
            return;
        }
        
        
        await processAudio();
    }
);


// ==========================================================
// BYPASS
// ==========================================================

bypassButton.addEventListener(
    "click",
    () => {
        
        if (
            !currentWavBlob
        ) {
            
            return;
        }
        
        
        if (
            bypassActive
        ) {
            
            processedPlayer.pause();
            
            
            processedPlayer.src =
                processedURL;
            
            
            processedPlayer.load();
            
            
            bypassActive =
                false;
            
            
            bypassButton.textContent =
                "Bypass: Original";
            
            
            return;
        }
        
        
        /*
         * O bypass não altera o áudio.
         *
         * Ele apenas alterna o player
         * entre o resultado e o original.
         */
        
        processedPlayer.pause();
        
        
        if (
            originalURL
        ) {
            
            processedPlayer.src =
                originalURL;
            
            processedPlayer.load();
        }
        
        
        bypassActive =
            true;
        
        
        bypassButton.textContent =
            "Bypass: Processado";
    }
);


// ==========================================================
// RESTAURAR RESULTADO APÓS BYPASS
// ==========================================================

processedPlayer.addEventListener(
    "ended",
    () => {
        
        if (
            bypassActive
        ) {
            
            return;
        }
    }
);


// ==========================================================
// GARANTIR QUE O PLAYER PROCESSADO
// VOLTE PARA O RESULTADO QUANDO
// O USUÁRIO DESATIVAR O BYPASS
// ==========================================================

function restoreProcessedPlayer() {
    
    if (
        !processedURL
    ) {
        
        return;
    }
    
    
    processedPlayer.pause();
    
    
    processedPlayer.src =
        processedURL;
    
    
    processedPlayer.load();
    
    
    bypassActive =
        false;
    
    
    bypassButton.textContent =
        "Bypass: Original";
}
// ==========================================================
// PARTE 5/8
// EXPORTAÇÃO
// ==========================================================


// ==========================================================
// EXPORTAR WAV
// ==========================================================

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
                "Módulo de exportação não carregado.";
            
            return;
        }
        
        
        try {
            
            downloadButton.disabled =
                true;
            
            
            downloadStatus.textContent =
                "Preparando WAV...";
            
            
            const result =
                await ExportManager.exportWav(
                    currentWavBlob,
                    currentOutputName ||
                    "smoothvstudio-vocal.wav"
                );
            
            
            if (
                result &&
                result.success
            ) {
                
                switch (
                    result.method
                ) {
                    
                    case "file-system-access":
                        
                        downloadStatus.textContent =
                            "WAV salvo com sucesso.";
                        
                        break;
                        
                        
                    case "anchor-download":
                        
                        downloadStatus.textContent =
                            "Download solicitado.";
                        
                        break;
                        
                        
                    case "blob-navigation":
                        
                        downloadStatus.textContent =
                            "O WAV foi aberto pelo navegador.";
                        
                        break;
                        
                        
                    default:
                        
                        downloadStatus.textContent =
                            "Exportação iniciada.";
                        
                        break;
                }
                
                
            } else {
                
                downloadStatus.textContent =
                    "Não foi possível exportar o WAV.";
            }
            
            
        } catch (error) {
            
            console.error(
                "SmoothVStudio: erro na exportação.",
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


// ==========================================================
// COMPARTILHAR WAV
// ==========================================================

shareButton.addEventListener(
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
            typeof FileDownloader ===
            "undefined"
        ) {
            
            downloadStatus.textContent =
                "Módulo de compartilhamento não carregado.";
            
            return;
        }
        
        
        if (
            typeof FileDownloader.shareFile !==
            "function"
        ) {
            
            downloadStatus.textContent =
                "Compartilhamento não disponível.";
            
            return;
        }
        
        
        const file =
            getCurrentWavFile();
        
        
        if (
            !file
        ) {
            
            downloadStatus.textContent =
                "Não foi possível preparar o WAV.";
            
            return;
        }
        
        
        try {
            
            shareButton.disabled =
                true;
            
            
            downloadStatus.textContent =
                "Abrindo compartilhamento...";
            
            
            await FileDownloader.shareFile(
                file
            );
            
            
            downloadStatus.textContent =
                "Compartilhamento concluído.";
            
            
        } catch (error) {
            
            console.error(
                "SmoothVStudio: erro no compartilhamento.",
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
                    "Não foi possível compartilhar o WAV.";
            }
            
        } finally {
            
            shareButton.disabled =
                false;
        }
    }
);
// ==========================================================
// PARTE 6/8
// LIMPEZA E NOVO ARQUIVO
// ==========================================================


// ==========================================================
// LIMPAR ESTADO COMPLETO
// ==========================================================

function resetApplicationState() {

    processing =
        false;


    clearProcessedOutput();


    releaseOriginalURL();


    currentFile =
        null;


    currentOutputName =
        null;


    originalPlayer.pause();

    originalPlayer.removeAttribute(
        "src"
    );

    originalPlayer.load();


    resetPlayerTimes();


    fileName.textContent =
        "Nenhum arquivo selecionado.";


    processingStatus.textContent =
        "Aguardando áudio.";


    downloadStatus.textContent =
        "";


    processButton.disabled =
        true;


    reprocessButton.disabled =
        true;
}


// ==========================================================
// LIMPAR RESULTADO QUANDO UM NOVO
// ARQUIVO FOR ESCOLHIDO
// ==========================================================
//
// A função já é utilizada no evento
// change do input.
//
// Mantemos uma função separada para
// que o ciclo de vida permaneça claro.
// ==========================================================

function prepareForNewFile() {

    clearProcessedOutput();

    releaseOriginalURL();

    resetPlayerTimes();
}


// ==========================================================
// EVITAR RESULTADO ANTIGO
// ==========================================================
//
// O arquivo atualmente carregado
// sempre representa a origem.
//
// O resultado anterior nunca deve
// ser reutilizado como nova origem.
// ==========================================================

function ensureOriginalSource() {

    if (
        !audioEngine.originalBuffer
    ) {

        throw new Error(
            "Áudio original indisponível."
        );
    }


    return (
        audioEngine.originalBuffer
    );
}


// ==========================================================
// EXPOSIÇÃO MÍNIMA DE ESTADO
// ==========================================================
//
// Útil para diagnóstico futuro sem
// expor objetos internos desnecessários.
// ==========================================================

function getApplicationState() {

    return {

        hasFile:
            Boolean(
                currentFile
            ),

        hasOriginalBuffer:
            Boolean(
                audioEngine.originalBuffer
            ),

        hasProcessedOutput:
            Boolean(
                currentWavBlob
            ),

        bypassActive:
            bypassActive,

        processing:
            processing
    };
}


// ==========================================================
// DISPONIBILIZAR DIAGNÓSTICO
// ==========================================================

window.SmoothVStudioApp =
    {

        getState:
            getApplicationState

    };
    // ==========================================================
// PARTE 7/8
// SEGURANÇA DE CICLO DE VIDA
// ==========================================================


// ==========================================================
// LIMPEZA AO SAIR DA PÁGINA
// ==========================================================

window.addEventListener(
    "pagehide",
    () => {
        
        releaseOriginalURL();
        
        releaseProcessedURL();
    }
);


// ==========================================================
// LIMPEZA ANTES DE DESCARREGAR
// ==========================================================

window.addEventListener(
    "beforeunload",
    () => {
        
        releaseOriginalURL();
        
        releaseProcessedURL();
    }
);


// ==========================================================
// PROTEÇÃO CONTRA ARQUIVO INVÁLIDO
// ==========================================================

audioFile.addEventListener(
    "cancel",
    () => {
        
        /*
         * Cancelar o seletor não altera
         * o áudio atualmente carregado.
         */
    }
);


// ==========================================================
// VERIFICAÇÃO BÁSICA DOS ELEMENTOS
// ==========================================================

const requiredElements = [
    
    audioFile,
    fileName,
    originalPlayer,
    processedPlayer,
    processButton,
    processingStatus,
    processedSection,
    bypassButton,
    reprocessButton,
    downloadButton,
    shareButton,
    downloadStatus,
    originalCurrent,
    originalDuration,
    processedCurrent,
    processedDuration
    
];


for (
    const element of
        requiredElements
) {
    
    if (
        !element
    ) {
        
        console.error(
            "SmoothVStudio: elemento da interface não encontrado."
        );
        
        break;
    }
}


// ==========================================================
// VERIFICAÇÃO DOS MÓDULOS
// ==========================================================

if (
    typeof AudioEngine ===
    "undefined"
) {
    
    processButton.disabled =
        true;
    
    
    processingStatus.textContent =
        "Motor de áudio indisponível.";
}


if (
    typeof WavExporter ===
    "undefined"
) {
    
    downloadButton.disabled =
        true;
}


// ==========================================================
// FIM DA INICIALIZAÇÃO
// ==========================================================

processingStatus.textContent =
    "Aguardando áudio.";
    // ==========================================================
// PARTE 8/8
// NOTAS DE ARQUITETURA
// ==========================================================
//
// Este arquivo deliberadamente NÃO contém:
//
// - Analyzer;
// - Sibilance;
// - Harshness;
// - Dynamics;
// - Tone;
// - Body;
// - Saturation;
// - Decision Pipeline;
// - Treatment Plan;
// - bridges de DSP;
// - presets;
// - inteligência;
// - machine learning.
//
// O controlador somente coordena a interface
// e chama os módulos responsáveis.
//
// Responsabilidades:
//
// AudioEngine
//     ↓
// áudio / processamento
//
// WavExporter
//     ↓
// criação e validação WAV
//
// ExportManager
//     ↓
// coordenação da exportação
//
// FileDownloader
//     ↓
// download / compartilhamento
//
// app.js
//     ↓
// interface e fluxo
//
// ==========================================================
//
// O reprocessamento sempre solicita ao
// AudioEngine uma nova execução a partir
// do áudio original.
//
// Nenhum resultado processado é utilizado
// como nova origem.
//
// ==========================================================
//
// O bypass pertence à apresentação:
//
// ele alterna o que o usuário escuta
// entre o original e o resultado.
//
// Ele não altera o processamento.
//
// ==========================================================