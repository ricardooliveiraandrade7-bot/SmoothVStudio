// ==========================================
// SMOOTHVSTUDIO
// VOCAL BODY
// V0.3
// ==========================================
// Controle adaptativo de grave e médio-grave.
// A integração com a decisão é opcional e conservadora.
// ==========================================

class VocalBody {
    
    constructor(options = {}) {
        
        this.version = "0.3";
        
        this.maxLowCut =
            options.maxLowCut ?? -3.0;
        
        this.maxLowMidCut =
            options.maxLowMidCut ?? -2.5;
        
        this.maxMudCut =
            options.maxMudCut ?? -2.0;
        
        
        // ==================================
        // COMPENSAÇÃO PÓS-ATENUAÇÃO
        // ==================================
        //
        // A compensação é exclusivamente DSP.
        //
        // Ela não depende da inteligência
        // e não concede qualquer autoridade
        // adicional ao Treatment Decision Pipeline.
        //
        // O objetivo é recuperar parcialmente
        // a sensação de corpo perdida após
        // a atenuação, sem simplesmente desfazer
        // os cortes realizados pelo VocalBody.
        //
        // Limite deliberadamente baixo para
        // preservar naturalidade e headroom.
        //
        // ==================================
        
        this.bodyRecoveryEnabled =
            options.bodyRecoveryEnabled ?? true;
        
        this.maxBodyRecoveryGain =
            options.maxBodyRecoveryGain ?? 0.6;
        
        this.bodyRecoveryQ =
            options.bodyRecoveryQ ?? 0.65;
        
        
        // Primeira integração controlada com a inteligência.
        // Nunca aumenta ganho e nunca libera processamento global.
        this.decisionIntegrationEnabled =
            options.decisionIntegrationEnabled ?? true;
        
        
        this.maxDecisionLowCut =
            options.maxDecisionLowCut ?? -1.0;
        
        
        this.minDecisionConfidence =
            options.minDecisionConfidence ?? "moderate";
    }
    
    
    clamp(value, min, max) {
        
        return Math.min(
            max,
            Math.max(
                min,
                value
            )
        );
    }
    
    
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
            
            
            // A decisão só pode pedir redução.
            // Nenhum boost é aceito nesta primeira integração.
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
        
        
        // A decisão nunca ultrapassa o orçamento específico desta ponte.
        return this.clamp(
            requestedCut * 0.5,
            this.maxDecisionLowCut,
            0
        );
    }
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
                ratios.body ?? 0;
            
            
            const globalLowExcess =
                this.clamp(
                    (globalBodyRatio - 0.18) / 0.18,
                    0,
                    1
                );
            
            
            const localBodyExcess =
                this.clamp(
                    (bodyRatio - 0.38) / 0.22,
                    0,
                    1
                );
            
            
            const lowExcess =
                this.clamp(
                    (globalLowExcess * 0.55) +
                    (localBodyExcess * 0.45),
                    0,
                    1
                );
            
            
            const lowMidExcess =
                this.clamp(
                    (lowMidRatio - 0.30) / 0.22,
                    0,
                    1
                );
            
            
            const lowMidMidBalance =
                (lowMidRatio * 0.62) +
                (midRatio * 0.38);
            
            
            const congestion =
                this.clamp(
                    (lowMidMidBalance - 0.37) / 0.28,
                    0,
                    1
                );
            
            
            const lowMidDominance =
                this.clamp(
                    (
                        (body + lowMid) /
                        (
                            mid +
                            body +
                            lowMid +
                            0.000001
                        )
                    ) - 0.48,
                    0,
                    0.40
                ) /
                0.40;
            
            
            const correctionConfidence =
                this.clamp(
                    (lowMidDominance * 0.60) +
                    (congestion * 0.40),
                    0,
                    1
                );
            
            
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
            
            
            const lowFrequency =
                this.clamp(
                    175 +
                    (lowExcess * 75),
                    175,
                    250
                );
            
            
            const lowMidFrequency =
                this.clamp(
                    350 +
                    (lowMidExcess * 120),
                    350,
                    470
                );
            
            
            const mudFrequency =
                this.clamp(
                    630 +
                    (congestion * 210),
                    630,
                    840
                );
            
            
            const intensity =
                this.clamp(
                    (lowExcess * 0.35) +
                    (lowMidExcess * 0.40) +
                    (congestion * 0.25),
                    0,
                    1
                );
                        // ==================================
        // RECUPERAÇÃO DE CORPO
        // ==================================
        //
        // A recuperação é proporcional ao
        // tratamento efetivamente aplicado.
        //
        // Ela nunca devolve integralmente
        // aquilo que foi retirado.
        //
        // O objetivo desta etapa é somente
        // testar se uma pequena compensação
        // melhora a sensação de corpo após
        // o controle de grave/médio-grave.
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


        // A frequência acompanha a região
        // efetivamente tratada, mas permanece
        // em uma faixa ampla para evitar
        // uma ressonância estreita.
        const recoveryFrequency =
            this.clamp(
                (
                    (lowFrequency * 0.35) +
                    (lowMidFrequency * 0.45) +
                    (mudFrequency * 0.20)
                ),
                260,
                520
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

            correctionConfidence,

            automaticLowGain,

            decisionLowCut,

            bodyRecoveryGain,

            recoveryFrequency,

            bodyRecoveryQ:
                this.bodyRecoveryQ
        };
    }


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
        // BODY RECOVERY
        // ==================================
        //
        // Compensação muito ampla e limitada.
        //
        // Esta etapa não tenta reconstruir
        // exatamente o espectro original.
        //
        // Ela somente recupera uma pequena
        // parcela do equilíbrio espectral
        // após a atenuação.
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

        lowFilter.connect(
            lowMidFilter
        );


        lowMidFilter.connect(
            mudFilter
        );


        mudFilter.connect(
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
}
window.VocalBody =
    VocalBody;