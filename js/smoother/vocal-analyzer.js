// ==========================================
// SMOOTHVSTUDIO
// VOCAL ANALYZER
// V0.6
// ==========================================
//
// Analisa o vocal antes do processamento.
//
// O Analyzer NÃO modifica o áudio.
//
// V0.6:
//
// - análise geral
// - análise por bandas
// - análise temporal de sibilância
// - análise preliminar de ruído
// - microjanelas de baixa atividade
// - agrupamento de microjanelas
// - acumulação de evidências
// - estabilidade espectral
// - repetição de ocorrências
// - confiança adaptativa
//
// IMPORTANTE:
//
// Esta versão NÃO remove ruído.
//
// Ela somente melhora a identificação
// do possível perfil de ruído.
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


        // ----------------------------------
        // LIMIAR DE BAIXA ATIVIDADE
        // ----------------------------------

        const lowActivityThreshold =
            Math.max(
                totalRms *
                0.22,
                0.00001
            );


        // ----------------------------------
        // LIMITES PARA MICROINTERVALOS
        // ----------------------------------

        /*
         * Uma ocorrência isolada de 10 ms
         * é fraca demais para representar
         * ruído confiável.
         *
         * Duas janelas já representam
         * aproximadamente 30 ms de cobertura.
         */

        const minimumRunFrames =
            2;


        /*
         * Não precisamos de silêncio maior
         * que meio segundo.
         *
         * O limite evita que uma região
         * muito longa domine a estatística.
         */

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


        /*
         * Contagem de ocorrências separadas.
         *
         * Isso é importante para rap:
         *
         * pausa curta 1
         * pausa curta 2
         * pausa curta 3
         *
         * podem juntas fornecer uma
         * estimativa muito melhor.
         */

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


        // ----------------------------------
        // ANÁLISE DAS MICROJANELAS
        // ----------------------------------

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


            /*
             * Para esta janela calculamos
             * apenas três regiões amplas.
             *
             * Isso mantém o custo baixo
             * no aparelho.
             */

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


            /*
             * Normalizamos as bandas pelo
             * RMS da própria janela.
             *
             * Assim podemos comparar
             * janelas de intensidades
             * ligeiramente diferentes.
             */

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


            /*
             * Estabilidade espectral.
             *
             * Ruído contínuo tende a manter
             * uma distribuição mais estável
             * que eventos vocais isolados.
             */

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


        // ----------------------------------
        // SEM EVIDÊNCIA SUFICIENTE
        // ----------------------------------

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


        // ----------------------------------
        // MÉDIAS
        // ----------------------------------

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


        // ----------------------------------
        // PERSISTÊNCIA
        // ----------------------------------

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


        // ----------------------------------
        // REPETIÇÃO
        // ----------------------------------

        /*
         * Uma única pausa não é suficiente.
         *
         * Várias pausas curtas distribuídas
         * ao longo do vocal aumentam a
         * confiança.
         */

        const repetition =
            this.clamp(
                candidateRuns /
                6,
                0,
                1
            );


        // ----------------------------------
        // ESTABILIDADE
        // ----------------------------------

        const stability =
            stabilityComparisons > 0
                ? stabilitySum /
                  stabilityComparisons
                : 0;


        // ----------------------------------
        // DURAÇÃO MÉDIA DAS OCORRÊNCIAS
        // ----------------------------------

        const averageRunFrames =
            candidateRuns > 0
                ? totalRunFrames /
                  candidateRuns
                : 0;


        const microDurationMs =
            averageRunFrames *
            this.hopMs;


        // ----------------------------------
        // CONFIANÇA
        // ----------------------------------

        /*
         * A confiança agora depende de
         * múltiplas evidências.
         *
         * Nenhuma delas sozinha é suficiente.
         */

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


        /*
         * Penalização de amostras
         * extremamente escassas.
         */

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


        /*
         * Pequena proteção contra falsos
         * positivos causados por uma única
         * ocorrência.
         */

        const confidence =
            candidateRuns >= 2
                ? evidenceConfidence
                : evidenceConfidence *
                  0.45;


        // ----------------------------------
        // CLASSIFICAÇÃO
        // ----------------------------------

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


        /*
         * Só disponibilizamos o perfil
         * quando existe confiança mínima.
         */

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
        // TIMELINE
        // ==================================

        const sibilanceTimeline =
            this.analyzeSibilanceTimeline(
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
        // CARACTERÍSTICAS
        // ==================================

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
                "0.6",

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