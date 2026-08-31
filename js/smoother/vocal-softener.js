"use strict";


class VocalSoftener {

    constructor(options = {}) {

        this.options = {

            enabled:
                true,

            /*
             * COMPRESSOR MULTIBANDA
             *
             * Cada banda trabalha de forma
             * independente.
             *
             * As cinco primeiras são estreitas.
             * As três últimas são moderadas.
             */

            compressorBands: [

                {
                    frequency: 1400,
                    q: 6.0
                },

                {
                    frequency: 1700,
                    q: 6.0
                },

                {
                    frequency: 2000,
                    q: 6.0
                },

                {
                    frequency: 2250,
                    q: 6.0
                },

                {
                    frequency: 2650,
                    q: 5.5
                },

                {
                    frequency: 3000,
                    q: 1.8
                },

                {
                    frequency: 3500,
                    q: 1.8
                },

                {
                    frequency: 4000,
                    q: 1.8
                }
            ],

            /*
             * Primeira versão propositalmente audível.
             */

            compressorThresholdDb:
                -24,

            compressorRatio:
                3.0,

            compressorAttackMs:
                7,

            compressorReleaseMs:
                90,

            compressorMaxReductionDb:
                3,


            /*
             * TAPE SATURATOR
             *
             * Somente acima de 1000 Hz.
             */

            tapeStartHz:
                1000,

            tapeDrive:
                2.2,

            tapeMix:
                0.70,


            /*
             * UPWARD EXPANDER
             *
             * Recupera microdinâmica.
             */

            upwardThresholdDb:
                -32,

            upwardRatio:
                1.45,

            upwardMaxBoostDb:
                5,

            upwardAttackMs:
                12,

            upwardReleaseMs:
                110,

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
         * O Analyzer NÃO controla a ativação.
         *
         * O perfil é recebido para manter a
         * integração preparada, mas nenhuma
         * condição dele pode neutralizar o Softener.
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


            this.applyMultibandCompression(
                data,
                audioBuffer.sampleRate
            );


            this.applyTapeSaturation(
                data,
                audioBuffer.sampleRate
            );


            this.applyUpwardExpansion(
                data,
                audioBuffer.sampleRate
            );
        }


        return audioBuffer;
    }


    applyMultibandCompression(
        data,
        sampleRate
    ) {

        for (
            const band of this.options.compressorBands
        ) {

            const filter =
                this.createBandpassFilter(
                    band.frequency,
                    band.q,
                    sampleRate
                );


            let x1 =
                0;

            let x2 =
                0;

            let y1 =
                0;

            let y2 =
                0;


            let envelope =
                0;


            const attackCoefficient =
                this.timeCoefficient(
                    this.options.compressorAttackMs,
                    sampleRate
                );


            const releaseCoefficient =
                this.timeCoefficient(
                    this.options.compressorReleaseMs,
                    sampleRate
                );


            for (
                let i = 0;
                i < data.length;
                i++
            ) {

                const input =
                    data[i];


                const filtered =
                    this.processBiquad(
                        input,
                        filter,
                        x1,
                        x2,
                        y1,
                        y2
                    );


                x1 =
                    filtered.x1;

                x2 =
                    filtered.x2;

                y1 =
                    filtered.y1;

                y2 =
                    filtered.y2;


                const bandSignal =
                    filtered.output;


                const magnitude =
                    Math.abs(
                        bandSignal
                    );


                if (
                    magnitude > envelope
                ) {

                    envelope =
                        attackCoefficient *
                        envelope
                        +
                        (
                            1 -
                            attackCoefficient
                        ) *
                        magnitude;

                } else {

                    envelope =
                        releaseCoefficient *
                        envelope
                        +
                        (
                            1 -
                            releaseCoefficient
                        ) *
                        magnitude;
                }


                const envelopeDb =
                    this.linearToDb(
                        envelope
                    );


                let reductionDb =
                    0;


                if (
                    envelopeDb >
                    this.options.compressorThresholdDb
                ) {

                    const overThresholdDb =
                        envelopeDb -
                        this.options.compressorThresholdDb;


                    reductionDb =
                        overThresholdDb -
                        (
                            overThresholdDb /
                            this.options.compressorRatio
                        );


                    reductionDb =
                        Math.min(
                            reductionDb,
                            this.options.compressorMaxReductionDb
                        );
                }


                if (
                    reductionDb <= 0
                ) {

                    continue;
                }


                const gain =
                    this.dbToLinear(
                        -reductionDb
                    );


                /*
                 * Somente a energia daquela região
                 * é reduzida.
                 *
                 * O restante do vocal permanece intacto.
                 */

                data[i] =
                    input +
                    (
                        bandSignal *
                        (
                            gain -
                            1
                        )
                    );
            }
        }
    }


    applyTapeSaturation(
        data,
        sampleRate
    ) {

        const filter =
            this.createHighpassFilter(
                this.options.tapeStartHz,
                sampleRate
            );


        let x1 =
            0;

        let x2 =
            0;

        let y1 =
            0;

        let y2 =
            0;


        const drive =
            Math.max(
                1,
                this.options.tapeDrive
            );


        const mix =
            Math.max(
                0,
                Math.min(
                    1,
                    this.options.tapeMix
                )
            );


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const input =
                data[i];


            const filtered =
                this.processBiquad(
                    input,
                    filter,
                    x1,
                    x2,
                    y1,
                    y2
                );


            x1 =
                filtered.x1;

            x2 =
                filtered.x2;

            y1 =
                filtered.y1;

            y2 =
                filtered.y2;


            const highFrequency =
                filtered.output;


            /*
             * Saturação suave não linear.
             */

            const saturated =
                Math.tanh(
                    highFrequency *
                    drive
                );


            const processedHighFrequency =
                highFrequency +
                (
                    saturated -
                    highFrequency
                ) *
                mix;


            /*
             * Somente a diferença criada pela
             * saturação é reinserida.
             *
             * Frequências abaixo de 1 kHz
             * permanecem sem saturação.
             */

            data[i] =
                input +
                (
                    processedHighFrequency -
                    highFrequency
                );
        }
    }


    applyUpwardExpansion(
        data,
        sampleRate
    ) {

        let envelope =
            0;


        const attackCoefficient =
            this.timeCoefficient(
                this.options.upwardAttackMs,
                sampleRate
            );


        const releaseCoefficient =
            this.timeCoefficient(
                this.options.upwardReleaseMs,
                sampleRate
            );


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const input =
                data[i];


            const magnitude =
                Math.abs(
                    input
                );


            if (
                magnitude > envelope
            ) {

                envelope =
                    attackCoefficient *
                    envelope
                    +
                    (
                        1 -
                        attackCoefficient
                    ) *
                    magnitude;

            } else {

                envelope =
                    releaseCoefficient *
                    envelope
                    +
                    (
                        1 -
                        releaseCoefficient
                    ) *
                    magnitude;
            }


            const envelopeDb =
                this.linearToDb(
                    envelope
                );


            /*
             * Acima do threshold não fazemos
             * expansão ascendente.
             */

            if (
                envelopeDb >=
                this.options.upwardThresholdDb
            ) {

                continue;
            }


            const distanceDb =
                this.options.upwardThresholdDb -
                envelopeDb;


            let boostDb =
                distanceDb *
                (
                    this.options.upwardRatio -
                    1
                );


            boostDb =
                Math.min(
                    boostDb,
                    this.options.upwardMaxBoostDb
                );


            if (
                boostDb <= 0
            ) {

                continue;
            }


            /*
             * A expansão é aplicada de forma
             * progressiva conforme o sinal
             * se aproxima do threshold.
             */

            const gain =
                this.dbToLinear(
                    boostDb
                );


            data[i] =
                input *
                gain;
        }
    }


    createBandpassFilter(
        frequency,
        q,
        sampleRate
    ) {

        const safeFrequency =
            Math.min(
                sampleRate * 0.45,
                Math.max(
                    20,
                    frequency
                )
            );


        const omega =
            2 *
            Math.PI *
            safeFrequency /
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
                Math.max(
                    0.1,
                    q
                )
            );


        const b0 =
            alpha;

        const b1 =
            0;

        const b2 =
            -alpha;

        const a0 =
            1 +
            alpha;

        const a1 =
            -2 *
            cosine;

        const a2 =
            1 -
            alpha;


        return {

            b0:
                b0 / a0,

            b1:
                b1 / a0,

            b2:
                b2 / a0,

            a1:
                a1 / a0,

            a2:
                a2 / a0
        };
    }


    createHighpassFilter(
        frequency,
        sampleRate
    ) {

        const safeFrequency =
            Math.min(
                sampleRate * 0.45,
                Math.max(
                    20,
                    frequency
                )
            );


        const omega =
            2 *
            Math.PI *
            safeFrequency /
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
                Math.SQRT1_2
            );


        const b0 =
            (
                1 +
                cosine
            ) /
            2;

        const b1 =
            -(
                1 +
                cosine
            );

        const b2 =
            (
                1 +
                cosine
            ) /
            2;

        const a0 =
            1 +
            alpha;

        const a1 =
            -2 *
            cosine;

        const a2 =
            1 -
            alpha;


        return {

            b0:
                b0 / a0,

            b1:
                b1 / a0,

            b2:
                b2 / a0,

            a1:
                a1 / a0,

            a2:
                a2 / a0
        };
    }


    processBiquad(
        input,
        filter,
        x1,
        x2,
        y1,
        y2
    ) {

        const output =
            (
                filter.b0 *
                input
            )
            +
            (
                filter.b1 *
                x1
            )
            +
            (
                filter.b2 *
                x2
            )
            -
            (
                filter.a1 *
                y1
            )
            -
            (
                filter.a2 *
                y2
            );


        return {

            output,

            x1:
                input,

            x2:
                x1,

            y1:
                output,

            y2:
                y1
        };
    }


    timeCoefficient(
        milliseconds,
        sampleRate
    ) {

        const time =
            Math.max(
                0.1,
                milliseconds
            ) /
            1000;


        return Math.exp(
            -1 /
            (
                sampleRate *
                time
            )
        );
    }


    linearToDb(
        value
    ) {

        return (
            20 *
            Math.log10(
                Math.max(
                    0.000001,
                    Math.abs(
                        value
                    )
                )
            )
        );
    }


    dbToLinear(
        db
    ) {

        return Math.pow(
            10,
            db / 20
        );
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