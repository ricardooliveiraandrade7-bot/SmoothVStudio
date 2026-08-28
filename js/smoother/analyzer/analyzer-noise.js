// ==========================================
// SMOOTHVSTUDIO
// ANALYZER NOISE
// ==========================================

class AnalyzerNoise {

    static analyzeNoiseProfile(
        analyzer,
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
                    analyzer.hopMs
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
                analyzer.calculateRMSRange(
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
                analyzer.calculateBandEnergy(
                    windowData,
                    sampleRate,
                    20,
                    250
                );


            const mid =
                analyzer.calculateBandEnergy(
                    windowData,
                    sampleRate,
                    250,
                    2500
                );


            const high =
                analyzer.calculateBandEnergy(
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
                    analyzer.clamp(
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
            analyzer.amplitudeToDb(
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
            analyzer.clamp(
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
            analyzer.hopMs;


        const sampleConfidence =
            analyzer.clamp(
                candidateRatio *
                3,
                0,
                1
            );


        const persistenceConfidence =
            analyzer.clamp(
                persistence,
                0,
                1
            );


        const evidenceConfidence =
            analyzer.clamp(
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
                analyzer.hopMs,

            profile
        };
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.AnalyzerNoise =
    AnalyzerNoise;