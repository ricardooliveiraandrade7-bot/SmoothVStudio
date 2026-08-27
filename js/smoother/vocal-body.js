// ==========================================
// SMOOTHVSTUDIO
// VOCAL BODY
// V0.4
// ==========================================
// Controle adaptativo de grave e médio-grave.
//
// V0.4:
//
// - preserva os cortes corretivos existentes;
// - adiciona Body Enhancement independente
//   da atenuação;
// - permite adicionar corpo quando o vocal
//   já chega deficiente nessa região;
// - mantém recuperação pós-atenuação;
// - usa evidência espectral/local para decidir
//   a intensidade do enhancement;
// - mantém limites conservadores;
// - não cria decisões;
// - não libera processamento global;
// - não substitui o vocal original.
//
// IMPORTANTE:
//
// O Body Enhancement desta versão é uma
// reconstrução espectral tonal conservadora.
// Ele NÃO constitui reconstrução harmônica
// verdadeira.
//
// Uma futura Vocal Reconstruction poderá
// utilizar evidências harmônicas/espectrais
// mais específicas.
//
// ==========================================

class VocalBody {
    
    constructor(options = {}) {
        
        this.version = "0.4";
        
        this.maxLowCut =
            options.maxLowCut ?? -3.0;
        
        this.maxLowMidCut =
            options.maxLowMidCut ?? -2.5;
        
        this.maxMudCut =
            options.maxMudCut ?? -2.0;
        
        
        // ==================================
        // BODY RECOVERY
        // ==================================
        //
        // Recupera parcialmente sensação de
        // corpo após uma atenuação corretiva.
        //
        // ==================================
        
        this.bodyRecoveryEnabled =
            options.bodyRecoveryEnabled ?? true;
        
        this.maxBodyRecoveryGain =
            options.maxBodyRecoveryGain ?? 0.6;
        
        this.bodyRecoveryQ =
            options.bodyRecoveryQ ?? 0.65;
        
        
        // ==================================
        // BODY ENHANCEMENT
        // ==================================
        //
        // Diferentemente do Recovery,
        // o Enhancement pode atuar quando
        // existe deficiência de corpo mesmo
        // sem cortes prévios.
        //
        // O objetivo não é simplesmente
        // aumentar graves.
        //
        // A atuação depende da evidência
        // de deficiência de corpo.
        //
        // ==================================
        
        this.bodyEnhancementEnabled =
            options.bodyEnhancementEnabled ?? true;
        
        this.maxBodyEnhancementGain =
            options.maxBodyEnhancementGain ?? 0.75;
        
        this.bodyEnhancementQ =
            options.bodyEnhancementQ ?? 0.65;
        
        
        // ==================================
        // LIMIARES DE DEFICIÊNCIA
        // ==================================
        //
        // São referências internas para
        // determinar quando o corpo está
        // abaixo de uma faixa considerada
        // suficiente.
        //
        // Não representam um alvo rígido.
        //
        // ==================================
        
        this.bodyReferenceRatio =
            options.bodyReferenceRatio ?? 0.18;
        
        this.localBodyReferenceRatio =
            options.localBodyReferenceRatio ?? 0.38;
        
        
        // ==================================
        // PRIMEIRA INTEGRAÇÃO CONTROLADA
        // ==================================
        
        this.decisionIntegrationEnabled =
            options.decisionIntegrationEnabled ?? true;
        
        this.maxDecisionLowCut =
            options.maxDecisionLowCut ?? -1.0;
        
        this.minDecisionConfidence =
            options.minDecisionConfidence ?? "moderate";
    }
    
    
    // ======================================
    // CLAMP
    // ======================================
    
    clamp(value, min, max) {
        
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
    
    safeNumber(
        value,
        fallback = 0
    ) {
        
        return Number.isFinite(
                value
            ) ?
            value :
            fallback;
    }
    
    
    // ======================================
    // RANK DE CONFIANÇA
    // ======================================
    
    confidenceRank(value) {
        
        const text =
            String(
                value || ""
            ).toLowerCase();
        
        
        if (
            text === "strong" ||
            text === "forte"
        ) {
            
            return 2;
        }
        
        
        if (
            text === "moderate" ||
            text === "moderada"
        ) {
            
            return 1;
        }
        
        
        return 0;
    }
        // ======================================
    // IDENTIFICAR REGIÃO LOW
    // ======================================

    isLowRegion(region) {

        if (!region) {

            return false;
        }


        const id =
            String(
                region.id ||
                region.key ||
                region.name ||
                ""
            ).toLowerCase();


        return (
            id === "body" ||
            id === "bass" ||
            id === "grave" ||
            id === "low" ||
            id === "low-body" ||
            id === "lowbody"
        );
    }


    // ======================================
    // IDENTIFICAR CORREÇÃO
    // ======================================

    isCorrectionTreatment(intent) {

        const type =
            String(
                intent &&
                (
                    intent.treatmentType ||
                    intent.treatment ||
                    intent.actionType ||
                    ""
                )
            ).toLowerCase();


        return (
            type.includes("correct") ||
            type.includes("correction") ||
            type.includes("reduce") ||
            type.includes("cut") ||
            type.includes("atten") ||
            type.includes("correção") ||
            type.includes("redução") ||
            type.includes("corte")
        );
    }


    // ======================================
    // LER CORTE DA DECISÃO
    // ======================================

    getDecisionLowCut(decision) {

        if (
            !this.decisionIntegrationEnabled ||
            !decision ||
            !Array.isArray(
                decision.regionalInterventionIntent
            )
        ) {

            return 0;
        }


        let requestedCut = 0;


        for (
            const intent of
                decision.regionalInterventionIntent
        ) {

            if (
                !intent ||
                intent.state !== "candidate"
            ) {

                continue;
            }


            if (
                !this.isLowRegion(
                    intent.region
                )
            ) {

                continue;
            }


            if (
                !this.isCorrectionTreatment(
                    intent
                )
            ) {

                continue;
            }


            const confidence =
                this.confidenceRank(
                    intent.confidence
                );


            if (
                confidence <
                this.confidenceRank(
                    this.minDecisionConfidence
                )
            ) {

                continue;
            }


            const boundedGain =
                Number(
                    intent.boundedGainDb
                );


            if (
                !Number.isFinite(
                    boundedGain
                )
            ) {

                continue;
            }


            const cut =
                Math.min(
                    0,
                    boundedGain
                );


            requestedCut =
                Math.min(
                    requestedCut,
                    cut
                );
        }


        return this.clamp(
            requestedCut * 0.5,
            this.maxDecisionLowCut,
            0
        );
    }


    // ======================================
    // MEDIR DEFICIÊNCIA DE CORPO
    // ======================================
    //
    // A deficiência é estimada por duas
    // evidências independentes:
    //
    // 1. relação global de body;
    // 2. relação local body / low-mid / mid.
    //
    // Isso evita que uma única métrica
    // determine o enhancement.
    //
    // ======================================

    calculateBodyDeficiency(
        globalBodyRatio,
        bodyRatio
    ) {

        const globalDeficiency =
            this.clamp(
                (
                    this.bodyReferenceRatio -
                    globalBodyRatio
                ) /
                this.bodyReferenceRatio,
                0,
                1
            );


        const localDeficiency =
            this.clamp(
                (
                    this.localBodyReferenceRatio -
                    bodyRatio
                ) /
                this.localBodyReferenceRatio,
                0,
                1
            );


        return this.clamp(
            (
                globalDeficiency * 0.60
            ) +
            (
                localDeficiency * 0.40
            ),
            0,
            1
        );
    }


    // ======================================
    // CONFIANÇA DO ENHANCEMENT
    // ======================================
    //
    // O enhancement fica mais disponível
    // que a antiga recuperação, mas ainda
    // exige evidência mínima.
    //
    // ======================================

    calculateEnhancementConfidence(
        bodyDeficiency,
        correctionConfidence,
        bodyRatio,
        globalBodyRatio
    ) {

        const deficiencyEvidence =
            this.clamp(
                bodyDeficiency,
                0,
                1
            );


        const localEvidence =
            this.clamp(
                (
                    (
                        this.localBodyReferenceRatio -
                        bodyRatio
                    ) /
                    this.localBodyReferenceRatio
                ),
                0,
                1
            );


        const globalEvidence =
            this.clamp(
                (
                    (
                        this.bodyReferenceRatio -
                        globalBodyRatio
                    ) /
                    this.bodyReferenceRatio
                ),
                0,
                1
            );


        const combinedEvidence =
            this.clamp(
                (
                    deficiencyEvidence * 0.50
                ) +
                (
                    localEvidence * 0.25
                ) +
                (
                    globalEvidence * 0.25
                ),
                0,
                1
            );


        // A evidência corretiva não é
        // obrigatória para liberar enhancement.
        //
        // Quando existe deficiência clara,
        // o enhancement pode atuar mesmo sem
        // qualquer corte prévio.

        const confidence =
            this.clamp(
                (
                    combinedEvidence * 0.75
                ) +
                (
                    correctionConfidence * 0.25
                ),
                0,
                1
            );


        return confidence;
    }
        // ======================================
    // CONFIGURAÇÃO
    // ======================================

    calculateSettings(
        analysis,
        treatmentDecision = null
    ) {

        if (!analysis) {

            throw new Error(
                "Análise vocal não disponível."
            );
        }


        const bands =
            analysis.bands || {};

        const ratios =
            analysis.ratios || {};


        const body =
            bands.body || 0;

        const lowMid =
            bands.lowMid || 0;

        const mid =
            bands.mid || 0;


        const total =
            body +
            lowMid +
            mid +
            0.000001;


        const bodyRatio =
            body /
            total;


        const lowMidRatio =
            lowMid /
            total;


        const midRatio =
            mid /
            total;


        const globalBodyRatio =
            this.safeNumber(
                ratios.body,
                0
            );


        // ==================================
        // EXCESSO DE LOW
        // ==================================

        const globalLowExcess =
            this.clamp(
                (
                    globalBodyRatio -
                    this.bodyReferenceRatio
                ) /
                this.bodyReferenceRatio,
                0,
                1
            );


        const localBodyExcess =
            this.clamp(
                (
                    bodyRatio -
                    this.localBodyReferenceRatio
                ) /
                0.22,
                0,
                1
            );


        const lowExcess =
            this.clamp(
                (
                    globalLowExcess * 0.55
                ) +
                (
                    localBodyExcess * 0.45
                ),
                0,
                1
            );


        // ==================================
        // EXCESSO LOW-MID
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


        const lowMidMidBalance =
            (
                lowMidRatio * 0.62
            ) +
            (
                midRatio * 0.38
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
        // DOMINÂNCIA LOW-MID
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
                    lowMidDominance * 0.60
                ) +
                (
                    congestion * 0.40
                ),
                0,
                1
            );


        // ==================================
        // CORREÇÃO AUTOMÁTICA LOW
        // ==================================

        const automaticLowGain =
            this.clamp(
                (
                    lowExcess *
                    correctionConfidence
                ) *
                this.maxLowCut,
                this.maxLowCut,
                0
            );


        // ==================================
        // DECISÃO
        // ==================================

        const decisionLowCut =
            this.getDecisionLowCut(
                treatmentDecision
            );


        const lowGain =
            this.clamp(
                automaticLowGain +
                decisionLowCut,
                this.maxLowCut,
                0
            );


        // ==================================
        // LOW-MID
        // ==================================

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


        // ==================================
        // MUD
        // ==================================

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
        // FREQUÊNCIAS
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
        // INTENSIDADE CORRETIVA
        // ==================================

        const intensity =
            this.clamp(
                (
                    lowExcess * 0.35
                ) +
                (
                    lowMidExcess * 0.40
                ) +
                (
                    congestion * 0.25
                ),
                0,
                1
            );


        // ==================================
        // DEFICIÊNCIA DE CORPO
        // ==================================

        const bodyDeficiency =
            this.calculateBodyDeficiency(
                globalBodyRatio,
                bodyRatio
            );


        const enhancementConfidence =
            this.calculateEnhancementConfidence(
                bodyDeficiency,
                correctionConfidence,
                bodyRatio,
                globalBodyRatio
            );
                    // ==================================
        // BODY ENHANCEMENT DEMAND
        // ==================================
        //
        // Diferentemente do Recovery,
        // não depende de haver ocorrido corte.
        //
        // Isso resolve o problema identificado:
        //
        // vocal com pouco corpo
        //       ↓
        // sem corte corretivo
        //       ↓
        // antigo Recovery = 0
        //
        // Agora:
        //
        // deficiência detectada
        //       ↓
        // enhancement controlado
        //
        // ==================================

        const enhancementDemand =
            this.clamp(
                (
                    bodyDeficiency *
                    enhancementConfidence
                ),
                0,
                1
            );


        // ==================================
        // BODY ENHANCEMENT GAIN
        // ==================================

        const bodyEnhancementGain =
            this.bodyEnhancementEnabled
                ? this.clamp(
                    enhancementDemand *
                    this.maxBodyEnhancementGain,
                    0,
                    this.maxBodyEnhancementGain
                )
                : 0;


        // ==================================
        // FREQUÊNCIA DO ENHANCEMENT
        // ==================================
        //
        // A frequência é deslocada
        // suavemente conforme a deficiência.
        //
        // Não é permitido simplesmente
        // empurrar todo vocal para uma
        // frequência fixa.
        //
        // ==================================

        const enhancementFrequency =
            this.clamp(
                250 +
                (
                    bodyDeficiency *
                    110
                ),
                250,
                360
            );


        // ==================================
        // BODY RECOVERY
        // ==================================
        //
        // Continua existindo separadamente.
        //
        // Recovery:
        //   responde ao que foi atenuado.
        //
        // Enhancement:
        //   responde ao que está faltando.
        //
        // ==================================

        const totalAttenuation =
            Math.abs(lowGain) +
            Math.abs(lowMidGain) +
            Math.abs(mudGain);


        const recoveryDemand =
            this.clamp(
                totalAttenuation /
                5.5,
                0,
                1
            );


        const bodyRecoveryGain =
            this.bodyRecoveryEnabled
                ? this.clamp(
                    recoveryDemand *
                    this.maxBodyRecoveryGain,
                    0,
                    this.maxBodyRecoveryGain
                )
                : 0;


        // ==================================
        // FREQUÊNCIA DE RECOVERY
        // ==================================

        const recoveryFrequency =
            this.clamp(
                (
                    (
                        lowFrequency *
                        0.35
                    ) +
                    (
                        lowMidFrequency *
                        0.45
                    ) +
                    (
                        mudFrequency *
                        0.20
                    )
                ),
                260,
                520
            );


        // ==================================
        // RESULTADO
        // ==================================

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

            correctionConfidence,

            automaticLowGain,

            decisionLowCut,

            // ------------------------------
            // BODY DEFICIENCY
            // ------------------------------

            bodyDeficiency,

            enhancementConfidence,

            enhancementDemand,

            bodyEnhancementGain,

            enhancementFrequency,

            bodyEnhancementQ:
                this.bodyEnhancementQ,

            // ------------------------------
            // BODY RECOVERY
            // ------------------------------

            bodyRecoveryGain,

            recoveryFrequency,

            bodyRecoveryQ:
                this.bodyRecoveryQ
        };
    }
        // ======================================
    // CRIAR PROCESSADOR
    // ======================================

    createProcessor(
        context,
        analysis,
        treatmentDecision = null
    ) {

        if (!context) {

            throw new Error(
                "AudioContext inválido."
            );
        }


        const settings =
            this.calculateSettings(
                analysis,
                treatmentDecision
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
        // BODY ENHANCEMENT
        // ==================================
        //
        // Atua independentemente da atenuação.
        //
        // Este é o ponto principal da correção.
        //
        // O filtro é amplo e de baixo ganho,
        // evitando criar uma ressonância
        // artificial.
        //
        // ==================================

        const bodyEnhancementFilter =
            context.createBiquadFilter();


        bodyEnhancementFilter.type =
            "peaking";


        bodyEnhancementFilter.frequency.value =
            settings.enhancementFrequency;


        bodyEnhancementFilter.Q.value =
            settings.bodyEnhancementQ;


        bodyEnhancementFilter.gain.value =
            settings.bodyEnhancementGain;


        // ==================================
        // BODY RECOVERY
        // ==================================
        //
        // Permanece separado do Enhancement.
        //
        // ==================================

        const bodyRecoveryFilter =
            context.createBiquadFilter();


        bodyRecoveryFilter.type =
            "peaking";


        bodyRecoveryFilter.frequency.value =
            settings.recoveryFrequency;


        bodyRecoveryFilter.Q.value =
            settings.bodyRecoveryQ;


        bodyRecoveryFilter.gain.value =
            settings.bodyRecoveryGain;


        // ==================================
        // CADEIA
        // ==================================
        //
        // A ordem permanece:
        //
        // LOW
        //   ↓
        // LOW-MID
        //   ↓
        // MUD
        //   ↓
        // ENHANCEMENT
        //   ↓
        // RECOVERY
        //
        // Não existe caminho paralelo novo.
        //
        // ==================================

        lowFilter.connect(
            lowMidFilter
        );


        lowMidFilter.connect(
            mudFilter
        );


        mudFilter.connect(
            bodyEnhancementFilter
        );


        bodyEnhancementFilter.connect(
            bodyRecoveryFilter
        );


        return {

            input:
                lowFilter,

            output:
                bodyRecoveryFilter,

            settings
        };
    }


    // ======================================
    // DIAGNÓSTICO
    // ======================================

    getDiagnosticSnapshot(
        analysis = null,
        treatmentDecision = null
    ) {

        if (!analysis) {

            return {
                version:
                    this.version,

                bodyEnhancementEnabled:
                    this.bodyEnhancementEnabled,

                bodyRecoveryEnabled:
                    this.bodyRecoveryEnabled,

                maxBodyEnhancementGain:
                    this.maxBodyEnhancementGain,

                maxBodyRecoveryGain:
                    this.maxBodyRecoveryGain
            };
        }


        return {

            version:
                this.version,

            settings:
                this.calculateSettings(
                    analysis,
                    treatmentDecision
                ),

            bodyEnhancementEnabled:
                this.bodyEnhancementEnabled,

            bodyRecoveryEnabled:
                this.bodyRecoveryEnabled,

            maxBodyEnhancementGain:
                this.maxBodyEnhancementGain,

            maxBodyRecoveryGain:
                this.maxBodyRecoveryGain,

            bodyEnhancementQ:
                this.bodyEnhancementQ,

            bodyRecoveryQ:
                this.bodyRecoveryQ
        };
    }
        // ======================================
    // ATUALIZAR PARÂMETROS DE UMA REGIÃO
    // ======================================

    setRegion(
        regionName,
        options = {}
    ) {

        // O VocalBody V0.4 mantém os
        // parâmetros regionais através
        // das propriedades principais.
        //
        // Este método permanece para
        // compatibilidade com consumidores
        // existentes.

        if (
            regionName === "low"
        ) {

            if (
                Number.isFinite(
                    options.maxCut
                )
            ) {

                this.maxLowCut =
                    Math.min(
                        0,
                        options.maxCut
                    );
            }

            return true;
        }


        if (
            regionName === "lowMid"
        ) {

            if (
                Number.isFinite(
                    options.maxCut
                )
            ) {

                this.maxLowMidCut =
                    Math.min(
                        0,
                        options.maxCut
                    );
            }

            return true;
        }


        if (
            regionName === "mud"
        ) {

            if (
                Number.isFinite(
                    options.maxCut
                )
            ) {

                this.maxMudCut =
                    Math.min(
                        0,
                        options.maxCut
                    );
            }

            return true;
        }


        return false;
    }


    // ======================================
    // CONFIGURAÇÃO DO ENHANCEMENT
    // ======================================

    setBodyEnhancement(
        options = {}
    ) {

        if (
            typeof options.enabled ===
            "boolean"
        ) {

            this.bodyEnhancementEnabled =
                options.enabled;
        }


        if (
            Number.isFinite(
                options.maxGain
            )
        ) {

            this.maxBodyEnhancementGain =
                this.clamp(
                    options.maxGain,
                    0,
                    2
                );
        }


        if (
            Number.isFinite(
                options.Q
            )
        ) {

            this.bodyEnhancementQ =
                this.clamp(
                    options.Q,
                    0.20,
                    1.40
                );
        }


        return true;
    }


    // ======================================
    // CONFIGURAÇÃO DA RECUPERAÇÃO
    // ======================================

    setBodyRecovery(
        options = {}
    ) {

        if (
            typeof options.enabled ===
            "boolean"
        ) {

            this.bodyRecoveryEnabled =
                options.enabled;
        }


        if (
            Number.isFinite(
                options.maxGain
            )
        ) {

            this.maxBodyRecoveryGain =
                this.clamp(
                    options.maxGain,
                    0,
                    2
                );
        }


        if (
            Number.isFinite(
                options.Q
            )
        ) {

            this.bodyRecoveryQ =
                this.clamp(
                    options.Q,
                    0.20,
                    1.40
                );
        }


        return true;
    }


    // ======================================
    // MODO CONSERVADOR
    // ======================================

    setConservativeMode() {

        this.maxLowCut =
            -3.0;

        this.maxLowMidCut =
            -2.5;

        this.maxMudCut =
            -2.0;


        this.bodyRecoveryEnabled =
            true;

        this.maxBodyRecoveryGain =
            0.45;

        this.bodyRecoveryQ =
            0.70;


        this.bodyEnhancementEnabled =
            true;

        this.maxBodyEnhancementGain =
            0.55;

        this.bodyEnhancementQ =
            0.70;
    }


    // ======================================
    // MODO PADRÃO
    // ======================================

    setDefaultMode() {

        this.maxLowCut =
            -3.0;

        this.maxLowMidCut =
            -2.5;

        this.maxMudCut =
            -2.0;


        this.bodyRecoveryEnabled =
            true;

        this.maxBodyRecoveryGain =
            0.6;

        this.bodyRecoveryQ =
            0.65;


        this.bodyEnhancementEnabled =
            true;

        this.maxBodyEnhancementGain =
            0.75;

        this.bodyEnhancementQ =
            0.65;
    }


    // ======================================
    // RESET
    // ======================================

    reset() {

        this.setDefaultMode();
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

if (
    typeof window !==
    "undefined"
) {

    window.VocalBody =
        VocalBody;
}
