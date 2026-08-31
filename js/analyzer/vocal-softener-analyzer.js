"use strict";


class VocalSoftenerAnalyzer {

    constructor(options = {}) {

        this.options = {

            /*
             * Janela utilizada para o cálculo
             * do RMS médio de cada banda.
             */

            windowMs: 300,


            /*
             * =====================================================
             * BANDAS DO VOCAL SOFTENER
             * =====================================================
             */

            bands: [

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
             * =====================================================
             * REFERÊNCIA DAS FREQUÊNCIAS FUNDAMENTAIS
             * =====================================================
             */

            fundamentalLowHz: 100,

            fundamentalHighHz: 800,


            /*
             * =====================================================
             * DETECÇÃO DE ASPEREZA
             * =====================================================
             *
             * Se a energia da banda estiver 6 dB ou mais
             * acima da referência fundamental:
             *
             * threshold - 3 dB
             */

            harshnessDeltaDb: 6,

            harshnessThresholdShiftDb: -3,


            /*
             * Limites de segurança do threshold.
             */

            minimumThresholdDb: -60,

            maximumThresholdDb: -6,


            ...options
        };
    }


    /*
     * =========================================================
     * ANÁLISE PRINCIPAL
     * =========================================================
     */

    analyze(
        audioBuffer
    ) {

        this.validateAudioBuffer(
            audioBuffer
        );


        const sampleRate =
            audioBuffer.sampleRate;


        const mono =
            this.createMonoBuffer(
                audioBuffer
            );


        const windowSamples =
            Math.max(
                1,
                Math.round(
                    sampleRate *
                    (
                        this.options.windowMs /
                        1000
                    )
                )
            );


        /*
         * =====================================================
         * REFERÊNCIA 100–800 Hz
         * =====================================================
         */

        const fundamentalSignal =
            this.filterFundamentalRange(
                mono,
                sampleRate
            );


        const fundamentalRmsDb =
            this.calculateAverageWindowRmsDb(
                fundamentalSignal,
                windowSamples
            );


        /*
         * =====================================================
         * ANÁLISE INDEPENDENTE DAS 8 BANDAS
         * =====================================================
         */

        const bands =
            this.options.bands.map(
                (
                    band
                ) => {

                    const bandFilter =
                        this.createBandpassFilter(
                            band.frequency,
                            band.q,
                            sampleRate
                        );


                    const bandSignal =
                        this.filterBuffer(
                            mono,
                            bandFilter
                        );


                    /*
                     * RMS médio em janelas de 300 ms.
                     */

                    const rmsDb =
                        this.calculateAverageWindowRmsDb(
                            bandSignal,
                            windowSamples
                        );


                    /*
                     * Peak máximo encontrado
                     * na banda analisada.
                     */

                    const peakDb =
                        this.calculatePeakDb(
                            bandSignal
                        );


                    /*
                     * =================================================
                     * THRESHOLD ADAPTATIVO
                     * =================================================
                     *
                     * Threshold =
                     * Peak - (Peak - RMS) × 0.3
                     */

                    let thresholdDb =
                        this.calculateAdaptiveThreshold(
                            rmsDb,
                            peakDb
                        );


                    /*
                     * =================================================
                     * DETECÇÃO DE ASPEREZA
                     * =================================================
                     */

                    const energyDifferenceDb =
                        rmsDb -
                        fundamentalRmsDb;


                    const harshness =
                        energyDifferenceDb >=
                        this.options.harshnessDeltaDb;


                    /*
                     * Se a banda estiver 6 dB ou mais
                     * acima das fundamentais, tornamos
                     * o threshold 3 dB mais sensível.
                     */

                    if (
                        harshness
                    ) {

                        thresholdDb +=
                            this.options.harshnessThresholdShiftDb;
                    }


                    /*
                     * Limite final de segurança.
                     */

                    thresholdDb =
                        this.clamp(
                            thresholdDb,
                            this.options.minimumThresholdDb,
                            this.options.maximumThresholdDb
                        );


                    return {

                        frequency:
                            band.frequency,

                        q:
                            band.q,

                        rmsDb,

                        peakDb,

                        energyDifferenceDb,

                        harshness,

                        thresholdDb,

                        thresholdAdjustmentDb:
                            harshness
                                ? this.options.harshnessThresholdShiftDb
                                : 0
                    };
                }
            );


        /*
         * =====================================================
         * PERFIL ENTREGUE AO VOCAL SOFTENER
         * =====================================================
         */

        return {

            type:
                "vocal-softener",

            sampleRate,

            windowMs:
                this.options.windowMs,

            fundamentalRange: {

                lowHz:
                    this.options.fundamentalLowHz,

                highHz:
                    this.options.fundamentalHighHz,

                rmsDb:
                    fundamentalRmsDb
            },

            bands
        };
    }


    /*
     * =========================================================
     * THRESHOLD ADAPTATIVO
     * =========================================================
     */

    calculateAdaptiveThreshold(
        rmsDb,
        peakDb
    ) {

        if (
            !Number.isFinite(
                rmsDb
            ) ||
            !Number.isFinite(
                peakDb
            )
        ) {

            return this.options.maximumThresholdDb;
        }


        return (
            peakDb -
            (
                peakDb -
                rmsDb
            ) *
            0.3
        );
    }


    /*
     * =========================================================
     * RMS MÉDIO
     * =========================================================
     *
     * Calculado independentemente para cada banda,
     * usando janelas de 300 ms.
     */

    calculateAverageWindowRmsDb(
        data,
        windowSamples
    ) {

        if (
            !data.length
        ) {

            return this.options.maximumThresholdDb;
        }


        let totalRms =
            0;

        let windowCount =
            0;


        for (
            let start = 0;
            start < data.length;
            start += windowSamples
        ) {

            const end =
                Math.min(
                    start +
                    windowSamples,
                    data.length
                );


            let sumSquares =
                0;

            let count =
                0;


            for (
                let i = start;
                i < end;
                i++
            ) {

                const sample =
                    data[i];


                sumSquares +=
                    sample *
                    sample;


                count++;
            }


            if (
                count === 0
            ) {

                continue;
            }


            const rms =
                Math.sqrt(
                    sumSquares /
                    count
                );


            totalRms +=
                rms;


            windowCount++;
        }


        if (
            windowCount === 0
        ) {

            return this.options.maximumThresholdDb;
        }


        const averageRms =
            totalRms /
            windowCount;


        return this.linearToDb(
            averageRms
        );
    }


    /*
     * =========================================================
     * PEAK
     * =========================================================
     */

    calculatePeakDb(
        data
    ) {

        let peak =
            0;


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const magnitude =
                Math.abs(
                    data[i]
                );


            if (
                magnitude >
                peak
            ) {

                peak =
                    magnitude;
            }
        }


        return this.linearToDb(
            peak
        );
    }


    /*
     * =========================================================
     * CONVERSÃO PARA MONO
     * =========================================================
     *
     * A análise representa a energia vocal combinada
     * dos canais.
     */

    createMonoBuffer(
        audioBuffer
    ) {

        const length =
            audioBuffer.length;


        const channels =
            audioBuffer.numberOfChannels;


        const mono =
            new Float32Array(
                length
            );


        for (
            let channel = 0;
            channel < channels;
            channel++
        ) {

            const data =
                audioBuffer.getChannelData(
                    channel
                );


            for (
                let i = 0;
                i < length;
                i++
            ) {

                mono[i] +=
                    data[i] /
                    channels;
            }
        }


        return mono;
    }


    /*
     * =========================================================
     * FILTRO PASSA-FAIXA DAS BANDAS
     * =========================================================
     *
     * Cada banda possui:
     *
     * frequência central própria
     * +
     * Q próprio
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


        const safeQ =
            Math.max(
                0.1,
                q
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
                safeQ
            );


        const a0 =
            1 +
            alpha;


        return {

            b0:
                alpha /
                a0,

            b1:
                0,

            b2:
                -alpha /
                a0,

            a1:
                (
                    -2 *
                    cosine
                ) /
                a0,

            a2:
                (
                    1 -
                    alpha
                ) /
                a0
        };
    }


    /*
     * =========================================================
     * FILTRO REAL DA REFERÊNCIA 100–800 Hz
     * =========================================================
     *
     * Primeiro passa-altas em 100 Hz.
     * Depois passa-baixas em 800 Hz.
     */

    filterFundamentalRange(
        data,
        sampleRate
    ) {

        const highpass =
            this.createHighpassFilter(
                this.options.fundamentalLowHz,
                sampleRate
            );


        const lowpass =
            this.createLowpassFilter(
                this.options.fundamentalHighHz,
                sampleRate
            );


        const highpassed =
            this.filterBuffer(
                data,
                highpass
            );


        return this.filterBuffer(
            highpassed,
            lowpass
        );
    }


    /*
     * =========================================================
     * FILTRO GENÉRICO
     * =========================================================
     *
     * Aplica um biquad ao buffer inteiro.
     *
     * Este método é utilizado pelo Analyzer tanto
     * nas bandas passa-faixa quanto na referência
     * fundamental de 100–800 Hz.
     */

    filterBuffer(
        data,
        filter
    ) {

        if (
            !data ||
            typeof data.length !== "number"
        ) {

            throw new Error(
                "VocalSoftenerAnalyzer: dados de filtro inválidos."
            );
        }


        if (
            !filter ||
            !Number.isFinite(filter.b0) ||
            !Number.isFinite(filter.b1) ||
            !Number.isFinite(filter.b2) ||
            !Number.isFinite(filter.a1) ||
            !Number.isFinite(filter.a2)
        ) {

            throw new Error(
                "VocalSoftenerAnalyzer: coeficientes do filtro inválidos."
            );
        }


        const output =
            new Float32Array(
                data.length
            );


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

            const filtered =
                this.processBiquad(
                    data[i],
                    filter,
                    x1,
                    x2,
                    y1,
                    y2
                );


            output[i] =
                filtered.output;


            x1 =
                filtered.x1;

            x2 =
                filtered.x2;

            y1 =
                filtered.y1;

            y2 =
                filtered.y2;
        }


        return output;
    }


    /*
     * =========================================================
     * PASSA-ALTAS
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


        const a0 =
            1 +
            alpha;


        return {

            b0:
                (
                    1 +
                    cosine
                ) /
                2 /
                a0,

            b1:
                -(
                    1 +
                    cosine
                ) /
                a0,

            b2:
                (
                    1 +
                    cosine
                ) /
                2 /
                a0,

            a1:
                (
                    -2 *
                    cosine
                ) /
                a0,

            a2:
                (
                    1 -
                    alpha
                ) /
                a0
        };
    }


    /*
     * =========================================================
     * PASSA-BAIXAS
     * =========================================================
     */

    createLowpassFilter(
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


        const a0 =
            1 +
            alpha;


        return {

            b0:
                (
                    1 -
                    cosine
                ) /
                2 /
                a0,

            b1:
                (
                    1 -
                    cosine
                ) /
                a0,

            b2:
                (
                    1 -
                    cosine
                ) /
                2 /
                a0,

            a1:
                (
                    -2 *
                    cosine
                ) /
                a0,

            a2:
                (
                    1 -
                    alpha
                ) /
                a0
        };
    }


    /*
     * =========================================================
     * PROCESSAMENTO BIQUAD
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
     * LIMITADOR
     * =========================================================
     */

    clamp(
        value,
        minimum,
        maximum
    ) {

        return Math.max(
            minimum,
            Math.min(
                maximum,
                value
            )
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
                "VocalSoftenerAnalyzer: AudioBuffer inválido."
            );
        }


        if (
            audioBuffer.length <= 0 ||
            audioBuffer.sampleRate <= 0 ||
            audioBuffer.numberOfChannels <= 0
        ) {

            throw new Error(
                "VocalSoftenerAnalyzer: áudio vazio ou inválido."
            );
        }
    }
}


/*
 * =========================================================
 * DISPONIBILIZAÇÃO GLOBAL
 * =========================================================
 */

window.VocalSoftenerAnalyzer =
    VocalSoftenerAnalyzer;