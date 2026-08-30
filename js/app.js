"use strict";


const audioEngine =
    new AudioEngine();


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
function updateOriginalDuration() {

    originalDuration.textContent =
        formatTime(
            originalPlayer.duration
        );
}


function updateProcessedDuration() {

    processedDuration.textContent =
        formatTime(
            processedPlayer.duration
        );
}


originalPlayer.addEventListener(
    "timeupdate",
    () => {

        originalCurrent.textContent =
            formatTime(
                originalPlayer.currentTime
            );
    }
);


originalPlayer.addEventListener(
    "loadedmetadata",
    updateOriginalDuration
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


processedPlayer.addEventListener(
    "loadedmetadata",
    updateProcessedDuration
);


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


initializeInterface();
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
        
        const processedBuffer =
            await audioEngine.process();
        
        
        if (
            !processedBuffer
        ) {
            
            throw new Error(
                "O AudioEngine não retornou um resultado."
            );
        }
        
        
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
processButton.addEventListener(
    "click",
    async () => {
        
        await processAudio();
    }
);


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
                "Preparando WAV.";
            
            
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
                
                if (
                    result.method ===
                    "share"
                ) {
                    
                    downloadStatus.textContent =
                        "Compartilhamento iniciado.";
                    
                } else {
                    
                    downloadStatus.textContent =
                        "Download solicitado.";
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


window.SmoothVStudioApp =
    {

        getState:
            getApplicationState

    };
    window.addEventListener(
    "pagehide",
    () => {
        
        releaseOriginalURL();
        
        releaseProcessedURL();
    }
);


window.addEventListener(
    "beforeunload",
    () => {
        
        releaseOriginalURL();
        
        releaseProcessedURL();
    }
);


audioFile.addEventListener(
    "cancel",
    () => {
        
    }
);


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


processingStatus.textContent =
    "Aguardando áudio.";