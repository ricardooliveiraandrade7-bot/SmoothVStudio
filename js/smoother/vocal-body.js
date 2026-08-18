// ==========================================
// SMOOTHVSTUDIO
// VOCAL BODY
// V0.2
// ==========================================
//
// Controle adaptativo de grave e médio-grave.
//
// Responsável por:
//
// - excesso de grave
// - excesso de low-mid
// - congestão de médio-grave
//
// Não aplica uma curva fixa.
//
// Recebe a análise do VocalAnalyzer
// e calcula a intensidade necessária.
//
// ==========================================


class VocalBody {


    constructor(options = {}) {

        this.version =
            "0.2";


        // ==================================
        // LIMITES DE SEGURANÇA
        // ==================================

        this.maxLowCut =
            options.maxLowCut ??
            -3.0;


        this.maxLowMidCut =
            options.maxLowMidCut ??
            -2.5;


        this.maxMudCut =
            options.maxMudCut ??
            -2.0;
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
        // Utilizamos tanto a relação global
        // quanto a relação local.
        //
        // Isso evita que um vocal com muito
        // agudo pareça automaticamente ter
        // pouco corpo.
        // ==================================

        const globalLowExcess =
            this.clamp(
                (
                    globalBodyRatio -
                    0.18
                ) /
                0.18,
                0,
                1
            );


        const localBodyExcess =
            this.clamp(
                (
                    bodyRatio -
                    0.38
                ) /
                0.22,
                0,
                1
            );


        const lowExcess =
            this.clamp(
                (
                    globalLowExcess *
                    0.55
                ) +
                (
                    localBodyExcess *
                    0.45
                ),
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
                    0.30
                ) /
                0.22,
                0,
                1
            );


        // ==================================
        // CONGESTÃO
        // ==================================
        //
        // Aqui observamos a relação entre
        // low-mid e médio.
        //
        // Se os dois dominarem juntos,
        // existe maior possibilidade de
        // congestionamento.
        // ==================================

        const lowMidMidBalance =
            (
                lowMidRatio *
                0.62
            ) +
            (
                midRatio *
                0.38
            );


        const congestion =
            this.clamp(
                (
                    lowMidMidBalance -
                    0.37
                ) /
                0.28,
                0,
                1
            );


        // ==================================
        // PROTEÇÃO CONTRA CORTE DESNECESSÁRIO
        // ==================================
        //
        // Se a energia de grave e low-mid
        // não estiver claramente acima da
        // região média, reduzimos a confiança
        // da intervenção.
        // ==================================

        const lowMidDominance =
            this.clamp(
                (
                    (
                        body +
                        lowMid
                    ) /
                    (
                        mid +
                        body +
                        lowMid +
                        0.000001
                    )
                ) -
                0.48,
                0,
                0.40
            ) /
            0.40;


        const correctionConfidence =
            this.clamp(
                (
                    lowMidDominance *
                    0.60
                ) +
                (
                    congestion *
                    0.40
                ),
                0,
                1
            );


        // ==================================
        // GANHOS ADAPTATIVOS
        // ==================================

        const lowGain =
            this.clamp(
                (
                    lowExcess *
                    correctionConfidence
                ) *
                this.maxLowCut,
                this.maxLowCut,
                0
            );


        const lowMidGain =
            this.clamp(
                (
                    lowMidExcess *
                    correctionConfidence
                ) *
                this.maxLowMidCut,
                this.maxLowMidCut,
                0
            );


        const mudGain =
            this.clamp(
                (
                    congestion *
                    correctionConfidence
                ) *
                this.maxMudCut,
                this.maxMudCut,
                0
            );


        // ==================================
        // FREQUÊNCIAS ADAPTATIVAS
        // ==================================

        const lowFrequency =
            this.clamp(
                175 +
                (
                    lowExcess *
                    75
                ),
                175,
                250
            );


        const lowMidFrequency =
            this.clamp(
                350 +
                (
                    lowMidExcess *
                    120
                ),
                350,
                470
            );


        const mudFrequency =
            this.clamp(
                630 +
                (
                    congestion *
                    210
                ),
                630,
                840
            );


        // ==================================
        // INTENSIDADE
        // ==================================

        const intensity =
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
                    congestion *
                    0.25
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

            congestion,

            correctionConfidence
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
        // MUD
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