// ==========================================
// SMOOTHVSTUDIO
// AUDIO ENGINE
// V0.2
// ==========================================
//
// Responsável por:
//
// - criar contexto
// - decodificar áudio
// - manter áudio original
// - executar processamento offline
//
// A inteligência do Vocal Smoother fica
// separada em:
//
// js/smoother/
//
// ==========================================


class AudioEngine {


    constructor() {

        this.audioContext =
            null;


        this.originalBuffer =
            null;


        this.processedBuffer =
            null;


        this.sampleRate =
            44100;


        this.vocalSmoother =
            new VocalSmoother();
    }


    // ======================================
    // CRIAR AUDIO CONTEXT
    // ======================================

    createContext() {

        if (
            !this.audioContext
        ) {

            const AudioContext =
                window.AudioContext ||
                window.webkitAudioContext;


            if (
                !AudioContext
            ) {

                throw new Error(
                    "Web Audio API não disponível."
                );
            }


            this.audioContext =
                new AudioContext();
        }


        return this.audioContext;
    }


    // ======================================
    // DECODIFICAR ARQUIVO
    // ======================================

    async decodeFile(
        file
    ) {

        if (
            !file
        ) {

            throw new Error(
                "Nenhum arquivo foi selecionado."
            );
        }


        const context =
            this.createContext();


        const arrayBuffer =
            await file.arrayBuffer();


        const audioBuffer =
            await context.decodeAudioData(
                arrayBuffer
            );


        this.originalBuffer =
            audioBuffer;


        this.processedBuffer =
            null;


        this.sampleRate =
            audioBuffer.sampleRate;


        return audioBuffer;
    }


    // ======================================
    // PROCESSAMENTO OFFLINE
    // ======================================

    async process() {

        if (
            !this.originalBuffer
        ) {

            throw new Error(
                "Nenhum áudio carregado."
            );
        }


        /*
         * Sempre processamos a partir do
         * ORIGINAL.
         *
         * Isso impede processamento
         * acumulativo quando o usuário
         * utiliza "Processar novamente".
         */

        const processed =
            await this.vocalSmoother.process(
                this.originalBuffer
            );


        this.processedBuffer =
            processed;


        return processed;
    }


    // ======================================
    // OBTER ANÁLISE
    // ======================================

    getVocalAnalysis() {

        return this.vocalSmoother
            .getLastAnalysis();
    }


    // ======================================
    // OBTER CONFIGURAÇÃO
    // ======================================

    getVocalSettings() {

        return this.vocalSmoother
            .getLastSettings();
    }


    // ======================================
    // CONVERTER BUFFER PARA WAV
    // ======================================

    bufferToWavURL(
        buffer
    ) {

        const wavBlob =
            AudioEngine.bufferToWav(
                buffer
            );


        return URL.createObjectURL(
            wavBlob
        );
    }


    // ======================================
    // WAV PCM 24-BIT
    // ======================================

    static bufferToWav(
        buffer
    ) {

        if (
            !buffer
        ) {

            throw new Error(
                "Buffer de áudio inválido."
            );
        }


        const numberOfChannels =
            buffer.numberOfChannels;


        const sampleRate =
            buffer.sampleRate;


        const bytesPerSample =
            3;


        const blockAlign =
            numberOfChannels *
            bytesPerSample;


        const dataLength =
            buffer.length *
            blockAlign;


        const bufferLength =
            44 +
            dataLength;


        const arrayBuffer =
            new ArrayBuffer(
                bufferLength
            );


        const view =
            new DataView(
                arrayBuffer
            );


        AudioEngine.writeString(
            view,
            0,
            "RIFF"
        );


        view.setUint32(
            4,
            36 + dataLength,
            true
        );


        AudioEngine.writeString(
            view,
            8,
            "WAVE"
        );


        AudioEngine.writeString(
            view,
            12,
            "fmt "
        );


        view.setUint32(
            16,
            16,
            true
        );


        view.setUint16(
            20,
            1,
            true
        );


        view.setUint16(
            22,
            numberOfChannels,
            true
        );


        view.setUint32(
            24,
            sampleRate,
            true
        );


        view.setUint32(
            28,
            sampleRate *
            blockAlign,
            true
        );


        view.setUint16(
            32,
            blockAlign,
            true
        );


        view.setUint16(
            34,
            24,
            true
        );


        AudioEngine.writeString(
            view,
            36,
            "data"
        );


        view.setUint32(
            40,
            dataLength,
            true
        );


        const channels =
            [];


        for (
            let channel = 0;
            channel < numberOfChannels;
            channel++
        ) {

            channels.push(
                buffer.getChannelData(
                    channel
                )
            );
        }


        let offset =
            44;


        for (
            let sample = 0;
            sample < buffer.length;
            sample++
        ) {

            for (
                let channel = 0;
                channel < numberOfChannels;
                channel++
            ) {

                let value =
                    channels[channel][sample];


                value =
                    Math.max(
                        -1,
                        Math.min(
                            1,
                            value
                        )
                    );


                let intValue;


                if (
                    value < 0
                ) {

                    intValue =
                        Math.round(
                            value *
                            8388608
                        );

                } else {

                    intValue =
                        Math.round(
                            value *
                            8388607
                        );
                }


                view.setUint8(
                    offset,
                    intValue & 0xff
                );


                view.setUint8(
                    offset + 1,
                    (
                        intValue >>
                        8
                    ) & 0xff
                );


                view.setUint8(
                    offset + 2,
                    (
                        intValue >>
                        16
                    ) & 0xff
                );


                offset +=
                    3;
            }
        }


        return new Blob(
            [arrayBuffer],
            {
                type:
                    "audio/wav"
            }
        );
    }


    // ======================================
    // ESCREVER TEXTO
    // ======================================

    static writeString(
        view,
        offset,
        string
    ) {

        for (
            let i = 0;
            i < string.length;
            i++
        ) {

            view.setUint8(
                offset + i,
                string.charCodeAt(i)
            );
        }
    }

}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.AudioEngine =
    AudioEngine;