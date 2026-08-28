// ==========================================
// SMOOTHVSTUDIO
// ANALYZER UTILS
// ==========================================
//
// Funções matemáticas auxiliares do
// VocalAnalyzer.
//
// Este módulo NÃO altera o áudio.
//
// ==========================================


class AnalyzerUtils {


    // ======================================
    // LIMITADOR
    // ======================================

    static clamp(
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

    static amplitudeToDb(
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

    static calculateRMS(
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

    static calculateRMSRange(
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

    static calculatePeak(
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
    // NORMALIZAÇÃO SEGURA
    // ======================================

    static normalizeRatio(
        value,
        denominator
    ) {

        if (
            !Number.isFinite(value) ||
            !Number.isFinite(denominator) ||
            denominator <= 0
        ) {

            return 0;
        }

        return this.clamp(
            value /
            denominator,
            0,
            1
        );
    }


    // ======================================
    // DISTÂNCIA RELATIVA
    // ======================================

    static relativeDistance(
        a,
        b
    ) {

        const denominator =
            Math.max(
                Math.abs(a),
                Math.abs(b),
                0.000001
            );

        return Math.abs(
            a - b
        ) / denominator;
    }


    // ======================================
    // ESTABILIDADE ENTRE VALORES
    // ======================================

    static calculateValueStability(
        values
    ) {

        if (
            !values ||
            values.length < 2
        ) {

            return 0;
        }

        let sumDifference = 0;

        let comparisons = 0;

        for (
            let i = 1;
            i < values.length;
            i++
        ) {

            const current =
                Number.isFinite(
                    values[i]
                )
                    ? values[i]
                    : 0;

            const previous =
                Number.isFinite(
                    values[i - 1]
                )
                    ? values[i - 1]
                    : 0;

            const difference =
                this.relativeDistance(
                    current,
                    previous
                );

            sumDifference +=
                this.clamp(
                    difference,
                    0,
                    1
                );

            comparisons++;
        }

        if (
            comparisons === 0
        ) {

            return 0;
        }

        return this.clamp(
            1 -
            (
                sumDifference /
                comparisons
            ),
            0,
            1
        );
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.AnalyzerUtils =
    AnalyzerUtils;