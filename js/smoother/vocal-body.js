// ==========================================
// SMOOTHVSTUDIO
// VOCAL BODY
// V0.1
// ==========================================
//
// Módulo responsável pelo controle adaptativo
// de excesso de grave e médio-grave.
//
// NÃO deve aplicar uma quantidade fixa de EQ.
//
// Ele recebe a análise do VocalAnalyzer e
// calcula automaticamente:
//
// - excesso de grave
// - excesso de low-mid
// - congestão de médio-grave
//
// Objetivo:
//
// - limpar excesso de peso
// - preservar o corpo natural da voz
// - evitar vocal fino
// - evitar cortes agressivos
//
// Arquitetura:
//
// VocalAnalyzer
//       ↓
// VocalBody
//       ↓
// parâmetros adaptativos
//
// ==========================================


class VocalBody {


    constructor(options = {}) {

        this.version =
            "0.1";


        // ==================================
        // LIMITES DE SEGURANÇA
        // ==================================

        this.maxLowCut =
            options.maxLowCut ??
            -2.5;


        this.maxLowMidCut =
            options.maxLowMidCut ??
            -2.0;


        this.maxMudCut =
            options.maxMudCut ??
            -1.5;
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


        const bands =
            analysis.bands ||
            {};


        const ratios =
            analysis.ratios ||
            {};


        const body =
            bands.body ||
            0;


        const lowMid =
            bands.lowMid ||
            0;


        const mid =
            bands.mid ||
            0;


        const total =
            body +
            lowMid +
            mid +
            0.000001;


        // ==================================
        // PROPORÇÕES LOCAIS
        // ==================================

        const bodyRatio =
            body /
            total;


        const lowMidRatio =
            lowMid /
            total;


        const midRatio =
            mid /
            total;


        // ==================================
        // REFERÊNCIA GLOBAL
        // ==================================

        const globalBodyRatio =
            ratios.body ??
            0;


        // ==================================
        // EXCESSO DE GRAVE
        // ==================================
        //
        // A região 120–500 Hz representa
        // grande parte do fundamento do vocal.
        //
        // Não queremos remover corpo.
        //
        // Portanto a intervenção só começa
        // quando a proporção fica realmente
        // dominante.
        // ==================================

        const lowExcess =
            this.clamp(
                (
                    globalBodyRatio -
                    0.20
                ) /
                0.16,
                0,
                1
            );


        // ==================================
        // EXCESSO DE LOW-MID
        // ==================================

        const lowMidExcess =
            this.clamp(
                (
                    lowMidRatio -
                    0.28
                ) /
                0.25,
                0,
                1
            );


        // ==================================
        // CONGESTÃO
        // ==================================
        //
        // Quando low-mid e médio começam a
        // dominar simultaneamente, podemos
        // ter sensação de vocal "fechado",
        // "gordo" ou congestionado.
        // ==================================

        const congestion =
            this.clamp(
                (
                    (
                        lowMidRatio *
                        0.65
                    ) +
                    (
                        midRatio *
                        0.35
                    )
                ) -
                0.38,
                0,
                0.30
            ) /
            0.30;


        // ==================================
        // GANHOS ADAPTATIVOS
        // ==================================

        const lowGain =
            this.clamp(
                lowExcess *
                this.maxLowCut,
                this.maxLowCut,
                0
            );


        const lowMidGain =
            this.clamp(
                lowMidExcess *
                this.maxLowMidCut,
                this.maxLowMidCut,
                0
            );


        const mudGain =
            this.clamp(
                congestion *
                this.maxMudCut,
                this.maxMudCut,
                0
            );


        // ==================================
        // FREQUÊNCIAS ADAPTATIVAS
        // ==================================

        const lowFrequency =
            this.clamp(
                180 +
                (
                    lowExcess *
                    70
                ),
                180,
                250
            );


        const lowMidFrequency =
            this.clamp(
                360 +
                (
                    lowMidExcess *
                    100
                ),
                360,
                460
            );


        const mudFrequency =
            this.clamp(
                650 +
                (
                    congestion *
                    180
                ),
                650,
                830
            );


        // ==================================
        // INTENSIDADE TOTAL
        // ==================================

        const intensity =
            this.clamp(
                (
                    lowExcess *
                    0.40
                ) +
                (
                    lowMidExcess *
                    0.40
                ) +
                (
                    congestion *
                    0.20
                ),
                0,
                1
            );


        return {

            lowGain,

            lowMidGain,

            mudGain,

            lowFrequency,

            lowMidFrequency,

            mudFrequency,

            intensity,

            lowExcess,

            lowMidExcess,

            congestion
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


        // ==================================
        // LOW
        // ==================================

        const lowFilter =
            context.createBiquadFilter();


        lowFilter.type =
            "peaking";


        lowFilter.frequency.value =
            settings.lowFrequency;


        lowFilter.Q.value =
            0.70;


        lowFilter.gain.value =
            settings.lowGain;


        // ==================================
        // LOW-MID
        // ==================================

        const lowMidFilter =
            context.createBiquadFilter();


        lowMidFilter.type =
            "peaking";


        lowMidFilter.frequency.value =
            settings.lowMidFrequency;


        lowMidFilter.Q.value =
            0.85;


        lowMidFilter.gain.value =
            settings.lowMidGain;


        // ==================================
        // MUD / CONGESTÃO
        // ==================================

        const mudFilter =
            context.createBiquadFilter();


        mudFilter.type =
            "peaking";


        mudFilter.frequency.value =
            settings.mudFrequency;


        mudFilter.Q.value =
            0.90;


        mudFilter.gain.value =
            settings.mudGain;


        // ==================================
        // CADEIA
        // ==================================

        lowFilter.connect(
            lowMidFilter
        );


        lowMidFilter.connect(
            mudFilter
        );


        return {

            input:
                lowFilter,

            output:
                mudFilter,

            settings
        };
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.VocalBody =
    VocalBody;