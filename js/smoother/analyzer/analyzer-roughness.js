// ==========================================
// SMOOTHVSTUDIO
// ANALYZER ROUGHNESS
// ==========================================

class AnalyzerRoughness {

    static analyzeRoughnessTimeline(
        analyzer,
        mono,
        sampleRate,
        totalRms
    ) {

        const roughnessSignal =
            analyzer.createBandSignal(
                mono,
                sampleRate,
                analyzer.roughnessLowCut,
                analyzer.roughnessHighCut
            );


        const windowSize =
            Math.max(
                1,
                Math.floor(
                    sampleRate *
                    (
                        analyzer.windowMs /
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
                        analyzer.hopMs /
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
                analyzer.roughnessActivityThreshold,
                0.00001
            );


        const minimumRunFrames =
            Math.max(
                2,
                analyzer.minimumRoughnessFrames
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
                analyzer.calculateRMSRange(
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
                analyzer.amplitudeToDb(
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
                    analyzer.clamp(
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
                    analyzer.roughnessVariationThreshold
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
            analyzer.clamp(
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
            analyzer.clamp(
                averageRelative *
                4,
                0,
                1
            );


        const peakScore =
            analyzer.clamp(
                peakRelative *
                3,
                0,
                1
            );


        const variationScore =
            analyzer.clamp(
                variation /
                0.12,
                0,
                1
            );


        const persistenceScore =
            analyzer.clamp(
                persistence,
                0,
                1
            );


        const activityScore =
            analyzer.clamp(
                activity *
                1.5,
                0,
                1
            );


        const confidence =
            analyzer.clamp(
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
            analyzer.clamp(
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
            analyzer.minimumRoughnessFrames &&
            confidence >=
            analyzer.minimumRoughnessConfidence;


        const amount =
            available
                ? analyzer.clamp(
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
                : analyzer.clamp(
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
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.AnalyzerRoughness =
    AnalyzerRoughness;