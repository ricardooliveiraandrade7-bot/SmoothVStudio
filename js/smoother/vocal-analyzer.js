// ==========================================
// SMOOTHVSTUDIO
// VOCAL ANALYZER
// V0.7
// ==========================================
//
// Analisa o vocal antes do processamento.
//
// O Analyzer NÃO modifica o áudio.
//
// V0.7:
//
// - análise geral
// - análise por bandas
// - análise temporal de sibilância
// - análise temporal de roughness
// - análise preliminar de ruído
// - microjanelas de baixa atividade
// - agrupamento de microjanelas
// - acumulação de evidências
// - estabilidade espectral
// - repetição de ocorrências
// - confiança adaptativa
// - refinamento conservador de hardness
//
// IMPORTANTE:
//
// Esta versão NÃO remove ruído.
//
// Ela somente melhora a identificação
// do possível perfil de ruído e das
// evidências espectrais/temporais.
//
// A nova análise de roughness NÃO aplica
// processamento.
//
// Ela somente fornece evidência para
// camadas posteriores.
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


        // ==================================
        // CONFIGURAÇÃO ROUGHNESS
        // ==================================
        //
        // A região principal de harshness/
        // roughness permanece separada da
        // região principal de sibilância.
        //
        // ==================================

        this.roughnessLowCut =
            options.roughnessLowCut ??
            2500;

        this.roughnessHighCut =
            options.roughnessHighCut ??
            5000;


        this.roughnessActivityThreshold =
            options.roughnessActivityThreshold ??
            0.12;


        this.roughnessVariationThreshold =
            options.roughnessVariationThreshold ??
            0.08;


        this.minimumRoughnessFrames =
            options.minimumRoughnessFrames ??
            3;


        this.minimumRoughnessConfidence =
            options.minimumRoughnessConfidence ??
            0.45;


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
    // LOW PASS
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

        let previous = 0;

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
    // ENERGIA DE BANDA
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
    // CRIAR BANDA
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
    // TIMELINE DE SIBILÂNCIA
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

        const frames = [];

        let peakEnergy = 0;
        let sumEnergy = 0;
        let activeFrames = 0;

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
                rms > peakEnergy
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

        const peakToAverage =
            averageEnergy > 0
                ? peakEnergy /
                  averageEnergy
                : 0;

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
    // TIMELINE DE ROUGHNESS V0.7
    // ======================================
    //
    // Esta análise procura comportamento
    // temporal irregular na região de
    // 2,5–5 kHz.
    //
    // Ela NÃO interpreta simplesmente
    // energia alta como roughness.
    //
    // A evidência depende de:
    //
    // - energia relativa;
    // - variação entre frames;
    // - persistência;
    // - atividade;
    // - repetição;
    // - estabilidade da evidência.
    //
    // A região é deliberadamente separada
    // da sibilância principal (5–9,5 kHz).
    //
    // ======================================

    analyzeRoughnessTimeline(
        mono,
        sampleRate,
        totalRms
    ) {

        const roughnessSignal =
            this.createBandSignal(
                mono,
                sampleRate,
                this.roughnessLowCut,
                this.roughnessHighCut
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


        if (
            mono.length === 0 ||
            totalRms <= 0
        ) {

            return {

                available:
                    false,

                confidence:
                    0,

                amount:
                    0,

                temporalScore:
                    0,

                averageEnergy:
                    0,

                peakEnergy:
                    0,

                averageRelative:
                    0,

                peakRelative:
                    0,

                activity:
                    0,

                variation:
                    0,

                persistence:
                    0,

                repetition:
                    0,

                stability:
                    0,

                activeFrames:
                    0,

                frameCount:
                    0,

                candidateRuns:
                    0,

                candidateFrames:
                    0,

                frames:
                    []
            };
        }


        const frames = [];


        let sumEnergy =
            0;


        let peakEnergy =
            0;


        let activeFrames =
            0;


        let candidateFrames =
            0;


        let candidateRuns =
            0;


        let currentRun =
            0;


        let persistentFrames =
            0;


        let totalVariation =
            0;


        let variationComparisons =
            0;


        let stabilitySum =
            0;


        let stabilityComparisons =
            0;


        let previousRelative =
            null;


        let previousDb =
            null;


        const activityThreshold =
            Math.max(
                totalRms *
                this.roughnessActivityThreshold,
                0.00001
            );


        const candidateThreshold =
            Math.max(
                totalRms *
                this.roughnessVariationThreshold,
                0.00001
            );


        const minimumRunFrames =
            Math.max(
                2,
                this.minimumRoughnessFrames
            );


        const finishRun =
            () => {

                if (
                    currentRun >=
                    minimumRunFrames
                ) {

                    candidateRuns++;

                    persistentFrames +=
                        currentRun;
                }

                currentRun =
                    0;
            };


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
                    roughnessSignal,
                    start,
                    end
                );


            const relative =
                totalRms > 0
                    ? rms /
                      totalRms
                    : 0;


            const db =
                this.amplitudeToDb(
                    rms
                );


            const time =
                start /
                sampleRate;


            let variation =
                0;


            let frameStability =
                0;


            if (
                previousRelative !==
                null
            ) {

                variation =
                    Math.abs(
                        relative -
                        previousRelative
                    );


                const dbVariation =
                    Math.abs(
                        db -
                        previousDb
                    );


                totalVariation +=
                    variation;


                variationComparisons++;


                /*
                 * Variações moderadas e
                 * persistentes são mais úteis
                 * que saltos isolados.
                 */

                const variationStability =
                    this.clamp(
                        1 -
                        (
                            dbVariation /
                            12
                        ),
                        0,
                        1
                    );


                frameStability =
                    variationStability;


                stabilitySum +=
                    frameStability;


                stabilityComparisons++;
            }


            const isActive =
                rms >
                activityThreshold;


            const isCandidate =
                isActive &&
                (
                    relative >
                    this.roughnessVariationThreshold
                );


            if (
                isActive
            ) {

                activeFrames++;
            }


            if (
                isCandidate
            ) {

                candidateFrames++;
                currentRun++;
            }

            else {

                finishRun();
            }


            sumEnergy +=
                rms;


            if (
                rms >
                peakEnergy
            ) {

                peakEnergy =
                    rms;
            }


            frames.push({

                time,

                rms,

                db,

                relative,

                variation,

                stability:
                    frameStability,

                active:
                    isActive,

                candidate:
                    isCandidate
            });


            previousRelative =
                relative;


            previousDb =
                db;
        }


        finishRun();


        const frameCount =
            frames.length;


        if (
            frameCount === 0
        ) {

            return {

                available:
                    false,

                confidence:
                    0,

                amount:
                    0,

                temporalScore:
                    0,

                averageEnergy:
                    0,

                peakEnergy:
                    0,

                averageRelative:
                    0,

                peakRelative:
                    0,

                activity:
                    0,

                variation:
                    0,

                persistence:
                    0,

                repetition:
                    0,

                stability:
                    0,

                activeFrames:
                    0,

                frameCount:
                    0,

                candidateRuns:
                    0,

                candidateFrames:
                    0,

                frames
            };
        }


        const averageEnergy =
            sumEnergy /
            frameCount;


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


        const activity =
            activeFrames /
            frameCount;


        const variation =
            variationComparisons > 0
                ? totalVariation /
                  variationComparisons
                : 0;


        const persistence =
            candidateFrames > 0
                ? persistentFrames /
                  candidateFrames
                : 0;


        const repetition =
            this.clamp(
                candidateRuns /
                5,
                0,
                1
            );


        const stability =
            stabilityComparisons > 0
                ? stabilitySum /
                  stabilityComparisons
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
                3,
                0,
                1
            );


        const variationScore =
            this.clamp(
                variation /
                0.12,
                0,
                1
            );


        const persistenceScore =
            this.clamp(
                persistence,
                0,
                1
            );


        const activityScore =
            this.clamp(
                activity *
                1.5,
                0,
                1
            );


        /*
         * A estabilidade aqui não significa
         * que o sinal deve ser perfeitamente
         * estável.
         *
         * Ela representa confiança de que
         * a evidência foi observada de forma
         * consistente entre frames.
         */

        const confidence =
            this.clamp(
                (
                    persistenceScore *
                    0.30
                ) +
                (
                    repetition *
                    0.20
                ) +
                (
                    stability *
                    0.20
                ) +
                (
                    activityScore *
                    0.15
                ) +
                (
                    averageScore *
                    0.15
                ),
                0,
                1
            );


        /*
         * Roughness temporal.
         *
         * A energia sozinha recebe peso
         * limitado.
         *
         * A variação também não domina
         * sozinha.
         */

        const temporalScore =
            this.clamp(
                (
                    averageScore *
                    0.20
                ) +
                (
                    peakScore *
                    0.10
                ) +
                (
                    variationScore *
                    0.25
                ) +
                (
                    persistenceScore *
                    0.20
                ) +
                (
                    repetition *
                    0.10
                ) +
                (
                    activityScore *
                    0.10
                ) +
                (
                    stability *
                    0.05
                ),
                0,
                1
            );


        const available =
            candidateFrames >=
            this.minimumRoughnessFrames &&
            confidence >=
            this.minimumRoughnessConfidence;


        const amount =
            available
                ? this.clamp(
                    temporalScore *
                    (
                        0.60 +
                        (
                            confidence *
                            0.40
                        )
                    ),
                    0,
                    1
                )
                : this.clamp(
                    temporalScore *
                    confidence *
                    0.50,
                    0,
                    1
                );


        return {

            available,

            confidence,

            amount,

            temporalScore,

            averageEnergy,

            peakEnergy,

            averageRelative,

            peakRelative,

            activity,

            variation,

            persistence,

            repetition,

            stability,

            activeFrames,

            frameCount,

            candidateRuns,

            candidateFrames,

            frames
        };
    }
        // ======================================
    // PERFIL DE RUÍDO V0.6
    // ======================================
    //
    // A grande mudança desta versão:
    //
    // não dependemos de silêncio longo.
    //
    // Pequenas janelas podem acumular
    // evidências ao longo da gravação.
    //
    // ======================================

    analyzeNoiseProfile(
        mono,
        sampleRate,
        totalRms
    ) {

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

        if (
            mono.length === 0 ||
            totalRms <= 0
        ) {

            return {

                available:
                    false,

                confidence:
                    0,

                floor:
                    0,

                floorDb:
                    -120,

                floorRelative:
                    0,

                low:
                    0,

                mid:
                    0,

                high:
                    0,

                lowRelative:
                    0,

                midRelative:
                    0,

                highRelative:
                    0,

                persistence:
                    0,

                repetition:
                    0,

                stability:
                    0,

                microDurationMs:
                    0,

                candidateRuns:
                    0,

                candidateFrames:
                    0,

                profile:
                    "unknown"
            };
        }


        const lowActivityThreshold =
            Math.max(
                totalRms *
                0.22,
                0.00001
            );


        const minimumRunFrames =
            2;


        const maximumRunFrames =
            Math.max(
                minimumRunFrames,
                Math.floor(
                    500 /
                    this.hopMs
                )
            );


        let analyzedFrames =
            0;


        let candidateFrames =
            0;


        let candidateRuns =
            0;


        let currentRun =
            0;


        let totalRunFrames =
            0;


        let persistentFrames =
            0;


        let sumNoiseRms =
            0;


        let sumLow =
            0;


        let sumMid =
            0;


        let sumHigh =
            0;


        let previousLowRelative =
            null;


        let previousMidRelative =
            null;


        let previousHighRelative =
            null;


        let stabilitySum =
            0;


        let stabilityComparisons =
            0;


        let longestRun =
            0;


        const finishRun =
            () => {

                if (
                    currentRun >=
                    minimumRunFrames
                ) {

                    candidateRuns++;

                    const usableFrames =
                        Math.min(
                            currentRun,
                            maximumRunFrames
                        );

                    totalRunFrames +=
                        usableFrames;

                    persistentFrames +=
                        usableFrames;

                    if (
                        usableFrames >
                        longestRun
                    ) {

                        longestRun =
                            usableFrames;
                    }
                }

                currentRun =
                    0;
            };


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

            analyzedFrames++;


            const rms =
                this.calculateRMSRange(
                    mono,
                    start,
                    end
                );


            const isCandidate =
                rms <=
                lowActivityThreshold;


            if (
                !isCandidate
            ) {

                finishRun();

                previousLowRelative =
                    null;

                previousMidRelative =
                    null;

                previousHighRelative =
                    null;

                continue;
            }


            candidateFrames++;
            currentRun++;


            const windowData =
                mono.subarray(
                    start,
                    end
                );


            const low =
                this.calculateBandEnergy(
                    windowData,
                    sampleRate,
                    20,
                    250
                );


            const mid =
                this.calculateBandEnergy(
                    windowData,
                    sampleRate,
                    250,
                    2500
                );


            const high =
                this.calculateBandEnergy(
                    windowData,
                    sampleRate,
                    2500,
                    Math.min(
                        12000,
                        sampleRate /
                        2 -
                        100
                    )
                );


            sumNoiseRms +=
                rms;


            sumLow +=
                low;


            sumMid +=
                mid;


            sumHigh +=
                high;


            const denominator =
                Math.max(
                    rms,
                    0.000001
                );


            const lowRelative =
                low /
                denominator;


            const midRelative =
                mid /
                denominator;


            const highRelative =
                high /
                denominator;


            if (
                previousLowRelative !==
                null
            ) {

                const lowDifference =
                    Math.abs(
                        lowRelative -
                        previousLowRelative
                    );


                const midDifference =
                    Math.abs(
                        midRelative -
                        previousMidRelative
                    );


                const highDifference =
                    Math.abs(
                        highRelative -
                        previousHighRelative
                    );


                const difference =
                    (
                        lowDifference +
                        midDifference +
                        highDifference
                    ) /
                    3;


                const frameStability =
                    this.clamp(
                        1 -
                        difference,
                        0,
                        1
                    );


                stabilitySum +=
                    frameStability;


                stabilityComparisons++;
            }


            previousLowRelative =
                lowRelative;


            previousMidRelative =
                midRelative;


            previousHighRelative =
                highRelative;
        }


        finishRun();


        if (
            candidateFrames === 0 ||
            candidateRuns === 0
        ) {

            return {

                available:
                    false,

                confidence:
                    0,

                floor:
                    0,

                floorDb:
                    -120,

                floorRelative:
                    0,

                low:
                    0,

                mid:
                    0,

                high:
                    0,

                lowRelative:
                    0,

                midRelative:
                    0,

                highRelative:
                    0,

                persistence:
                    0,

                repetition:
                    0,

                stability:
                    0,

                microDurationMs:
                    0,

                candidateRuns:
                    0,

                candidateFrames:
                    0,

                profile:
                    "unknown"
            };
        }


        const floor =
            sumNoiseRms /
            candidateFrames;


        const floorDb =
            this.amplitudeToDb(
                floor
            );


        const lowEnergy =
            sumLow /
            candidateFrames;


        const midEnergy =
            sumMid /
            candidateFrames;


        const highEnergy =
            sumHigh /
            candidateFrames;


        const lowRelative =
            totalRms > 0
                ? lowEnergy /
                  totalRms
                : 0;


        const midRelative =
            totalRms > 0
                ? midEnergy /
                  totalRms
                : 0;


        const highRelative =
            totalRms > 0
                ? highEnergy /
                  totalRms
                : 0;


        const floorRelative =
            totalRms > 0
                ? floor /
                  totalRms
                : 0;


        const candidateRatio =
            analyzedFrames > 0
                ? candidateFrames /
                  analyzedFrames
                : 0;


        const persistence =
            candidateFrames > 0
                ? persistentFrames /
                  candidateFrames
                : 0;


        const repetition =
            this.clamp(
                candidateRuns /
                6,
                0,
                1
            );


        const stability =
            stabilityComparisons > 0
                ? stabilitySum /
                  stabilityComparisons
                : 0;


        const averageRunFrames =
            candidateRuns > 0
                ? totalRunFrames /
                  candidateRuns
                : 0;


        const microDurationMs =
            averageRunFrames *
            this.hopMs;


        const sampleConfidence =
            this.clamp(
                candidateRatio *
                3,
                0,
                1
            );


        const persistenceConfidence =
            this.clamp(
                persistence,
                0,
                1
            );


        const repetitionConfidence =
            repetition;


        const stabilityConfidence =
            stability;


        const evidenceConfidence =
            this.clamp(
                (
                    sampleConfidence *
                    0.20
                ) +
                (
                    persistenceConfidence *
                    0.30
                ) +
                (
                    repetitionConfidence *
                    0.25
                ) +
                (
                    stabilityConfidence *
                    0.25
                ),
                0,
                1
            );


        const confidence =
            candidateRuns >= 2
                ? evidenceConfidence
                : evidenceConfidence *
                  0.45;


        let profile =
            "low";


        if (
            floorRelative >=
            0.18
        ) {

            profile =
                "high";

        } else if (
            floorRelative >=
            0.08
        ) {

            profile =
                "moderate";
        }


        const available =
            confidence >=
            0.35;


        if (
            !available
        ) {

            profile =
                "unknown";
        }


        return {

            available,

            confidence,

            floor,

            floorDb,

            floorRelative,

            low:
                lowEnergy,

            mid:
                midEnergy,

            high:
                highEnergy,

            lowRelative,

            midRelative,

            highRelative,

            persistence,

            repetition,

            stability,

            microDurationMs,

            candidateRuns,

            candidateFrames,

            longestRunMs:
                longestRun *
                this.hopMs,

            profile
        };
    }


    // ======================================
    // CALCULAR CONFIANÇA GLOBAL
    // ======================================
    //
    // Mantemos uma confiança geral simples
    // para compatibilidade com consumidores
    // existentes.
    //
    // ======================================

    calculateAnalysisConfidence(
        sibilanceTimeline,
        roughnessTimeline,
        noiseProfile
    ) {

        const sibilanceConfidence =
            sibilanceTimeline &&
            Number.isFinite(
                sibilanceTimeline.temporalScore
            )
                ? this.clamp(
                    sibilanceTimeline.temporalScore,
                    0,
                    1
                )
                : 0;


        const roughnessConfidence =
            roughnessTimeline &&
            Number.isFinite(
                roughnessTimeline.confidence
            )
                ? this.clamp(
                    roughnessTimeline.confidence,
                    0,
                    1
                )
                : 0;


        const noiseConfidence =
            noiseProfile &&
            Number.isFinite(
                noiseProfile.confidence
            )
                ? this.clamp(
                    noiseProfile.confidence,
                    0,
                    1
                )
                : 0;


        /*
         * A confiança global não deve ser
         * dominada por roughness ou ruído.
         *
         * A análise espectral geral continua
         * sendo a base principal.
         */

        const confidence =
            this.clamp(
                (
                    0.55
                ) +
                (
                    sibilanceConfidence *
                    0.15
                ) +
                (
                    roughnessConfidence *
                    0.20
                ) +
                (
                    noiseConfidence *
                    0.10
                ),
                0,
                1
            );


        return confidence;
    }
        // ======================================
    // ANÁLISE PRINCIPAL
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
        // TIMELINE DE SIBILÂNCIA
        // ==================================

        const sibilanceTimeline =
            this.analyzeSibilanceTimeline(
                mono,
                sampleRate,
                rms
            );


        // ==================================
        // TIMELINE DE ROUGHNESS
        // ==================================

        const roughnessTimeline =
            this.analyzeRoughnessTimeline(
                mono,
                sampleRate,
                rms
            );


        // ==================================
        // RUÍDO
        // ==================================

        const noiseProfile =
            this.analyzeNoiseProfile(
                mono,
                sampleRate,
                rms
            );


        // ==================================
        // CONFIANÇA GERAL
        // ==================================

        const analysisConfidence =
            this.calculateAnalysisConfidence(
                sibilanceTimeline,
                roughnessTimeline,
                noiseProfile
            );


        // ==================================
        // CARACTERÍSTICAS
        // ==================================

        const spectralCore =
            body +
            lowMid +
            mid +
            presence +
            0.000001;


        const presenceCoreRatio =
            this.clamp(
                presence /
                spectralCore,
                0,
                1
            );


        const midCore =
            lowMid +
            mid +
            0.000001;


        const presenceToMid =
            this.clamp(
                presence /
                midCore,
                0,
                2
            );


        const presenceContrast =
            this.clamp(
                (
                    presenceToMid -
                    0.35
                ) /
                0.90,
                0,
                1
            );


        // ==================================
        // HARDNESS V0.7
        // ==================================
        //
        // A presença isolada não determina
        // hardness.
        //
        // Agora temos:
        //
        // 1. predominância da presença;
        // 2. contraste presença/médios;
        // 3. roughness temporal;
        // 4. pequena influência da proporção
        //    global.
        //
        // Isso ajuda a separar:
        //
        // voz brilhante
        //
        // de
        //
        // voz brilhante + comportamento
        // áspero persistente.
        //
        // ==================================

        const temporalRoughness =
            this.clamp(
                roughnessTimeline.amount,
                0,
                1
            );


        const roughnessConfidence =
            this.clamp(
                roughnessTimeline.confidence,
                0,
                1
            );


        const hardness =
            this.clamp(
                (
                    presenceCoreRatio *
                    0.30
                ) +
                (
                    presenceContrast *
                    0.30
                ) +
                (
                    temporalRoughness *
                    0.30
                ) +
                (
                    presenceRatio *
                    0.10
                ),
                0,
                1
            );


        // ==================================
        // ROUGHNESS V0.7
        // ==================================
        //
        // Roughness passa a representar
        // principalmente a evidência temporal.
        //
        // A concentração espectral permanece
        // apenas como suporte.
        //
        // ==================================

        const spectralRoughnessSupport =
            this.clamp(
                (
                    presenceCoreRatio *
                    0.45
                ) +
                (
                    presenceContrast *
                    0.35
                ) +
                (
                    airRatio *
                    0.20
                ),
                0,
                1
            );


        const roughness =
            this.clamp(
                (
                    temporalRoughness *
                    0.65
                ) +
                (
                    spectralRoughnessSupport *
                    0.35
                ),
                0,
                1
            );


        // ==================================
        // SIBILÂNCIA
        // ==================================
        //
        // Continua independente da roughness.
        //
        // ==================================

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


        // ==================================
        // BODY
        // ==================================

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


        // ==================================
        // PRESENCE
        // ==================================

        const presenceAmount =
            this.clamp(
                presenceRatio *
                5,
                0,
                1
            );


        // ==================================
        // ROUGHNESS STATE
        // ==================================
        //
        // Estado descritivo.
        //
        // Não autoriza processamento.
        //
        // ==================================

        let roughnessState =
            "low";


        if (
            roughness >=
            0.70 &&
            roughnessConfidence >=
            this.minimumRoughnessConfidence
        ) {

            roughnessState =
                "high";

        } else if (
            roughness >=
            0.45 &&
            roughnessConfidence >=
            this.minimumRoughnessConfidence
        ) {

            roughnessState =
                "moderate";
        }


        // ==================================
        // HARDNESS CONFIDENCE
        // ==================================
        //
        // A confiança da hardness aumenta
        // quando existe evidência temporal
        // suficiente.
        //
        // ==================================

        const hardnessConfidence =
            this.clamp(
                (
                    analysisConfidence *
                    0.45
                ) +
                (
                    roughnessConfidence *
                    0.40
                ) +
                (
                    this.clamp(
                        presenceContrast,
                        0,
                        1
                    ) *
                    0.15
                ),
                0,
                1
            );


        // ==================================
        // RESULTADO
        // ==================================

        this.analysis = {

            version:
                "0.7",

            sampleRate,

            channels:
                audioBuffer.numberOfChannels,

            duration:
                audioBuffer.duration,

            rms,

            rmsDb,

            peak,

            peakDb,


            confidence:
                analysisConfidence,


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


            characteristicConfidence: {

                hardness:
                    hardnessConfidence,

                roughness:
                    roughnessConfidence,

                sibilance:
                    this.clamp(
                        (
                            analysisConfidence *
                            0.50
                        ) +
                        (
                            temporalSibilance *
                            0.50
                        ),
                        0,
                        1
                    )
            },


            roughnessAnalysis: {

                available:
                    roughnessTimeline.available,

                confidence:
                    roughnessTimeline.confidence,

                amount:
                    roughnessTimeline.amount,

                temporal:
                    roughnessTimeline.temporalScore,

                averageEnergy:
                    roughnessTimeline.averageEnergy,

                peakEnergy:
                    roughnessTimeline.peakEnergy,

                averageRelative:
                    roughnessTimeline.averageRelative,

                peakRelative:
                    roughnessTimeline.peakRelative,

                activity:
                    roughnessTimeline.activity,

                variation:
                    roughnessTimeline.variation,

                persistence:
                    roughnessTimeline.persistence,

                repetition:
                    roughnessTimeline.repetition,

                stability:
                    roughnessTimeline.stability,

                activeFrames:
                    roughnessTimeline.activeFrames,

                frameCount:
                    roughnessTimeline.frameCount,

                candidateRuns:
                    roughnessTimeline.candidateRuns,

                candidateFrames:
                    roughnessTimeline.candidateFrames,

                state:
                    roughnessState
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
            },
                        // ==================================
            // PERFIL DE RUÍDO
            // ==================================

            noiseAnalysis: {

                available:
                    noiseProfile.available,

                confidence:
                    noiseProfile.confidence,

                floor:
                    noiseProfile.floor,

                floorDb:
                    noiseProfile.floorDb,

                floorRelative:
                    noiseProfile.floorRelative,

                low:
                    noiseProfile.low,

                mid:
                    noiseProfile.mid,

                high:
                    noiseProfile.high,

                lowRelative:
                    noiseProfile.lowRelative,

                midRelative:
                    noiseProfile.midRelative,

                highRelative:
                    noiseProfile.highRelative,

                persistence:
                    noiseProfile.persistence,

                repetition:
                    noiseProfile.repetition,

                stability:
                    noiseProfile.stability,

                microDurationMs:
                    noiseProfile.microDurationMs,

                candidateRuns:
                    noiseProfile.candidateRuns,

                candidateFrames:
                    noiseProfile.candidateFrames,

                longestRunMs:
                    noiseProfile.longestRunMs,

                profile:
                    noiseProfile.profile
            },


            // ==================================
            // EVIDÊNCIA DE INTERPRETAÇÃO
            // ==================================
            //
            // Somente informação.
            //
            // Nenhuma dessas propriedades
            // autoriza processamento.
            //
            // ==================================

            evidence: {

                upperPresence:

                    this.clamp(
                        presenceCoreRatio,
                        0,
                        1
                    ),

                presenceContrast:

                    this.clamp(
                        presenceContrast,
                        0,
                        1
                    ),

                temporalRoughness:

                    temporalRoughness,

                roughnessConfidence:

                    roughnessConfidence,

                temporalSibilance:

                    temporalSibilance,

                hardnessConfidence:

                    hardnessConfidence,

                preserveIfRoughnessConfidenceLow:
                    roughnessConfidence <
                    this.minimumRoughnessConfidence,

                preserveIfSibilanceConfidenceLow:
                    temporalSibilance <
                    0.35
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
    