// ==========================================
// SMOOTHVSTUDIO
// VOCAL HARSHNESS
// V0.1
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
// - analysis.characteristics.sibilance
//
// Objetivos:
//
// - controlar agressividade vocal nos high-mids;
// - preservar presença;
// - preservar inteligibilidade;
// - evitar cortes estáticos excessivos;
// - adaptar a intensidade ao tipo de vocal;
// - atuar somente quando houver evidência suficiente;
// - manter o processamento conservador.
//
// Região inicial:
//
// 2.5 kHz → 5.0 kHz
//
// O módulo utiliza processamento diferencial:
//
// sinal original
//      +
// diferença entre a banda original e a banda
// dinamicamente controlada
//
// Dessa maneira a região fora do problema permanece
// essencialmente intacta.
//
// ==========================================


class VocalHarshness {


    constructor(
        options = {}
    ) {


        this.version =
            "0.1";


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
        // Limite deliberadamente conservador.
        //
        // O módulo não busca remover toda a
        // agressividade em uma única passagem.
        //
        // ==================================

        this.maxReductionDb =
            Number.isFinite(
                options.maxReductionDb
            )
                ? options.maxReductionDb
                : 2.0;


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
                : 2.0;


        // ==================================
        // ATAQUE / RELEASE
        // ==================================
        //
        // Valores deliberadamente naturais.
        //
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

        this.hardnessWeight =
            Number.isFinite(
                options.hardnessWeight
            )
                ? options.hardnessWeight
                : 0.70;


        this.roughnessWeight =
            Number.isFinite(
                options.roughnessWeight
            )
                ? options.roughnessWeight
                : 0.25;


        this.sibilanceWeight =
            Number.isFinite(
                options.sibilanceWeight
            )
                ? options.sibilanceWeight
                : 0.05;


        // ==================================
        // LIMIAR DE ATIVAÇÃO
        // ==================================
        //
        // Abaixo desse ponto o módulo fica
        // essencialmente transparente.
        //
        // ==================================

        this.activationThreshold =
            Number.isFinite(
                options.activationThreshold
            )
                ? options.activationThreshold
                : 0.25;


        // ==================================
        // INTENSIDADE DA CORREÇÃO
        // ==================================
        //
        // Controla quanto da diferença entre
        // banda original e banda comprimida
        // será aplicada.
        //
        // 1.0 = substituição completa da banda
        //
        // O valor máximo é deliberadamente menor.
        //
        // ==================================

        this.maxBlend =
            Number.isFinite(
                options.maxBlend
            )
                ? options.maxBlend
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
    //
    // Aceita indicadores em:
    //
    // 0 → 1
    //
    // ou
    //
    // 0 → 100
    //
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
    // CALCULAR EVIDÊNCIA
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


        const sibilance =
            this.normalizeIndicator(
                this.readCharacteristic(
                    characteristics,
                    [
                        "sibilance"
                    ]
                )
            );


        const evidence =
            this.clamp(
                hardness *
                    this.hardnessWeight
                +
                roughness *
                    this.roughnessWeight
                +
                sibilance *
                    this.sibilanceWeight,
                0,
                1
            );


        return {

            hardness,

            roughness,

            sibilance,

            evidence
        };
    }


    // ======================================
    // CALCULAR FREQUÊNCIA
    // ======================================
    //
    // O centro permanece dentro da região
    // de harshness.
    //
    // Não tenta identificar uma frequência
    // nova através da inteligência.
    //
    // É apenas adaptação do executor.
    //
    // ======================================

    calculateFrequency(
        evidenceData
    ) {

        const hardness =
            evidenceData.hardness;


        const roughness =
            evidenceData.roughness;


        const offset =
            (
                hardness -
                roughness
            ) *
            500;


        return this.clamp(
            this.defaultFrequency +
                offset,
            this.minFrequency,
            this.maxFrequency
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


        const activity =
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


        const reductionDb =
            this.clamp(
                activity *
                    this.maxReductionDb,
                0,
                this.maxReductionDb
            );


        const ratio =
            this.minRatio +
            (
                this.maxRatio -
                this.minRatio
            ) *
            activity;


        const threshold =
            this.maxThresholdDb -
            (
                this.maxThresholdDb -
                this.minThresholdDb
            ) *
            activity;


        const frequency =
            this.calculateFrequency(
                evidenceData
            );


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

            bandQ:
                this.bandQ,

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

        input.connect(
            output
        );


        // ==================================
        // SE NÃO HOUVER EVIDÊNCIA
        // ==================================
        //
        // O módulo permanece praticamente
        // transparente.
        //
        // ==================================

        if (
            !settings.active
        ) {

            return {

                input,

                output,

                settings
            };
        }


        // ==================================
        // BANDA ORIGINAL
        // ==================================
        //
        // Essa banda será subtraída parcialmente
        // do sinal final.
        //
        // ==================================

        const originalBand =
            context.createBiquadFilter();


        originalBand.type =
            "bandpass";


        originalBand.frequency.value =
            settings.frequency;


        originalBand.Q.value =
            settings.bandQ;


        // ==================================
        // BANDA PROCESSADA
        // ==================================

        const processedBand =
            context.createBiquadFilter();


        processedBand.type =
            "bandpass";


        processedBand.frequency.value =
            settings.frequency;


        processedBand.Q.value =
            settings.bandQ;


        // ==================================
        // COMPRESSOR
        // ==================================

        const compressor =
            context.createDynamicsCompressor();


        compressor.threshold.value =
            settings.threshold;


        compressor.ratio.value =
            settings.ratio;


        compressor.attack.value =
            settings.attack;


        compressor.release.value =
            settings.release;


        compressor.knee.value =
            settings.knee;


        // ==================================
        // GANHO DA DIFERENÇA
        // ==================================
        //
        // O objetivo é:
        //
        // original
        //
        // +
        //
        // blend ×
        // (
        // compressedBand
        // -
        // originalBand
        // )
        //
        // Assim somente uma fração da banda
        // é modificada.
        //
        // ==================================

        const originalReductionGain =
            context.createGain();


        originalReductionGain.gain.value =
            -settings.blend;


        const processedBlendGain =
            context.createGain();


        processedBlendGain.gain.value =
            settings.blend;


        // ==================================
        // CAMINHO ORIGINAL DA BANDA
        // ==================================

        input.connect(
            originalBand
        );


        originalBand.connect(
            originalReductionGain
        );


        originalReductionGain.connect(
            output
        );


        // ==================================
        // CAMINHO PROCESSADO
        // ==================================

        input.connect(
            processedBand
        );


        processedBand.connect(
            compressor
        );


        compressor.connect(
            processedBlendGain
        );


        processedBlendGain.connect(
            output
        );


        // ==================================
        // RETORNO
        // ==================================

        return {

            input,

            output,

            settings,

            originalBand,

            processedBand,

            compressor
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