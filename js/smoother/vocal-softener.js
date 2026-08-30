"use strict";


class VocalSoftener {

    constructor(options = {}) {

        this.options = {

            /*
             * Primeira versão deliberadamente simples.
             *
             * Um único all-pass é usado para introduzir
             * uma pequena dispersão temporal na região
             * de interesse da dureza vocal.
             */

            frequency:
                3800,

            q:
                0.8,

            enabled:
                true,

            ...options
        };
    }


    process(
        audioBuffer,
        vocalProfile = null
    ) {

        this.validateAudioBuffer(
            audioBuffer
        );


        if (
            !this.options.enabled
        ) {

            return audioBuffer;
        }


        /*
         * O perfil é recebido desde já para manter
         * a conexão preparada com o Analyzer.
         *
         * Nesta primeira versão experimental,
         * não usamos thresholds adaptativos.
         *
         * Isso evita adicionar processamento ou
         * decisões artificiais antes de ouvirmos
         * o comportamento básico da suavização.
         */

        void vocalProfile;


        for (
            let channel = 0;
            channel < audioBuffer.numberOfChannels;
            channel++
        ) {

            const data =
                audioBuffer.getChannelData(
                    channel
                );


            this.applyAllPass(
                data,
                audioBuffer.sampleRate
            );
        }


        return audioBuffer;
    }


    applyAllPass(
        data,
        sampleRate
    ) {

        const frequency =
            Math.min(
                sampleRate * 0.45,
                Math.max(
                    20,
                    this.options.frequency
                )
            );


        const q =
            Math.max(
                0.3,
                this.options.q
            );


        const omega =
            2 *
            Math.PI *
            frequency /
            sampleRate;


        const sine =
            Math.sin(
                omega
            );


        const cosine =
            Math.cos(
                omega
            );


        const alpha =
            sine /
            (
                2 *
                q
            );


        /*
         * Biquad All-Pass.
         *
         * A estrutura mantém magnitude unitária
         * idealmente, alterando principalmente a
         * relação de fase e o comportamento temporal.
         */

        const b0 =
            1 -
            alpha;

        const b1 =
            -2 *
            cosine;

        const b2 =
            1 +
            alpha;

        const a0 =
            1 +
            alpha;

        const a1 =
            -2 *
            cosine;

        const a2 =
            1 -
            alpha;


        const normalizedB0 =
            b0 /
            a0;

        const normalizedB1 =
            b1 /
            a0;

        const normalizedB2 =
            b2 /
            a0;

        const normalizedA1 =
            a1 /
            a0;

        const normalizedA2 =
            a2 /
            a0;


        let x1 =
            0;

        let x2 =
            0;

        let y1 =
            0;

        let y2 =
            0;


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const input =
                data[i];


            const output =
                (
                    normalizedB0 *
                    input
                )
                +
                (
                    normalizedB1 *
                    x1
                )
                +
                (
                    normalizedB2 *
                    x2
                )
                -
                (
                    normalizedA1 *
                    y1
                )
                -
                (
                    normalizedA2 *
                    y2
                );


            data[i] =
                output;


            x2 =
                x1;

            x1 =
                input;

            y2 =
                y1;

            y1 =
                output;
        }
    }


    validateAudioBuffer(
        audioBuffer
    ) {

        if (
            !audioBuffer ||
            typeof audioBuffer.length !== "number" ||
            typeof audioBuffer.sampleRate !== "number" ||
            typeof audioBuffer.numberOfChannels !== "number" ||
            typeof audioBuffer.getChannelData !== "function"
        ) {

            throw new Error(
                "VocalSoftener: AudioBuffer inválido."
            );
        }


        if (
            audioBuffer.length <= 0 ||
            audioBuffer.sampleRate <= 0 ||
            audioBuffer.numberOfChannels <= 0
        ) {

            throw new Error(
                "VocalSoftener: áudio vazio ou inválido."
            );
        }
    }
}


window.VocalSoftener =
    VocalSoftener;