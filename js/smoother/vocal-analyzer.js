// ==========================================
// SMOOTHVSTUDIO
// VOCAL ANALYZER
// V0.4
// ==========================================
//
// Analisa o vocal antes do processamento.
//
// O Analyzer NÃO modifica o áudio.
//
// Evolução V0.4:
//
// - análise geral do vocal
// - análise por bandas
// - análise temporal da sibilância
// - detecção de picos de energia sibilante
// - estimativa de atividade sibilante
//
// A análise temporal prepara o motor para,
// futuramente, aplicar de-essing somente nos
// momentos em que a sibilância realmente
// aparece.
//
// Arquitetura modular:
// este módulo pode evoluir
// independentemente de:
//
// - VocalDynamics
// - VocalSibilance
// - VocalSmoother
//
// ==========================================


class VocalAnalyzer {


    constructor(options = {}) {

        this.sampleRate =
            options.sampleRate ||
            44100;


        this.windowMs =
            options.windowMs ??
            20;


        this.hopMs =
            options.hopMs ??
            10;


        this.analysis =
            null;
    }


    // ======================================
    // LIMITADOR
    // ======================================

    clamp(
        value,
        min,
        max
    ) {

        return Math.min(
            max,
            Math.max(
                min,
                value
            )
        );
    }


    // ======================================
    // AMPLITUDE → DB
    // ======================================

    amplitudeToDb(
        amplitude
    ) {

        if (
            amplitude <= 0
        ) {

            return -120;
        }


        return 20 *
            Math.log10(
                amplitude
            );
    }


    // ======================================
    // RMS
    // ======================================

    calculateRMS(
        data
    ) {

        if (
            !data ||
            data.length === 0
        ) {

            return 0;
        }


        let sum = 0;


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const sample =
                data[i];


            sum +=
                sample *
                sample;
        }


        return Math.sqrt(
            sum /
            data.length
        );
    }


    // ======================================
    // RMS DE UMA REGIÃO
    // ======================================

    calculateRMSRange(
        data,
        start,
        end
    ) {

        if (
            !data ||
            data.length === 0
        ) {

            return 0;
        }


        const safeStart =
            Math.max(
                0,
                Math.floor(start)
            );


        const safeEnd =
            Math.min(
                data.length,
                Math.floor(end)
            );


        if (
            safeEnd <= safeStart
        ) {

            return 0;
        }


        let sum = 0;


        for (
            let i = safeStart;
            i < safeEnd;
            i++
        ) {

            const sample =
                data[i];


            sum +=
                sample *
                sample;
        }


        return Math.sqrt(
            sum /
            (
                safeEnd -
                safeStart
            )
        );
    }


    // ======================================
    // PICO
    // ======================================

    calculatePeak(
        data
    ) {

        let peak = 0;


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const value =
                Math.abs(
                    data[i]
                );


            if (
                value > peak
            ) {

                peak = value;
            }
        }


        return peak;
    }


    // ======================================
    // FILTRO LOW-PASS SIMPLES
    // ======================================

    lowPass(
        data,
        sampleRate,
        cutoff
    ) {

        const output =
            new Float32Array(
                data.length
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
            dt /
            (
                rc +
                dt
            );


        let previous =
            0;


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            previous +=
                alpha *
                (
                    data[i] -
                    previous
                );


            output[i] =
                previous;
        }


        return output;
    }


    // ======================================
    // ENERGIA DE UMA FAIXA
    // ======================================

    calculateBandEnergy(
        data,
        sampleRate,
        lowCut,
        highCut
    ) {

        const lowPassed =
            this.lowPass(
                data,
                sampleRate,
                highCut
            );


        let highPassed;


        if (
            lowCut <= 20
        ) {

            highPassed =
                data;

        } else {

            const lower =
                this.lowPass(
                    data,
                    sampleRate,
                    lowCut
                );


            highPassed =
                new Float32Array(
                    data.length
                );


            for (
                let i = 0;
                i < data.length;
                i++
            ) {

                highPassed[i] =
                    lowPassed[i] -
                    lower[i];
            }
        }


        return this.calculateRMS(
            highPassed
        );
    }


    // ======================================
    // CRIAR BANDA FILTRADA
    // ======================================
    //
    // Diferentemente de calculateBandEnergy,
    // este método mantém o sinal filtrado.
    //
    // Isso permite analisar a evolução da
    // energia sibilante ao longo do tempo.
    //
    // ======================================

    createBandSignal(
        data,
        sampleRate,
        lowCut,
        highCut
    ) {

        const high =
            this.lowPass(
                data,
                sampleRate,
                highCut
            );


        if (
            lowCut <= 20
        ) {

            return high;
        }


        const low =
            this.lowPass(
                data,
                sampleRate,
                lowCut
            );


        const band =
            new Float32Array(
                data.length
            );


        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            band[i] =
                high[i] -
                low[i];
        }


        return band;
    }


    // ======================================
    // MONO
    // ======================================

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


    // ======================================
    // ANALISAR SIBILÂNCIA NO TEMPO
    // ======================================
    //
    // A V0.3 observava apenas a energia
    // média de 5–9.5 kHz.
    //
    // A V0.4 também observa pequenas janelas.
    //
    // Isso permite distinguir:
    //
    // vocal com brilho constante
    //
    // de:
    //
    // vocal com picos curtos de S / SH / CH.
    //
    // ======================================

    analyzeSibilanceTimeline(
        mono,
        sampleRate,
        totalRms
    ) {

        const sibilanceSignal =
            this.createBandSignal(
                mono,
                sampleRate,
                5000,
                9500
            );


        const windowSize =
            Math.max(
                1,
                Math.floor(
                    sampleRate *
                    (
                        this.windowMs /
                        1000
                    )
                )
            );


        const hopSize =
            Math.max(
                1,
                Math.floor(
                    sampleRate *
                    (
                        this.hopMs /
                        1000
                    )
                )
            );


        const frames =
            [];


        let peakEnergy =
            0;


        let sumEnergy =
            0;


        let activeFrames =
            0;


        /*
         * O limiar de atividade é relativo
         * ao RMS geral do vocal.
         *
         * Assim, o mesmo valor absoluto
         * não precisa funcionar para todos
         * os arquivos.
         */

        const activityThreshold =
            Math.max(
                totalRms *
                0.18,
                0.00001
            );


        for (
            let start = 0;
            start < mono.length;
            start += hopSize
        ) {

            const end =
                Math.min(
                    mono.length,
                    start +
                    windowSize
                );


            if (
                end <= start
            ) {

                break;
            }


            const rms =
                this.calculateRMSRange(
                    sibilanceSignal,
                    start,
                    end
                );


            const db =
                this.amplitudeToDb(
                    rms
                );


            const time =
                start /
                sampleRate;


            frames.push({

                time,

                rms,

                db
            });


            sumEnergy +=
                rms;


            if (
                rms >
                peakEnergy
            ) {

                peakEnergy =
                    rms;
            }


            if (
                rms >
                activityThreshold
            ) {

                activeFrames++;
            }
        }


        const frameCount =
            frames.length;


        const averageEnergy =
            frameCount > 0
                ? sumEnergy /
                  frameCount
                : 0;


        const activity =
            frameCount > 0
                ? activeFrames /
                  frameCount
                : 0;


        /*
         * Relação entre o pico sibilante
         * e a energia média.
         *
         * Picos muito superiores à média
         * indicam maior possibilidade de
         * eventos sibilantes concentrados.
         */

        const peakToAverage =
            averageEnergy > 0
                ? peakEnergy /
                  averageEnergy
                : 0;


        /*
         * Normalização adaptativa.
         *
         * Não usamos um único número absoluto.
         * O resultado considera:
         *
         * - intensidade média
         * - pico
         * - concentração temporal
         */

        const averageRelative =
            totalRms > 0
                ? averageEnergy /
                  totalRms
                : 0;


        const peakRelative =
            totalRms > 0
                ? peakEnergy /
                  totalRms
                : 0;


        const averageScore =
            this.clamp(
                averageRelative *
                4,
                0,
                1
            );


        const peakScore =
            this.clamp(
                peakRelative *
                5,
                0,
                1
            );


        const concentrationScore =
            this.clamp(
                (
                    peakToAverage -
                    1
                ) /
                4,
                0,
                1
            );


        const activityScore =
            this.clamp(
                activity *
                2.5,
                0,
                1
            );


        /*
         * O score temporal não substitui
         * o score espectral.
         *
         * Ele acrescenta informação.
         */

        const temporalScore =
            this.clamp(
                (
                    averageScore *
                    0.30
                ) +
                (
                    peakScore *
                    0.35
                ) +
                (
                    concentrationScore *
                    0.20
                ) +
                (
                    activityScore *
                    0.15
                ),
                0,
                1
            );


        return {

            windowMs:
                this.windowMs,

            hopMs:
                this.hopMs,

            frameCount,

            averageEnergy,

            peakEnergy,

            peakDb:
                this.amplitudeToDb(
                    peakEnergy
                ),

            activity,

            peakToAverage,

            averageRelative,

            peakRelative,

            temporalScore,

            frames
        };
    }


    // ======================================
    // ANALISAR
    // ======================================

    analyzeBuffer(
        audioBuffer
    ) {

        if (
            !audioBuffer
        ) {

            throw new Error(
                "AudioBuffer inválido."
            );
        }


        const sampleRate =
            audioBuffer.sampleRate;


        this.sampleRate =
            sampleRate;


        const mono =
            this.createMonoBuffer(
                audioBuffer
            );


        const rms =
            this.calculateRMS(
                mono
            );


        const peak =
            this.calculatePeak(
                mono
            );


        const rmsDb =
            this.amplitudeToDb(
                rms
            );


        const peakDb =
            this.amplitudeToDb(
                peak
            );


        // ==================================
        // BANDAS
        // ==================================

        const body =
            this.calculateBandEnergy(
                mono,
                sampleRate,
                120,
                500
            );


        const lowMid =
            this.calculateBandEnergy(
                mono,
                sampleRate,
                500,
                1200
            );


        const mid =
            this.calculateBandEnergy(
                mono,
                sampleRate,
                1200,
                2500
            );


        const presence =
            this.calculateBandEnergy(
                mono,
                sampleRate,
                2500,
                5000
            );


        const sibilance =
            this.calculateBandEnergy(
                mono,
                sampleRate,
                5000,
                9500
            );


        const air =
            this.calculateBandEnergy(
                mono,
                sampleRate,
                9500,
                14000
            );


        const total =
            body +
            lowMid +
            mid +
            presence +
            sibilance +
            air +
            0.000001;


        // ==================================
        // PROPORÇÕES
        // ==================================

        const bodyRatio =
            body /
            total;


        const presenceRatio =
            presence /
            total;


        const sibilanceRatio =
            sibilance /
            total;


        const airRatio =
            air /
            total;


        // ==================================
        // ANÁLISE TEMPORAL
        // ==================================

        const sibilanceTimeline =
            this.analyzeSibilanceTimeline(
                mono,
                sampleRate,
                rms
            );


        // ==================================
        // CARACTERÍSTICAS
        // ==================================

        /*
         * A dureza continua sendo baseada
         * principalmente na relação entre
         * presença e corpo.
         */

        const hardness =
            this.clamp(
                (
                    presenceRatio *
                    4.5
                ) -
                (
                    bodyRatio *
                    0.8
                ),
                0,
                1
            );


        /*
         * A aspereza considera presença,
         * sibilância e ar.
         */

        const roughness =
            this.clamp(
                (
                    presenceRatio *
                    2.5
                ) +
                (
                    sibilanceRatio *
                    2.5
                ) +
                (
                    airRatio *
                    0.8
                ),
                0,
                1
            );


        /*
         * Sibilância V0.4.
         *
         * O valor geral continua disponível,
         * mas agora recebe uma pequena
         * contribuição da análise temporal.
         *
         * Isso permite ao motor saber não
         * apenas QUANTA energia existe,
         * mas também se ela aparece em
         * eventos concentrados.
         */

        const spectralSibilance =
            this.clamp(
                sibilanceRatio *
                6,
                0,
                1
            );


        const temporalSibilance =
            sibilanceTimeline
                .temporalScore;


        const sibilanceAmount =
            this.clamp(
                (
                    spectralSibilance *
                    0.60
                ) +
                (
                    temporalSibilance *
                    0.40
                ),
                0,
                1
            );


        /*
         * Corpo indica quanto existe de
         * energia útil na região grave/média
         * do vocal.
         */

        const bodyAmount =
            this.clamp(
                (
                    bodyRatio +
                    (
                        lowMid /
                        total
                    )
                ) *
                3,
                0,
                1
            );


        /*
         * Presença útil.
         *
         * Não queremos simplesmente cortar
         * presença porque ela é importante
         * para inteligibilidade no rap.
         */

        const presenceAmount =
            this.clamp(
                presenceRatio *
                5,
                0,
                1
            );


        // ==================================
        // RESULTADO
        // ==================================

        this.analysis = {

            version:
                "0.4",

            sampleRate,

            channels:
                audioBuffer.numberOfChannels,

            duration:
                audioBuffer.duration,

            rms,

            rmsDb,

            peak,

            peakDb,


            bands: {

                body,

                lowMid,

                mid,

                presence,

                sibilance,

                air
            },


            ratios: {

                body:
                    bodyRatio,

                presence:
                    presenceRatio,

                sibilance:
                    sibilanceRatio,

                air:
                    airRatio
            },


            characteristics: {

                hardness,

                roughness,

                sibilance:
                    sibilanceAmount,

                body:
                    bodyAmount,

                presence:
                    presenceAmount
            },


            sibilanceAnalysis: {

                spectral:
                    spectralSibilance,

                temporal:
                    temporalSibilance,

                amount:
                    sibilanceAmount,

                windowMs:
                    sibilanceTimeline
                        .windowMs,

                hopMs:
                    sibilanceTimeline
                        .hopMs,

                averageEnergy:
                    sibilanceTimeline
                        .averageEnergy,

                peakEnergy:
                    sibilanceTimeline
                        .peakEnergy,

                peakDb:
                    sibilanceTimeline
                        .peakDb,

                activity:
                    sibilanceTimeline
                        .activity,

                peakToAverage:
                    sibilanceTimeline
                        .peakToAverage,

                averageRelative:
                    sibilanceTimeline
                        .averageRelative,

                peakRelative:
                    sibilanceTimeline
                        .peakRelative
            }
        };


        return this.analysis;
    }


    // ======================================
    // ÚLTIMA ANÁLISE
    // ======================================

    getAnalysis() {

        return this.analysis;
    }
}


// ==========================================
// DISPONIBILIZAR
// ==========================================

window.VocalAnalyzer =
    VocalAnalyzer;