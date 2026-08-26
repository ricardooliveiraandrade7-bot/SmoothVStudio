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
// O módulo utiliza processamento espectral serial:
//
// sinal original
//      ↓
// filtro peaking adaptativo
//      ↓
// sinal processado
//
// Dessa maneira não existe soma/subtração de duas
// bandas filtradas paralelas.
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
        // Mantidos no contrato do módulo.
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
        // Mantido como parâmetro compatível
        // com a versão anterior.
        //
        // Nesta versão a intensidade efetiva
        // é aplicada através de um filtro
        // peaking serial.
        //
        // ==================================

        this.maxBlend =
            Number.isFinite(
                options.maxBlend
            )
                ? options.maxBlend
                : 0.65;


        // ==================================
        // Q ADAPTATIVO
        // ==================================
        //
        // Mantém o Q base próximo do valor
        // anterior.
        //
        // Com evidência forte, a banda fica
        // ligeiramente mais seletiva para
        // reduzir a possibilidade de remover
        // presença adjacente.
        //
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
                : 1.30;


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
    // CURVA DE ATIVIDADE
    // ======================================
    //
    // Suaviza a transição próxima ao limiar
    // de ativação.
    //
    // A resposta continua:
    //
    // baixa evidência → baixa atuação
    // evidência moderada → atuação progressiva
    // evidência forte → aproximação do máximo
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
    // A adaptação é deliberadamente limitada.
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


        const activity =
            this.shapeActivity(
                rawActivity
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
                evidenceData,
                activity
            );


        const bandQ =
            this.calculateBandQ(
                activity
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
        // O sinal passa por um único caminho.
        //
        // Não existe mais:
        //
        // originalBand
        // +
        // processedBand
        // -
        // reconstrução paralela.
        //
        // ==================================

        // ==================================
        // SE NÃO HOUVER EVIDÊNCIA
        // ==================================
        //
        // O módulo permanece transparente.
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
        //
        // O tratamento é aplicado diretamente
        // em série no sinal.
        //
        // Isso evita a soma/subtração de duas
        // bandas filtradas paralelas.
        //
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
        // A redução efetiva vem da evidência
        // calculada previamente.
        //
        // O limite continua conservador:
        //
        // máximo = 2 dB.
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