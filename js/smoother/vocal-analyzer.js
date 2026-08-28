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
    
    return AnalyzerSibilance.analyzeSibilanceTimeline(
        this,
        mono,
        sampleRate,
        totalRms
    );
}


    // ======================================
    // TIMELINE DE ROUGHNESS V0.8
    // ======================================

    analyzeRoughnessTimeline(
    mono,
    sampleRate,
    totalRms
) {
    
    return AnalyzerRoughness.analyzeRoughnessTimeline(
        this,
        mono,
        sampleRate,
        totalRms
    );
}
// ======================================
// PERFIL ESPECTRAL TEMPORAL V0.8
// ======================================

analyzeSpectralTimeline(
    mono,
    sampleRate,
    totalRms
) {
    
    return AnalyzerSpectral.analyzeSpectralTimeline(
        this,
        mono,
        sampleRate,
        totalRms
    );
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
    
    return AnalyzerConfidence.calculateAnalysisConfidence(
        this,
        sibilanceTimeline,
        roughnessTimeline,
        noiseProfile,
        spectralTimeline
    );
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

window.VocalAnalyzer = VocalAnalyzer;
    VocalAnalyzer;