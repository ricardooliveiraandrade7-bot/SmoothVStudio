// ==========================================
// SMOOTHVSTUDIO
// VOCAL TONE
// V0.1
// ==========================================
//
// Correção tonal adaptativa.
//
// Responsável por:
//
// - excesso de grave/corpo
// - excesso de médio-grave
// - excesso de médios
//
// O módulo NÃO utiliza cortes fixos.
// A intensidade da correção é calculada
// a partir da análise do vocal.
//
// ==========================================


class VocalTone {


    constructor(options = {}) {

        this.version =
            "0.1";


        // ==================================
        // LIMITES DE CORREÇÃO
        // ==================================

        this.maxLowReductionDb =
            options.maxLowReductionDb ??
            2.5;


        this.maxLowMidReductionDb =
            options.maxLowMidReductionDb ??
            3.0;


        this.maxMidReductionDb =
            options.maxMidReductionDb ??
            2.0;


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
    // DECIBEL PARA GANHO
    // ======================================

    dbToGain(
        db
    ) {

        return Math.pow(
            10,
            db / 20
        );
    }


    // ======================================
    // CALCULAR EXCESSO
    // ======================================

    calculateExcess(
        ratio,
        reference,
        sensitivity
    ) {

        /*
         * A referência representa uma região
         * considerada tonalmente equilibrada.
         *
         * A correção somente começa quando
         * a energia ultrapassa essa referência.
         */

        const excess =
            (
                ratio -
                reference
            ) /
            reference;


        return this.clamp(
            excess *
            sensitivity,
            0,
            1
        );
    }


    // ======================================
    // CALCULAR CONFIGURAÇÃO
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


        const ratios =
            analysis.ratios ||
            {};


        const body =
            ratios.body ??
            0;


        const presence =
            ratios.presence ??
            0;


        /*
         * Como o Analyzer atual fornece
         * principalmente body e presence
         * em forma proporcional, usamos
         * também as bandas absolutas para
         * estabelecer relações entre regiões.
         */

        const bands =
            analysis.bands ||
            {};


        const lowEnergy =
            bands.body ??
            0;


        const lowMidEnergy =
            bands.lowMid ??
            0;


        const midEnergy =
            bands.mid ??
            0;


        const totalEnergy =
            lowEnergy +
            lowMidEnergy +
            midEnergy +
            (
                bands.presence ??
                0
            ) +
            (
                bands.sibilance ??
                0
            ) +
            (
                bands.air ??
                0
            ) +
            0.000001;


        const lowRatio =
            lowEnergy /
            totalEnergy;


        const lowMidRatio =
            lowMidEnergy /
            totalEnergy;


        const midRatio =
            midEnergy /
            totalEnergy;


        // ==================================
        // REFERÊNCIAS
        // ==================================
        //
        // São referências de equilíbrio,
        // NÃO cortes fixos.
        //
        // O resultado depende do vocal.
        //
        // ==================================

        const lowReference =
            0.115;


        const lowMidReference =
            0.145;


        const midReference =
            0.175;


        // ==================================
        // EXCESSOS
        // ==================================

        const lowExcess =
            this.calculateExcess(
                lowRatio,
                lowReference,
                1.8
            );


        const lowMidExcess =
            this.calculateExcess(
                lowMidRatio,
                lowMidReference,
                2.0
            );


        const midExcess =
            this.calculateExcess(
                midRatio,
                midReference,
                1.6
            );


        // ==================================
        // REDUÇÕES
        // ==================================

        const lowReductionDb =
            -(
                lowExcess *
                this.maxLowReductionDb
            );


        const lowMidReductionDb =
            -(
                lowMidExcess *
                this.maxLowMidReductionDb
            );


        const midReductionDb =
            -(
                midExcess *
                this.maxMidReductionDb
            );


        // ==================================
        // ATIVAÇÃO GERAL
        // ==================================

        const activity =
            this.clamp(
                (
                    lowExcess *
                    0.35
                ) +
                (
                    lowMidExcess *
                    0.40
                ) +
                (
                    midExcess *
                    0.25
                ),
                0,
                1
            );


        const settings = {

            version:
                this.version,

            lowRatio,

            lowMidRatio,

            midRatio,

            lowExcess,

            lowMidExcess,

            midExcess,

            lowReductionDb,

            lowMidReductionDb,

            midReductionDb,

            activity
        };


        this.lastSettings =
            settings;


        return settings;
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


        // ==================================
        // LOW / CORPO
        // ==================================

        const lowFilter =
            context.createBiquadFilter();


        lowFilter.type =
            "lowshelf";


        lowFilter.frequency.value =
            250;


        lowFilter.gain.value =
            settings.lowReductionDb;


        // ==================================
        // LOW-MID
        // ==================================

        const lowMidFilter =
            context.createBiquadFilter();


        lowMidFilter.type =
            "peaking";


        lowMidFilter.frequency.value =
            750;


        lowMidFilter.Q.value =
            0.75;


        lowMidFilter.gain.value =
            settings.lowMidReductionDb;


        // ==================================
        // MÉDIOS
        // ==================================

        const midFilter =
            context.createBiquadFilter();


        midFilter.type =
            "peaking";


        midFilter.frequency.value =
            1750;


        midFilter.Q.value =
            0.75;


        midFilter.gain.value =
            settings.midReductionDb;


        // ==================================
        // CONEXÃO
        // ==================================

        lowFilter.connect(
            lowMidFilter
        );


        lowMidFilter.connect(
            midFilter
        );


        return {

            input:
                lowFilter,

            output:
                midFilter,

            settings
        };
    }


    // ======================================
    // ÚLTIMA CONFIGURAÇÃO
    // ======================================

    getLastSettings() {

        return this.lastSettings;
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.VocalTone =
    VocalTone;