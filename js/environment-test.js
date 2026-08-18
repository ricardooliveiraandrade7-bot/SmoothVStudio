// ==========================================
// SMOOTHVSTUDIO
// ENVIRONMENT TEST
// V0.2
// ==========================================
//
// Diagnóstico do ambiente do Spck Android.
//
// Este módulo NÃO aparece automaticamente
// na interface normal do aplicativo.
//
// O diagnóstico pode ser executado pelo
// console quando necessário.
//
// ==========================================

(function () {

    "use strict";


    // ======================================
    // FUNÇÃO DE SUPORTE
    // ======================================

    function support(value) {

        return value
            ? "SIM"
            : "NÃO";

    }


    // ======================================
    // TESTAR BLOB URL
    // ======================================

    let blobUrlSupport =
        false;


    try {

        const testBlob =
            new Blob(
                ["SmoothVStudio"],
                {
                    type:
                        "text/plain"
                }
            );


        const testUrl =
            URL.createObjectURL(
                testBlob
            );


        blobUrlSupport =
            testUrl.startsWith(
                "blob:"
            );


        URL.revokeObjectURL(
            testUrl
        );


    } catch (error) {

        blobUrlSupport =
            false;

    }


    // ======================================
    // DOWNLOAD ATTRIBUTE
    // ======================================

    let downloadAttribute =
        false;


    try {

        const anchor =
            document.createElement(
                "a"
            );


        downloadAttribute =
            "download" in anchor;


    } catch (error) {

        downloadAttribute =
            false;

    }


    // ======================================
    // FILE SYSTEM ACCESS API
    // ======================================

    const fileSystemAccess =
        typeof window.showSaveFilePicker ===
        "function";


    // ======================================
    // WEB SHARE
    // ======================================

    const webShare =
        typeof navigator.share ===
        "function";


    // ======================================
    // CAN SHARE
    // ======================================

    const canShare =
        typeof navigator.canShare ===
        "function";


    // ======================================
    // INDEXED DB
    // ======================================

    const indexedDBSupport =
        typeof window.indexedDB !==
        "undefined";


    // ======================================
    // WEB AUDIO
    // ======================================

    const webAudio =
        typeof window.AudioContext ===
            "function" ||

        typeof window.webkitAudioContext ===
            "function";


    // ======================================
    // OFFLINE AUDIO
    // ======================================

    const offlineAudio =
        typeof window.OfflineAudioContext ===
            "function" ||

        typeof window.webkitOfflineAudioContext ===
            "function";


    // ======================================
    // FILE API
    // ======================================

    const fileAPI =
        typeof window.File ===
        "function";


    // ======================================
    // BLOB API
    // ======================================

    const blobAPI =
        typeof window.Blob ===
        "function";


    // ======================================
    // ARRAY BUFFER
    // ======================================

    const arrayBufferAPI =
        typeof window.ArrayBuffer ===
        "function";


    // ======================================
    // OBJECT URL
    // ======================================

    const objectURLAPI =
        typeof URL !== "undefined" &&
        typeof URL.createObjectURL ===
        "function";


    // ======================================
    // CLIPBOARD
    // ======================================

    const clipboardAPI =
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
        "function";


    // ======================================
    // INFORMAÇÕES DO AMBIENTE
    // ======================================

    const environment = {

        userAgent:
            navigator.userAgent,

        platform:
            navigator.platform,

        language:
            navigator.language,

        online:
            navigator.onLine,

        url:
            window.location.href,

        origin:
            window.location.origin,

        protocol:
            window.location.protocol,

        hostname:
            window.location.hostname,

        isSecureContext:
            window.isSecureContext,

        documentVisibility:
            document.visibilityState,

        webViewHint:
            /wv/i.test(
                navigator.userAgent
            ),

        android:
            /Android/i.test(
                navigator.userAgent
            )

    };


    // ======================================
    // RESULTADOS
    // ======================================

    const results = {

        "Blob API":
            support(blobAPI),

        "File API":
            support(fileAPI),

        "ArrayBuffer":
            support(arrayBufferAPI),

        "URL.createObjectURL":
            support(objectURLAPI),

        "blob: URL":
            support(blobUrlSupport),

        "HTML download attribute":
            support(downloadAttribute),

        "File System Access API":
            support(fileSystemAccess),

        "showSaveFilePicker":
            support(fileSystemAccess),

        "Web Share":
            support(webShare),

        "navigator.canShare":
            support(canShare),

        "IndexedDB":
            support(indexedDBSupport),

        "Web Audio API":
            support(webAudio),

        "OfflineAudioContext":
            support(offlineAudio),

        "Clipboard":
            support(clipboardAPI)

    };


    // ======================================
    // GERAR RELATÓRIO
    // ======================================

    let report =
        "SMOOTHVSTUDIO - DIAGNÓSTICO\n";

    report +=
        "================================\n\n";


    report +=
        "CAPACIDADES:\n\n";


    Object.keys(
        results
    ).forEach(
        key => {

            report +=
                key +
                ": " +
                results[key] +
                "\n";

        }
    );


    report +=
        "\n\nAMBIENTE:\n\n";


    Object.keys(
        environment
    ).forEach(
        key => {

            report +=
                key +
                ": " +
                environment[key] +
                "\n";

        }
    );


    report +=
        "\n\n================================\n";

    report +=
        "FIM DO DIAGNÓSTICO\n";


    // ======================================
    // DISPONIBILIZAR PARA TESTES
    // ======================================

    window.SmoothVStudioEnvironment = {

        results:
            results,

        environment:
            environment,

        report:
            report

    };


    // ======================================
    // CONSOLE
    // ======================================

    console.log(
        "=================================="
    );

    console.log(
        "SMOOTHVSTUDIO ENVIRONMENT TEST"
    );

    console.log(
        "=================================="
    );

    console.table(
        results
    );

    console.log(
        environment
    );

    console.log(
        report
    );


    // ======================================
    // IMPORTANTE
    // ======================================
    //
    // V0.2 NÃO cria painel visual.
    //
    // O aplicativo volta a abrir normalmente.
    //
    // O diagnóstico continua disponível
    // através de:
    //
    // window.SmoothVStudioEnvironment
    //
    // ======================================


})();