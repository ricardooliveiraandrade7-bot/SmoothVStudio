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
            -14;


        this.ratio =
            options.ratio ??
            1.6;


        this.attack =
            options.attack ??
            0.025;


        this.release =
            options.release ??
            0.135;


        this.knee =
            options.knee ??
            22;
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
         * maior a intensidade de controle
         * dinâmico.
         *
         * A adaptação permanece baseada
         * exclusivamente na análise existente.
         *
         * Os limites foram reduzidos para
         * preservar melhor a dinâmica natural
         * e evitar compressão excessiva.
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


        /*
         * Threshold adaptativo:
         *
         * intensidade baixa  = -8 dB
         * intensidade alta  = -20 dB
         *
         * O compressor pode atuar mais cedo
         * quando existe maior evidência de
         * agressividade, mas sem retornar aos
         * limites anteriores de até -30 dB.
         */

        const threshold =
            -8 -
            (
                intensity *
                12
            );


        /*
         * Ratio adaptativo:
         *
         * intensidade baixa  = 1.2:1
         * intensidade alta  = 2.0:1
         *
         * Mantém o controle progressivo sem
         * chegar à compressão mais agressiva
         * da versão anterior.
         */

        const ratio =
            1.2 +
            (
                intensity *
                0.8
            );


        /*
         * Attack adaptativo:
         *
         * intensidade baixa  = 35 ms
         * intensidade alta  = 15 ms
         *
         * Ataques mais lentos preservam melhor
         * o início natural das palavras quando
         * o controle dinâmico necessário é baixo.
         *
         * Quando a agressividade aumenta,
         * o ataque pode responder mais rapidamente.
         */

        const attack =
            0.015 +
            (
                (
                    1 -
                    intensity
                ) *
                0.020
            );


        /*
         * Release adaptativo:
         *
         * intensidade baixa  = 180 ms
         * intensidade alta  = 90 ms
         *
         * Releases mais longos em situações
         * leves ajudam a evitar bombeamento
         * perceptível.
         */

        const release =
            0.090 +
            (
                (
                    1 -
                    intensity
                ) *
                0.090
            );


        /*
         * Knee suave:
         *
         * intensidade baixa  = 18 dB
         * intensidade alta  = 26 dB
         *
         * Mantém uma transição gradual para
         * evitar uma entrada abrupta na
         * compressão.
         */

        const knee =
            18 +
            (
                intensity *
                8
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