// ==========================================
// SMOOTHVSTUDIO
// VOCAL TONE
// V0.2
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
// V0.2:
//
// - correção tonal mais complementar
//   ao VocalBody;
// - limites de redução suavizados;
// - referências de equilíbrio ligeiramente
//   elevadas para evitar atuação precoce;
// - preservação da estrutura adaptativa;
// - nenhuma alteração em inteligência;
// - nenhuma reconstrução;
// - nenhuma atuação em médio-agudos/agudos.
//
// ==========================================


class VocalTone {


    constructor(options = {}) {


        this.version =
            "0.2";


        // ==================================
        // LIMITES DE CORREÇÃO
        // ==================================
        //
        // O VocalBody já realiza o tratamento
        // principal de corpo e médio-grave.
        //
        // Portanto o VocalTone atua como
        // complemento tonal e não como uma
        // segunda camada forte de limpeza.
        //
        // ==================================

        this.maxLowReductionDb =
            options.maxLowReductionDb ??
            1.5;


        this.maxLowMidReductionDb =
            options.maxLowMidReductionDb ??
            2.5;


        this.maxMidReductionDb =
            options.maxMidReductionDb ??
            1.5;


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
        // As referências foram elevadas
        // levemente para reduzir a ativação
        // excessiva após o trabalho do Body.
        //
        // ==================================

        const lowReference =
            0.125;


        const lowMidReference =
            0.155;


        const midReference =
            0.185;


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
    