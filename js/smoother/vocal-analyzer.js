// ==========================================
// SMOOTHVSTUDIO
// VOCAL ANALYZER
// V0.8
// ==========================================
//
// Analisa o vocal antes do processamento.
//
// O Analyzer NÃO modifica o áudio.
//
// V0.8:
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
// - evidência espectral superior
// - análise de deficiência aparente de bandwidth
// - estabilidade das bandas
// - perfil espectral temporal
//
// IMPORTANTE:
//
// Esta versão NÃO remove ruído.
//
// Ela somente melhora a identificação
// das características do vocal e fornece
// evidências para camadas posteriores.
//
// Nenhuma propriedade desta análise
// autoriza reconstrução automaticamente.
//
// Baixa confiança deve favorecer
// preservação.
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


        // ==================================
        // CONFIGURAÇÃO ESPECTRAL V0.8
        // ==================================
        //
        // Estas bandas não substituem as
        // bandas antigas.
        //
        // Elas existem para fornecer
        // contexto adicional.
        //
        // ==================================

        this.spectralBands = [

            {
                name: "sub",
                low: 20,
                high: 120
            },

            {
                name: "body",
                low: 120,
                high: 500
            },

            {
                name: "lowMid",
                low: 500,
                high: 1200
            },

            {
                name: "mid",
                low: 1200,
                high: 2500
            },

            {
                name: "presence",
                low: 2500,
                high: 5000
            },

            {
                name: "sibilance",
                low: 5000,
                high: 9500
            },

            {
                name: "air",
                low: 9500,
                high: 14000
            }
        ];


        this.minimumSpectralFrames =
            options.minimumSpectralFrames ??
            4;


        this.minimumSpectralConfidence =
            options.minimumSpectralConfidence ??
            0.40;


        this.upperContentMinimumRatio =
            options.upperContentMinimumRatio ??
            0.025;


        this.upperContentStrongRatio =
            options.upperContentStrongRatio ??
            0.055;


        this.upperContentDeficiencyRatio =
            options.upperContentDeficiencyRatio ??
            0.018;


        this.spectralStabilityThreshold =
            options.spectralStabilityThreshold ??
            0.25;


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
    
    return AnalyzerUtils.clamp(
        value,
        min,
        max
    );
}


    // ======================================
    // AMPLITUDE → DB
    // ======================================

    amplitudeToDb(
    amplitude
) {
    
    return AnalyzerUtils.amplitudeToDb(
        amplitude
    );
}


    // ======================================
    // RMS
    // ======================================

    calculateRMS(
    data
) {
    
    return AnalyzerUtils.calculateRMS(
        data
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
    
    return AnalyzerUtils.calculateRMSRange(
        data,
        start,
        end
    );
}


    // ======================================
    // PICO
    // ======================================

    calculatePeak(
    data
) {
    
    return AnalyzerUtils.calculatePeak(
        data
    );
}


    // ======================================
    // LOW PASS
    // ======================================

    lowPass(
    data,
    sampleRate,
    cutoff
) {
    
    return AnalyzerSignal.lowPass(
        data,
        sampleRate,
        cutoff,
        this.clamp.bind(this)
    );
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
    
    return AnalyzerSignal.calculateBandEnergy(
        data,
        sampleRate,
        lowCut,
        highCut,
        this.clamp.bind(this),
        this.calculateRMS.bind(this)
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
    
    return AnalyzerSignal.createBandSignal(
        data,
        sampleRate,
        lowCut,
        highCut,
        this.clamp.bind(this)
    );
}


    // ======================================
    // MONO
    // ======================================

    createMonoBuffer(
    audioBuffer
) {
    
    return AnalyzerSignal.createMonoBuffer(
        audioBuffer
    );
}


    // ======================================
    // NORMALIZAÇÃO SEGURA
    // ======================================

    normalizeRatio(
    value,
    denominator
) {
    
    return AnalyzerUtils.normalizeRatio(
        value,
        denominator
    );
}


    // ======================================
    // DISTÂNCIA RELATIVA
    // ======================================

    relativeDistance(
    a,
    b
) {
    
    return AnalyzerUtils.relativeDistance(
        a,
        b
    );
}


    // ======================================
    // ESTABILIDADE ENTRE VALORES
    // ======================================

    calculateValueStability(
    values
) {
    
    return AnalyzerUtils.calculateValueStability(
        values
    );
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
    // TIMELINE DE ROUGHNESS V0.8
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

                available: false,

                confidence: 0,

                amount: 0,

                temporalScore: 0,

                averageEnergy: 0,

                peakEnergy: 0,

                averageRelative: 0,

                peakRelative: 0,

                activity: 0,

                variation: 0,

                persistence: 0,

                repetition: 0,

                stability: 0,

                activeFrames: 0,

                frameCount: 0,

                candidateRuns: 0,

                candidateFrames: 0,

                frames: []
            };
        }


        const frames = [];


        let sumEnergy = 0;

        let peakEnergy = 0;

        let activeFrames = 0;

        let candidateFrames = 0;

        let candidateRuns = 0;

        let currentRun = 0;

        let persistentFrames = 0;

        let totalVariation = 0;

        let variationComparisons = 0;

        let stabilitySum = 0;

        let stabilityComparisons = 0;

        let previousRelative = null;

        let previousDb = null;


        const activityThreshold =
            Math.max(
                totalRms *
                this.roughnessActivityThreshold,
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


            let variation = 0;

            let frameStability = 0;


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
                rms > peakEnergy
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

                available: false,

                confidence: 0,

                amount: 0,

                temporalScore: 0,

                averageEnergy: 0,

                peakEnergy: 0,

                averageRelative: 0,

                peakRelative: 0,

                activity: 0,

                variation: 0,

                persistence: 0,

                repetition: 0,

                stability: 0,

                activeFrames: 0,

                frameCount: 0,

                candidateRuns: 0,

                candidateFrames: 0,

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
    // PERFIL ESPECTRAL TEMPORAL V0.8
    // ======================================
    //
    // Esta é uma das principais melhorias.
    //
    // O Analyzer passa a observar como as
    // relações entre bandas se comportam
    // ao longo do tempo.
    //
    // Não basta existir energia em 9,5–14 kHz.
    //
    // Precisamos saber se essa evidência:
    //
    // - aparece repetidamente;
    // - permanece coerente;
    // - é extremamente isolada;
    // - ou simplesmente não existe.
    //
    // ======================================

    analyzeSpectralTimeline(
        mono,
        sampleRate,
        totalRms
    ) {

        if (
            !mono ||
            mono.length === 0 ||
            totalRms <= 0
        ) {

            return {

                available: false,

                confidence: 0,

                frameCount: 0,

                activeFrames: 0,

                stability: 0,

                lowerEnergy: 0,

                upperEnergy: 0,

                upperToLowerRatio: 0,

                upperPresence: 0,

                bandwidthDeficiency: false,

                status: "preserve",

                reason:
                    "insufficient-audio-data",

                frames: []
            };
        }


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


        const upperHigh =
            Math.min(
                14000,
                sampleRate * 0.49
            );


        const upperLow =
            Math.min(
                9500,
                upperHigh - 100
            );


        if (
            upperHigh <= upperLow
        ) {

            return {

                available: false,

                confidence: 0,

                frameCount: 0,

                activeFrames: 0,

                stability: 0,

                lowerEnergy: 0,

                upperEnergy: 0,

                upperToLowerRatio: 0,

                upperPresence: 0,

                bandwidthDeficiency: false,

                status: "preserve",

                reason:
                    "insufficient-upper-bandwidth",

                frames: []
            };
        }


        const frames = [];


        let lowerEnergySum = 0;

        let upperEnergySum = 0;

        let activeFrames = 0;

        let upperPresentFrames = 0;

        let deficiencyFrames = 0;

        let stabilitySum = 0;

        let stabilityComparisons = 0;


        let previousUpperRatio =
            null;


        let previousLowerRatio =
            null;


        const activityThreshold =
            Math.max(
                totalRms *
                0.12,
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


            const windowData =
                mono.subarray(
                    start,
                    end
                );


            const lowerEnergy =
                this.calculateBandEnergy(
                    windowData,
                    sampleRate,
                    2500,
                    upperLow
                );


            const upperEnergy =
                this.calculateBandEnergy(
                    windowData,
                    sampleRate,
                    upperLow,
                    upperHigh
                );


            const windowRms =
                this.calculateRMS(
                    windowData
                );


            const lowerRatio =
                totalRms > 0
                    ? lowerEnergy /
                      totalRms
                    : 0;


            const upperRatio =
                totalRms > 0
                    ? upperEnergy /
                      totalRms
                    : 0;


            const upperToLowerRatio =
                lowerEnergy > 0
                    ? upperEnergy /
                      lowerEnergy
                    : 0;


            const active =
                windowRms >
                activityThreshold;


            const upperPresent =
                upperRatio >=
                this.upperContentMinimumRatio;


            const deficient =
                active &&
                upperRatio <
                this.upperContentDeficiencyRatio;


            if (
                active
            ) {

                activeFrames++;
            }


            if (
                upperPresent
            ) {

                upperPresentFrames++;
            }


            if (
                deficient
            ) {

                deficiencyFrames++;
            }


            if (
                previousUpperRatio !==
                null
            ) {

                const upperDifference =
                    this.relativeDistance(
                        upperRatio,
                        previousUpperRatio
                    );


                const lowerDifference =
                    this.relativeDistance(
                        lowerRatio,
                        previousLowerRatio
                    );


                const combinedDifference =
                    this.clamp(
                        (
                            upperDifference *
                            0.70
                        ) +
                        (
                            lowerDifference *
                            0.30
                        ),
                        0,
                        1
                    );


                const frameStability =
                    this.clamp(
                        1 -
                        combinedDifference,
                        0,
                        1
                    );


                stabilitySum +=
                    frameStability;


                stabilityComparisons++;
            }


            lowerEnergySum +=
                lowerEnergy;


            upperEnergySum +=
                upperEnergy;


            frames.push({

                time:
                    start /
                    sampleRate,

                rms:
                    windowRms,

                lowerEnergy,

                upperEnergy,

                lowerRatio,

                upperRatio,

                upperToLowerRatio,

                active,

                upperPresent,

                deficient
            });


            previousUpperRatio =
                upperRatio;


            previousLowerRatio =
                lowerRatio;
        }


        const frameCount =
            frames.length;


        if (
            frameCount === 0
        ) {

            return {

                available: false,

                confidence: 0,

                frameCount: 0,

                activeFrames: 0,

                stability: 0,

                lowerEnergy: 0,

                upperEnergy: 0,

                upperToLowerRatio: 0,

                upperPresence: 0,

                bandwidthDeficiency: false,

                status: "preserve",

                reason:
                    "no-spectral-frames",

                frames
            };
        }


        const activeRatio =
            activeFrames /
            frameCount;


        const lowerEnergy =
            lowerEnergySum /
            frameCount;


        const upperEnergy =
            upperEnergySum /
            frameCount;


        const upperToLowerRatio =
            lowerEnergy > 0
                ? upperEnergy /
                  lowerEnergy
                : 0;


        const upperPresenceRatio =
            activeFrames > 0
                ? upperPresentFrames /
                  activeFrames
                : 0;


        const deficiencyRatio =
            activeFrames > 0
                ? deficiencyFrames /
                  activeFrames
                : 0;


        const stability =
            stabilityComparisons > 0
                ? stabilitySum /
                  stabilityComparisons
                : 0;


        const dataAvailability =
            this.clamp(
                activeRatio *
                1.5,
                0,
                1
            );


        const persistence =
            this.clamp(
                upperPresenceRatio,
                0,
                1
            );


        const deficiencyPersistence =
            this.clamp(
                deficiencyRatio,
                0,
                1
            );


        const confidence =
            this.clamp(
                (
                    dataAvailability *
                    0.35
                ) +
                (
                    stability *
                    0.25
                ) +
                (
                    Math.max(
                        persistence,
                        deficiencyPersistence
                    ) *
                    0.40
                ),
                0,
                1
            );


        const bandwidthDeficiency =
            confidence >=
            this.minimumSpectralConfidence &&
            activeRatio >=
            0.20 &&
            deficiencyRatio >=
            0.55;


        let status =
            "preserve";


        let reason =
            "insufficient-band-evidence";


        if (
            bandwidthDeficiency
        ) {

            status =
                "possible-deficiency";

            reason =
                "persistent-upper-content-deficit";

        } else if (
            confidence >=
            this.minimumSpectralConfidence &&
            upperPresenceRatio >=
            0.55
        ) {

            status =
                "available";

            reason =
                "persistent-upper-content";

        } else if (
            confidence >=
            this.minimumSpectralConfidence
        ) {

            status =
                "neutral";

            reason =
                "spectral-evidence-inconclusive";
        }


        return {

            available:
                confidence >=
                this.minimumSpectralConfidence,

            confidence,

            frameCount,

            activeFrames,

            activeRatio,

            stability,

            lowerEnergy,

            upperEnergy,

            upperToLowerRatio,

            upperPresence:
                upperPresenceRatio,

            deficiencyRatio,

            bandwidthDeficiency,

            status,

            reason,

            frames
        };
    }


    // ======================================
    // RESUMO ESPECTRAL
    // ======================================
    //
    // Converte a análise temporal em um
    // conjunto pequeno de evidências.
    //
    // ======================================

    calculateSpectralEvidence(
        bands,
        spectralTimeline
    ) {

        const body =
            bands.body || 0;

        const lowMid =
            bands.lowMid || 0;

        const mid =
            bands.mid || 0;

        const presence =
            bands.presence || 0;

        const sibilance =
            bands.sibilance || 0;

        const air =
            bands.air || 0;


        const lowerCore =
            body +
            lowMid +
            mid +
            presence +
            0.000001;


        const upperCore =
            sibilance +
            air +
            0.000001;


        const upperRatio =
            upperCore /
            (
                lowerCore +
                upperCore
            );


        const upperPresence =
            spectralTimeline &&
            Number.isFinite(
                spectralTimeline.upperPresence
            )
                ? spectralTimeline.upperPresence
                : this.clamp(
                    upperRatio * 8,
                    0,
                    1
                );


        const upperStability =
            spectralTimeline &&
            Number.isFinite(
                spectralTimeline.stability
            )
                ? spectralTimeline.stability
                : 0;


        const bandwidthConfidence =
            spectralTimeline &&
            Number.isFinite(
                spectralTimeline.confidence
            )
                ? spectralTimeline.confidence
                : 0;


        const bandwidthDeficiency =
            Boolean(
                spectralTimeline &&
                spectralTimeline.bandwidthDeficiency
            );


        const upperToLowerRatio =
            spectralTimeline &&
            Number.isFinite(
                spectralTimeline.upperToLowerRatio
            )
                ? spectralTimeline.upperToLowerRatio
                : upperCore /
                  (
                      lowerCore +
                      0.000001
                  );


        const upperAvailabilityScore =
            this.clamp(
                (
                    upperPresence *
                    0.55
                ) +
                (
                    upperStability *
                    0.20
                ) +
                (
                    bandwidthConfidence *
                    0.25
                ),
                0,
                1
            );


        let status =
            "preserve";


        let reason =
            "insufficient-band-evidence";


        if (
            bandwidthDeficiency
        ) {

            status =
                "possible-deficiency";

            reason =
                "persistent-upper-content-deficit";

        } else if (
            upperAvailabilityScore >=
            0.55 &&
            bandwidthConfidence >=
            this.minimumSpectralConfidence
        ) {

            status =
                "available";

            reason =
                "upper-content-supported";

        } else if (
            bandwidthConfidence >=
            this.minimumSpectralConfidence
        ) {

            status =
                "neutral";

            reason =
                "upper-content-not-conclusive";
        }


        return {

            upperRatio,

            upperPresence,

            upperStability,

            upperToLowerRatio,

            upperAvailabilityScore,

            bandwidthConfidence,

            bandwidthDeficiency,

            status,

            reason
        };
    }
        // ======================================
    // PERFIL DE RUÍDO V0.6
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

                available: false,

                confidence: 0,

                floor: 0,

                floorDb: -120,

                floorRelative: 0,

                low: 0,

                mid: 0,

                high: 0,

                lowRelative: 0,

                midRelative: 0,

                highRelative: 0,

                persistence: 0,

                repetition: 0,

                stability: 0,

                microDurationMs: 0,

                candidateRuns: 0,

                candidateFrames: 0,

                profile: "unknown"
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


        let analyzedFrames = 0;

        let candidateFrames = 0;

        let candidateRuns = 0;

        let currentRun = 0;

        let totalRunFrames = 0;

        let persistentFrames = 0;

        let sumNoiseRms = 0;

        let sumLow = 0;

        let sumMid = 0;

        let sumHigh = 0;

        let previousLowRelative = null;

        let previousMidRelative = null;

        let previousHighRelative = null;

        let stabilitySum = 0;

        let stabilityComparisons = 0;

        let longestRun = 0;


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
                        sampleRate * 0.49
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

                available: false,

                confidence: 0,

                floor: 0,

                floorDb: -120,

                floorRelative: 0,

                low: 0,

                mid: 0,

                high: 0,

                lowRelative: 0,

                midRelative: 0,

                highRelative: 0,

                persistence: 0,

                repetition: 0,

                stability: 0,

                microDurationMs: 0,

                candidateRuns: 0,

                candidateFrames: 0,

                profile: "unknown"
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
                    repetition *
                    0.25
                ) +
                (
                    stability *
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
    // CALCULAR CONFIANÇA GLOBAL V0.8
    // ======================================

    calculateAnalysisConfidence(
        sibilanceTimeline,
        roughnessTimeline,
        noiseProfile,
        spectralTimeline
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


        const spectralConfidence =
            spectralTimeline &&
            Number.isFinite(
                spectralTimeline.confidence
            )
                ? this.clamp(
                    spectralTimeline.confidence,
                    0,
                    1
                )
                : 0;


        const confidence =
            this.clamp(
                (
                    0.50
                ) +
                (
                    sibilanceConfidence *
                    0.12
                ) +
                (
                    roughnessConfidence *
                    0.18
                ) +
                (
                    noiseConfidence *
                    0.08
                ) +
                (
                    spectralConfidence *
                    0.12
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
                Math.min(
                    14000,
                    sampleRate * 0.49
                )
            );


        const sub =
            this.calculateBandEnergy(
                mono,
                sampleRate,
                20,
                120
            );


        const total =
            sub +
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


        const subRatio =
            sub /
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
        // PERFIL ESPECTRAL
        // ==================================

        const spectralTimeline =
            this.analyzeSpectralTimeline(
                mono,
                sampleRate,
                rms
            );


        const spectralEvidence =
            this.calculateSpectralEvidence(
                {
                    sub,
                    body,
                    lowMid,
                    mid,
                    presence,
                    sibilance,
                    air
                },
                spectralTimeline
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
                noiseProfile,
                spectralTimeline
            );


        // ==================================
        // CARACTERÍSTICAS
        // ======================================

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
        // HARDNESS V0.8
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
        // ROUGHNESS
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
        // EVIDÊNCIA DE BANDWIDTH
        // ==================================

        const bandwidthConfidence =
            this.clamp(
                spectralEvidence
                    .bandwidthConfidence,
                0,
                1
            );


        const upperContentConfidence =
            this.clamp(
                (
                    spectralEvidence
                        .upperAvailabilityScore *
                    0.60
                ) +
                (
                    bandwidthConfidence *
                    0.40
                ),
                0,
                1
            );


        const reconstructionPreservation =
            bandwidthConfidence <
            this.minimumSpectralConfidence ||
            spectralEvidence
                .status ===
            "preserve";


        // ==================================
        // RESULTADO
        // ==================================

        this.analysis = {

            version:
                "0.8",

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

                sub,

                body,

                lowMid,

                mid,

                presence,

                sibilance,

                air
            },


            ratios: {

                sub:
                    subRatio,

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


            // ==================================
            // ROUGHNESS ANALYSIS
            // ==================================

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
                        // ==================================
            // SIBILANCE ANALYSIS
            // ==================================

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
            // PERFIL ESPECTRAL V0.8
            // ==================================
            //
            // Este bloco é informativo.
            //
            // Não autoriza reconstrução.
            //
            // ==================================

            spectralAnalysis: {

                available:
                    spectralTimeline.available,

                confidence:
                    spectralTimeline.confidence,

                frameCount:
                    spectralTimeline.frameCount,

                activeFrames:
                    spectralTimeline.activeFrames,

                activeRatio:
                    spectralTimeline.activeRatio,

                stability:
                    spectralTimeline.stability,

                lowerEnergy:
                    spectralTimeline.lowerEnergy,

                upperEnergy:
                    spectralTimeline.upperEnergy,

                upperToLowerRatio:
                    spectralTimeline.upperToLowerRatio,

                upperPresence:
                    spectralTimeline.upperPresence,

                deficiencyRatio:
                    spectralTimeline.deficiencyRatio,

                bandwidthDeficiency:
                    spectralTimeline.bandwidthDeficiency,

                status:
                    spectralTimeline.status,

                reason:
                    spectralTimeline.reason
            },


            // ==================================
            // UPPER CONTENT EVIDENCE
            // ==================================

            upperContentEvidence: {

                available:
                    spectralTimeline.available,

                confidence:
                    upperContentConfidence,

                lowerReferenceEnergy:
                    spectralEvidence
                        .upperRatio,

                upperReferenceEnergy:
                    spectralTimeline.upperEnergy,

                upperToLowerRatio:
                    spectralEvidence
                        .upperToLowerRatio,

                upperPresence:
                    spectralEvidence
                        .upperPresence,

                stability:
                    spectralEvidence
                        .upperStability,

                bandwidthDeficiency:
                    spectralEvidence
                        .bandwidthDeficiency,

                status:
                    spectralEvidence.status,

                reason:
                    spectralEvidence.reason,

                preserve:
                    reconstructionPreservation
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


                // ==================================
                // NOVAS EVIDÊNCIAS V0.8
                // ==================================

                upperContentConfidence:

                    upperContentConfidence,

                bandwidthConfidence:

                    bandwidthConfidence,

                bandwidthDeficiency:

                    Boolean(
                        spectralEvidence
                            .bandwidthDeficiency
                    ),

                upperContentStability:

                    this.clamp(
                        spectralEvidence
                            .upperStability,
                        0,
                        1
                    ),

                upperToLowerRatio:

                    Math.max(
                        0,
                        spectralEvidence
                            .upperToLowerRatio
                    ),


                // ==================================
                // PRESERVAÇÃO
                // ==================================

                preserveIfRoughnessConfidenceLow:
                    roughnessConfidence <
                    this.minimumRoughnessConfidence,

                preserveIfSibilanceConfidenceLow:
                    temporalSibilance <
                    0.35,

                preserveIfBandwidthConfidenceLow:
                    bandwidthConfidence <
                    this.minimumSpectralConfidence,

                preserveIfBandwidthEvidenceAmbiguous:
                    spectralEvidence.status !==
                    "possible-deficiency"
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