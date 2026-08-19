// ==========================================
// SMOOTHVSTUDIO
// SPECTRAL TREATMENT BRIDGE
// V0.2
// ==========================================
//
// Ponte entre:
//
// SpectralProfile
//        ↓
// VocalTreatmentPlan
//
// RESPONSABILIDADE:
//
// Transformar a interpretação espectral
// em informações seguras para o sistema
// de planejamento.
//
// IMPORTANTE:
//
// Este módulo NÃO:
//
// - modifica AudioBuffer
// - aplica EQ
// - cria filtros
// - altera volume
// - altera timbre
// - executa processamento DSP
// - determina ganho de processamento
//
// Ele apenas responde:
//
// "O que a análise espectral está dizendo,
// com que confiança e quanto essa informação
// pode participar da decisão?"
//
// ==========================================


class SpectralTreatmentBridge {


    constructor(
        options = {}
    ) {


        // ==================================
        // CONFIGURAÇÃO
        // ==================================

        this.minimumConfidence =
            options.minimumConfidence ??
            0.55;


        this.minimumSeparationDb =
            options.minimumSeparationDb ??
            0.20;


        this.maxSuggestedInfluence =
            options.maxSuggestedInfluence ??
            0.35;


        this.version =
            "0.2";
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

    safeNumber(
        value,
        fallback = 0
    ) {

        const number =
            Number(
                value
            );


        return Number.isFinite(
            number
        )
            ? number
            : fallback;
    }


    // ======================================
    // NORMALIZAR PERFIL
    // ======================================

    normalizeProfile(
        profile
    ) {

        if (
            !profile ||
            profile.valid === false
        ) {

            return {

                valid:
                    false,

                confidence:
                    0,

                tonalConfidence:
                    0,

                tonalTendency:
                    "unknown",

                closestReference:
                    "unknown",

                referenceSeparationDb:
                    0,

                ambiguous:
                    true,

                actionable:
                    false
            };
        }


        return {

            valid:
                true,

            confidence:
                this.clamp(
                    this.safeNumber(
                        profile.confidence
                    ),
                    0,
                    1
                ),

            tonalConfidence:
                this.clamp(
                    this.safeNumber(
                        profile.tonalConfidence
                    ),
                    0,
                    1
                ),

            tonalTendency:
                profile.tonalTendency ||
                "unknown",

            closestReference:
                profile.closestReference ||
                "unknown",

            referenceSeparationDb:
                this.safeNumber(
                    profile.referenceSeparationDb
                ),

            ambiguous:
                profile.ambiguous === true,

            actionable:
                profile.actionable === true
        };
    }


    // ======================================
    // CALCULAR CONFIANÇA ESPECTRAL
    // ======================================

    calculateSpectralConfidence(
        profile
    ) {

        const normalized =
            this.normalizeProfile(
                profile
            );


        if (
            !normalized.valid
        ) {

            return 0;
        }


        const analysisConfidence =
            normalized.confidence;


        const tonalConfidence =
            normalized.tonalConfidence;


        const separationConfidence =
            normalized.referenceSeparationDb >=
            this.minimumSeparationDb
                ? 1
                : 0.5;


        return this.clamp(
            (
                analysisConfidence *
                0.45
            ) +
            (
                tonalConfidence *
                0.35
            ) +
            (
                separationConfidence *
                0.20
            ),
            0,
            1
        );
    }


    // ======================================
    // CLASSIFICAR NÍVEL DE EVIDÊNCIA
    // ======================================
    //
    // Isto não é intensidade de processamento.
    //
    // É apenas qualidade da informação
    // disponível para tomada de decisão.
    //
    // ======================================

    classifyEvidence(
        confidence
    ) {

        const value =
            this.clamp(
                this.safeNumber(
                    confidence
                ),
                0,
                1
            );


        if (
            value < 0.40
        ) {

            return "low";
        }


        if (
            value < 0.70
        ) {

            return "medium";
        }


        return "high";
    }


    // ======================================
    // DETERMINAR REFERÊNCIA
    // ======================================

    determineReference(
        profile
    ) {

        const normalized =
            this.normalizeProfile(
                profile
            );


        const confidence =
            this.calculateSpectralConfidence(
                normalized
            );


        if (
            confidence <
            this.minimumConfidence
        ) {

            return {

                reference:
                    "unknown",

                confidence,

                usable:
                    false
            };
        }


        if (
            normalized.ambiguous
        ) {

            return {

                reference:
                    "neutral",

                confidence:
                    confidence *
                    0.50,

                usable:
                    false
            };
        }


        if (
            normalized.closestReference !==
                "neutral" &&
            normalized.closestReference !==
                "warm" &&
            normalized.closestReference !==
                "bright"
        ) {

            return {

                reference:
                    "unknown",

                confidence:
                    confidence *
                    0.50,

                usable:
                    false
            };
        }


        return {

            reference:
                normalized.closestReference,

            confidence,

            usable:
                normalized.actionable
        };
    }


    // ======================================
    // DETERMINAR TENDÊNCIA TONAL
    // ======================================
    //
    // A tendência é apenas contextual.
    //
    // NÃO representa uma ordem de EQ.
    //
    // ======================================

    determineTonalDirection(
        profile
    ) {

        const normalized =
            this.normalizeProfile(
                profile
            );


        if (
            !normalized.valid
        ) {

            return "unknown";
        }


        if (
            normalized.ambiguous
        ) {

            return "neutral";
        }


        if (
            normalized.closestReference ===
            "warm"
        ) {

            return "warm";
        }


        if (
            normalized.closestReference ===
            "bright"
        ) {

            return "bright";
        }


        if (
            normalized.closestReference ===
            "neutral"
        ) {

            return "neutral";
        }


        return "unknown";
    }


    // ======================================
    // INFLUÊNCIA SEGURA
    // ======================================
    //
    // Isto NÃO é ganho de EQ.
    //
    // É apenas um peso de decisão.
    //
    // ======================================

    calculateInfluence(
        profile
    ) {

        const normalized =
            this.normalizeProfile(
                profile
            );


        const confidence =
            this.calculateSpectralConfidence(
                normalized
            );


        if (
            confidence <
            this.minimumConfidence
        ) {

            return 0;
        }


        if (
            normalized.ambiguous
        ) {

            return 0;
        }


        if (
            !normalized.actionable
        ) {

            return 0;
        }


        return this.clamp(
            confidence *
            this.maxSuggestedInfluence,
            0,
            this.maxSuggestedInfluence
        );
    }


    // ======================================
    // NÍVEL DE SEGURANÇA
    // ======================================
    //
    // Define quão seguro é permitir que
    // a informação entre no planejamento.
    //
    // Não determina processamento.
    //
    // ======================================

    determineSafetyLevel(
        confidence,
        usable,
        ambiguous
    ) {

        if (
            ambiguous ||
            !usable
        ) {

            return "observe";
        }


        if (
            confidence <
            this.minimumConfidence
        ) {

            return "observe";
        }


        if (
            confidence >=
            0.75
        ) {

            return "supported";
        }


        return "cautious";
    }


    // ======================================
    // SINAL ESPECTRAL
    // ======================================

    createSpectralSignal(
        profile
    ) {

        const normalized =
            this.normalizeProfile(
                profile
            );


        const reference =
            this.determineReference(
                normalized
            );


        const influence =
            this.calculateInfluence(
                normalized
            );


        const tonalDirection =
            this.determineTonalDirection(
                normalized
            );


        const evidence =
            this.classifyEvidence(
                reference.confidence
            );


        const safety =
            this.determineSafetyLevel(
                reference.confidence,
                reference.usable,
                normalized.ambiguous
            );


        return {

            reference:
                reference.reference,

            tonalDirection:

                tonalDirection,

            confidence:
                reference.confidence,

            influence:
                influence,

            evidence:
                evidence,

            safety:
                safety,

            valid:
                normalized.valid,

            ambiguous:
                normalized.ambiguous,

            usable:
                reference.usable
        };
    }


    // ======================================
    // COMPARAR COM UMA REGIÃO
    // ======================================
    //
    // IMPORTANTE:
    //
    // O perfil espectral atual ainda é uma
    // evidência global.
    //
    // Portanto não fingimos possuir uma
    // medição específica de cada região.
    //
    // ======================================

    evaluateRegion(
        profile,
        regionName
    ) {

        const signal =
            this.createSpectralSignal(
                profile
            );


        if (
            !signal.usable
        ) {

            return {

                region:
                    regionName,

                support:
                    0,

                confidence:
                    signal.confidence,

                evidence:
                    signal.evidence,

                safety:
                    signal.safety,

                usable:
                    false,

                regionSpecificEvidence:
                    false,

                evidenceSource:
                    "global-spectral-profile",

                reason:
                    "spectral-analysis-insufficient"
            };
        }


        /*
         * Nesta fase o sistema ainda não
         * possui evidência espectral exclusiva
         * desta região.
         *
         * Portanto a informação pode apoiar
         * uma decisão futura, mas não pode
         * gerar tratamento por si só.
         */


        return {

            region:
                regionName,

            support:
                signal.influence,

            confidence:
                signal.confidence,

            evidence:
                signal.evidence,

            safety:
                signal.safety,

            usable:
                true,

            regionSpecificEvidence:
                false,

            evidenceSource:
                "global-spectral-profile",

            reference:
                signal.reference,

            tonalDirection:
                signal.tonalDirection,

            reason:
                "global-spectral-reference-available"
        };
    }


    // ======================================
    // GERAR CONTEXTO PARA O PLANO
    // ======================================

    createPlanningContext(
        profile
    ) {

        const signal =
            this.createSpectralSignal(
                profile
            );


        const regions = [

            "bass",

            "body",

            "mid",

            "presence",

            "harshness",

            "sibilance",

            "air"
        ];


        const regionContext =
            {};


        for (
            let i = 0;
            i < regions.length;
            i++
        ) {

            const region =
                regions[i];


            regionContext[
                region
            ] =
                this.evaluateRegion(
                    profile,
                    region
                );
        }


        return {

            version:
                this.version,

            spectral: {

                valid:
                    signal.valid,

                reference:
                    signal.reference,

                tonalDirection:
                    signal.tonalDirection,

                confidence:
                    signal.confidence,

                evidence:
                    signal.evidence,

                influence:
                    signal.influence,

                safety:
                    signal.safety,

                ambiguous:
                    signal.ambiguous,

                usable:
                    signal.usable
            },

            regions:
                regionContext,

            decisionPolicy: {

                analysisOnly:
                    true,

                regionSpecificEvidenceRequired:
                    true,

                processingRequiresIndependentEvidence:
                    true,

                tonalReferenceIsNotEqPreset:
                    true
            },

            safety: {

                audioProcessing:
                    false,

                gainGeneration:
                    false,

                filterGeneration:
                    false,

                reconstruction:
                    false
            }
        };
    }


    // ======================================
    // CONECTAR PERFIL AO PLANO
    // ======================================
    //
    // NÃO modifica o objeto original.
    //
    // Retorna uma cópia enriquecida.
    //
    // ======================================

    enrichPlan(
        treatmentPlan,
        profile
    ) {

        const context =
            this.createPlanningContext(
                profile
            );


        const basePlan =
            treatmentPlan &&
            typeof treatmentPlan ===
                "object"
                ? treatmentPlan
                : {};


        return {

            ...basePlan,

            spectralContext:
                context
        };
    }


    // ======================================
    // VERIFICAR SEGURANÇA
    // ======================================

    isAnalysisOnly(
        context
    ) {

        if (
            !context ||
            !context.safety
        ) {

            return false;
        }


        return (

            context
                .safety
                .audioProcessing ===
                false

        ) && (

            context
                .safety
                .gainGeneration ===
                false

        ) && (

            context
                .safety
                .filterGeneration ===
                false

        ) && (

            context
                .safety
                .reconstruction ===
                false
        );
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.SpectralTreatmentBridge =
    SpectralTreatmentBridge;