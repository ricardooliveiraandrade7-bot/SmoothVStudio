"use strict";


class VocalSoftener {

    constructor(options = {}) {

        this.options = {

            enabled: true,


            /*
             * =====================================================
             * EQ DINÂMICO MULTIBANDA
             * =====================================================
             *
             * As cinco primeiras regiões são estreitas.
             * As três últimas são moderadas.
             *
             * A redução máxima de cada banda é 3 dB.
             */

            dynamicBands: [

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
             * Fallback utilizado somente quando
             * não houver threshold válido vindo
             * do Vocal Softener Analyzer.
             *
             * O Analyzer passa a ser a fonte
             * principal do threshold.
             */

            dynamicThresholdDb: -28,


            /*
             * Comportamento do EQ dinâmico.
             */

            dynamicRatio: 2.5,

            dynamicAttackMs: 6,

            dynamicReleaseMs: 90,

            dynamicMaxReductionDb: 3,


            /*
             * =====================================================
             * TAPE SATURATOR
             * =====================================================
             *
             * Atua somente a partir de 1 kHz.
             */

            tapeStartHz: 1000,

            tapeDrive: 2.2,

            tapeMix: 0.70,


            /*
             * =====================================================
             * UPWARD EXPANDER
             * =====================================================
             */

            upwardThresholdDb: -32,

            upwardRatio: 1.45,

            upwardMaxBoostDb: 5,

            upwardAttackMs: 12,

            upwardReleaseMs: 110,


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
         * O perfil do Analyzer é opcional.
         *
         * Se existir e possuir thresholds válidos,
         * eles serão usados individualmente por banda.
         *
         * Se não existir, o Softener continua funcionando
         * usando o threshold de fallback.
         *
         * O Analyzer nunca pode bloquear o processamento.
         */


        for (
            let channel = 0;
            channel < audioBuffer.numberOfChannels;
            channel++
        ) {

            const data =
                audioBuffer.getChannelData(
                    channel
                );


            this.applyDynamicMultibandEQ(
                data,
                audioBuffer.sampleRate,
                vocalProfile
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


    /*
     * =========================================================
     * EQ DINÂMICO MULTIBANDA
     * =========================================================
     */

    applyDynamicMultibandEQ(
        data,
        sampleRate,
        vocalProfile = null
    ) {

        for (
            let bandIndex = 0;
            bandIndex < this.options.dynamicBands.length;
            bandIndex++
        ) {

            const band =
                this.options.dynamicBands[
                    bandIndex
                ];


            const filter =
                this.createBandpassFilter(
                    band.frequency,
                    band.q,
                    sampleRate
                );


            /*
             * =================================================
             * THRESHOLD INDIVIDUAL DA BANDA
             * =================================================
             *
             * O Analyzer fornece um threshold calculado
             * especificamente para esta frequência.
             *
             * Se não houver um valor válido,
             * usamos o fallback de -28 dB.
             */

            const analyzedBand =
                vocalProfile &&
                Array.isArray(
                    vocalProfile.bands
                )
                    ? vocalProfile.bands[
                        bandIndex
                    ]
                    : null;


            const thresholdDb =
                analyzedBand &&
                Number.isFinite(
                    analyzedBand.thresholdDb
                )
                    ? analyzedBand.thresholdDb
                    : this.options.dynamicThresholdDb;


            let x1 = 0;

            let x2 = 0;

            let y1 = 0;

            let y2 = 0;

            let envelope = 0;


            const attack =
                this.timeCoefficient(
                    this.options.dynamicAttackMs,
                    sampleRate
                );


            const release =
                this.timeCoefficient(
                    this.options.dynamicReleaseMs,
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


                /*
                 * Detector de envelope.
                 */

                if (
                    magnitude >
                    envelope
                ) {

                    envelope =
                        attack *
                        envelope +
                        (
                            1 -
                            attack
                        ) *
                        magnitude;

                } else {

                    envelope =
                        release *
                        envelope +
                        (
                            1 -
                            release
                        ) *
                        magnitude;
                }


                const levelDb =
                    this.linearToDb(
                        envelope
                    );


                /*
                 * O threshold agora é específico
                 * desta banda.
                 */

                if (
                    levelDb <=
                    thresholdDb
                ) {

                    continue;
                }


                const excessDb =
                    levelDb -
                    thresholdDb;


                /*
                 * A redução cresce conforme
                 * o sinal ultrapassa o threshold.
                 */

                let reductionDb =
                    excessDb -
                    (
                        excessDb /
                        this.options.dynamicRatio
                    );


                /*
                 * Nunca ultrapassa o limite
                 * máximo definido para a banda.
                 */

                reductionDb =
                    Math.min(
                        reductionDb,
                        this.options.dynamicMaxReductionDb
                    );


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
                 * Apenas a região detectada
                 * é reduzida.
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


    /*
     * =========================================================
     * TAPE SATURATION
     * =========================================================
     *
     * Somente 1 kHz para cima.
     */

    applyTapeSaturation(
        data,
        sampleRate
    ) {

        const filter =
            this.createHighpassFilter(
                this.options.tapeStartHz,
                sampleRate
            );


        let x1 = 0;

        let x2 = 0;

        let y1 = 0;

        let y2 = 0;


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


            const saturated =
                Math.tanh(
                    highFrequency *
                    drive
                );


            const processed =
                highFrequency +
                (
                    saturated -
                    highFrequency
                ) *
                mix;


            data[i] =
                input +
                (
                    processed -
                    highFrequency
                );
        }
    }


    /*
     * =========================================================
     * UPWARD EXPANDER
     * =========================================================
     */

    applyUpwardExpansion(
        data,
        sampleRate
    ) {

        let envelope = 0;


        const attack =
            this.timeCoefficient(
                this.options.upwardAttackMs,
                sampleRate
            );


        const release =
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
                magnitude >
                envelope
            ) {

                envelope =
                    attack *
                    envelope +
                    (
                        1 -
                        attack
                    ) *
                    magnitude;

            } else {

                envelope =
                    release *
                    envelope +
                    (
                        1 -
                        release
                    ) *
                    magnitude;
            }


            const levelDb =
                this.linearToDb(
                    envelope
                );


            if (
                levelDb >=
                this.options.upwardThresholdDb
            ) {

                continue;
            }


            const distanceDb =
                this.options.upwardThresholdDb -
                levelDb;


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


            const gain =
                this.dbToLinear(
                    boostDb
                );


            data[i] =
                input *
                gain;
        }
    }


    /*
     * =========================================================
     * BANDPASS
     * =========================================================
     */

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
                b0 /
                a0,

            b1:
                b1 /
                a0,

            b2:
                b2 /
                a0,

            a1:
                a1 /
                a0,

            a2:
                a2 /
                a0
        };
    }


    /*
     * =========================================================
     * HIGH-PASS
     * =========================================================
     */

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
                b0 /
                a0,

            b1:
                b1 /
                a0,

            b2:
                b2 /
                a0,

            a1:
                a1 /
                a0,

            a2:
                a2 /
                a0
        };
    }


    /*
     * =========================================================
     * BIQUAD
     * =========================================================
     */

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
            ) +
            (
                filter.b1 *
                x1
            ) +
            (
                filter.b2 *
                x2
            ) -
            (
                filter.a1 *
                y1
            ) -
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


    /*
     * =========================================================
     * TEMPO
     * =========================================================
     */

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


    /*
     * =========================================================
     * CONVERSÃO LINEAR → dB
     * =========================================================
     */

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


    /*
     * =========================================================
     * CONVERSÃO dB → LINEAR
     * =========================================================
     */

    dbToLinear(
        db
    ) {

        return Math.pow(
            10,
            db /
            20
        );
    }


    /*
     * =========================================================
     * VALIDAÇÃO
     * =========================================================
     */

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