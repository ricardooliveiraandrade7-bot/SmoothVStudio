// ==========================================
// SMOOTHVSTUDIO
// ANALYZER SPECTRAL
// ==========================================

class AnalyzerSpectral {

    static analyzeSpectralTimeline(
        analyzer,
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
                analyzer.calculateBandEnergy(
                    windowData,
                    sampleRate,
                    2500,
                    upperLow
                );


            const upperEnergy =
                analyzer.calculateBandEnergy(
                    windowData,
                    sampleRate,
                    upperLow,
                    upperHigh
                );


            const windowRms =
                analyzer.calculateRMS(
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
                analyzer.upperContentMinimumRatio;


            const deficient =
                active &&
                upperRatio <
                analyzer.upperContentDeficiencyRatio;


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
                    analyzer.relativeDistance(
                        upperRatio,
                        previousUpperRatio
                    );


                const lowerDifference =
                    analyzer.relativeDistance(
                        lowerRatio,
                        previousLowerRatio
                    );


                const combinedDifference =
                    analyzer.clamp(
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
                    analyzer.clamp(
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
            analyzer.clamp(
                activeRatio *
                1.5,
                0,
                1
            );


        const persistence =
            analyzer.clamp(
                upperPresenceRatio,
                0,
                1
            );


        const deficiencyPersistence =
            analyzer.clamp(
                deficiencyRatio,
                0,
                1
            );


        const confidence =
            analyzer.clamp(
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
            analyzer.minimumSpectralConfidence &&
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
            analyzer.minimumSpectralConfidence &&
            upperPresenceRatio >=
            0.55
        ) {

            status =
                "available";

            reason =
                "persistent-upper-content";

        } else if (
            confidence >=
            analyzer.minimumSpectralConfidence
        ) {

            status =
                "neutral";

            reason =
                "spectral-evidence-inconclusive";
        }


        return {

            available:
                confidence >=
                analyzer.minimumSpectralConfidence,

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
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.AnalyzerSpectral =
    AnalyzerSpectral;