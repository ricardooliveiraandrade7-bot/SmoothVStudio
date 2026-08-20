// ==========================================
// SMOOTHVSTUDIO
// SPECTRAL TREATMENT BRIDGE
// V0.3
// ==========================================
//
// Ponte entre:
//
// SpectralProfile
//        ↓
// SpectralDiagnosticObserver
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


        this.minimumDiagnosticConfidence =
            options.minimumDiagnosticConfidence ??
            0.55;


        this.minimumRegionalCoverage =
            options.minimumRegionalCoverage ??
            0.50;


        this.version =
            "0.3";
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
    // BOOLEANO SEGURO
    // ======================================

    safeBoolean(
        value
    ) {

        return value === true;
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
    // NORMALIZAR DIAGNÓSTICO
    // ======================================
    //
    // O Bridge NÃO executa o Observer.
    //
    // Apenas recebe o resultado dele.
    //
    // ======================================

    normalizeDiagnostic(
        diagnostic
    ) {

        if (
            !diagnostic ||
            typeof diagnostic !==
                "object"
        ) {

            return {

                available:
                    false,

                valid:
                    false,

                confidence:
                    0,

                diagnosticState:
                    "uncertain",

                processingAllowed:
                    false,

                processingPermission:
                    "none",

                regionalCoverage:
                    0,

                uncertainRatio:
                    1,

                conflicts:
                    true,

                conflictRatio:
                    1,

                conclusion:
                    "diagnostic-unavailable"
            };
        }


        const interpretation =
            diagnostic.interpretation ||
            diagnostic;


        const confidence =
            this.clamp(
                this.safeNumber(
                    interpretation.confidence
                ),
                0,
                1
            );


        const diagnosticState =
            interpretation
                .diagnosticState ||
            "uncertain";


        const processingAllowed =
            interpretation
                .processingAllowed ===
                true;


        const processingPermission =
            interpretation
                .processingPermission ||
            "none";


        const confidentRegions =
            Math.max(
                0,
                this.safeNumber(
                    interpretation
                        .confidentRegions
                )
            );


        const uncertainRegions =
            Math.max(
                0,
                this.safeNumber(
                    interpretation
                        .uncertainRegions
                )
            );


        const usableRegions =
            Math.max(
                0,
                this.safeNumber(
                    interpretation
                        .usableRegions
                )
            );


        const totalRegional =
            confidentRegions +
            uncertainRegions;


        const regionalCoverage =
            totalRegional > 0
                ? this.clamp(
                    confidentRegions /
                    totalRegional,
                    0,
                    1
                )
                : 0;


        const uncertainRatio =
            totalRegional > 0
                ? this.clamp(
                    uncertainRegions /
                    totalRegional,
                    0,
                    1
                )
                : 1;


        const evidenceConflicts =
            interpretation
                .evidenceConflicts ||
            (
                interpretation
                    .contextualDiagnosis &&
                interpretation
                    .contextualDiagnosis
                    .evidenceConflicts
            ) ||
            {

                conflict:
                    true,

                conflictRatio:
                    1,

                conflicts: [
                    "diagnostic-conflicts-unavailable"
                ]
            };


        const conflictRatio =
            this.clamp(
                this.safeNumber(
                    evidenceConflicts
                        .conflictRatio
                ),
                0,
                1
            );


        const hasConflict =
            evidenceConflicts.conflict ===
            true ||
            conflictRatio > 0;


        //
        // Segurança fundamental:
        //
        // O Bridge nunca aumenta a autoridade
        // recebida do Observer.
        //
        // Se o diagnóstico disser que não pode
        // processar, continua não podendo.
        //

        const safeProcessingAllowed =
            processingAllowed === true &&
            processingPermission !==
                "none" &&
            diagnosticState !==
                "uncertain" &&
            !hasConflict &&
            confidence >=
                this.minimumDiagnosticConfidence;


        return {

            available:
                true,

            valid:
                interpretation.valid !==
                    false,

            confidence,

            diagnosticState,

            processingAllowed:
                safeProcessingAllowed,

            processingPermission:
                safeProcessingAllowed
                    ? processingPermission
                    : "none",

            regionalCoverage,

            uncertainRatio,

            confidentRegions,

            uncertainRegions,

            usableRegions,

            conflicts:
                hasConflict,

            conflictRatio,

            conclusion:
                interpretation.conclusion ||
                "diagnostic-conclusion-unavailable"
        };
    }


    // ======================================
    // INFLUÊNCIA DIAGNÓSTICA
    // ======================================
    //
    // Não é ganho de processamento.
    //
    // É somente peso de confiança.
    //
    // ======================================

    calculateDiagnosticInfluence(
        diagnostic
    ) {

        const normalized =
            this.normalizeDiagnostic(
                diagnostic
            );


        if (
            !normalized.available ||
            !normalized.valid
        ) {

            return 0;
        }


        if (
            normalized.diagnosticState ===
            "uncertain"
        ) {

            return 0;
        }


        if (
            normalized.conflicts
        ) {

            return 0;
        }


        if (
            normalized.regionalCoverage <
            this.minimumRegionalCoverage
        ) {

            return 0;
        }


        return this.clamp(

            normalized.confidence *
            normalized.regionalCoverage,

            0,
            1
        );
    }


    // ======================================
    // ESTADO DIAGNÓSTICO SEGURO
    // ======================================

    determineDiagnosticSafety(
        diagnostic
    ) {

        const normalized =
            this.normalizeDiagnostic(
                diagnostic
            );


        if (
            !normalized.available
        ) {

            return "observe";
        }


        if (
            normalized.conflicts
        ) {

            return "observe";
        }


        if (
            normalized.diagnosticState ===
            "uncertain"
        ) {

            return "observe";
        }


        if (
            normalized.confidence <
            this.minimumDiagnosticConfidence
        ) {

            return "observe";
        }


        if (
            normalized.regionalCoverage <
            this.minimumRegionalCoverage
        ) {

            return "cautious";
        }


        if (
            normalized.confidence >=
            0.75
        ) {

            return "supported";
        }


        return "cautious";
    }


    // ======================================
    // COMPARAR COM UMA REGIÃO
    // ======================================
    //
    // IMPORTANTE:
    //
    // O perfil espectral global ainda é uma
    // evidência global.
    //
    // O Bridge não pode fingir possuir uma
    // medição específica que não recebeu.
    //
    // ======================================

    evaluateRegion(
        profile,
        regionName,
        diagnostic = null
    ) {

        const signal =
            this.createSpectralSignal(
                profile
            );


        const normalizedDiagnostic =
            this.normalizeDiagnostic(
                diagnostic
            );


        const diagnosticInfluence =
            this.calculateDiagnosticInfluence(
                diagnostic
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
                    "observe",

                usable:
                    false,

                regionSpecificEvidence:
                    false,

                evidenceSource:
                    "global-spectral-profile",

                diagnosticAvailable:
                    normalizedDiagnostic
                        .available,

                diagnosticInfluence:
                    diagnosticInfluence,

                reason:
                    "spectral-analysis-insufficient"
            };
        }


        /*
         * Nesta fase o sistema ainda não
         * possui evidência espectral exclusiva
         * desta região a partir do perfil global.
         *
         * Quando o Observer fornecer uma medição
         * regional real, ela será preservada aqui.
         */


        let regionSpecificEvidence =
            false;


        let regionalState =
            "uncertain";


        let regionalStateConfidence =
            0;


        if (
            diagnostic &&
            diagnostic.snapshot &&
            diagnostic.snapshot.regions &&
            diagnostic.snapshot.regions[
                regionName
            ]
        ) {

            const observed =
                diagnostic
                    .snapshot
                    .regions[
                        regionName
                    ];


            regionSpecificEvidence =
                observed
                    .regionSpecificEvidence ===
                    true;


            regionalState =
                observed.acousticState ||
                "uncertain";


            regionalStateConfidence =
                this.clamp(
                    this.safeNumber(
                        observed.stateConfidence
                    ),
                    0,
                    1
                );
        }


        const combinedConfidence =
            this.clamp(

                (
                    signal.confidence *
                    0.40
                ) +

                (
                    regionalStateConfidence *
                    0.60
                ),

                0,
                1
            );


        return {

            region:
                regionName,

            support:
                regionSpecificEvidence
                    ? diagnosticInfluence
                    : 0,

            confidence:
                combinedConfidence,

            evidence:
                regionSpecificEvidence
                    ? "regional-diagnostic"
                    : signal.evidence,

            safety:
                regionSpecificEvidence
                    ? this.determineDiagnosticSafety(
                        diagnostic
                    )
                    : signal.safety,

            usable:
                true,

            regionSpecificEvidence:
                regionSpecificEvidence,

            evidenceSource:
                regionSpecificEvidence
                    ? "spectral-diagnostic-observer"
                    : "global-spectral-profile",

            diagnosticAvailable:
                normalizedDiagnostic
                    .available,

            diagnosticInfluence:
                diagnosticInfluence,

            acousticState:
                regionalState,

            stateConfidence:
                regionalStateConfidence,

            reference:
                signal.reference,

            tonalDirection:
                signal.tonalDirection,

            reason:
                regionSpecificEvidence
                    ? "validated-regional-diagnostic"
                    : "global-spectral-reference-available"
        };
    }


    // ======================================
    // GERAR CONTEXTO PARA O PLANO
    // ======================================

    createPlanningContext(
        profile,
        diagnostic = null
    ) {

        const signal =
            this.createSpectralSignal(
                profile
            );


        const normalizedDiagnostic =
            this.normalizeDiagnostic(
                diagnostic
            );


        const diagnosticSafety =
            this.determineDiagnosticSafety(
                diagnostic
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
                    region,
                    diagnostic
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


            diagnostic: {

                available:
                    normalizedDiagnostic
                        .available,

                valid:
                    normalizedDiagnostic
                        .valid,

                confidence:
                    normalizedDiagnostic
                        .confidence,

                state:
                    normalizedDiagnostic
                        .diagnosticState,

                regionalCoverage:
                    normalizedDiagnostic
                        .regionalCoverage,

                uncertainRatio:
                    normalizedDiagnostic
                        .uncertainRatio,

                conflicts:
                    normalizedDiagnostic
                        .conflicts,

                conflictRatio:
                    normalizedDiagnostic
                        .conflictRatio,

                safety:
                    diagnosticSafety,

                influence:
                    this.calculateDiagnosticInfluence(
                        diagnostic
                    ),

                conclusion:
                    normalizedDiagnostic
                        .conclusion
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

                diagnosticConfidenceRequired:
                    true,

                conflictingEvidenceFallsBackToUncertain:
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
                    false,

                processingPermission:
                    "none"
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
        profile,
        diagnostic = null
    ) {

        const context =
            this.createPlanningContext(
                profile,
                diagnostic
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

        ) && (

            context
                .safety
                .processingPermission ===
                "none"
        );
    }
}


// ==========================================
// DISPONIBILIZAR GLOBALMENTE
// ==========================================

window.SpectralTreatmentBridge =
    SpectralTreatmentBridge;