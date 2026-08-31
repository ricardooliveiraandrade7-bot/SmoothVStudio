"use strict";


class AirReverb {

    constructor(options = {}) {

        this.options = {

            enabled: true,

            /*
             * =====================================================
             * AMBIENTE
             * =====================================================
             */

            position: "central-close",

            canopyHeight: "low",

            canopyMaterial: "soft",

            galleryDamping: true,


            /*
             * =====================================================
             * TEMPO
             * =====================================================
             */

            decayTime: 0.95,

            preDelayMs: 30,


            /*
             * =====================================================
             * REFLEXÕES
             * =====================================================
             */

            earlyReflectionsDb: -3.5,

            tailLevelDb: -6,

            diffusion: 0.65,

            density: 0.50,


            /*
             * =====================================================
             * ALTA FREQUÊNCIA
             * =====================================================
             */

            highFrequencyDamping: 0.75,

            highRolloffHz: 6000,

            highPassHz: 250,

            highShelfHz: 8000,

            highShelfGainDb: -2,


            /*
             * =====================================================
             * MISTURA
             * =====================================================
             */

            mix: 0.15,

            amount: 1.0,


            ...options
        };
    }


    /*
     * =========================================================
     * PROCESSAMENTO PRINCIPAL
     * =========================================================
     */

    process(audioBuffer) {

        this.validateAudioBuffer(audioBuffer);


        if (!this.options.enabled) {

            return audioBuffer;
        }


        const sampleRate =
            audioBuffer.sampleRate;


        const numberOfChannels =
            audioBuffer.numberOfChannels;


        const mix =
            this.clamp(
                this.options.mix,
                0,
                1
            );


        const amount =
            this.clamp(
                this.options.amount,
                0,
                1
            );


        if (
            mix <= 0 ||
            amount <= 0
        ) {

            return audioBuffer;
        }


        for (
            let channel = 0;
            channel < numberOfChannels;
            channel++
        ) {

            const data =
                audioBuffer.getChannelData(
                    channel
                );


            this.processChannel(
                data,
                sampleRate,
                mix,
                amount
            );
        }


        return audioBuffer;
    }


    /*
     * =========================================================
     * CANAL
     * =========================================================
     */

    processChannel(
        data,
        sampleRate,
        mix,
        amount
    ) {

        const length =
            data.length;


        const original =
            new Float32Array(
                data
            );


        /*
         * -----------------------------------------------------
         * PRE-DELAY
         * -----------------------------------------------------
         */

        const preDelaySamples =
            Math.max(
                1,
                Math.round(
                    this.options.preDelayMs *
                    sampleRate /
                    1000
                )
            );


        /*
         * -----------------------------------------------------
         * REVERB BUFFERS
         * -----------------------------------------------------
         */

        const preDelayBuffer =
            new Float32Array(
                length
            );


        /*
         * Pequenas reflexões iniciais.
         *
         * Os tempos são deliberadamente curtos
         * para manter a sensação de ambiente próximo.
         */

        const earlyDelays = [
            0.011,
            0.017,
            0.023,
            0.031
        ];


        const earlyGains = [
            0.42,
            0.34,
            0.27,
            0.21
        ];


        /*
         * -----------------------------------------------------
         * EARLY REFLECTIONS
         * -----------------------------------------------------
         */

        const earlyBuffer =
            new Float32Array(
                length
            );


        const earlyLevel =
            this.dbToLinear(
                this.options.earlyReflectionsDb
            );


        for (
            let i = 0;
            i < length;
            i++
        ) {

            let value = 0;


            for (
                let d = 0;
                d < earlyDelays.length;
                d++
            ) {

                const delaySamples =
                    Math.max(
                        1,
                        Math.round(
                            earlyDelays[d] *
                            sampleRate
                        )
                    );


                const sourceIndex =
                    i -
                    delaySamples;


                if (
                    sourceIndex < 0
                ) {

                    continue;
                }


                value +=
                    original[sourceIndex] *
                    earlyGains[d];
            }


            earlyBuffer[i] =
                value *
                earlyLevel;
        }


        /*
         * -----------------------------------------------------
         * PRE-DELAY
         * -----------------------------------------------------
         */

        for (
            let i = preDelaySamples;
            i < length;
            i++
        ) {

            preDelayBuffer[i] =
                original[
                    i -
                    preDelaySamples
                ];
        }


        /*
         * -----------------------------------------------------
         * DIFFUSÃO
         * -----------------------------------------------------
         */

        const diffusion =
            this.clamp(
                this.options.diffusion,
                0,
                1
            );


        const density =
            this.clamp(
                this.options.density,
                0,
                1
            );


        /*
         * Quatro linhas de atraso
         * independentes formam a cauda.
         */

        const tailDelays = [

            Math.max(
                1,
                Math.round(
                    0.037 *
                    sampleRate
                )
            ),

            Math.max(
                1,
                Math.round(
                    0.053 *
                    sampleRate
                )
            ),

            Math.max(
                1,
                Math.round(
                    0.071 *
                    sampleRate
                )
            ),

            Math.max(
                1,
                Math.round(
                    0.089 *
                    sampleRate
                )
            )
        ];


        const delayBuffers =
            tailDelays.map(
                delay =>
                    new Float32Array(
                        delay
                    )
            );


        const delayPositions =
            new Array(
                delayBuffers.length
            ).fill(0);


        const decayTime =
            this.clamp(
                this.options.decayTime,
                0.1,
                3.0
            );


        /*
         * Ganho de feedback aproximado
         * para atingir a região de RT60 desejada.
         */

        const feedback =
            Math.pow(
                10,
                -3 *
                (
                    tailDelays.reduce(
                        (a, b) => a + b,
                        0
                    ) /
                    tailDelays.length
                ) /
                sampleRate /
                decayTime
            );


        const safeFeedback =
            this.clamp(
                feedback,
                0.15,
                0.88
            );


        const tail =
            new Float32Array(
                length
            );


        /*
         * -----------------------------------------------------
         * CAUDA
         * -----------------------------------------------------
         */

        for (
            let i = 0;
            i < length;
            i++
        ) {

            const input =
                preDelayBuffer[i] *
                density;


            let wet = 0;


            for (
                let d = 0;
                d < delayBuffers.length;
                d++
            ) {

                const buffer =
                    delayBuffers[d];


                let position =
                    delayPositions[d];


                const delayed =
                    buffer[position];


                const feedbackInput =
                    input +
                    delayed *
                    safeFeedback *
                    diffusion;


                buffer[position] =
                    feedbackInput;


                position++;


                if (
                    position >=
                    buffer.length
                ) {

                    position = 0;
                }


                delayPositions[d] =
                    position;


                wet +=
                    delayed;
            }


            tail[i] =
                (
                    wet /
                    delayBuffers.length
                );
        }


        /*
         * -----------------------------------------------------
         * DAMPING DE ALTA FREQUÊNCIA
         * -----------------------------------------------------
         */

        this.applyHighFrequencyDamping(
            tail,
            sampleRate
        );


        /*
         * -----------------------------------------------------
         * HPF DO RETORNO
         * -----------------------------------------------------
         */

        this.applyHighPass(
            tail,
            sampleRate,
            this.options.highPassHz
        );


        /*
         * -----------------------------------------------------
         * HIGH SHELF
         * -----------------------------------------------------
         */

        this.applyHighShelf(
            tail,
            sampleRate,
            this.options.highShelfHz,
            this.options.highShelfGainDb
        );


        /*
         * -----------------------------------------------------
         * NÍVEL DA CAUDA
         * -----------------------------------------------------
         */

        const tailGain =
            this.dbToLinear(
                this.options.tailLevelDb
            );


        /*
         * -----------------------------------------------------
         * MIX FINAL
         * -----------------------------------------------------
         */

        for (
            let i = 0;
            i < length;
            i++
        ) {

            const early =
                earlyBuffer[i];


            const late =
                tail[i] *
                tailGain;


            const reverb =
                (
                    early +
                    late
                ) *
                amount;


            data[i] =
                original[i] +
                (
                    reverb -
                    original[i]
                ) *
                mix;
        }
    }


    /*
     * =========================================================
     * HIGH FREQUENCY DAMPING
     * =========================================================
     */

    applyHighFrequencyDamping(
        data,
        sampleRate
    ) {

        const damping =
            this.clamp(
                this.options.highFrequencyDamping,
                0,
                1
            );


        if (
            damping <= 0
        ) {

            return;
        }


        const cutoff =
            this.clamp(
                this.options.highRolloffHz,
                1000,
                sampleRate * 0.45
            );


        const alpha =
            Math.exp(
                -2 *
                Math.PI *
                cutoff /
                sampleRate
            );


        let previousInput = 0;
        let previousOutput = 0;


        const dampingAmount =
            damping *
            0.75;


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const input =
                data[i];


            const low =
                (
                    1 -
                    alpha
                ) *
                input +
                alpha *
                previousOutput;


            const high =
                input -
                low;


            data[i] =
                low +
                high *
                (
                    1 -
                    dampingAmount
                );


            previousInput =
                input;


            previousOutput =
                low;
        }
    }


    /*
     * =========================================================
     * HIGH-PASS
     * =========================================================
     */

    applyHighPass(
        data,
        sampleRate,
        frequency
    ) {

        const cutoff =
            this.clamp(
                frequency,
                20,
                sampleRate * 0.45
            );


        const rc =
            1 /
            (
                2 *
                Math.PI *
                cutoff
            );


        const dt =
            1 /
            sampleRate;


        const alpha =
            rc /
            (
                rc +
                dt
            );


        let previousInput = 0;
        let previousOutput = 0;


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const input =
                data[i];


            const output =
                alpha *
                (
                    previousOutput +
                    input -
                    previousInput
                );


            data[i] =
                output;


            previousInput =
                input;


            previousOutput =
                output;
        }
    }


    /*
     * =========================================================
     * HIGH SHELF SIMPLIFICADO
     * =========================================================
     */

    applyHighShelf(
        data,
        sampleRate,
        frequency,
        gainDb
    ) {

        const gain =
            this.dbToLinear(
                gainDb
            );


        if (
            Math.abs(
                gainDb
            ) <
            0.001
        ) {

            return;
        }


        const cutoff =
            this.clamp(
                frequency,
                1000,
                sampleRate * 0.45
            );


        const alpha =
            Math.exp(
                -2 *
                Math.PI *
                cutoff /
                sampleRate
            );


        let low =
            0;


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const input =
                data[i];


            low =
                (
                    1 -
                    alpha
                ) *
                input +
                alpha *
                low;


            const high =
                input -
                low;


            data[i] =
                low +
                high *
                gain;
        }
    }


    /*
     * =========================================================
     * UTILITÁRIOS
     * =========================================================
     */

    dbToLinear(db) {

        return Math.pow(
            10,
            db / 20
        );
    }


    clamp(
        value,
        min,
        max
    ) {

        return Math.max(
            min,
            Math.min(
                max,
                value
            )
        );
    }


    validateAudioBuffer(
        audioBuffer
    ) {

        if (
            !audioBuffer ||
            typeof audioBuffer.numberOfChannels !==
            "number" ||
            typeof audioBuffer.length !==
            "number" ||
            typeof audioBuffer.sampleRate !==
            "number"
        ) {

            throw new Error(
                "Buffer de áudio inválido para o Air Reverb."
            );
        }


        if (
            audioBuffer.numberOfChannels <= 0 ||
            audioBuffer.length <= 0 ||
            audioBuffer.sampleRate <= 0
        ) {

            throw new Error(
                "Estrutura de áudio inválida para o Air Reverb."
            );
        }
    }
}


window.AirReverb =
    AirReverb;