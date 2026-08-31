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
 * TAPE SATURATOR — 15 IPS / HIGH OUTPUT / OVERBIAS
 * =====================================================
 *
 * Modelo inspirado em fita moderna de alta saída.
 *
 * 15 IPS:
 * - head bump em 60–150 Hz
 * - suavização progressiva do extremo superior
 *
 * Overbias:
 * - reduz a tendência de dureza no alto
 * - aumenta suavemente a não-linearidade
 *
 * Flux:
 * - controla quanto o sinal entra na região
 *   magnética de saturação.
 */

tapeSpeedIps: 15,
    
    tapeStartHz: 1000,
    
    tapeHeadBumpCenterHz: 95,
    
    tapeHeadBumpGainDb: 1.25,
    
    tapeHighRolloffStartHz: 6500,
    
    tapeHighRolloffDb: -1.8,
    
    tapeBias: 1.18,
    
    tapeFlux: 1.25,
    
    tapeDrive: 1.55,
    
    tapeMix: 0.72,
    
    tapeOddHarmonicAmount: 0.78,
    
    tapeTransientCompressionDb: 1.5,


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

    /*
     * =====================================================
     * TAPE 15 IPS
     * =====================================================
     *
     * O processamento é feito por bandas:
     *
     * 1. Head bump 60–150 Hz
     * 2. Saturação magnética
     * 3. Roll-off suave do extremo superior
     *
     * A região abaixo de 1 kHz permanece fora
     * da saturação principal.
     */


    const startHz =
        this.options.tapeStartHz;


    const headBumpCenter =
        this.options.tapeHeadBumpCenterHz;


    const headBumpGain =
        this.dbToLinear(
            this.options.tapeHeadBumpGainDb
        );


    const highRolloffStart =
        this.options.tapeHighRolloffStartHz;


    const highRolloffGain =
        this.dbToLinear(
            this.options.tapeHighRolloffDb
        );


    const bias =
        Math.max(
            0.1,
            this.options.tapeBias
        );


    const flux =
        Math.max(
            0.1,
            this.options.tapeFlux
        );


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


    const oddAmount =
        Math.max(
            0,
            Math.min(
                1,
                this.options.tapeOddHarmonicAmount
            )
        );


createPeakFilter(
    frequency,
    q,
    gainLinear,
    sampleRate
) 
{

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


    const safeQ =
        Math.max(
            0.1,
            q
        );


    const alpha =
        sine /
        (
            2 *
            safeQ
        );


    const gainDb =
        20 *
        Math.log10(
            gainLinear
        );


    const A =
        Math.pow(
            10,
            gainDb /
            40
        );


    const alphaGain =
        alpha *
        A;


    const alphaDivide =
        alpha /
        A;


    const b0 =
        1 +
        alphaGain;


    const b1 =
        -2 *
        cosine;


    const b2 =
        1 -
        alphaGain;


    const a0 =
        1 +
        alphaDivide;


    const a1 =
        -2 *
        cosine;


    const a2 =
        1 -
        alphaDivide;


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


createLowShelfFilter(
    frequency,
    gainLinear,
    sampleRate
) 
{

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


    const gainDb =
        20 *
        Math.log10(
            gainLinear
        );


    const A =
        Math.pow(
            10,
            gainDb /
            40
        );


    const alpha =
        sine /
        2 *
        Math.SQRT2;


    const twoSqrtAAlpha =
        2 *
        Math.sqrt(
            A
        ) *
        alpha;


    const beta =
        2 *
        Math.sqrt(
            A
        ) *
        alpha;


    const b0 =
        A *
        (
            (
                A + 1
            ) -
            (
                A - 1
            ) *
            cosine +
            beta
        );


    const b1 =
        2 *
        A *
        (
            (
                A - 1
            ) -
            (
                A + 1
            ) *
            cosine
        );


    const b2 =
        A *
        (
            (
                A + 1
            ) -
            (
                A - 1
            ) *
            cosine -
            beta
        );


    const a0 =
        (
            A + 1
        ) +
        (
            A - 1
        ) *
        cosine +
        twoSqrtAAlpha;


    const a1 =
        -2 *
        (
            (
                A - 1
            ) +
            (
                A + 1
            ) *
            cosine
        );


    const a2 =
        (
            A + 1
        ) +
        (
            A - 1
        ) *
        cosine -
        twoSqrtAAlpha;


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
     * =====================================================
     * FILTROS
     * =====================================================
     */

    const saturationHighpass =
        this.createHighpassFilter(
            startHz,
            sampleRate
        );


    const headBumpFilter =
        this.createPeakFilter(
            headBumpCenter,
            0.85,
            headBumpGain,
            sampleRate
        );


    const highRolloffFilter =
        this.createLowShelfFilter(
            highRolloffStart,
            highRolloffGain,
            sampleRate
        );


    let hpX1 = 0;
    let hpX2 = 0;
    let hpY1 = 0;
    let hpY2 = 0;


    let bumpX1 = 0;
    let bumpX2 = 0;
    let bumpY1 = 0;
    let bumpY2 = 0;


    let rollX1 = 0;
    let rollX2 = 0;
    let rollY1 = 0;
    let rollY2 = 0;


    /*
     * =====================================================
     * PROCESSAMENTO
     * =====================================================
     */

    for (
        let i = 0;
        i < data.length;
        i++
    ) {

        const input =
            data[i];


        /*
         * ---------------------------------------------
         * HEAD BUMP
         * ---------------------------------------------
         *
         * Reforço muito suave na região de
         * aproximadamente 60–150 Hz.
         */

        const bumpResult =
            this.processBiquad(
                input,
                headBumpFilter,
                bumpX1,
                bumpX2,
                bumpY1,
                bumpY2
            );


        bumpX1 =
            bumpResult.x1;

        bumpX2 =
            bumpResult.x2;

        bumpY1 =
            bumpResult.y1;

        bumpY2 =
            bumpResult.y2;


        let signal =
            input +
            (
                bumpResult.output -
                input
            ) *
            0.55;


        /*
         * ---------------------------------------------
         * REGIÃO DE SATURAÇÃO
         * ---------------------------------------------
         */

        const highResult =
            this.processBiquad(
                signal,
                saturationHighpass,
                hpX1,
                hpX2,
                hpY1,
                hpY2
            );


        hpX1 =
            highResult.x1;

        hpX2 =
            highResult.x2;

        hpY1 =
            highResult.y1;

        hpY2 =
            highResult.y2;


        const highPart =
            highResult.output;


        /*
         * ---------------------------------------------
         * FLUXO MAGNÉTICO
         * ---------------------------------------------
         *
         * O fluxo aumenta a intensidade com que
         * o sinal entra na curva magnética.
         */

        const driven =
            highPart *
            drive *
            flux;


        /*
         * ---------------------------------------------
         * CURVA MAGNÉTICA COM ÊNFASE EM ÍMPARES
         * ---------------------------------------------
         *
         * A primeira parcela produz a compressão
         * suave da fita.
         *
         * As parcelas seguintes reforçam principalmente
         * componentes ímpares.
         */

        const saturated =
            Math.tanh(
                driven /
                bias
            );


        const third =
            Math.pow(
                saturated,
                3
            );


        const fifth =
            Math.pow(
                saturated,
                5
            );


        const seventh =
            Math.pow(
                saturated,
                7
            );


        const oddCurve =
            saturated +
            (
                third *
                0.24
            ) +
            (
                fifth *
                0.08
            ) +
            (
                seventh *
                0.035
            );


        /*
         * Mantém a saturação controlada.
         */

        const normalized =
            Math.tanh(
                oddCurve
            );


        /*
         * ---------------------------------------------
         * COMPRESSÃO SUAVE DOS TRANSIENTES
         * ---------------------------------------------
         */

        const driveLevel =
            Math.abs(
                driven
            );


        const transientLimit =
            this.dbToLinear(
                this.options.tapeTransientCompressionDb
            );


        let transientGain =
            1;


        if (
            driveLevel >
            transientLimit
        ) {

            transientGain =
                transientLimit /
                driveLevel;
        }


        const compressedHigh =
            highPart *
            (
                1 +
                (
                    transientGain -
                    1
                ) *
                0.65
            );


        /*
         * ---------------------------------------------
         * MISTURA DA SATURAÇÃO
         * ---------------------------------------------
         */

        const saturatedHigh =
            compressedHigh *
            (
                1 -
                oddAmount
            )
            +
            (
                compressedHigh *
                normalized
            ) *
            oddAmount;


        signal =
            signal +
            (
                saturatedHigh -
                highPart
            ) *
            mix;


        /*
         * ---------------------------------------------
         * HIGH-END ROLL-OFF
         * ---------------------------------------------
         *
         * Pequena suavização do extremo superior.
         */

        const rollResult =
            this.processBiquad(
                signal,
                highRolloffFilter,
                rollX1,
                rollX2,
                rollY1,
                rollY2
            );


        rollX1 =
            rollResult.x1;

        rollX2 =
            rollResult.x2;

        rollY1 =
            rollResult.y1;

        rollY2 =
            rollResult.y2;


        /*
         * Aplique apenas parte do roll-off,
         * evitando transformar o efeito em EQ.
         */

        signal =
            signal +
            (
                rollResult.output -
                signal
            ) *
            0.48;


        /*
         * Segurança contra níveis excessivos.
         */

        data[i] =
            Math.max(
                -1,
                Math.min(
                    1,
                    signal
                )
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