// ==========================================
// SMOOTHVSTUDIO
// ANALYZER SIBILANCE
// ==========================================

class AnalyzerSibilance {

    static analyzeSibilanceTimeline(
        analyzer,
        mono,
        sampleRate,
        totalRms
    ) {

        const sibilanceSignal =
            analyzer.createBandSignal(
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

        const frames = [];

        let peakEnergy = 0;
        let sumEnergy = 0;
        let activeFrames = 0;

        const activityThreshold =
            Math.max(
                totalRms * 0.18,
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
                    start + windowSize
                );

            if (
                end <= start
            ) {

                break;
            }

            const rms =
                analyzer.calculateRMSRange(
                    sibilanceSignal,
                    start,
                    end
                );

            const db =
                analyzer.amplitudeToDb(
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

            sumEnergy += rms;

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
            analyzer.clamp(
                averageRelative * 4,
                0,
                1
            );

        const peakScore =
            analyzer.clamp(
                peakRelative * 5,
                0,
                1
            );

        const concentrationScore =
            analyzer.clamp(
                (
                    peakToAverage -
                    1
                ) / 4,
                0,
                1
            );

        const activityScore =
            analyzer.clamp(
                activity * 2.5,
                0,
                1
            );

        const temporalScore =
            analyzer.clamp(
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
                analyzer.windowMs,

            hopMs:
                analyzer.hopMs,

            frameCount,

            averageEnergy,

            peakEnergy,

            peakDb:
                analyzer.amplitudeToDb(
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
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.AnalyzerSibilance =
    AnalyzerSibilance;