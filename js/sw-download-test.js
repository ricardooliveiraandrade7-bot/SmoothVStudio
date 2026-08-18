// ==========================================
// SMOOTHVSTUDIO
// SERVICE WORKER DOWNLOAD TEST
// V0.1
// ==========================================


class SWDownloadTest {


    static serviceWorkerPath =
        "js/download-service-worker.js";


    static downloadPath =
        "/smoothvstudio-download.wav";


    // ======================================
    // INTERFACE
    // ======================================

    static createInterface() {

        document.body.innerHTML =
            "";


        const container =
            document.createElement(
                "div"
            );


        container.style.minHeight =
            "100vh";


        container.style.padding =
            "20px";


        container.style.background =
            "#101216";


        container.style.color =
            "#f1f1f1";


        container.style.fontFamily =
            "Arial, Helvetica, sans-serif";


        const title =
            document.createElement(
                "h1"
            );


        title.textContent =
            "SmoothVStudio — Teste de Download";


        title.style.fontSize =
            "22px";


        title.style.marginBottom =
            "12px";


        const description =
            document.createElement(
                "p"
            );


        description.textContent =
            "Este teste verifica se o WebView do Spck aceita um download produzido pelo Service Worker.";


        description.style.color =
            "#aeb5bf";


        description.style.lineHeight =
            "1.5";


        description.style.marginBottom =
            "20px";


        const button =
            document.createElement(
                "button"
            );


        button.textContent =
            "TESTAR DOWNLOAD";


        button.style.width =
            "100%";


        button.style.minHeight =
            "52px";


        button.style.border =
            "none";


        button.style.borderRadius =
            "10px";


        button.style.background =
            "#d9d9d9";


        button.style.color =
            "#111";


        button.style.fontSize =
            "15px";


        button.style.fontWeight =
            "700";


        button.addEventListener(
            "click",
            async () => {

                button.disabled =
                    true;


                button.textContent =
                    "PREPARANDO...";


                status.textContent =
                    "Iniciando teste...";


                try {

                    const result =
                        await this.test();


                    status.textContent =
                        result;

                } catch (error) {

                    console.error(
                        error
                    );


                    status.textContent =
                        "ERRO\n\n" +

                        "Nome:\n" +

                        (
                            error.name ||
                            "desconhecido"
                        ) +

                        "\n\nMensagem:\n" +

                        (
                            error.message ||
                            String(error)
                        );

                }


                button.disabled =
                    false;


                button.textContent =
                    "TESTAR NOVAMENTE";

            }
        );


        const status =
            document.createElement(
                "pre"
            );


        status.style.marginTop =
            "20px";


        status.style.padding =
            "15px";


        status.style.background =
            "#1c2026";


        status.style.borderRadius =
            "10px";


        status.style.whiteSpace =
            "pre-wrap";


        status.style.wordBreak =
            "break-word";


        status.style.lineHeight =
            "1.5";


        status.textContent =
            "Aguardando teste.";


        container.appendChild(
            title
        );


        container.appendChild(
            description
        );


        container.appendChild(
            button
        );


        container.appendChild(
            status
        );


        document.body.appendChild(
            container
        );

    }


    // ======================================
    // REGISTRAR SERVICE WORKER
    // ======================================

    static async register() {

        if (
            !("serviceWorker" in navigator)
        ) {

            throw new Error(
                "Service Worker não está disponível."
            );

        }


        const registration =
            await navigator.serviceWorker.register(
                this.serviceWorkerPath,
                {
                    scope:
                        "./"
                }
            );


        await navigator.serviceWorker.ready;


        return registration;

    }


    // ======================================
    // GERAR WAV
    // ======================================

    static createTestWav() {

        const sampleRate =
            44100;


        const duration =
            1;


        const channels =
            1;


        const bitsPerSample =
            24;


        const bytesPerSample =
            3;


        const samples =
            sampleRate *
            duration;


        const dataSize =
            samples *
            channels *
            bytesPerSample;


        const buffer =
            new ArrayBuffer(
                44 +
                dataSize
            );


        const view =
            new DataView(
                buffer
            );


        let offset =
            0;


        this.writeString(
            view,
            offset,
            "RIFF"
        );


        offset += 4;


        view.setUint32(
            offset,
            36 + dataSize,
            true
        );


        offset += 4;


        this.writeString(
            view,
            offset,
            "WAVE"
        );


        offset += 4;


        this.writeString(
            view,
            offset,
            "fmt "
        );


        offset += 4;


        view.setUint32(
            offset,
            16,
            true
        );


        offset += 4;


        view.setUint16(
            offset,
            1,
            true
        );


        offset += 2;


        view.setUint16(
            offset,
            channels,
            true
        );


        offset += 2;


        view.setUint32(
            offset,
            sampleRate,
            true
        );


        offset += 4;


        const byteRate =
            sampleRate *
            channels *
            bytesPerSample;


        view.setUint32(
            offset,
            byteRate,
            true
        );


        offset += 4;


        const blockAlign =
            channels *
            bytesPerSample;


        view.setUint16(
            offset,
            blockAlign,
            true
        );


        offset += 2;


        view.setUint16(
            offset,
            bitsPerSample,
            true
        );


        offset += 2;


        this.writeString(
            view,
            offset,
            "data"
        );


        offset += 4;


        view.setUint32(
            offset,
            dataSize,
            true
        );


        return new Blob(
            [buffer],
            {
                type:
                    "audio/wav"
            }
        );

    }


    // ======================================
    // STRING
    // ======================================

    static writeString(
        view,
        offset,
        text
    ) {

        for (
            let i = 0;
            i < text.length;
            i++
        ) {

            view.setUint8(
                offset + i,
                text.charCodeAt(i)
            );

        }

    }


    // ======================================
    // TESTE PRINCIPAL
    // ======================================

    static async test() {

        const registration =
            await this.register();


        const worker =
            registration.active ||
            navigator.serviceWorker.controller;


        if (!worker) {

            throw new Error(
                "Service Worker registrado, mas ainda não existe um controlador ativo."
            );

        }


        const wav =
            this.createTestWav();


        const arrayBuffer =
            await wav.arrayBuffer();


        const fileName =
            "smoothvstudio-sw-teste.wav";


        worker.postMessage(
            {

                type:
                    "STORE_WAV",

                data:
                    arrayBuffer,

                fileName:
                    fileName,

                size:
                    arrayBuffer.byteLength,

                type:
                    "audio/wav"

            },
            [
                arrayBuffer
            ]
        );


        /*
         * Dar tempo para o Service Worker
         * concluir a gravação no IndexedDB.
         */

        await new Promise(
            resolve => {

                setTimeout(
                    resolve,
                    500
                );

            }
        );


        /*
         * Agora navegamos para uma URL
         * HTTP controlada pelo Service Worker.
         */

        const downloadUrl =
            new URL(
                this.downloadPath,
                window.location.origin
            ).href;


        const anchor =
            document.createElement(
                "a"
            );


        anchor.href =
            downloadUrl;


        anchor.download =
            fileName;


        anchor.rel =
            "noopener";


        anchor.style.display =
            "none";


        document.body.appendChild(
            anchor
        );


        anchor.click();


        setTimeout(
            () => {

                anchor.remove();

            },
            1000
        );


        return (
            "TESTE INICIADO\n\n" +

            "Service Worker registrado.\n\n" +

            "WAV 24-bit preparado.\n\n" +

            "URL de download criada.\n\n" +

            "O WebView/Spck deverá agora decidir se trata essa resposta como download.\n\n" +

            "Verifique se apareceu um arquivo chamado:\n\n" +

            fileName
        );

    }

}


// ==========================================
// INICIALIZAÇÃO
// ==========================================

window.addEventListener(
    "load",
    () => {

        SWDownloadTest.createInterface();

    }
);