// ==========================================
// SMOOTHVSTUDIO
// SPCK DIRECTORY WRITE TEST
// V0.4
// ==========================================
//
// Testa:
// showDirectoryPicker()
// getFileHandle()
// createWritable()
// write()
// close()
//
// NÃO altera o motor de áudio.
// NÃO altera o WAV exporter.
// NÃO altera o downloader.
// ==========================================


class SpckDirectoryWriteTest {


    // ======================================
    // CRIAR WAV DE TESTE
    // ======================================

    static createTestWav() {

        const sampleRate =
            44100;

        const channels =
            1;

        const bitsPerSample =
            24;

        const duration =
            1;

        const bytesPerSample =
            3;

        const totalSamples =
            sampleRate *
            duration;

        const dataSize =
            totalSamples *
            channels *
            bytesPerSample;

        const buffer =
            new ArrayBuffer(
                44 + dataSize
            );

        const view =
            new DataView(
                buffer
            );


        let offset = 0;


        // RIFF

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


        // fmt

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


        // data

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
    // ESCREVER STRING
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
            "SmoothVStudio — Teste de Pasta";


        title.style.fontSize =
            "22px";


        title.style.marginBottom =
            "12px";


        const description =
            document.createElement(
                "p"
            );


        description.textContent =
            "Vamos testar se o Preview do Spck permite escolher uma pasta e criar um arquivo WAV dentro dela.";


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
            "ESCOLHER PASTA E TESTAR";


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
                    "TESTANDO...";


                status.textContent =
                    "Abrindo seletor de pasta...";


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
    // TESTE
    // ======================================

    static async test() {

        if (
            typeof window.showDirectoryPicker !==
            "function"
        ) {

            return (
                "RESULTADO\n\n" +
                "showDirectoryPicker não está disponível."
            );

        }


        // ----------------------------------
        // 1. ESCOLHER PASTA
        // ----------------------------------

        let directory;


        try {

            directory =
                await window.showDirectoryPicker();

        } catch (error) {

            if (
                error &&
                error.name ===
                "AbortError"
            ) {

                return (
                    "RESULTADO\n\n" +
                    "O seletor de pasta foi encerrado."
                );

            }


            throw error;

        }


        // ----------------------------------
        // 2. CRIAR HANDLE DO ARQUIVO
        // ----------------------------------

        const fileHandle =
            await directory.getFileHandle(
                "smoothvstudio-teste-pasta.wav",
                {
                    create:
                        true
                }
            );


        // ----------------------------------
        // 3. CRIAR ESCRITOR
        // ----------------------------------

        const writable =
            await fileHandle.createWritable();


        // ----------------------------------
        // 4. GERAR WAV
        // ----------------------------------

        const wav =
            this.createTestWav();


        // ----------------------------------
        // 5. ESCREVER
        // ----------------------------------

        await writable.write(
            wav
        );


        // ----------------------------------
        // 6. FECHAR
        // ----------------------------------

        await writable.close();


        // ----------------------------------
        // 7. VERIFICAR ARQUIVO
        // ----------------------------------

        const savedFile =
            await fileHandle.getFile();


        return (
            "RESULTADO\n\n" +

            "SUCESSO!\n\n" +

            "Arquivo criado:\n" +

            savedFile.name +

            "\n\nTamanho:\n" +

            savedFile.size +

            " bytes\n\n" +

            "Tipo:\n" +

            savedFile.type +

            "\n\n" +

            "A escrita via File System Access API funcionou."
        );

    }

}


// ==========================================
// INICIALIZAÇÃO
// ==========================================

window.addEventListener(
    "load",
    () => {

        SpckDirectoryWriteTest.createInterface();

    }
);