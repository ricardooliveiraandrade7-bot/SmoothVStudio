// ==========================================
// SMOOTHVSTUDIO
// VOCAL SIBILANCE
// V0.2
// ==========================================
//
// De-esser adaptativo.
//
// Responsável por reduzir a região sibilante
// somente quando necessário.
//
// Arquitetura:
//
// VocalAnalyzer
//       ↓
// VocalSibilance
//       ↓
// VocalSmoother
//
// Esta versão evita manter a região de
// sibilância permanentemente reduzida.
//
// O objetivo é diminuir S / CH / X somente
// quando a região apresentar energia elevada.
//
// ==========================================


class VocalSibilance {


    constructor(options = {}) {

        this.version =
            "0.2";


        // ==================================
        // REGIÃO SIBILANTE
        // ==================================

        this.lowFrequency =
            options.lowFrequency ??
            5000;


        this.highFrequency =
            options.highFrequency ??
            9500;


        // ==================================
        // REDUÇÃO
        // ==================================

        this.maxReductionDb =
            options.maxReductionDb ??
            5.5;


        // ==================================
        // DINÂMICA
        // ==================================

        this.attack =
            options.attack ??
            0.002;


        this.release =
            options.release ??
            0.070;


        // ==================================
        // ESTADO
        // ==================================

        this.lastSettings =
            null;
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
    // INTERPOLAÇÃO
    // ======================================

    lerp(
        min,
        max,
        amount
    ) {

        return (
            min +
            (
                (
                    max -
                    min
                ) *
                amount
            )
        );
    }


    // ======================================
    // CALCULAR INTENSIDADE
    // ======================================

    calculateIntensity(
        analysis
    ) {

        if (
            !analysis
        ) {

            throw new Error(
                "Análise vocal não disponível."
            );
        }


        const characteristics =
            analysis.characteristics ||
            {};


        const sibilance =
            this.clamp(
                characteristics.sibilance ?? 0,
                0,
                1
            );


        /*
         * A intensidade é deliberadamente
         * conservadora nesta primeira versão.
         *
         * O objetivo não é destruir os
         * agudos do vocal.
         */

        const intensity =
            this.clamp(
                sibilance *
                1.15,
                0,
                1
            );


        return intensity;
    }


    // ======================================
    // CALCULAR CONFIGURAÇÃO
    // ======================================

    calculateSettings(
        analysis
    ) {

        const intensity =
            this.calculateIntensity(
                analysis
            );


        /*
         * Quanto maior a sibilância,
         * maior a redução máxima.
         */

        const reductionDb =
            this.lerp(
                1.0,
                this.maxReductionDb,
                intensity
            );


        /*
         * Ataque rápido para pegar
         * consoantes sibilantes.
         */

        const attack =
            this.lerp(
                0.004,
                this.attack,
                intensity
            );


        /*
         * Release moderado para evitar
         * modulação audível.
         */

        const release =
            this.lerp(
                0.110,
                this.release,
                intensity
            );


        const settings = {

            version:
                this.version,

            lowFrequency:
                this.lowFrequency,

            highFrequency:
                this.highFrequency,

            intensity,

            reductionDb,

            attack,

            release
        };


        this.lastSettings =
            settings;


        return settings;
    }


    // ======================================
    // CRIAR FILTRO DE FAIXA
    // ======================================

    createBandFilter(
        context
    ) {

        const filter =
            context.createBiquadFilter();


        filter.type =
            "bandpass";


        filter.frequency.value =
            (
                this.lowFrequency +
                this.highFrequency
            ) /
            2;


        filter.Q.value =
            0.72;


        return filter;
    }


    // ======================================
    // CRIAR PROCESSADOR
    // ======================================
    //
    // Nesta versão o compressor atua apenas
    // sobre a banda sibilante.
    //
    // O resultado será utilizado como
    // sinal de controle/redução pelo
    // VocalSmoother.
    //
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


        const bandFilter =
            this.createBandFilter(
                context
            );


        const compressor =
            context.createDynamicsCompressor();


        /*
         * O threshold é calculado a partir
         * da intensidade detectada.
         */

        const threshold =
            this.lerp(
                -12,
                -30,
                settings.intensity
            );


        const ratio =
            this.lerp(
                2.0,
                5.0,
                settings.intensity
            );


        const knee =
            10 +
            (
                settings.intensity *
                12
            );


        compressor.threshold.value =
            threshold;


        compressor.knee.value =
            knee;


        compressor.ratio.value =
            ratio;


        compressor.attack.value =
            settings.attack;


        compressor.release.value =
            settings.release;


        bandFilter.connect(
            compressor
        );


        return {

            input:
                bandFilter,

            processor:
                compressor,

            output:
                compressor,

            settings
        };
    }


    // ======================================
    // OBTER CONFIGURAÇÃO
    // ======================================

    getLastSettings() {

        return this.lastSettings;
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.VocalSibilance =
    VocalSibilance;