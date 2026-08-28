// ==========================================
// SMOOTHVSTUDIO
// VOCAL HARSHNESS
// V0.2
// ==========================================
//
// Tratamento DSP adaptativo de harshness vocal.
//
// Este módulo NÃO contém inteligência de diagnóstico.
//
// Ele utiliza somente informações que já chegam ao DSP
// através de:
//
// - analysis.characteristics.hardness
// - analysis.characteristics.roughness
//
// A sibilância é lida apenas para diagnóstico/telemetria,
// mas NÃO participa mais da evidência de harshness.
//
// Objetivos:
//
// - controlar agressividade vocal nos high-mids;
// - preservar presença;
// - preservar inteligibilidade;
// - adaptar a intensidade ao tipo de vocal;
// - permitir atuação perceptível quando houver
//   dureza/aspereza real;
// - evitar dependência excessiva da confiança;
// - manter processamento serial;
// - preparar o módulo para futura recuperação harmônica.
//
// Região:
//
// 2.5 kHz → 5.0 kHz
//
// Arquitetura:
//
// sinal original
//      ↓
// filtro peaking adaptativo
//      ↓
// sinal processado
//
// Não existe soma/subtração de bandas paralelas.
//
// ==========================================


class VocalHarshness {


    constructor(
        options = {}
    ) {


        this.version =
            "0.2";


        // ==================================
        // FAIXA DE HARSHNESS
        // ==================================

        this.minFrequency =
            Number.isFinite(
                options.minFrequency
            )
                ? options.minFrequency
                : 2500;


        this.maxFrequency =
            Number.isFinite(
                options.maxFrequency
            )
                ? options.maxFrequency
                : 5000;


        // ==================================
        // CENTRO DA REGIÃO
        // ==================================

        this.defaultFrequency =
            Number.isFinite(
                options.defaultFrequency
            )
                ? options.defaultFrequency
                : 3750;


        // ==================================
        // REDUÇÃO
        // ==================================
        //
        // A versão anterior era limitada a 2 dB.
        //
        // Nesta versão permitimos tratamento
        // perceptivelmente mais efetivo.
        //
        // O limite continua finito para impedir
        // que o módulo remova agressividade de
        // forma destrutiva.
        //
        // ==================================

        this.maxReductionDb =
            Number.isFinite(
                options.maxReductionDb
            )
                ? options.maxReductionDb
                : 4.0;


        // ==================================
        // THRESHOLD
        // ==================================

        this.minThresholdDb =
            Number.isFinite(
                options.minThresholdDb
            )
                ? options.minThresholdDb
                : -18;


        this.maxThresholdDb =
            Number.isFinite(
                options.maxThresholdDb
            )
                ? options.maxThresholdDb
                : -8;


        // ==================================
        // RATIO
        // ==================================

        this.minRatio =
            Number.isFinite(
                options.minRatio
            )
                ? options.minRatio
                : 1.15;


        this.maxRatio =
            Number.isFinite(
                options.maxRatio
            )
                ? options.maxRatio
                : 2.5;


        // ==================================
        // ATAQUE / RELEASE
        // ==================================

        this.attack =
            Number.isFinite(
                options.attack
            )
                ? options.attack
                : 0.018;


        this.release =
            Number.isFinite(
                options.release
            )
                ? options.release
                : 0.120;


        // ==================================
        // KNEE
        // ==================================

        this.knee =
            Number.isFinite(
                options.knee
            )
                ? options.knee
                : 18;


        // ==================================
        // Q
        // ==================================

        this.bandQ =
            Number.isFinite(
                options.bandQ
            )
                ? options.bandQ
                : 1.15;


        // ==================================
        // PESOS ADAPTATIVOS
        // ==================================
        //
        // Hardness é a evidência principal.
        //
        // Roughness complementa a percepção de
        // aspereza/agressividade.
        //
        // Sibilance NÃO participa da evidência.
        //
        // ==================================

        this.hardnessWeight =
            Number.isFinite(
                options.hardnessWeight
            )
                ? options.hardnessWeight
                : 0.65;


        this.roughnessWeight =
            Number.isFinite(
                options.roughnessWeight
            )
                ? options.roughnessWeight
                : 0.35;


        // ==================================
        // LIMIAR DE ATIVAÇÃO
        // ==================================
        //
        // Reduzido de 0.25 para 0.15.
        //
        // O objetivo é impedir que uma evidência
        // perceptivelmente relevante seja anulada
        // apenas por um limiar excessivamente alto.
        //
        // ==================================

        this.activationThreshold =
            Number.isFinite(
                options.activationThreshold
            )
                ? options.activationThreshold
                : 0.15;


        // ==================================
        // INTENSIDADE
        // ==================================

        this.maxBlend =
            Number.isFinite(
                options.maxBlend
            )
                ? options.maxBlend
                : 0.75;


        // ==================================
        // Q ADAPTATIVO
        // ==================================

        this.minBandQ =
            Number.isFinite(
                options.minBandQ
            )
                ? options.minBandQ
                : 1.05;


        this.maxBandQ =
            Number.isFinite(
                options.maxBandQ
            )
                ? options.maxBandQ
                : 1.35;


        // ==================================
        // PISO DE CONFIANÇA
        // ==================================
        //
        // A confiança NÃO funciona como gate.
        //
        // Mesmo quando o Analyzer apresenta
        // confiança baixa, uma medida de
        // hardness/roughness ainda pode produzir
        // atuação.
        //
        // O piso impede que uma confiança baixa
        // reduza a evidência para zero.
        //
        // ==================================

        this.minimumConfidenceInfluence =
            Number.isFinite(
                options.minimumConfidenceInfluence
            )
                ? options.minimumConfidenceInfluence
                : 0.65;


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
    // NÚMERO SEGURO
    // ======================================

    number(
        value,
        fallback = 0
    ) {

        return Number.isFinite(
            value
        )
            ? value
            : fallback;
    }


    // ======================================
    // LER CARACTERÍSTICA
    // ======================================

    readCharacteristic(
        characteristics,
        names
    ) {

        if (
            !characteristics
        ) {

            return 0;
        }


        for (
            const name of names
        ) {

            const value =
                characteristics[name];


            if (
                Number.isFinite(
                    value
                )
            ) {

                return value;
            }
        }


        return 0;
    }


    // ======================================
    // NORMALIZAR INDICADOR
    // ======================================

    normalizeIndicator(
        value
    ) {

        const numeric =
            this.number(
                value,
                0
            );


        if (
            numeric <= 1
        ) {

            return this.clamp(
                numeric,
                0,
                1
            );
        }


        return this.clamp(
            numeric / 100,
            0,
            1
        );
    }


    // ======================================
    // LER CONFIANÇA
    // ======================================
    //
    // A função aceita diferentes nomes para
    // permanecer compatível com possíveis
    // formatos já existentes no Analyzer.
    //
    // Se nenhuma confiança específica existir,
    // retornamos 1.
    //
    // Isso significa:
    //
    // ausência de confiança explícita
    // ≠ ausência de evidência.
    //
    // ======================================

    readCharacteristicConfidence(
        analysis,
        names
    ) {

        const confidenceSource =
            analysis &&
            analysis.characteristicConfidence
                ? analysis.characteristicConfidence
                : (
                    analysis &&
                    analysis.characteristics &&
                    analysis.characteristics.confidence
                        ? analysis.characteristics.confidence
                        : null
                );


        if (
            !confidenceSource
        ) {

            return 1;
        }


        for (
            const name of names
        ) {

            const value =
                confidenceSource[name];


            if (
                Number.isFinite(
                    value
                )
            ) {

                return this.normalizeIndicator(
                    value
                );
            }
        }


        return 1;
    }


    // ======================================
    // INFLUÊNCIA DA CONFIANÇA
    // ======================================
    //
    // A confiança apenas modula a evidência.
    //
    // Ela não funciona como autorização binária.
    //
    // Fórmula:
    //
    // piso + (1 - piso) × confiança
    //
    // Com piso 0.65:
    //
    // confiança 1.00 → 1.00
    // confiança 0.50 → 0.825
    // confiança 0.00 → 0.65
    //
    // ======================================

    calculateConfidenceInfluence(
        confidence
    ) {

        const normalized =
            this.normalizeIndicator(
                confidence
            );


        return this.clamp(

            this.minimumConfidenceInfluence
            +
            (
                1 -
                this.minimumConfidenceInfluence
            )
            *
            normalized,

            this.minimumConfidenceInfluence,

            1
        );
    }
        // ======================================
    // CURVA DE ATIVIDADE
    // ======================================
    //
    // Curva suavizada para evitar degrau brusco.
    //
    // ======================================

    shapeActivity(
        value
    ) {

        const normalized =
            this.clamp(
                this.number(
                    value,
                    0
                ),
                0,
                1
            );


        return (
            normalized *
            normalized *
            (
                3 -
                (
                    2 *
                    normalized
                )
            )
        );
    }


    // ======================================
    // CURVA DE ATUAÇÃO
    // ======================================
    //
    // Diferente da versão anterior, esta curva
    // não começa extremamente lenta.
    //
    // Isso permite que evidências moderadas
    // tenham consequência audível.
    //
    // ======================================

    shapeTreatment(
        value
    ) {

        const normalized =
            this.clamp(
                this.number(
                    value,
                    0
                ),
                0,
                1
            );


        return (
            0.35 *
            normalized
        )
        +
        (
            0.65 *
            this.shapeActivity(
                normalized
            )
        );
    }


    // ======================================
    // CALCULAR EVIDÊNCIA
    // ======================================
    //
    // PRINCÍPIO:
    //
    // Hardness = evidência primária
    // Roughness = evidência complementar
    //
    // Sibilance não participa da decisão.
    //
    // ======================================

    calculateEvidence(
        analysis
    ) {

        const characteristics =
            analysis &&
            analysis.characteristics
                ? analysis.characteristics
                : {};


        const hardness =
            this.normalizeIndicator(
                this.readCharacteristic(
                    characteristics,
                    [
                        "hardness"
                    ]
                )
            );


        const roughness =
            this.normalizeIndicator(
                this.readCharacteristic(
                    characteristics,
                    [
                        "roughness"
                    ]
                )
            );


        // ----------------------------------
        // SIBILANCE
        // ----------------------------------
        //
        // Continua disponível para diagnóstico,
        // mas não influencia a decisão de Harshness.
        //
        // ----------------------------------

        const sibilance =
            this.normalizeIndicator(
                this.readCharacteristic(
                    characteristics,
                    [
                        "sibilance"
                    ]
                )
            );


        // ----------------------------------
        // CONFIANÇAS
        // ----------------------------------

        const hardnessConfidence =
            this.readCharacteristicConfidence(
                analysis,
                [
                    "hardness",
                    "hardnessConfidence"
                ]
            );


        const roughnessConfidence =
            this.readCharacteristicConfidence(
                analysis,
                [
                    "roughness",
                    "roughnessConfidence"
                ]
            );


        // ----------------------------------
        // INFLUÊNCIA DA CONFIANÇA
        // ----------------------------------

        const hardnessInfluence =
            this.calculateConfidenceInfluence(
                hardnessConfidence
            );


        const roughnessInfluence =
            this.calculateConfidenceInfluence(
                roughnessConfidence
            );


        // ----------------------------------
        // EVIDÊNCIA PONDERADA
        // ----------------------------------

        const weightedHardness =
            hardness *
            this.hardnessWeight *
            hardnessInfluence;


        const weightedRoughness =
            roughness *
            this.roughnessWeight *
            roughnessInfluence;


        const evidence =
            this.clamp(
                weightedHardness +
                weightedRoughness,
                0,
                1
            );


        return {

            hardness,

            roughness,

            sibilance,

            hardnessConfidence,

            roughnessConfidence,

            hardnessInfluence,

            roughnessInfluence,

            weightedHardness,

            weightedRoughness,

            evidence
        };
    }


    // ======================================
    // CALCULAR FREQUÊNCIA
    // ======================================
    //
    // Hardness tende a deslocar a região
    // de atuação para cima.
    //
    // Roughness tende a manter a atuação
    // mais centrada.
    //
    // A adaptação permanece limitada aos
    // limites do módulo.
    //
    // ======================================

    calculateFrequency(
        evidenceData,
        activity = 1
    ) {

        const hardness =
            this.number(
                evidenceData.hardness,
                0
            );


        const roughness =
            this.number(
                evidenceData.roughness,
                0
            );


        const rawOffset =
            (
                hardness -
                roughness
            ) *
            500;


        const stabilizedOffset =
            rawOffset *
            this.clamp(
                activity,
                0,
                1
            );


        return this.clamp(
            this.defaultFrequency +
                stabilizedOffset,
            this.minFrequency,
            this.maxFrequency
        );
    }


    // ======================================
    // CALCULAR Q
    // ======================================

    calculateBandQ(
        activity
    ) {

        const normalized =
            this.clamp(
                this.number(
                    activity,
                    0
                ),
                0,
                1
            );


        return (
            this.minBandQ +
            (
                this.maxBandQ -
                this.minBandQ
            ) *
            normalized
        );
    }


    // ======================================
    // CALCULAR PARÂMETROS
    // ======================================

    calculateSettings(
        analysis = {}
    ) {

        const evidenceData =
            this.calculateEvidence(
                analysis
            );


        const evidence =
            evidenceData.evidence;


        // ----------------------------------
        // ATIVAÇÃO
        // ----------------------------------

        const rawActivity =
            this.clamp(
                (
                    evidence -
                    this.activationThreshold
                )
                /
                (
                    1 -
                    this.activationThreshold
                ),
                0,
                1
            );


        // ----------------------------------
        // ATIVIDADE
        // ----------------------------------

        const activity =
            this.shapeTreatment(
                rawActivity
            );


        // ----------------------------------
        // REDUÇÃO
        // ----------------------------------

        const reductionDb =
            this.clamp(
                activity *
                    this.maxReductionDb,
                0,
                this.maxReductionDb
            );


        // ----------------------------------
        // RATIO
        // ----------------------------------

        const ratio =
            this.minRatio +
            (
                this.maxRatio -
                this.minRatio
            ) *
            activity;


        // ----------------------------------
        // THRESHOLD
        // ----------------------------------

        const threshold =
            this.maxThresholdDb -
            (
                this.maxThresholdDb -
                this.minThresholdDb
            ) *
            activity;


        // ----------------------------------
        // FREQUÊNCIA
        // ----------------------------------

        const frequency =
            this.calculateFrequency(
                evidenceData,
                activity
            );


        // ----------------------------------
        // Q
        // ----------------------------------

        const bandQ =
            this.calculateBandQ(
                activity
            );


        // ----------------------------------
        // BLEND
        // ----------------------------------

        const blend =
            this.clamp(
                activity *
                    this.maxBlend,
                0,
                this.maxBlend
            );


        return {

            frequency,

            minFrequency:
                this.minFrequency,

            maxFrequency:
                this.maxFrequency,

            threshold,

            ratio,

            attack:
                this.attack,

            release:
                this.release,

            knee:
                this.knee,

            bandQ,

            reductionDb,

            blend,

            evidence,

            activity,

            hardness:
                evidenceData.hardness,

            roughness:
                evidenceData.roughness,

            sibilance:
                evidenceData.sibilance,

            hardnessConfidence:
                evidenceData.hardnessConfidence,

            roughnessConfidence:
                evidenceData.roughnessConfidence,

            hardnessInfluence:
                evidenceData.hardnessInfluence,

            roughnessInfluence:
                evidenceData.roughnessInfluence,

            active:
                blend > 0.01,

            processingPermission:
                "none",

            audioProcessing:
                false,

            reconstructionPermission:
                "none",

            executorPermission:
                "none"
        };
    }
        // ======================================
    // CRIAR PROCESSADOR
    // ======================================

    createProcessor(
        context,
        analysis = {}
    ) {

        if (
            !context
        ) {

            throw new Error(
                "OfflineAudioContext inválido."
            );
        }


        const settings =
            this.calculateSettings(
                analysis
            );


        this.lastSettings =
            settings;


        // ==================================
        // ENTRADA
        // ==================================

        const input =
            context.createGain();


        // ==================================
        // SAÍDA
        // ==================================

        const output =
            context.createGain();


        // ==================================
        // CAMINHO DIRETO
        // ==================================
        //
        // O sinal permanece em um único caminho.
        //
        // Não existe:
        //
        // originalBand
        // +
        // processedBand
        // -
        // reconstrução paralela.
        //
        // ==================================


        // ==================================
        // SEM ATUAÇÃO
        // ==================================
        //
        // Quando não existe evidência suficiente,
        // o módulo permanece transparente.
        //
        // ==================================

        if (
            !settings.active
        ) {

            input.connect(
                output
            );


            return {

                input,

                output,

                settings
            };
        }


        // ==================================
        // FILTRO PEAKING
        // ==================================

        const harshnessFilter =
            context.createBiquadFilter();


        harshnessFilter.type =
            "peaking";


        harshnessFilter.frequency.value =
            settings.frequency;


        harshnessFilter.Q.value =
            settings.bandQ;


        // ==================================
        // GANHO ADAPTATIVO
        // ==================================
        //
        // A redução agora pode chegar a 4 dB.
        //
        // O valor efetivo continua totalmente
        // subordinado à evidência calculada.
        //
        // ==================================

        harshnessFilter.gain.value =
            -settings.reductionDb;


        // ==================================
        // CONEXÃO SERIAL
        // ==================================

        input.connect(
            harshnessFilter
        );


        harshnessFilter.connect(
            output
        );


        // ==================================
        // RETORNO
        // ==================================

        return {

            input,

            output,

            settings,

            harshnessFilter
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

if (
    typeof window !==
    "undefined"
) {

    window.VocalHarshness =
        VocalHarshness;
}


// ==========================================
// COMMONJS
// ==========================================

if (
    typeof module !==
    "undefined" &&
    module.exports
) {

    module.exports =
        VocalHarshness;
}
