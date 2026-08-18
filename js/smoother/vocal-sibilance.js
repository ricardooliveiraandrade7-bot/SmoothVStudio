// ==========================================
// SMOOTHVSTUDIO
// VOCAL SIBILANCE
// V0.3
// ==========================================
//
// De-esser adaptativo paralelo.
//
// Responsável por reduzir S / CH / X
// sem remover o restante do espectro.
//
// Arquitetura:
//
//                 ┌── sinal original ──────┐
// Entrada ────────┤                         ├── Saída
//                 └── banda sibilante ──────┘
//                          ↓
//                     compressor
//                          ↓
//                    redução negativa
//
// A banda sibilante NÃO substitui o vocal.
// Ela é utilizada para reduzir suavemente
// somente a energia sibilante.
//
// ==========================================


class VocalSibilance {


    constructor(options = {}) {

        this.version =
            "0.3";


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
            6.0;


        // ==================================
        // DINÂMICA
        // ==================================

        this.attack =
            options.attack ??
            0.0025;


        this.release =
            options.release ??
            0.075;


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
    // DB → GANHO LINEAR
    // ======================================

    dbToLinear(
        db
    ) {

        return Math.pow(
            10,
            db / 20
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
         * A sibilância global continua sendo
         * apenas o ponto de partida.
         *
         * Mantemos a intensidade conservadora
         * para evitar que o de-esser fique
         * audível o tempo inteiro.
         */

        const intensity =
            this.clamp(
                sibilance *
                1.20,
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
         * Redução máxima adaptativa.
         *
         * Vocais com pouca sibilância recebem
         * apenas uma intervenção muito leve.
         */

        const reductionDb =
            this.lerp(
                0.75,
                this.maxReductionDb,
                intensity
            );


        /*
         * Ataque rápido o suficiente para
         * alcançar consoantes agressivas,
         * mas não excessivamente rápido.
         */

        const attack =
            this.lerp(
                0.005,
                this.attack,
                intensity
            );


        /*
         * Release ligeiramente mais longo
         * para reduzir modulação perceptível.
         */

        const release =
            this.lerp(
                0.120,
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
    // CRIAR FILTRO DE BANDA
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


        /*
         * Q moderadamente baixo para não
         * criar uma faixa estreita demais.
         *
         * Isso ajuda a evitar aquele caráter
         * artificial de "filtro".
         */

        filter.Q.value =
            0.72;


        return filter;
    }


    // ======================================
    // CRIAR PROCESSADOR
    // ======================================
    //
    // A V0.3 passa a possuir duas rotas:
    //
    // DRY:
    //
    // input → dryGain → output
    //
    // SIBILÂNCIA:
    //
    // input
    //   ↓
    // bandpass
    //   ↓
    // compressor
    //   ↓
    // ganho negativo
    //   ↓
    // output
    //
    // O resultado é uma redução paralela
    // da região sibilante.
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


        // ==================================
        // ENTRADA
        // ==================================

        const input =
            context.createGain();


        input.gain.value =
            1.0;


        // ==================================
        // SAÍDA
        // ==================================

        const output =
            context.createGain();


        output.gain.value =
            1.0;


        // ==================================
        // CAMINHO ORIGINAL
        // ==================================

        const dryGain =
            context.createGain();


        dryGain.gain.value =
            1.0;


        input.connect(
            dryGain
        );


        dryGain.connect(
            output
        );


        // ==================================
        // FILTRO SIBILANTE
        // ==================================

        const bandFilter =
            this.createBandFilter(
                context
            );


        input.connect(
            bandFilter
        );


        // ==================================
        // COMPRESSOR SIBILANTE
        // ==================================

        const compressor =
            context.createDynamicsCompressor();


        const threshold =
            this.lerp(
                -8,
                -28,
                settings.intensity
            );


        const ratio =
            this.lerp(
                2.0,
                5.5,
                settings.intensity
            );


        const knee =
            this.lerp(
                12,
                22,
                settings.intensity
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


        // ==================================
        // REDUÇÃO DA BANDA
        // ==================================
        //
        // O sinal comprimido é subtraído
        // suavemente do sinal original.
        //
        // Isso transforma a cadeia em um
        // de-esser paralelo simples.
        //
        // ==================================

        const reductionGain =
            context.createGain();


        const reductionAmount =
            this.dbToLinear(
                -settings.reductionDb
            );


        /*
         * Usamos uma fração da redução calculada
         * para manter a atuação natural.
         */

        reductionGain.gain.value =
            -(
                reductionAmount *
                0.70
            );


        compressor.connect(
            reductionGain
        );


        reductionGain.connect(
            output
        );


        return {

            input,

            processor:
                compressor,

            output,

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