// ==========================================
// SMOOTHVSTUDIO
// WAV EXPORTER
// V0.2
// ==========================================
//
// Responsável exclusivamente pela criação
// e validação básica dos arquivos WAV.
//
// O processamento DSP permanece no
// AudioEngine.
//
// ==========================================


class WavExporter {


    // ======================================
    // VALIDAR AUDIOBUFFER
    // ======================================

    static validateAudioBuffer(
        audioBuffer
    ) {

        if (
            !audioBuffer
        ) {

            throw new Error(
                "Nenhum áudio processado."
            );
        }


        if (
            !Number.isFinite(
                audioBuffer.sampleRate
            ) ||

            audioBuffer.sampleRate <= 0
        ) {

            throw new Error(
                "Sample rate inválido no áudio processado."
            );
        }


        if (
            !Number.isFinite(
                audioBuffer.length
            ) ||

            audioBuffer.length <= 0
        ) {

            throw new Error(
                "O áudio processado não possui amostras válidas."
            );
        }


        if (
            !Number.isFinite(
                audioBuffer.duration
            ) ||

            audioBuffer.duration <= 0
        ) {

            throw new Error(
                "A duração do áudio processado é inválida."
            );
        }


        if (
            !Number.isFinite(
                audioBuffer.numberOfChannels
            ) ||

            audioBuffer.numberOfChannels <= 0
        ) {

            throw new Error(
                "O áudio processado não possui canais válidos."
            );
        }


        /*
         * Verificação leve dos dados.
         *
         * Não percorremos todas as amostras.
         * Isso evita custo desnecessário em
         * aparelhos móveis.
         *
         * Verificamos pontos distribuídos
         * pelo áudio para detectar valores
         * NaN ou Infinity.
         */

        const channelsToCheck =
            Math.min(
                audioBuffer.numberOfChannels,
                2
            );


        const pointsToCheck = [
            0,
            Math.floor(
                audioBuffer.length * 0.25
            ),
            Math.floor(
                audioBuffer.length * 0.5
            ),
            Math.floor(
                audioBuffer.length * 0.75
            ),
            audioBuffer.length - 1
        ];


        for (
            let channel = 0;
            channel < channelsToCheck;
            channel++
        ) {

            const data =
                audioBuffer.getChannelData(
                    channel
                );


            for (
                const index of pointsToCheck
            ) {

                const sample =
                    data[index];


                if (
                    !Number.isFinite(
                        sample
                    )
                ) {

                    throw new Error(
                        "O áudio processado contém amostras inválidas."
                    );
                }
            }
        }


        return true;
    }


    // ======================================
    // VALIDAR BLOB WAV
    // ======================================

    static validateBlob(
        blob
    ) {

        if (
            !blob
        ) {

            throw new Error(
                "O WAV não foi gerado."
            );
        }


        if (
            !(blob instanceof Blob)
        ) {

            throw new Error(
                "O resultado da exportação não é um Blob válido."
            );
        }


        /*
         * Um WAV PCM possui pelo menos
         * um cabeçalho RIFF/WAVE.
         *
         * 44 bytes é o tamanho mínimo
         * esperado para um WAV PCM simples.
         */

        if (
            !Number.isFinite(
                blob.size
            ) ||

            blob.size < 44
        ) {

            throw new Error(
                "O WAV gerado possui tamanho inválido."
            );
        }


        /*
         * O MIME pode variar dependendo
         * do navegador, portanto não
         * rejeitamos um Blob sem MIME.
         *
         * Porém, se existir, deve ser WAV.
         */

        if (
            blob.type &&

            blob.type !==
            "audio/wav" &&

            blob.type !==
            "audio/x-wav"
        ) {

            throw new Error(
                "O WAV gerado possui um tipo MIME inesperado."
            );
        }


        return true;
    }


    // ======================================
    // CRIAR BLOB WAV
    // ======================================

    static createBlob(
        audioBuffer
    ) {

        // ==============================
        // VALIDAR ORIGEM
        // ==============================

        WavExporter.validateAudioBuffer(
            audioBuffer
        );


        // ==============================
        // GERAR WAV
        // ==============================

        const blob =
            AudioEngine.bufferToWav(
                audioBuffer
            );


        // ==============================
        // VALIDAR RESULTADO
        // ==============================

        WavExporter.validateBlob(
            blob
        );


        return blob;
    }


    // ======================================
    // CRIAR OBJETO FILE
    // ======================================

    static createFile(
        audioBuffer,
        fileName =
            "smoothvstudio-vocal.wav"
    ) {

        const blob =
            WavExporter.createBlob(
                audioBuffer
            );


        return new File(
            [
                blob
            ],
            fileName,
            {
                type:
                    "audio/wav"
            }
        );
    }


}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.WavExporter =
    WavExporter;