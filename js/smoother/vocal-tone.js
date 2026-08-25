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


        // ==================================
        // COORDENAÇÃO BODY → TONE
        // ==================================
        //
        // O VocalBody continua responsável
        // pelo seu próprio processamento.
        //
        // Esta camada somente reduz
        // parcialmente a atuação do Tone
        // quando o Body já tratou a mesma
        // região.
        //
        // Nenhum novo detector é criado.
        // Nenhuma decisão de inteligência
        // é criada ou modificada.
        //
        // ==================================

        this.bodyCoordinationEnabled =
            options.bodyCoordinationEnabled ??
            true;


        this.maxBodyCoordination =
            options.maxBodyCoordination ??
            0.55;


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
    // CALCULAR COORDENAÇÃO BODY → TONE
    // ======================================
    //
    // O objetivo não é zerar o Tone quando
    // o Body atua.
    //
    // O objetivo é reduzir parcialmente
    // somente a parcela potencialmente
    // redundante.
    //
    // A recuperação de corpo do Body é
    // considerada para evitar tratar um
    // corte bruto como se fosse o efeito
    // líquido completo.
    //
    // ======================================

    calculateBodyCoordination(
        bodySettings
    ) {

        if (
            !this.bodyCoordinationEnabled ||
            !bodySettings
        ) {

            return {

                lowOverlap:
                    0,

                lowMidOverlap:
                    0,

                midOverlap:
                    0,

                overall:
                    0
            };
        }


        const lowGain =
            Number(
                bodySettings.lowGain
            );


        const lowMidGain =
            Number(
                bodySettings.lowMidGain
            );


        const mudGain =
            Number(
                bodySettings.mudGain
            );


        const bodyRecoveryGain =
            Number(
                bodySettings.bodyRecoveryGain
            );


        const safeLowGain =
            Number.isFinite(
                lowGain
            )
                ? Math.abs(
                    Math.min(
                        0,
                        lowGain
                    )
                )
                : 0;


        const safeLowMidGain =
            Number.isFinite(
                lowMidGain
            )
                ? Math.abs(
                    Math.min(
                        0,
                        lowMidGain
                    )
                )
                : 0;


        const safeMudGain =
            Number.isFinite(
                mudGain
            )
                ? Math.abs(
                    Math.min(
                        0,
                        mudGain
                    )
                )
                : 0;


        const safeRecovery =
            Number.isFinite(
                bodyRecoveryGain
            )
                ? this.clamp(
                    bodyRecoveryGain,
                    0,
                    0.6
                )
                : 0;


        /*
         * A recuperação reduz somente uma
         * pequena parcela da evidência de
         * sobreposição.
         *
         * Ela não desfaz os cortes do Body.
         */

        const effectiveLow =
            this.clamp(
                safeLowGain -
                (
                    safeRecovery *
                    0.30
                ),
                0,
                3
            );


        const effectiveLowMid =
            this.clamp(
                safeLowMidGain -
                (
                    safeRecovery *
                    0.20
                ),
                0,
                2.5
            );


        const effectiveMud =
            this.clamp(
                safeMudGain -
                (
                    safeRecovery *
                    0.15
                ),
                0,
                2
            );
                    /*
         * Conversão dos tratamentos reais
         * do Body em fatores de sobreposição.
         *
         * Os fatores são deliberadamente
         * conservadores.
         */

        const lowOverlap =
            this.clamp(
                effectiveLow /
                3.0,
                0,
                1
            ) *
            0.75;


        const lowMidOverlap =
            this.clamp(
                (
                    (
                        effectiveLowMid /
                        2.5
                    ) *
                    0.35
                ) +
                (
                    (
                        effectiveMud /
                        2.0
                    ) *
                    0.65
                ),
                0,
                1
            );


        const midOverlap =
            this.clamp(
                (
                    effectiveMud /
                    2.0
                ) *
                0.35,
                0,
                1
            );


        return {

            lowOverlap:
                this.clamp(
                    lowOverlap *
                    this.maxBodyCoordination,
                    0,
                    this.maxBodyCoordination
                ),

            lowMidOverlap:
                this.clamp(
                    lowMidOverlap *
                    this.maxBodyCoordination,
                    0,
                    this.maxBodyCoordination
                ),

            midOverlap:
                this.clamp(
                    midOverlap *
                    this.maxBodyCoordination,
                    0,
                    this.maxBodyCoordination
                ),

            overall:
                this.clamp(
                    (
                        lowOverlap *
                        0.35
                    ) +
                    (
                        lowMidOverlap *
                        0.40
                    ) +
                    (
                        midOverlap *
                        0.25
                    ),
                    0,
                    this.maxBodyCoordination
                )
        };
    }


    // ======================================
    // CALCULAR CONFIGURAÇÃO
    // ======================================

    calculateSettings(
        analysis,
        bodySettings = null
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
        // REDUÇÕES ORIGINAIS
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
        // COORDENAÇÃO BODY → TONE
        // ==================================

        const bodyCoordination =
            this.calculateBodyCoordination(
                bodySettings
            );


        /*
         * A redução é proporcional à
         * atuação original do Tone.
         *
         * Portanto, quando o Tone já está
         * próximo de zero, a coordenação
         * praticamente não altera nada.
         */

        const coordinatedLowReductionDb =
            lowReductionDb *
            (
                1 -
                bodyCoordination.lowOverlap
            );


        const coordinatedLowMidReductionDb =
            lowMidReductionDb *
            (
                1 -
                bodyCoordination.lowMidOverlap
            );


        const coordinatedMidReductionDb =
            midReductionDb *
            (
                1 -
                bodyCoordination.midOverlap
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

            coordinatedLowReductionDb,

            coordinatedLowMidReductionDb,

            coordinatedMidReductionDb,

            bodyCoordinationEnabled:
                this.bodyCoordinationEnabled,

            bodyCoordination:

                bodyCoordination,

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
        analysis,
        bodySettings = null
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
                analysis,
                bodySettings
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
            settings.coordinatedLowReductionDb;


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
            settings.coordinatedLowMidReductionDb;


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
            settings.coordinatedMidReductionDb;


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