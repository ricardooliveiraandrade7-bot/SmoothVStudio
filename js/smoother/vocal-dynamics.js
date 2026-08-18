// ==========================================
// SMOOTHVSTUDIO
// VOCAL DYNAMICS
// V0.1
// ==========================================
//
// Primeiro módulo de dinâmica do Vocal
// Smoother.
//
// Responsável por controlar suavemente
// regiões agressivas do vocal.
//
// Não substitui ainda um compressor vocal
// completo.
//
// Esta versão trabalha principalmente
// com a região superior do espectro.
//
// ==========================================


class VocalDynamics {


    constructor(options = {}) {

        this.version =
            "0.1";


        this.threshold =
            options.threshold ??
            -24;


        this.ratio =
            options.ratio ??
            2.2;


        this.attack =
            options.attack ??
            0.004;


        this.release =
            options.release ??
            0.090;


        this.knee =
            options.knee ??
            18;
    }


    // ======================================
    // CLAMP
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
    // CALCULAR PARÂMETROS ADAPTATIVOS
    // ======================================

    calculateSettings(
        analysis
    ) {

        if (
            !analysis
        ) {

            throw new Error(
                "Análise vocal não disponível."
            );
        }


        const hardness =
            analysis.characteristics
                .hardness;


        const roughness =
            analysis.characteristics
                .roughness;


        const sibilance =
            analysis.characteristics
                .sibilance;


        /*
         * Quanto mais agressivo o vocal,
         * mais baixo fica o threshold.
         *
         * Porém existe um limite para evitar
         * esmagamento excessivo.
         */

        const intensity =
            this.clamp(
                (
                    hardness * 0.45
                ) +
                (
                    roughness * 0.30
                ) +
                (
                    sibilance * 0.25
                ),
                0,
                1
            );


        const threshold =
            -18 -
            (
                intensity *
                12
            );


        const ratio =
            1.6 +
            (
                intensity *
                1.8
            );


        const attack =
            0.003 +
            (
                (
                    1 -
                    intensity
                ) *
                0.004
            );


        const release =
            0.060 +
            (
                (
                    1 -
                    intensity
                ) *
                0.060
            );


        const knee =
            16 +
            (
                intensity *
                10
            );


        return {

            threshold,

            ratio,

            attack,

            release,

            knee,

            intensity
        };
    }


    // ======================================
    // CRIAR PROCESSADOR
    // ======================================

    createProcessor(
        context,
        analysis
    ) {

        if (
            !context
        ) {

            throw new Error(
                "AudioContext inválido."
            );
        }


        const settings =
            this.calculateSettings(
                analysis
            );


        const compressor =
            context.createDynamicsCompressor();


        compressor.threshold.value =
            settings.threshold;


        compressor.knee.value =
            settings.knee;


        compressor.ratio.value =
            settings.ratio;


        compressor.attack.value =
            settings.attack;


        compressor.release.value =
            settings.release;


        return {

            processor:
                compressor,

            settings
        };
    }
}


// ==========================================
// DISPONIBILIZAR
// ==========================================

window.VocalDynamics =
    VocalDynamics;